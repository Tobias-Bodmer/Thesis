namespace Enemy {
    export class Summonor extends EnemyShoot {
        damageTaken: number = 0;
        beginDefencePhase: boolean = false;
        defencePhaseTime: number = 720;
        defencePhaseCurrentTime: number = 0;
        summonChance: number = 5;
        summonCooldown: number = 120;
        summonCurrentCooldown: number = 0;
        private summon: Ability.SpawnSummoners = new Ability.SpawnSummoners(this.netId, 0, 5, 5 * 60)

        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _attributes, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
        }

        cooldown(): void {
            if (this.summonCurrentCooldown > 0) {
                this.summonCurrentCooldown--;
            }
        }

        behaviour() {
            this.cooldown();
            let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;

            if (distance < 5) {
                this.gotRecognized = true;
            }

            if (this.damageTaken >= 25) {
                this.attributes.hitable = false;
                this.currentBehaviour = Entity.BEHAVIOUR.SUMMON;
            } else {
                this.attributes.hitable = true;
                this.currentBehaviour = Entity.BEHAVIOUR.FLEE;
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
                    this.attackingPhase();

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

        attackingPhase(): void {
            this.moveDirection = this.moveAway(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
            this.shoot();
        }

        defencePhase(): void {
            //TODO: make if dependent from teleport animation frame
            if (!this.mtxLocal.translation.equals(new ƒ.Vector2(0, -13).toVector3(), 1)) {
                this.moveDirection = this.moveSimple(new ƒ.Vector2(0, -13)).toVector3();
            } else {
                if (!this.beginDefencePhase) {
                    this.defencePhaseCurrentTime = Math.round(this.defencePhaseTime + Math.random() * 120);
                    this.beginDefencePhase = true;
                }
                if (this.defencePhaseCurrentTime > 0) {
                    if (this.mtxLocal.translation.equals(new ƒ.Vector2(0, -13).toVector3(), 1)) {
                        this.mtxLocal.translation = new ƒ.Vector2(0, -13).toVector3();
                        // if (this.summonCurrentCooldown <= 0) {
                        // if (this.summon.doesAbility) {
                        let nextState = Math.round(Math.random() * 100);

                        if (nextState <= this.summonChance) {
                            // this.summon();
                            this.summon.doAbility();
                            this.summonCurrentCooldown = this.summonCooldown;
                        }
                        // }
                    }
                    this.defencePhaseCurrentTime--;
                } else {
                    this.damageTaken = 0;
                    this.beginDefencePhase = false;
                }
            }
        }

        // summon() {
        //     let target = Math.round(Math.random());
        //     if (target > 0) {
        //         EnemySpawner.spawnByID(ENEMYCLASS.SUMMONORADDS, Entity.ID.SMALLTICK, this.mtxLocal.translation.toVector2(), null, Game.avatar1);
        //     } else {
        //         EnemySpawner.spawnByID(ENEMYCLASS.SUMMONORADDS, Entity.ID.SMALLTICK, this.mtxLocal.translation.toVector2(), null, Game.avatar2);
        //     }
        // }
    }
}