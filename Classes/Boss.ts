namespace Enemy {
    export class Summonor extends EnemyShoot {
        damageTaken: number = 0;

        beginAttackingPhase: boolean = false;
        attackingPhaseTime: number = 580;
        attackingPhaseCurrentTime: number = 0;

        beginDefencePhase: boolean = false;
        defencePhaseTime: number = 720;
        defencePhaseCurrentTime: number = 0;

        beginShooting: boolean = false;
        shootingCount: number = 3;
        currentShootingCount: number = 0;



        private summon: Ability.SpawnSummoners = new Ability.SpawnSummoners(this.netId, 0, 8, 300);
        private dash: Ability.Dash = new Ability.Dash(this.netId, 100000, 1, 13 * 60, 2);
        private shoot360: Ability.circleShoot = new Ability.circleShoot(this.netId, 0, 1, 5 * 60);
        private dashWeapon: Weapons.Weapon = new Weapons.Weapon(12, 1, Bullets.BULLETTYPE.SUMMONER, 1, this.netId, Weapons.AIM.NORMAL);

        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _attributes, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
        }


        behaviour() {
            let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;

            if (distance < 5) {
                this.gotRecognized = true;
                //TODO: Intro animation here and when it is done then fight...
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
            if (!this.beginAttackingPhase) {
                this.attackingPhaseCurrentTime = Math.round(this.attackingPhaseTime + Math.random() * 120);
                this.beginAttackingPhase = true;
            }
            if (this.attackingPhaseCurrentTime > 0) {
                let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;

                if (distance > 10 || this.dash.doesAbility) {
                    this.moveDirection = Calculation.getRotatedVectorByAngle2D(this.moveSimple(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3(), 90);
                    if (Math.round(Math.random() * 100) >= 10) {
                        this.dash.doAbility();
                    }
                } else {
                    this.moveDirection = this.moveAway(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
                }

                if (this.dash.doesAbility) {
                    this.dashWeapon.shoot(this.mtxLocal.translation.toVector2(), Game.ƒ.Vector2.DIFFERENCE(this.target, this.mtxLocal.translation.toVector2()).toVector3(), null, true);
                    this.dashWeapon.getCoolDown.setMaxCoolDown = Calculation.clampNumber(Math.random() * 30, 8, 30);
                }
                this.attackingPhaseCurrentTime--;
            } else {
                this.mtxLocal.translation = (new ƒ.Vector2(0, 0)).toVector3();
                this.shooting360();
            }
        }

        defencePhase(): void {
            this.beginAttackingPhase = false;
            //TODO: make if dependent from teleport animation frame
            // if (!this.mtxLocal.translation.equals(new ƒ.Vector2(0, -13).toVector3(), 1)) {
            this.mtxLocal.translation = (new ƒ.Vector2(0, -12)).toVector3();
            // } else {
            if (!this.beginDefencePhase) {
                this.defencePhaseCurrentTime = Math.round(this.defencePhaseTime + Math.random() * 120);
                this.beginDefencePhase = true;
            }
            if (this.defencePhaseCurrentTime > 0) {
                if (this.mtxLocal.translation.equals(new ƒ.Vector2(0, -13).toVector3(), 1)) {
                    this.mtxLocal.translation = new ƒ.Vector2(0, -13).toVector3();
                    this.summon.doAbility();
                }
                this.defencePhaseCurrentTime--;
            } else {
                this.mtxLocal.translation = (new ƒ.Vector2(0, 0)).toVector3();
                this.shooting360();
            }
            // }
        }

        shooting360() {
            if (!this.beginShooting) {
                this.currentShootingCount = Math.round(this.shootingCount + Math.random() * 2);
                this.beginShooting = true;
            } else {
                if (this.currentShootingCount > 0) {
                    this.shoot360.bulletAmount = Math.round(8 + Math.random() * 8);
                    this.shoot360.doAbility();
                    if (this.shoot360.doesAbility) {
                        this.currentShootingCount--;
                    }
                } else {
                    this.beginShooting = false;
                    if (this.currentBehaviour == Entity.BEHAVIOUR.SUMMON) {
                        this.damageTaken = 0;
                        this.beginDefencePhase = false;
                    } else {
                        this.beginAttackingPhase = false;
                    }
                }
            }
        }
    }
}