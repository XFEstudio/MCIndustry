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
    if(build.items.total() >= magneticConveyor.itemCapacity){
        return;
    }

    let room = magneticConveyor.itemCapacity - build.items.total();
    for(let i = 0; i < build.proximity.size && room > 0; i++){
        room -= pullFrom(magneticConveyor, build, build.proximity.get(i), room);
    }
}

function direction4(value){
    const result = value % 4;
    return result < 0 ? result + 4 : result;
}

function sideNeighbors(build){
    return [
        build.nearby(direction4(build.rotation + 1)),
        build.nearby(direction4(build.rotation + 3))
    ];
}

function nearbyInDirection(build, dir){
    const offset = Geometry.d4[dir];
    return Vars.world.build(
        build.tile.x + offset.x,
        build.tile.y + offset.y
    );
}

function isRenderConnection(magneticConveyor, build, near){
    if(near == null || near.team != build.team){
        return false;
    }

    // 只有其中一端确实朝向另一端时才绘制接口。这样 T 形分支会打开，
    // 但只是平行贴放、并未形成物品通路的两条传送带仍会各自保留封边。
    if(near.block == magneticConveyor){
        return near.front() == build || near.back() == build ||
            build.front() == near || build.back() == near;
    }

    // 正前方和正后方由本传送带自身的方向决定。
    if(build.front() == near || build.back() == near){
        return near.block.acceptsItems || near.block.outputsItems();
    }

    // 两侧只为真正朝向本传送带的输出端，或能够从侧面接货的建筑打开边框。
    // 有方向的物流方块必须以正确的一端相接，避免仅仅贴在旁边也出现缺口。
    if(near.block.rotate){
        return near.front() == build || near.back() == build;
    }

    return near.block.acceptsItems || near.block.outputsItems();
}

function canOutputToSide(magneticConveyor, build, target, item){
    if(target == null || target.team != build.team || item == null){
        return false;
    }

    // 磁铜传送带分支必须背对当前传送带，即真正从主线向侧面延伸。
    if(target.block == magneticConveyor){
        return target.back() == build && target.link == -1 && target.items.empty();
    }

    // 普通有方向的物流方块也必须背对主线，防止把物品倒灌进输入支线。
    if(target.block.rotate && target.back() != build){
        return false;
    }

    return target.acceptStack(item, build.items.get(item), build) > 0;
}

function chooseSideOutput(magneticConveyor, build){
    if(build.link == -1 || !build.enabled || build.state == 2 || build.items.empty()){
        return null;
    }

    const eff = build.enabled ? build.efficiency + magneticConveyor.baseEfficiency : 1;
    const nextCooldown = Math.max(
        0,
        build.cooldown - magneticConveyor.speed * eff * build.delta()
    );
    if(nextCooldown > 0){
        return null;
    }

    const item = build.lastItem != null && build.items.has(build.lastItem)
        ? build.lastItem
        : build.items.first();

    // 装载端仍然等到一整组再发送；中间节点可以转发侧面刚送来的整组。
    if(build.state == 1 && build.items.total() < magneticConveyor.itemCapacity){
        return null;
    }

    const sides = sideNeighbors(build).filter(target =>
        canOutputToSide(magneticConveyor, build, target, item)
    );
    if(sides.length == 0){
        return null;
    }

    // 正前方算一路，与有效的左右支路轮流分配整组物品。
    const route = build.cdump % (sides.length + 1);
    build.cdump++;
    return route == 0 ? null : sides[route - 1];
}

