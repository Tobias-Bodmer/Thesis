namespace Weapons {
    export enum AIM {
        NORMAL,
        HOMING
    }

    export enum WEAPONTYPE {
        RANGEDWEAPON,
        MELEEWEAPON,
        THORSHAMMERWEAPON
    }

    export abstract class Weapon {
        ownerNetId: number; get owner(): Entity.Entity { return Game.entities.find(elem => elem.netId == this.ownerNetId) };
        protected cooldown: Ability.Cooldown; get getCoolDown() { return this.cooldown };
        protected attackCount: number; get getAttackCount() { return this.attackCount };
        public currentAttackCount: number;
        aimType: AIM;
        bulletType: Bullets.BULLETTYPE = Bullets.BULLETTYPE.STANDARD;
        projectileAmount: number = 1;

        constructor(_cooldownTime: number, _attackCount: number, _bulletType: Bullets.BULLETTYPE, _projectileAmount: number, _ownerNetId: number, _aimType: AIM) {
            this.attackCount = _attackCount;
            this.currentAttackCount = _attackCount;
            this.bulletType = _bulletType;
            this.projectileAmount = _projectileAmount;
            this.ownerNetId = _ownerNetId;
            this.aimType = _aimType;

            this.cooldown = new Ability.Cooldown(_cooldownTime);
        }

        public abstract shoot(_direction: ƒ.Vector3, _sync: boolean, _bulletNetId?: number): void;

        public abstract getType(): WEAPONTYPE;

        protected inaccuracy(_direciton: ƒ.Vector3) {
            _direciton.x = _direciton.x + Math.random() * 10 / this.owner.attributes.accuracy - Math.random() * 10 / this.owner.attributes.accuracy;
            _direciton.y = _direciton.y + Math.random() * 10 / this.owner.attributes.accuracy - Math.random() * 10 / this.owner.attributes.accuracy;
        }

        protected fire(_magazine: Bullets.Bullet[]) {
            _magazine.forEach(bullet => {
                bullet.spawn();
            })
        }
    }

    export class RangedWeapon extends Weapon {
        public magazin: Bullets.Bullet[]; get getMagazin(): Bullets.Bullet[] { return this.magazin }; set setMagazin(_magazin: Bullets.Bullet[]) { this.magazin = _magazin };
        public ItemFunctions: Function[] = [];

        public shoot(_direction: ƒ.Vector3, _sync: boolean, _bulletNetId?: number): void {

            let _position: ƒ.Vector2 = this.owner.mtxLocal.translation.toVector2();
            if (_sync) {
                if (this.currentAttackCount <= 0 && !this.cooldown.hasCooldown) {
                    this.currentAttackCount = this.attackCount;
                }
                if (this.currentAttackCount > 0 && !this.cooldown.hasCooldown) {

                    if (this.owner.attributes.accuracy < 100) {
                        this.inaccuracy(_direction);
                    }
                    this.magazin = this.loadMagazine(_position, _direction, this.bulletType, _bulletNetId);
                    this.processItemEffects();

                    this.sendMagazin();

                    this.fire(this.magazin);
                    this.currentAttackCount--;
                    if (this.currentAttackCount <= 0 && !this.cooldown.hasCooldown) {
                        this.cooldown.setMaxCoolDown = this.cooldown.getMaxCoolDown * this.owner.attributes.coolDownReduction;
                        this.cooldown.startCooldown();
                    }
                }

            }
            else {
                this.processItemEffects();
                this.fire(this.magazin);
            }
        }

        protected sendMagazin() {
            let bulletType: Bullets.BULLETTYPE[] = [];
            let directions: Game.ƒ.Vector2[] = [];
            let netIds: number[] = [];
            let targets: ƒ.Vector3[] = [];
            let magazinpayload;
            if (this.aimType == AIM.NORMAL) {
                this.magazin.forEach(bul => { bulletType.push(bul.type); directions.push(bul.direction.toVector2()); netIds.push(bul.netId); });
                magazinpayload = <Interfaces.IMagazin>{ bulletTypes: bulletType, directions: directions, ownerNetId: this.ownerNetId, netIds: netIds };
            } else {
                this.magazin.forEach(bul => { bulletType.push(bul.type); directions.push(bul.direction.toVector2()); netIds.push(bul.netId); targets.push((<Bullets.HomingBullet>bul).target) });
                magazinpayload = <Interfaces.IMagazin>{ bulletTypes: bulletType, directions: directions, ownerNetId: this.ownerNetId, netIds: netIds, targets: targets };
            }
            Networking.sendMagazin(magazinpayload);
        }

        protected fire(_magazine: Bullets.Bullet[]): void {
            super.fire(_magazine);
            this.magazin = [];
        }
        public addFunction(_func: Function) {
            this.ItemFunctions.push(_func);
        }

        public deleteFunction(_func: Function) {
            this.ItemFunctions.splice(this.ItemFunctions.indexOf(_func), 1);
        }

        private processItemEffects() {
            this.ItemFunctions.forEach(func => {
                func();
            })
        }

        protected loadMagazine(_position: ƒ.Vector2, _direction: ƒ.Vector3, _bulletType: Bullets.BULLETTYPE, _netId?: number): Bullets.Bullet[] {
            let magazine: Bullets.Bullet[] = [];
            for (let i = 0; i < this.projectileAmount; i++) {
                switch (this.aimType) {
                    case AIM.NORMAL:
                        magazine.push(new Bullets.NormalBullet(this.bulletType, _position, _direction, this.ownerNetId, _netId))
                        break;
                    case AIM.HOMING:
                        magazine.push(new Bullets.HomingBullet(this.bulletType, _position, _direction, this.ownerNetId, null, _netId));
                        break;
                }
            }
            return magazine;
        }

        public getType(): WEAPONTYPE {
            return WEAPONTYPE.RANGEDWEAPON;
        }
    }


    export class MeleeWeapon extends Weapon {
        public shoot(_direction: ƒ.Vector3, _sync: boolean, _bulletNetId?: number): void {
            let newPos: Game.ƒ.Vector2 = this.owner.mtxLocal.translation.clone.toVector2();

            if (_direction.magnitude > 0) {
                _direction.normalize();
                _direction.scale(0.5);
            }

            newPos.add(_direction.toVector2());

            let swordCollider: Collider.Collider = new Collider.Collider(newPos, (<Player.Melee>this.owner).swordRadius / 2, this.ownerNetId);

            Game.enemies.forEach(enemy => {
                if (swordCollider.collides(enemy.collider)) {
                    enemy.getDamage(this.owner.attributes.attackPoints);
                }
            })

            if (Networking.client.id != Networking.client.idHost && this.owner == Game.avatar1) {
                Networking.spawnBullet(null, _direction, null, this.ownerNetId);
            }
        }

        public getType(): WEAPONTYPE {
            return WEAPONTYPE.MELEEWEAPON;
        }
    }

    export class ThorsHammer extends RangedWeapon {
        public weaponStorage: Weapon;

        constructor(_attackCount: number, _bulletType: Bullets.BULLETTYPE, _projectileAmount: number, _ownerNetId: number) {
            super(1, _attackCount, _bulletType, _projectileAmount, _ownerNetId, AIM.NORMAL);
            this.weaponStorage = (<Player.Player>this.owner).weapon;
            this.bulletType = Bullets.BULLETTYPE.THORSHAMMER;
        }

        public getType(): WEAPONTYPE {
            return WEAPONTYPE.THORSHAMMERWEAPON;
        }

        public shoot(_direction: ƒ.Vector3, _sync: boolean, _bulletNetId?: number) {
            if (this.owner.items.find(item => item.id == Items.ITEMID.THORSHAMMER) != null) {
                let _position: ƒ.Vector2 = this.owner.mtxLocal.translation.toVector2();
                if (_sync) {
                    if (this.currentAttackCount <= 0 && !this.cooldown.hasCooldown) {
                        this.currentAttackCount = this.attackCount;
                    }
                    if (this.currentAttackCount > 0 && !this.cooldown.hasCooldown) {
                        this.magazin = this.loadMagazine(_position, _direction, this.bulletType, _bulletNetId);

                        this.sendMagazin();

                        this.fire(this.magazin);
                        this.currentAttackCount--;
                        if (this.currentAttackCount <= 0 && !this.cooldown.hasCooldown) {
                            this.cooldown.setMaxCoolDown = this.cooldown.getMaxCoolDown * this.owner.attributes.coolDownReduction;
                            this.cooldown.startCooldown();
                        }
                    }
                }
                else {
                    this.fire(this.magazin);
                }
            }
        }

        protected fire(_magazine: Bullets.Bullet[]): void {
            super.fire(_magazine);
            let removeItem = this.owner.items.find(item => (<Items.InternalItem>item).id == Items.ITEMID.THORSHAMMER);

            if (removeItem != undefined) {
                this.owner.items.splice(this.owner.items.indexOf(removeItem), 1);
            }
        }
    }
}