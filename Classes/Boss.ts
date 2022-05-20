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
        IDLE, WALK, SUMMON, ATTACK, TELEPORT, SHOOT360
    }
    export class Summonor extends EnemyShoot implements Game.ƒAid.StateMachine<SUMMNORBEHAVIOUR> {
        damageTaken: number = 0;
        stateCurrent: SUMMNORBEHAVIOUR;
        stateNext: SUMMNORBEHAVIOUR;
        instructions: ƒAid.StateMachineInstructions<SUMMNORBEHAVIOUR>;

        attackPhaseCd: Ability.Cooldown = new Ability.Cooldown(580);
        defencePhaseCd: Ability.Cooldown = new Ability.Cooldown(720);
        shootingCount: number = 3;
        currentShootingCount: number = 0;
        teleportPosition: ƒ.Vector3 = new ƒ.Vector3();
        afterTeleportState: SUMMNORBEHAVIOUR;
        stateMachineInstructions: Game.ƒAid.StateMachineInstructions<SUMMNORBEHAVIOUR>;
        dashDirection: number = 100;


        private summon: Ability.SpawnSummoners = new Ability.SpawnSummoners(this.netId, 0, 1, 45);
        private dash: Ability.Dash = new Ability.Dash(this.netId, 45, 1, 6 * 60, 5);
        private shoot360: Ability.circleShoot = new Ability.circleShoot(this.netId, 0, 1, 60);
        private shoot360Cooldown: Ability.Cooldown = new Ability.Cooldown(580);
        private dashWeapon: Weapons.Weapon = new Weapons.RangedWeapon(12, 1, Bullets.BULLETTYPE.SUMMONER, 1, this.netId, Weapons.AIM.NORMAL);
        private flock: FlockingBehaviour = new FlockingBehaviour(
            this,
            4,
            4,
            1,
            1,
            1,
            1,
            1,
            10);
        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
            this.defencePhaseCd.onEndCoolDown = this.stopDefencePhase;

            this.stateMachineInstructions = new Game.ƒAid.StateMachineInstructions();
            this.stateMachineInstructions.transitDefault = () => { };
            this.stateMachineInstructions.actDefault = this.intro;
            this.stateMachineInstructions.setAction(SUMMNORBEHAVIOUR.ATTACK, this.attackingPhase);
            this.stateMachineInstructions.setAction(SUMMNORBEHAVIOUR.SUMMON, this.defencePhase);
            this.stateMachineInstructions.setAction(SUMMNORBEHAVIOUR.TELEPORT, this.doTeleport);
            this.stateMachineInstructions.setAction(SUMMNORBEHAVIOUR.SHOOT360, this.shooting360);


            this.instructions = this.stateMachineInstructions;

            this.dash.onDoAbility = this.shootOnDash;
            this.dash.onEndAbility = this.changeDashDirection;
            this.transit(SUMMNORBEHAVIOUR.ATTACK);
        }

        public transit(_next: SUMMNORBEHAVIOUR): void {
            console.info(SUMMNORBEHAVIOUR[this.stateCurrent]);
            this.instructions.transit(this.stateCurrent, _next, this);
        }
        public act(): void {
            this.instructions.act(this.stateCurrent, this);
        }

        public update(): void {
            if (Networking.client.id == Networking.client.idHost) {
                this.updateBuffs();
                this.shadow.updateShadowPos();
                this.setCollider();
                this.act();
                this.move(this.moveDirection);
                Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId);
            }
        }

        intro = () => {
            //TODO: Intro animation here and when it is done then fight...

            if (this.damageTaken >= 1) {
                this.transit(SUMMNORBEHAVIOUR.ATTACK);
            }
        }

        public getDamage(_value: number): void {
            super.getDamage(_value);
            if (this.attributes.hitable) {
                this.damageTaken += _value;
            }
        }

        attackingPhase = (): void => {
            this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            if (this.damageTaken >= (this.attributes.maxHealthPoints * 0.34)) {
                this.moveDirection = Game.ƒ.Vector3.ZERO();
                let tempPortPos = new Game.ƒ.Vector2(Game.currentRoom.mtxWorld.translation.x, Game.currentRoom.mtxWorld.translation.y - Game.currentRoom.roomSize / 3);
                this.teleport(SUMMNORBEHAVIOUR.SUMMON, tempPortPos);
                return;
            }
            if (!this.attackPhaseCd.hasCoolDown) {
                this.attackPhaseCd.setMaxCoolDown = Math.round(this.attackPhaseCd.getMaxCoolDown + Math.random() * 5 + Math.random() * -5);
                this.attackPhaseCd.startCoolDown();
            }
            if (this.attackPhaseCd.hasCoolDown) {
                let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
                this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();

                if (distance < 5) {
                    this.isAggressive = true;
                    this.flock.notToTargetWeight = 2;
                    this.flock.toTargetWeight = 1;
                } else if (distance > 8) {
                    this.flock.notToTargetWeight = 1;
                    this.flock.toTargetWeight = 2;
                }

                if (!this.dash.doesAbility) {
                    this.nextAttack();

                    this.flock.update();
                    this.moveDirection = this.flock.getMoveVector().toVector3();
                }
            }
        }

        private nextAttack() {
            let random: number = Math.round(Math.random() * 100);
            switch (true) {
                case random > 99:
                    if (!this.shoot360Cooldown.hasCoolDown) {
                        this.currentShootingCount = this.shootingCount;
                        this.teleport(SUMMNORBEHAVIOUR.SHOOT360, new Game.ƒ.Vector2(Game.currentRoom.mtxWorld.translation.x + 3, Game.currentRoom.mtxWorld.translation.y + 3));
                    }
                    break;
                case random > 50 && random < 70:
                    this.doDash();
                    break;
            }
        }

        private doDash() {
            if (this.dash.hasCooldown()) {
                return;
            }


            if (!this.dash.hasCooldown()) {

                if (Math.round(Math.random() * 100) >= 10) {
                    this.dash.doAbility();
                }
            }
        }

        private changeDashDirection = () => {
            this.dashDirection *= -1;
        }

        private shootOnDash = () => {
            let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation);
            this.moveDirection = Calculation.getRotatedVectorByAngle2D(distance, this.dashDirection);
            this.dashWeapon.shoot(Game.ƒ.Vector2.DIFFERENCE(this.target, this.mtxLocal.translation.toVector2()).toVector3(), true, null);
            this.dashWeapon.getCoolDown.setMaxCoolDown = Calculation.clampNumber(Math.random() * 24, 10, 24);
        }

        defencePhase = (): void => {
            if (!this.defencePhaseCd.hasCoolDown) {
                this.defencePhaseCd.setMaxCoolDown = Math.round(this.defencePhaseCd.getMaxCoolDown + Math.random() * 5 + Math.random() * -5);
                this.defencePhaseCd.startCoolDown();
                new Buff.AttributesBuff(Buff.BUFFID.IMMUNE, null, 1, 0).addToEntity(this);
            } else {
                if (this.mtxLocal.translation.equals(this.teleportPosition, 1)) {
                    this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);

                    this.moveDirection = ƒ.Vector3.ZERO();
                    this.summon.doAbility();
                }
            }
        }

        stopDefencePhase = () => {
            this.damageTaken = 0;
            new Buff.AttributesBuff(Buff.BUFFID.IMMUNE, null, 1, 0).removeBuff(this);
            this.currentShootingCount = this.shootingCount;
            this.teleport(SUMMNORBEHAVIOUR.SHOOT360, new Game.ƒ.Vector2(Game.currentRoom.mtxWorld.translation.x, Game.currentRoom.mtxWorld.translation.y));
        }

        /**
         * used to prepare Teleport
         * @param _nextState nextState after the Teleport is done
         * @param _teleportPosition teleportPosistion the Summoner is teleporting to
         */
        private teleport(_nextState: SUMMNORBEHAVIOUR, _teleportPosition: Game.ƒ.Vector2) {
            this.teleportPosition = _teleportPosition.clone.toVector3(this.mtxWorld.translation.z);
            this.afterTeleportState = _nextState;
            this.transit(SUMMNORBEHAVIOUR.TELEPORT);
        }

        private doTeleport = (): void => {
            if (!this.mtxLocal.translation.equals(this.teleportPosition)) {
                this.switchAnimation(Entity.ANIMATIONSTATES.TELEPORT);
                this.moveDirection = ƒ.Vector3.ZERO();
                if (this.getCurrentFrame >= 5) {
                    this.mtxLocal.translation = this.teleportPosition;
                    this.transit(this.afterTeleportState);
                }
            }
        }

        shooting360 = (): void => {
            if (this.currentShootingCount > 0) {

                new Buff.AttributesBuff(Buff.BUFFID.IMMUNE, null, 1, 0).addToEntity(this);

                if (!this.shoot360.hasCooldown()) {
                    this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);
                }

                if (this.getCurrentFrame == 10 && !this.shoot360.hasCooldown()) {
                    this.shoot360.bulletAmount = Math.round(8 + Math.random() * 8);
                    this.shoot360.doAbility();
                    this.currentShootingCount--;
                }

            }
            else if (this.getCurrentFrame >= 12) {
                this.shoot360Cooldown.startCoolDown();
                this.transit(SUMMNORBEHAVIOUR.ATTACK);
                new Buff.AttributesBuff(Buff.BUFFID.IMMUNE, null, 1, 0).removeBuff(this);
                this.currentShootingCount = this.shootingCount;
            }
        }

    }
}
