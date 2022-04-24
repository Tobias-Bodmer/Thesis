namespace Enemy {
    export class Summonor extends EnemyShoot {
        damageTaken: number = 0;
        summonChance: number = 5;
        summonCooldown: number = 120;
        summonCurrentCooldown: number = 0;

        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _attributes, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.translation.x / 2, this.netId);
        }

        update(): void {
            super.update();
        }

        cooldown(): void {
            if (this.summonCurrentCooldown > 0) {
                this.summonCurrentCooldown--;
            }
        }

        behaviour() {
            this.cooldown();

            if (this.damageTaken >= 25) {
                this.attributes.hitable = false;
                this.currentBehaviour = Entity.BEHAVIOUR.SUMMON;
            }
        }

        public getDamage(_value: number): void {
            super.getDamage(_value);
            this.damageTaken += _value;
        }

        moveBehaviour() {
            this.behaviour();

            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.IDLE:
                    // this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    // this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveAway(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
                    break;
                case Entity.BEHAVIOUR.SUMMON:
                    // this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);
                    this.defencePhase();
                    break;
                default:
                    // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                    break;
            }
        }

        defencePhase(): void {

            if (this.mtxLocal.translation.equals(new ƒ.Vector2(0, -13).toVector3(), 1)) {
                this.mtxLocal.translation = new ƒ.Vector2(0, -13).toVector3();
                if (this.summonCurrentCooldown <= 0) {
                    let nextState = Math.round(Math.random() * 100);

                    if (nextState <= this.summonChance) {
                        this.summon();
                        this.summonCurrentCooldown = this.summonCooldown;
                    }
                }
            } else {
                this.moveDirection = this.moveSimple(new ƒ.Vector2(0, -13)).toVector3();
            }
        }

        summon() {
            let target = Math.round(Math.random());
            if (target > 0) {
                EnemySpawner.spawnByID(EnemyClass.SUMMONORADDS, Entity.ID.SMALLTICK, this.mtxLocal.translation.toVector2(), null, Game.avatar1);
            } else {
                EnemySpawner.spawnByID(EnemyClass.SUMMONORADDS, Entity.ID.SMALLTICK, this.mtxLocal.translation.toVector2(), null, Game.avatar2);
            }
        }
    }
}