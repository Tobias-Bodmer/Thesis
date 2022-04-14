namespace Weapons {
    export class Weapon {
        cooldownTime: number = 10;
        public currentCooldownTime: number = this.cooldownTime;
        attackCount: number = 1;
        public currentAttackCount: number = this.attackCount;
        bulletType: BULLETS;
        projectileAmount: number;

        constructor(_cooldownTime: number, _attackCount: number) {
            this.cooldownTime = _cooldownTime;
            this.attackCount = _attackCount;
        }

        public shoot(_position: ƒ.Vector2, _direciton: ƒ.Vector3, _netId?: number, _sync?: boolean) {
            if (this.currentAttackCount > 0) {
                let magazine: Bullets.Bullet[] = this.loadMagazine(_position, _direciton, this.bulletType, this.projectileAmount, _netId);
            }
        }

        loadMagazine(_position: ƒ.Vector2, _direction: ƒ.Vector3, _bulletType: BULLETS, amount: number, _netId?: number): Bullets.Bullet[] {
            let magazine: Bullets.Bullet[] = [];
            for (let i = 0; i < amount; i++) {
                switch (_bulletType) {
                    case BULLETS.NORMAL:
                        magazine.push(new Bullets.Bullet(_position, _direction, _netId))
                        break;
                }
            }
            return magazine;
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

    enum BULLETS {
        NORMAL,
        HIGHSPEED,
        HOMING
    }
}