const magneticBridge = Vars.content.getByName(
    ContentType.block,
    modName + "-磁驱传输器"
);

const batchSize = 10;

if(magneticBridge == null){
    throw new Error("找不到磁驱传输器内容：" + modName + "-磁驱传输器");
}

// ItemBridge.setStats() 只按 transportTime 计算单件速度；初始化完成后将
// 数据库面板中的速度替换为实际的“每批数量 × 每秒批数”。
Events.on(ContentInitEvent, cons(() => {
    magneticBridge.stats.remove(Stat.itemsMoved);
    magneticBridge.stats.add(
        Stat.itemsMoved,
        batchSize * 60 / magneticBridge.transportTime,
        StatUnit.itemsSecond
    );
}));

// ItemBridge 原版每次只处理 1 件物品。这里保留它的计时、供电与连接
// 规则，但把一次传输事件改成最多搬运 10 件物品。
magneticBridge.buildType = prov(() => extend(
    ItemBridge.ItemBridgeBuild,
    magneticBridge,
    {
        updateTransport(other){
            this.transportCounter += this.edelta();

            while(this.transportCounter >= magneticBridge.transportTime){
                const item = this.items.first();

                if(item != null && other.acceptItem(this, item)){
                    // 两端都是同一种 ItemBridge；按对端的总容量截断批量，
                    // 再用一次 handleStack 完成真正的成组传输。
                    const amount = Math.min(
                        batchSize,
                        this.items.get(item),
                        magneticBridge.itemCapacity - other.items.total()
                    );

                    if(amount > 0){
                        this.items.remove(item, amount);
                        other.handleStack(item, amount, this);
                        this.moved = true;
                    }
                }

                this.transportCounter -= magneticBridge.transportTime;
            }
        },

        // 无有效链接时，ItemBridge 会向相邻建筑卸货。原版这里同样只有
        // 1 件/tick，因此必须一起扩展，否则整条线路仍会卡在约 60 件/秒。
        doDump(){
            for(let i = 0; i < batchSize; i++){
                if(!this.dump()) break;
            }
        }
    }
));
