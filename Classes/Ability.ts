namespace Ability {
    export abstract class Ability {
        protected ownerNetId: number; get owner(): Entity.Entity { return Game.entities.find(elem => elem.netId == this.ownerNetId) };
        protected cooldown: Cooldown;
        protected abilityCount: number;
        protected currentabilityCount: number;
        protected duration: number;
        public doesAbility: boolean = false;

        constructor(_ownerNetId: number, _duration: number, _abilityCount: number, _cooldownTime: number) {
            this.ownerNetId = _ownerNetId;
            this.duration = _duration;
            this.abilityCount = _abilityCount;
            this.currentabilityCount = this.abilityCount;

            this.cooldown = new Cooldown(_cooldownTime);
        }

        public doAbility(): void {
            //do stuff
            if (!this.cooldown.hasCoolDown && this.currentabilityCount <= 0) {
                this.currentabilityCount = this.abilityCount;
            }
            if (!this.cooldown.hasCoolDown && this.currentabilityCount > 0) {
                this.doesAbility = true;
                this.activateAbility()
                setTimeout(() => {
                    this.deactivateAbility();
                    this.doesAbility = false;
                }, this.duration * Game.deltaTime);

                this.currentabilityCount--;
                if (this.currentabilityCount <= 0) {
                    this.cooldown.startCoolDown();
                }
            }
        }

        public hasCooldown(): boolean {
            return this.cooldown.hasCoolDown;
        }

        protected activateAbility() {

        }
        protected deactivateAbility() {

        }


    }

    export class Block extends Ability {

        protected activateAbility(): void {
            this.owner.attributes.hitable = false;
        }

        protected deactivateAbility(): void {
            this.owner.attributes.hitable = true;
        }
    }

    export class Dash extends Ability {
        speed: number;
        constructor(_ownerNetId: number, _duration: number, _abilityCount: number, _cooldownTime: number, _speed: number) {
            super(_ownerNetId, _duration, _abilityCount, _cooldownTime);
            this.speed = _speed;
        }
        protected activateAbility(): void {
            this.owner.attributes.hitable = false;
            this.owner.attributes.speed *= 5;
        }
        protected deactivateAbility(): void {
            this.owner.attributes.hitable = true;
            this.owner.attributes.speed /= 5;
        }
    }

    export class SpawnSummoners extends Ability {
        private spawnRadius: number = 1;
        protected activateAbility(): void {
            if (Networking.client.id == Networking.client.idHost) {
                let position: Game.ƒ.Vector2 = new ƒ.Vector2(this.owner.mtxLocal.translation.x + Math.random() * this.spawnRadius, this.owner.mtxLocal.translation.y +2)
                if (Math.round(Math.random()) > 0.5) {
                    EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, Entity.ID.SMALLTICK, position, null, Game.avatar1, null);
                } else {
                    EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, Entity.ID.SMALLTICK, position, null, Game.avatar2, null);
                }
            }
        }
        protected deactivateAbility(): void {

        }
    }

    export class circleShoot extends Ability {
        public bulletAmount: number;
        private bullets: Bullets.Bullet[] = [];

        protected activateAbility(): void {
            this.bullets = [];
            for (let i = 0; i < this.bulletAmount; i++) {
                this.bullets.push(new Bullets.Bullet(Bullets.BULLETTYPE.STANDARD, this.owner.mtxLocal.translation.toVector2(), Game.ƒ.Vector3.ZERO(), this.ownerNetId));
                this.bullets[i].mtxLocal.rotateZ((360 / this.bulletAmount * i));
            }
            for (let i = 0; i < this.bulletAmount; i++) {
                Game.graph.addChild(this.bullets[i]);
                Networking.spawnBullet(Weapons.AIM.NORMAL, this.bullets[i].direction, this.bullets[i].netId, this.ownerNetId);
            }
        }
    }

    export class Cooldown {
        public hasCoolDown: boolean
        private coolDown: number; get getMaxCoolDown(): number { return this.coolDown }; set setMaxCoolDown(_param: number) { this.coolDown = _param }
        private currentCooldown: number;
        constructor(_number: number) {
            this.coolDown = _number;
            this.currentCooldown = _number;
            this.hasCoolDown = false;
            Game.ƒ.Loop.addEventListener(Game.ƒ.EVENT.LOOP_FRAME, this.eventUpdate);
        }

        public startCoolDown() {
            this.hasCoolDown = true
        }

        private endCoolDOwn() {
            this.hasCoolDown = false;
        }

        public eventUpdate = (_event: Event): void => {
            this.updateCoolDown();
        }

        public updateCoolDown(): void {
            if (this.hasCoolDown && this.currentCooldown > 0) {
                this.currentCooldown--;
            }
            if (this.currentCooldown <= 0 && this.hasCoolDown) {
                this.endCoolDOwn();
                this.currentCooldown = this.coolDown;
            }
        }
    }
}

