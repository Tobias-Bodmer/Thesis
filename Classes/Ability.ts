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
                }, this.duration);

                this.currentabilityCount--;
                if (this.currentabilityCount <= 0) {
                    this.cooldown.startCoolDown();
                }
            }
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
        protected activateAbility(): void {
            if (Networking.client.id == Networking.client.idHost) {
                EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, Entity.ID.SMALLTICK, this.owner.mtxLocal.translation.toVector2(), null, Game.avatar1, null);
            }
        }
        protected deactivateAbility(): void {

        }
    }

    export class circleShooot extends Ability {
        private bulletAmount: number;
        private bullets: Bullets.Bullet[] = [];
        protected activateAbility(): void {
            for (let i = 0; i < this.bulletAmount; i++) {
                this.bullets.push()
            }
        }
    }

    export class Cooldown {
        public hasCoolDown: boolean
        private coolDown: number
        private currentCooldown: number;
        constructor(_number: number) {
            this.coolDown = _number;
            this.currentCooldown = _number;

        }
        public startCoolDown() {
            this.hasCoolDown = true
            Game.coolDowns.push(this);
        }

        private endCoolDOwn() {
            Game.coolDowns = Game.coolDowns.filter(cd => cd != this);
            this.hasCoolDown = false;
        }

        public updateCoolDown() {
            if (this.currentCooldown > 0) {
                this.currentCooldown--;
            }
            else {
                this.currentCooldown = this.coolDown;
                this.endCoolDOwn();
            }
        }
    }
}

