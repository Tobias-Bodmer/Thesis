namespace Enemy {
    export class BigBoom extends EnemyDumb {

        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
        }

        behaviour() {

        }

        moveBehaviour() {
            this.behaviour();

            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    break;
                case Entity.BEHAVIOUR.SUMMON:
                    this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);
                    break;
                default:
                    // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                    break;
            }
        }
    }


    export enum SUMMNORBEHAVIOUR {
        IDLE, WALK, SUMMON, ATTACK, TELEPORT, ABILITY
    }
    export class Summonor extends EnemyShoot implements Game.ƒAid.StateMachine<SUMMNORBEHAVIOUR> {
        damageTaken: number = 0;
        stateCurrent: SUMMNORBEHAVIOUR;
        stateNext: SUMMNORBEHAVIOUR;
        instructions: ƒAid.StateMachineInstructions<SUMMNORBEHAVIOUR>;

        attackPhaseCd: Ability.Cooldown = new Ability.Cooldown(580);
        defencePhaseCd: Ability.Cooldown = new Ability.Cooldown(720);
        beginShooting: boolean = false;
        shootingCount: number = 3;
        currentShootingCount: number = 0;
        summonPosition: ƒ.Vector3 = new ƒ.Vector3();
        stateMachineInstructions: Game.ƒAid.StateMachineInstructions<SUMMNORBEHAVIOUR>;
        lastState: SUMMNORBEHAVIOUR;

        private summon: Ability.SpawnSummoners = new Ability.SpawnSummoners(this.netId, 0, 1, 45);
        private dash: Ability.Dash = new Ability.Dash(this.netId, 45, 1, 13 * 60, 5);
        private shoot360: Ability.circleShoot = new Ability.circleShoot(this.netId, 0, 3, 5 * 60);
        private dashWeapon: Weapons.Weapon = new Weapons.RangedWeapon(12, 1, Bullets.BULLETTYPE.SUMMONER, 1, this.netId, Weapons.AIM.NORMAL);
        private flock: FlockingBehaviour = new FlockingBehaviour(
            this,
            4,
            4,
            1,
            1,
            1,
            0,
            1,
            10);
        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
            this.defencePhaseCd.onEndCoolDown = this.stopDefencePhase;

            this.stateMachineInstructions = new Game.ƒAid.StateMachineInstructions();
            this.stateMachineInstructions.transitDefault = () => { };
            this.stateMachineInstructions.actDefault = this.behaviour;
            // this.stateMachineInstructions.setTransition(Entity.BEHAVIOUR.FLEE, Entity.BEHAVIOUR.SUMMON, this.teleport);
            this.stateMachineInstructions.setAction(SUMMNORBEHAVIOUR.ATTACK, this.attackingPhase);
            this.stateMachineInstructions.setAction(SUMMNORBEHAVIOUR.SUMMON, this.defencePhase);
            this.stateMachineInstructions.setAction(SUMMNORBEHAVIOUR.TELEPORT, this.teleport);
            this.stateMachineInstructions.setAction(SUMMNORBEHAVIOUR.ABILITY, this.shooting360);


            this.instructions = this.stateMachineInstructions;

            this.transit(SUMMNORBEHAVIOUR.IDLE);
        }

        public transit(_next: SUMMNORBEHAVIOUR): void {
            console.log(SUMMNORBEHAVIOUR[this.stateCurrent]);
            this.lastState = this.stateCurrent;
            this.instructions.transit(this.stateCurrent, _next, this);
        }
        public act(): void {
            this.instructions.act(this.stateCurrent, this);
        }

        public update(): void {
            this.act();
        }

        behaviour = () => {
            this.target = Game.avatar1.mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            this.flock.update();
            this.moveDirection = this.flock.getMoveVector().toVector3();
            console.log(distance);
            if (distance < 5) {
                this.isAggressive = true;
                this.flock.notToTargetWeight = 2;
                this.flock.toTargetWeight = 0;
                //TODO: Intro animation here and when it is done then fight...
            }
            else {
                this.flock.notToTargetWeight = 0;
                this.flock.toTargetWeight = 2;

            }

            if (this.damageTaken >= 4) {
                // new Buff.DamageBuff(Buff.BUFFID.POISON, 120, 30, 3).addToEntity(this);
                this.transit(SUMMNORBEHAVIOUR.SUMMON);
                // this.currentBehaviour = Entity.BEHAVIOUR.SUMMON;
                // } else {
                //     this.stateMachine.transit(Entity.BEHAVIOUR.FLEE);
            }

            this.move(this.moveDirection);
        }

        public getDamage(_value: number): void {
            super.getDamage(_value);
            this.damageTaken += _value;
        }

        // moveBehaviour = () => {
        //     this.behaviour();

        //     // switch (this.currentBehaviour) {
        //     //     case Entity.BEHAVIOUR.IDLE:
        //     //         this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
        //     //         break;
        //     //     case Entity.BEHAVIOUR.FLEE:
        //     //         this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
        //     //         this.attackingPhase();
        //     //         break;
        //     //     case Entity.BEHAVIOUR.SUMMON:
        //     //         this.defencePhase();
        //     //         break;
        //     //     default:
        //     //         break;
        //     // }
        // }

        attackingPhase = (): void => {
            if (!this.attackPhaseCd.hasCoolDown) {
                this.attackPhaseCd.setMaxCoolDown = Math.round(this.attackPhaseCd.getMaxCoolDown + Math.random() * 5 + Math.random() * -5);
                this.attackPhaseCd.startCoolDown();
            }
            if (this.attackPhaseCd.hasCoolDown) {
                let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;

                if (distance > 10 || this.dash.doesAbility) {
                    this.moveDirection = Calculation.getRotatedVectorByAngle2D(this.moveDirection, 90);
                    if (Math.round(Math.random() * 100) >= 10) {
                        this.dash.doAbility();
                    }
                } else {
                    // this.moveDirection = this.moveAway(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
                }

                if (this.dash.doesAbility) {
                    this.dashWeapon.shoot(Game.ƒ.Vector2.DIFFERENCE(this.target, this.mtxLocal.translation.toVector2()).toVector3(), true, null);
                    this.dashWeapon.getCoolDown.setMaxCoolDown = Calculation.clampNumber(Math.random() * 30, 8, 30);
                }
            } else {
                this.mtxLocal.translation = (new ƒ.Vector2(0, 0)).toVector3();
                this.shooting360();
            }
        }

        defencePhase = (): void => {

            // if (this.teleport()) {

            if (!this.defencePhaseCd.hasCoolDown) {
                this.defencePhaseCd.setMaxCoolDown = Math.round(this.defencePhaseCd.getMaxCoolDown + Math.random() * 5 + Math.random() * -5);
                this.defencePhaseCd.startCoolDown();

                this.summonPosition.set(Game.currentRoom.mtxWorld.translation.x, Game.currentRoom.mtxWorld.translation.y - (Game.currentRoom.roomSize / 3), this.mtxWorld.translation.z);
            } else {
                if (this.mtxLocal.translation.equals(this.summonPosition, 1)) {
                    this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);
                    new Buff.AttributesBuff(Buff.BUFFID.IMMUNE, null, 1, 0).addToEntity(this);

                    console.log("spawning");

                    this.moveDirection = ƒ.Vector3.ZERO();
                    this.summon.doAbility();
                }
                // }
            }

        }

        stopDefencePhase = () => {
            this.summonPosition.set(Game.currentRoom.mtxWorld.translation.x, Game.currentRoom.mtxWorld.translation.y, this.mtxWorld.translation.z);
            this.transit(SUMMNORBEHAVIOUR.TELEPORT);
        }

        teleport = (): void => {
            if (!this.mtxLocal.translation.equals(this.summonPosition)) {
                this.switchAnimation(Entity.ANIMATIONSTATES.TELEPORT);
                console.log(this.getCurrentFrame);


                if (this.getCurrentFrame >= 5) {
                    this.mtxLocal.translation = this.summonPosition;
                    switch (this.lastState) {
                        case SUMMNORBEHAVIOUR.IDLE:
                        case SUMMNORBEHAVIOUR.ATTACK:
                            this.transit(SUMMNORBEHAVIOUR.SUMMON);
                            break;
                        case SUMMNORBEHAVIOUR.SUMMON:
                            this.transit(SUMMNORBEHAVIOUR.ABILITY);
                            break;
                        default:
                            break;
                    }
                }
            }
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
                    this.damageTaken = 0;
                }
            }
        }
    }
}