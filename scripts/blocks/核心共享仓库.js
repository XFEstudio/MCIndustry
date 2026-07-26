// 远程仓库不能使用原版 StorageBlock 的 coreMerge：
// 原版只会把与核心直接相邻的仓库加入核心容量。
// 此脚本按队伍重新计算“核心 + 相邻原版仓库 + 全部远程仓库”的每种物品容量，
// 并让远程仓库直接引用核心的 ItemModule。

const remoteStorageBlocks = [];
let refreshingRemoteStorage = false;
let lastRefreshTick = -1;

function isRemoteStorage(build){
    return build != null && (
        build.block == remoteStorageBlocks[0] ||
        build.block == remoteStorageBlocks[1]
    );
}

function vanillaCoreCapacity(cores){
    let capacity = 0;

    for(let i = 0; i < cores.size; i++){
        const core = cores.get(i);
        capacity += core.block.itemCapacity;

        for(let j = 0; j < core.proximity.size; j++){
            const near = core.proximity.get(j);
            if(near instanceof StorageBlock.StorageBuild &&
                near.block.coreMerge &&
                (near.linkedCore == core || near.linkedCore == null)){
                capacity += near.block.itemCapacity;
            }
        }
    }

    return capacity;
}

function refreshRemoteStorage(excluded, force){
    if(refreshingRemoteStorage || Vars.state == null || Vars.state.isMenu()){
        return;
    }

    const tick = Math.floor(Time.time);
    if(!force && tick == lastRefreshTick){
        return;
    }

    refreshingRemoteStorage = true;
    lastRefreshTick = tick;

    try{
        const extraByTeam = [];
        const warehouses = [];

        Groups.build.each(cons(build => {
            if(build != excluded && isRemoteStorage(build)){
                const teamId = build.team.id;
                extraByTeam[teamId] =
                    (extraByTeam[teamId] == null ? 0 : extraByTeam[teamId]) +
                    build.block.itemCapacity;
                warehouses.push(build);
            }
        }));

        for(let teamId = 0; teamId < Team.all.length; teamId++){
            const team = Team.all[teamId];
            const cores = team.cores();
            if(cores == null || cores.size == 0){
                continue;
            }

            const totalCapacity = vanillaCoreCapacity(cores) +
                (extraByTeam[team.id] == null ? 0 : extraByTeam[team.id]);

            for(let i = 0; i < cores.size; i++){
                cores.get(i).storageCapacity = totalCapacity;
            }

            // 与原版核心仓库容量下降时一致，移除扩展仓库后截断超出的物品。
            const sharedItems = cores.get(0).items;
            const allItems = Vars.content.items();
            for(let i = 0; i < allItems.size; i++){
                const item = allItems.get(i);
                if(sharedItems.get(item) > totalCapacity){
                    sharedItems.set(item, totalCapacity);
                }
            }
        }

        for(let i = 0; i < warehouses.length; i++){
            const warehouse = warehouses[i];
            const core = warehouse.team.core();
            if(core != null){
                warehouse.linkedCore = core;
                warehouse.items = core.items;
            }else{
                warehouse.linkedCore = null;
            }
        }
    }finally{
        refreshingRemoteStorage = false;
    }
}

function installRemoteStorage(block){
    block.update = true;
    block.coreMerge = false;

    block.buildType = prov(() => extend(
        StorageBlock.StorageBuild,
        block,
        {
            placed(){
                this.super$placed();
                refreshRemoteStorage(null, true);
            },

            onRemoved(){
                this.super$onRemoved();
                refreshRemoteStorage(this, true);
            },

            changeTeam(next){
                if(this.team == next){
                    return;
                }
                this.super$changeTeam(next);
                refreshRemoteStorage(null, true);
            },

            updateTile(){
                // 每秒兜底同步一次，以覆盖核心重建、占领和其他仓库变化。
                // Rhino 会优先把 Building.timer 解析为 Interval 字段，
                // 因此必须直接调用 Interval.get，不能调用同名 Java 方法。
                if(this.timer.get(0, 60)){
                    refreshRemoteStorage(null, false);
                }
            }
        }
    ));
}

Events.on(ContentInitEvent, cons(() => {
    remoteStorageBlocks.length = 0;
    remoteStorageBlocks.push(
        Vars.content.getByName(
            ContentType.block,
            modName + "-磁铜压缩仓库"
        )
    );
    remoteStorageBlocks.push(
        Vars.content.getByName(
            ContentType.block,
            modName + "-磁涌扩展仓库"
        )
    );

    for(let i = 0; i < remoteStorageBlocks.length; i++){
        const block = remoteStorageBlocks[i];
        if(block == null){
            Log.err("找不到远程核心仓库内容，索引：" + i);
            continue;
        }
        installRemoteStorage(block);
    }
}));

Events.on(WorldLoadEvent, cons(() => {
    refreshRemoteStorage(null, true);
}));

Events.on(CoreChangeEvent, cons(() => {
    refreshRemoteStorage(null, true);
}));
