namespace Weapons {
    export class Weapon {
        cooldownTime: number = 10;
        public currentCooldownTime: number = this.cooldownTime;
        attackCount: number = 1;
        public currentAttackCount: number = this.attackCount;

        constructor(_cooldownTime: number, _attackCount: number) {
            this.cooldownTime = _cooldownTime;
            this.attackCount = _attackCount;
        }
    }
}