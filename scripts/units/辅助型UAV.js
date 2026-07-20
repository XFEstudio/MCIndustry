
var 辅助型UAV = extendContent(UnitType, '辅助型UAV', {});
辅助型UAV.defaultController = prov(() => extend(BuilderAI, {}));
辅助型UAV.drawShields = false;
辅助型UAV.abilities.add( new RepairFieldAbility(20, 60, 80));
辅助型UAV.constructor = prov(() => extend(UnitTypes.poly.constructor.get().class, {}));

