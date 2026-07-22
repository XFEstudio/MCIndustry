
var 辅助型UAV = Vars.content.getByName(ContentType.unit, modName + "-辅助型UAV");
辅助型UAV.aiController = prov(() => new BuilderAI());
辅助型UAV.drawShields = false;
辅助型UAV.abilities.add( new RepairFieldAbility(20, 60, 80));
