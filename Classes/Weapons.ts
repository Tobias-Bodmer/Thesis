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


        public cooldown(_faktor: number) {
            let specificCoolDownTime = this.cooldownTime * _faktor;
            if (this.currentAttackCount <= 0) {
                if (this.currentCooldownTime <= 0) {
                    this.currentCooldownTime = specificCoolDownTime;
                    this.currentAttackCount = this.attackCount;
                } else {
                    // console.log(this.currentCooldownTime);

                    this.currentCooldownTime--;
                }
            }

        }
    }
}