namespace Ability {
    export abstract class Ability {
        protected ownerNetId: number; get owner(): Entity.Entity { return Game.entities.find(elem => elem.netId == this.ownerNetId) };
        protected cooldown: Cooldown; get getCooldown(): Cooldown { return this.cooldown; };
        protected abilityCount: number;
        protected currentabilityCount: number;
        protected duration: Cooldown;
        public doesAbility: boolean = false;
        public onDoAbility: () => void;
        public onEndAbility: () => void;

        constructor(_ownerNetId: number, _duration: number, _abilityCount: number, _cooldownTime: number) {
            this.ownerNetId = _ownerNetId;
            this.abilityCount = _abilityCount;
            this.currentabilityCount = this.abilityCount;
            this.duration = new Cooldown(_duration);
            this.cooldown = new Cooldown(_cooldownTime);
        }

        public eventUpdate = (_event: Event): void => {
            this.updateAbility();
        }
        protected updateAbility() {
            if (this.doesAbility && !this.duration.hasCoolDown) {
                this.deactivateAbility();
                this.doesAbility = false;
            }
            if (this.onDoAbility != undefined) {
                this.onDoAbility();
            }
        }
        public doAbility(): void {
            //do stuff
            if (!this.cooldown.hasCoolDown && this.currentabilityCount <= 0) {
                this.currentabilityCount = this.abilityCount;
            }
            if (!this.cooldown.hasCoolDown && this.currentabilityCount > 0) {
                this.doesAbility = true;
                this.activateAbility()
                this.duration.startCoolDown();
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
            Game.ƒ.Loop.addEventListener(Game.ƒ.EVENT.LOOP_FRAME, this.eventUpdate);

        }
        protected deactivateAbility() {
            if (this.onEndAbility != undefined) {
                this.onEndAbility();
            }
            Game.ƒ.Loop.removeEventListener(Game.ƒ.EVENT.LOOP_FRAME, this.eventUpdate);
        }


    }

    export class Block extends Ability {

        protected activateAbility(): void {
            super.activateAbility();
            this.owner.attributes.hitable = false;
        }

        protected deactivateAbility(): void {
            super.deactivateAbility();
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
            super.activateAbility();
            this.owner.attributes.hitable = false;
            this.owner.attributes.speed *= this.speed;
        }
        protected deactivateAbility(): void {
            super.deactivateAbility();
            this.owner.attributes.hitable = true;
            this.owner.attributes.speed /= this.speed;
        }
    }

    export class SpawnSummoners extends Ability {
        private spawnRadius: number = 1;
        protected activateAbility(): void {
            super.activateAbility();
            if (Networking.client.id == Networking.client.idHost) {
                let position: Game.ƒ.Vector2 = new ƒ.Vector2(this.owner.mtxLocal.translation.x + Math.random() * this.spawnRadius, this.owner.mtxLocal.translation.y + 5)
                if (Math.round(Math.random()) > 0.5) {
                    EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, Entity.ID.BAT, position, Game.avatar1, null);
                } else {
                    EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, Entity.ID.BAT, position, Game.avatar2, null);
                }
            }
        }
    }

    export class circleShoot extends Ability {
        public bulletAmount: number;
        private bullets: Bullets.Bullet[] = [];

        protected activateAbility(): void {
            super.activateAbility();
            this.bullets = [];
            for (let i = 0; i < this.bulletAmount; i++) {
                this.bullets.push(new Bullets.NormalBullet(Bullets.BULLETTYPE.SUMMONER, this.owner.mtxLocal.translation.toVector2(), Game.ƒ.Vector3.ZERO(), this.ownerNetId));
                this.bullets[i].mtxLocal.rotateZ((360 / this.bulletAmount * i));
            }
            for (let i = 0; i < this.bulletAmount; i++) {
                Game.graph.addChild(this.bullets[i]);
                Networking.spawnBullet(this.bullets[i].direction, this.bullets[i].netId, this.ownerNetId);
            }
        }
    }

    export class Stomp extends Ability {
        //TODO: DoStomp
    }

    export class Smash extends Ability {
        //TODO: DoSmash
    }

    export class Cooldown {
        public hasCoolDown: boolean
        private coolDown: number; get getMaxCoolDown(): number { return this.coolDown }; set setMaxCoolDown(_param: number) { this.coolDown = _param; }
        private currentCooldown: number; get getCurrentCooldown(): number { return this.currentCooldown };
        public onEndCoolDown: () => void;
        constructor(_number: number) {
            this.coolDown = _number;
            this.currentCooldown = _number;
            this.hasCoolDown = false;
        }

        public startCoolDown() {
            this.hasCoolDown = true
            Game.ƒ.Loop.addEventListener(Game.ƒ.EVENT.LOOP_FRAME, this.eventUpdate);

        }

        private endCoolDown() {
            if (this.onEndCoolDown != undefined) {
                this.onEndCoolDown();
            }
            this.hasCoolDown = false;
            Game.ƒ.Loop.removeEventListener(Game.ƒ.EVENT.LOOP_FRAME, this.eventUpdate);

        }

        public eventUpdate = (_event: Event): void => {
            this.updateCoolDown();
        }

        public updateCoolDown(): void {
            if (this.hasCoolDown && this.currentCooldown > 0) {
                this.currentCooldown--;
            }
            if (this.currentCooldown <= 0 && this.hasCoolDown) {
                this.endCoolDown();
                this.currentCooldown = this.coolDown;
            }
        }
    }
}