function moveToSide(magneticConveyor, build, target){
    const item = build.lastItem != null && build.items.has(build.lastItem)
        ? build.lastItem
        : build.items.first();
    if(item == null){
        return false;
    }

    if(target.block == magneticConveyor){
        if(target.link != -1 || !target.items.empty()){
            return false;
        }

        // 与原版 StackConveyor 的正向交接一致：整组和动画来源一起交给支路。
        target.items.add(build.items);
        target.lastItem = item;
        target.link = build.tile.pos();
        target.cooldown = 1;

        build.items.clear();
        build.lastItem = null;
        build.link = -1;
        build.cooldown = magneticConveyor.recharge;
        return true;
    }

    const accepted = Math.min(
        build.items.get(item),
        target.acceptStack(item, build.items.get(item), build)
    );
    if(accepted <= 0){
        return false;
    }

    build.items.remove(item, accepted);
    target.handleStack(item, accepted, build);
    build.cooldown = magneticConveyor.recharge;

    if(!build.items.has(item)){
        build.lastItem = null;
        build.link = -1;
    }
    return true;
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

    const magneticSideRegion = Core.atlas.find(
        magneticConveyor.name + "-side"
    );
    const magneticBorderRegion = Core.atlas.find(
        magneticConveyor.name + "-border"
    );
    const magneticCornerRegion = Core.atlas.find(
        magneticConveyor.name + "-corner"
    );
    // border 贴图宽 5 像素，即 1.25 世界单位；将中心平移 3.375 单位后，
    // 它的外沿恰好落在 8×8 方块的边界上。
    const magneticBorderOffset = Vars.tilesize / 2 - 0.625;

    magneticConveyor.buildType = prov(() => extend(
        StackConveyor.StackConveyorBuild,
        magneticConveyor,
        {
            // 原版只允许 stateLoad 装载端收货。这里改为普通传送带式规则：
            // 后方和左右两侧均可输入，只有正前方禁止反向输入。
            acceptItem(source, item){
                if(this == source){
                    return this.items.total() < magneticConveyor.itemCapacity &&
                        (!this.items.any() || this.items.has(item));
                }
                if(source == this.front() || this.cooldown > magneticConveyor.recharge - 1){
                    return false;
                }
                return this.items.total() < magneticConveyor.itemCapacity &&
                    (!this.items.any() || this.items.has(item));
            },

            acceptStack(item, amount, source){
                if(source == this.front() || (this.items.any() && !this.items.has(item))){
                    return 0;
                }
                return Math.min(
                    amount,
                    magneticConveyor.itemCapacity - this.items.total()
                );
            },

            updateTile(){
                const side = chooseSideOutput(magneticConveyor, this);
                if(side != null){
                    // 暂时阻止父类在同一 tick 把这一组送往正前方；父类仍负责
                    // 更新冷却、供电状态和其他内部字段。
                    this.cooldown = magneticConveyor.recharge;
                    this.super$updateTile();
                    this.cooldown = 0;

                    if(moveToSide(magneticConveyor, this, side)){
                        fillLoadingDock(magneticConveyor, this);
                        return;
                    }
                }

                this.super$updateTile();
                fillLoadingDock(magneticConveyor, this);
            },

            drawCached(){
                // 先按世界方向收集四条边的连接状态。使用 var 是为了避开 v159
                // Rhino 在 Java 扩展方法中复用循环块 const 值的问题。
                var connections = [false, false, false, false];
                var connectionCount = 0;
                for(var dir = 0; dir < 4; dir++){
                    var near = nearbyInDirection(this, dir);
                    connections[dir] = isRenderConnection(
                        magneticConveyor,
                        this,
                        near
                    );
                    if(connections[dir]){
                        connectionCount++;
                    }
                }

                // corner 贴图的标准方向连接东(0)+南(3)。恰好两条相邻边连接时
                // 整格替换为专用弯道中心，避免直线箭头和半格 side 贴图重叠。
                var cornerRotation = -1;
                if(connectionCount == 2){
                    if(connections[0] && connections[3]){
                        cornerRotation = 0;
                    }else if(connections[0] && connections[1]){
                        cornerRotation = 90;
                    }else if(connections[2] && connections[1]){
                        cornerRotation = 180;
                    }else if(connections[2] && connections[3]){
                        cornerRotation = 270;
                    }
                }

                Draw.rect(
                    cornerRotation >= 0
                        ? magneticCornerRegion
                        : magneticConveyor.regions[this.state],
                    this.x,
                    this.y,
                    cornerRotation >= 0 ? cornerRotation : this.rotdeg()
                );

                for(var dir = 0; dir < 4; dir++){
                    var connected = connections[dir];

                    if(!connected){
                        var offset = Geometry.d4[dir];
                        Draw.rect(
                            magneticBorderRegion,
                            this.x + offset.x * magneticBorderOffset,
                            this.y + offset.y * magneticBorderOffset,
                            dir * 90
                        );
                    }else if(
                        cornerRotation < 0 &&
                        dir != this.rotation &&
                        dir != direction4(this.rotation + 2)
                    ){
                        // 侧向连接使用专用接口贴图填平接缝；
                        // 前后连接由相邻底图自然衔接。
                        Draw.rect(
                            magneticSideRegion,
                            this.x,
                            this.y,
                            dir * 90
                        );
                    }
                }
            },

            onProximityUpdate(){
                this.super$onProximityUpdate();
                if(Vars.headless){
                    return;
                }

                // 原版 blends() 不认识本模组允许的双向侧接规则，因此在父类完成
                // 状态计算后重建 blendprox，并再次缓存最终连接贴图。
                var mask = 0;
                for(var i = 0; i < 4; i++){
                    var dir = direction4(this.rotation - i);
                    if(isRenderConnection(
                        magneticConveyor,
                        this,
                        nearbyInDirection(this, dir)
                    )){
                        mask |= 1 << i;
                    }
                }

                this.blendprox = mask;
                this.recache();
            }
        }
    ));
}));
