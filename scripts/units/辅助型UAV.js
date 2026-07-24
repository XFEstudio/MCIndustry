
Events.on(ContentInitEvent, cons(() => {
    const 辅助型UAV = Vars.content.getByName(ContentType.unit, modName + "-辅助型UAV");
    if(辅助型UAV == null){
        Log.err("找不到辅助型UAV内容：" + modName + "-辅助型UAV");
        return;
    }

    辅助型UAV.aiController = prov(() => new BuilderAI());
    辅助型UAV.drawShields = false;
    辅助型UAV.abilities.add(new RepairFieldAbility(20, 60, 80));
}));
