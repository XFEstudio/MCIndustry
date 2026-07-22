// StackConveyor 的标称速度是“整组容量 × 每秒移动组数”。原版装载端仍然
// 等待相邻建筑逐件 dump，所以单个物品源会先被 100/s 的输出上限卡住。
// 磁铜传送带在装载状态下从相邻 ItemSource 或 Drill 补满一组，使 25 件物品可以真正
// 每 3 tick 向前移动一次，即 25 × 60 / 3 = 500 件/秒。
function pullFrom(magneticConveyor, build, source, room){
    if(source == null || source == build.front() || source.team != build.team){
        return 0;
    }

    if(source.block instanceof ItemSource){
        // ItemSource 没有持久库存；outputItem 就是无限供应的配置物品。
        const item = source.outputItem;
        if(item == null || (build.items.any() && !build.items.has(item)) || !source.canDump(build, item)){
            return 0;
        }

        build.handleStack(item, room, source);
        return room;
    }

    if(source.block instanceof Drill){
        // 钻头只会产出 dominantItem，因此可以安全地批量取走该物品；不能
        // 使用 items.first()，否则将来扩展钻头时可能误取其他内部物品。
        const item = source.dominantItem;
        if(item == null || (build.items.any() && !build.items.has(item)) ||
            !source.items.has(item) || !source.canDump(build, item)){
            return 0;
        }

        const amount = Math.min(room, source.items.get(item));
        const removed = source.removeStack(item, amount);
        if(removed > 0){
            build.handleStack(item, removed, source);
        }
        return removed;
    }

    // 普通工厂、核心和仓库仍沿用原版输入规则，避免传送带错误抽走
    // 配方原料或绕过卸载器。
    return 0;
}

function fillLoadingDock(magneticConveyor, build){
    // stateLoad == 1；该常量在 Java 中是 protected，脚本侧不能直接读取。
    if(build.state !== 1 || build.items.total() >= magneticConveyor.itemCapacity){
        return;
    }

    let room = magneticConveyor.itemCapacity - build.items.total();
    for(let i = 0; i < build.proximity.size && room > 0; i++){
        room -= pullFrom(magneticConveyor, build, build.proximity.get(i), room);
    }
}

Events.on(ContentInitEvent, cons(() => {
    const magneticConveyor = Vars.content.getByName(
        ContentType.block,
        modName + "-磁铜传送带"
    );

    if(magneticConveyor == null){
        Log.err("找不到磁铜传送带内容：" + modName + "-磁铜传送带");
        return;
    }

    magneticConveyor.buildType = prov(() => extend(
        StackConveyor.StackConveyorBuild,
        magneticConveyor,
        {
            updateTile(){
                this.super$updateTile();
                fillLoadingDock(magneticConveyor, this);
            }
        }
    ));
}));
