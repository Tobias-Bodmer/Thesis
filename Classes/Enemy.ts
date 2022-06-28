namespace Enemy {

    export enum ENEMYCLASS {
        ENEMYDUMB,
        ENEMYCIRCLE,
        ENEMYDASH,
        ENEMYSMASH,
        ENEMYPATROL,
        ENEMYSHOOT,
        SUMMONER,
        BIGBOOM,
        SUMMONORADDS
    }

    export enum ENEMYBEHAVIOUR {
        IDLE, WALK, SUMMON, ATTACK, TELEPORT, SHOOT360, SHOOT, SMASH, STOMP, DASH
    }

    import ƒAid = FudgeAid;

    export abstract class Enemy extends Entity.Entity implements Interfaces.IKnockbackable, Game.ƒAid.StateMachine<ENEMYBEHAVIOUR> {
        currentBehaviour: Entity.BEHAVIOUR;
        target: ƒ.Vector2;
        moveDirection: Game.ƒ.Vector3 = Game.ƒ.Vector3.ZERO();
        protected abstract flocking: FlockingBehaviour;
        protected isAggressive: boolean;
        protected canThinkCoolDown: Ability.Cooldown;
        protected canThink: boolean;

        stateNext: ENEMYBEHAVIOUR;
        stateCurrent: ENEMYBEHAVIOUR;
        instructions: ƒAid.StateMachineInstructions<ENEMYBEHAVIOUR>;
        protected stateMachineInstructions: Game.ƒAid.StateMachineInstructions<ENEMYBEHAVIOUR>;



        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.isAggressive = false;
            let ref = Game.enemiesJSON.find(enemy => enemy.name == Entity.ID[_id].toLowerCase())
            console.log(ref);
            this.attributes = new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, ref.attributes.knockbackForce, ref.attributes.armor, ref.attributes.coolDownReduction, ref.attributes.accuracy);

            if (this.animationContainer != undefined) {
                this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animationContainer.animations["idle"]);
            }

            this.canThink = false;
            this.canThinkCoolDown = new Ability.Cooldown(60 + (Math.random() * 5));
            this.canThinkCoolDown.onEndCooldown = this.startThinkin;
            this.canThinkCoolDown.startCooldown();

            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            this.mtxLocal.scaling = new ƒ.Vector3(this.attributes.getScale, this.attributes.getScale, 1);
            this.offsetColliderX = ref.offsetColliderX;
            this.offsetColliderY = ref.offsetColliderY;
            this.colliderScaleFaktor = ref.colliderScaleFaktor;
            this.collider = new Collider.Collider(new ƒ.Vector2(this.mtxLocal.translation.x + (ref.offsetColliderX * this.mtxLocal.scaling.x), this.mtxLocal.translation.y + (ref.offsetColliderY * this.mtxLocal.scaling.y)), ((this.mtxLocal.scaling.x * this.idleScale) / 2) * this.colliderScaleFaktor, this.netId);
            this.stateMachineInstructions = new Game.ƒAid.StateMachineInstructions();
            this.shadowOffsetY = -0.8;
        }


        act(): void {
            this.instructions.act(this.stateCurrent, this);
        }

        transit(_next: ENEMYBEHAVIOUR): void {
            console.info(ENEMYBEHAVIOUR[this.stateCurrent] + " to " + ENEMYBEHAVIOUR[_next]);
            this.instructions.transit(this.stateCurrent, _next, this);
        }

        protected startThinkin = () => {
            this.canThink = true;
        }

        public update() {
            this.shadow.updateShadowPos();
            if (this.canThink) {
                if (Networking.client.id == Networking.client.idHost) {
                    super.update();
                    this.act();
                    this.move(this.moveDirection);
                    Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId);
                }
            }
        };

        public getDamage(_value: number): void {
            super.getDamage(_value);
            this.isAggressive = true;
        }

        public getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void {
            super.getKnockback(_knockbackForce, _position);
        }
        move(_direction: ƒ.Vector3) {
            if (this.isAggressive) {
                this.collide(_direction);
            } else {
                this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            }
        }


        public moveSimple(_target: ƒ.Vector2): ƒ.Vector2 {
            this.target = _target;
            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation);
            return direction.toVector2();
        }

        public moveAway(_target: ƒ.Vector2): ƒ.Vector2 {
            let moveSimple = this.moveSimple(_target);
            moveSimple.scale(-1);
            return moveSimple;
        }

        public die() {
            super.die();
            Game.currentRoom.enemyCountManager.onEnemyDeath();
        }

        public collide(_direction: ƒ.Vector3) {
            let knockback = this.currentKnockback.clone;
            if (knockback.magnitude > 0) {
            }
            if (_direction.magnitude > 0) {
                _direction.normalize();
                _direction.add(knockback);


                _direction.scale((Game.deltaTime * this.attributes.speed));
                knockback.scale((Game.deltaTime * this.attributes.speed));

                super.collide(_direction);

                // Collision with Avatars 
                // let avatar: Player.Player[] = (<Player.Player[]>Game.graph.getChildren().filter(element => (<Player.Player>element).tag == Tag.TAG.PLAYER));
                // let avatarColliders: Collider.Collider[] = [];
                // avatar.forEach((elem) => {
                //     avatarColliders.push((<Player.Player>elem).collider);
                // });

                // this.calculateCollision(avatarColliders, _direction);

                // Collision with Enemies
                // let enemies: Enemy.Enemy[] = Game.enemies;
                // let enemyColliders: Collider.Collider[] = [];
                // enemies.forEach((elem) => {
                //     enemyColliders.push((<Enemy.Enemy>elem).collider);
                // });

                // this.calculateCollision(enemyColliders, _direction);

                if (this.canMoveX && this.canMoveY) {
                    this.cmpTransform.mtxLocal.translate(_direction);
                } else if (this.canMoveX && !this.canMoveY) {
                    _direction = new ƒ.Vector3(_direction.x, 0, _direction.z)
                    this.cmpTransform.mtxLocal.translate(_direction);
                } else if (!this.canMoveX && this.canMoveY) {
                    _direction = new ƒ.Vector3(0, _direction.y, _direction.z)
                    this.cmpTransform.mtxLocal.translate(_direction);
                }
                _direction.subtract(knockback);
            }

            this.reduceKnockback();
        }
    }

    export class EnemyCircle extends Enemy {
        public flocking: FlockingBehaviour = new FlockingBehaviour(this, 3, 0.5, 0.1, 0.1, 4, 1, 0, 1);
        private circleRadius: number = 2;
        private circleDirection: number;
        private circleTolerance: number = 0.1;
        constructor(_id: Entity.ID, _pos: Game.ƒ.Vector2, _netId: number) {
            super(_id, _pos, _netId);
            this.isAggressive = true;
            this.stateMachineInstructions.actDefault = this.walkAI
            this.instructions = this.stateMachineInstructions;
            this.circleDirection = this.getCircleDirection();
            this.circleRadius = Calculation.clampNumber(this.circleRadius * Math.random() * (this.circleRadius - 2), 2, this.circleRadius);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_pos.x, _pos.y, 0.1);
            this.shadowOffsetY = 0;
        }

        private getCircleDirection(): number {
            let random = Math.random();
            if (random > 0.5) {
                return 90;
            }
            else {
                return -90;
            }
        }

        public update(): void {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2();
            this.flocking.update();
            super.update();
        }

        private walkAI = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            let distance = this.target.toVector3().getDistance(this.mtxLocal.translation);
            if (Math.abs(distance - this.circleRadius) <= this.circleTolerance) {
                this.walkCircle();
            }
            if (distance > this.circleRadius + this.circleTolerance) {
                this.getCloser();
            }
            if (distance < this.circleRadius - this.circleTolerance) {
                this.getFurtherAway();
            }
        }

        private getCloser = () => {
            this.flocking.toTargetWeight = 1;
            this.flocking.notToTargetWeight = 0;
            this.moveDirection = this.flocking.getMoveVector().toVector3();
        }

        private getFurtherAway = () => {
            this.flocking.notToTargetWeight = 1;
            this.flocking.toTargetWeight = 0;
            this.moveDirection = this.flocking.getMoveVector().toVector3();
        }

        private walkCircle = () => {
            this.flocking.toTargetWeight = 1;
            this.flocking.notToTargetWeight = 0;
            this.moveDirection = Calculation.getRotatedVectorByAngle2D(this.flocking.getMoveVector().toVector3(), this.circleDirection);
        }
    }


    export class EnemyDumb extends Enemy {
        protected flocking: FlockingBehaviour = new FlockingBehaviour(this, 3, 0.5, 0.1, 1, 3, 1, 0, 1);
        private aggressiveDistance: number = 3 * 3;
        private stamina: Ability.Cooldown = new Ability.Cooldown(180);
        private recover: Ability.Cooldown = new Ability.Cooldown(60);

        constructor(_id: Entity.ID, _pos: Game.ƒ.Vector2, _netId: number) {
            super(_id, _pos, _netId);
            this.isAggressive = false;
            this.stamina.onEndCooldown = this.OnStaminaCooldownEnd;
            this.recover.onEndCooldown = this.OnRecoverCooldownEnd;
            this.stateMachineInstructions.actDefault = this.idle;
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.WALK, this.walk);
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.IDLE, this.idle);
            this.stateMachineInstructions.setTransition(ENEMYBEHAVIOUR.IDLE, ENEMYBEHAVIOUR.WALK, this.startWalking);
            this.stateMachineInstructions.setTransition(ENEMYBEHAVIOUR.WALK, ENEMYBEHAVIOUR.IDLE, this.startIdling);
            this.instructions = this.stateMachineInstructions;
            this.stateCurrent = ENEMYBEHAVIOUR.IDLE;
        }

        public update(): void {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2();
            this.flocking.update();
            super.update();
            this.checkAggressiveState();
        }

        private checkAggressiveState() {
            if (this.isAggressive) {
                return;
            }
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitudeSquared;
            if (distance < this.aggressiveDistance) {
                this.isAggressive = true;
            }
        }

        private OnStaminaCooldownEnd = () => {
            this.transit(ENEMYBEHAVIOUR.IDLE);
        }

        private OnRecoverCooldownEnd = () => {
            this.transit(ENEMYBEHAVIOUR.WALK);
        }

        private startIdling = () => {
            this.recover.startCooldown();
        }

        public die(): void {
            super.die();
            this.stamina = null;
            this.recover = null;
        }

        private idle = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            this.moveDirection = Game.ƒ.Vector3.ZERO();
            if (this.isAggressive && !this.recover.hasCooldown) {
                this.transit(ENEMYBEHAVIOUR.WALK);
            }
        }

        private startWalking = () => {
            this.stamina.startCooldown();
        }

        private walk = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            this.moveDirection = this.flocking.getMoveVector().toVector3();
        }
    }

    export class EnemySmash extends Enemy {
        coolDown = new Ability.Cooldown(5);
        avatars: Player.Player[] = [];
        randomPlayer = Math.round(Math.random());
        currentBehaviour: Entity.BEHAVIOUR = Entity.BEHAVIOUR.IDLE;
        protected flocking: FlockingBehaviour = new FlockingBehaviour(this, 3, 0.5, 0.1, 1, 4, 1, 0, 0);
        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId: number) {
            super(_id, _position, _netId);
            this.spriteScaleFactor = 2;
            this.updateScale(this.attributes.getScale, false);
        }

        behaviour() {
            this.avatars = [Game.avatar1, Game.avatar2];
            this.target = (<Player.Player>this.avatars[this.randomPlayer]).mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;

            if (this.currentBehaviour == Entity.BEHAVIOUR.ATTACK && this.getCurrentFrame >= (<ƒAid.SpriteSheetAnimation>this.animationContainer.animations["attack"]).frames.length - 1) {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }
            if (distance < 4 && !this.coolDown.hasCooldown) {
                this.coolDown.startCooldown();
                this.currentBehaviour = Entity.BEHAVIOUR.ATTACK;
            }
            if (this.coolDown.hasCooldown && this.currentBehaviour != Entity.BEHAVIOUR.IDLE) {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }
            if (this.currentBehaviour != Entity.BEHAVIOUR.FOLLOW) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
        }



        moveBehaviour(): void {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveSimple(this.target).toVector3();
                    break;
                case Entity.BEHAVIOUR.ATTACK:
                    this.switchAnimation(Entity.ANIMATIONSTATES.ATTACK);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
            }
        }
    }

    export class EnemyDash extends Enemy {
        protected dash = new Ability.Dash(this.netId, 12, 1, 300, 3);
        protected lastMoveDireciton: Game.ƒ.Vector3;
        protected dashDistance: number = Math.pow(2, 2);
        protected dashCount: number = 1;

        protected flocking: FlockingBehaviour = new FlockingBehaviour(this, 3, 0.5, 0.1, 1, 4, 1, 0, 0);


        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _position, _netId);
            this.isAggressive = true;
            this.dash.onEndAbility = this.onEndDash;
            this.stateMachineInstructions.actDefault = this.walk;
            this.stateMachineInstructions.setTransition(ENEMYBEHAVIOUR.WALK, ENEMYBEHAVIOUR.DASH, this.startDash);
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.DASH, this.doDash);
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.WALK, this.walk);
            this.instructions = this.stateMachineInstructions;
            this.lastMoveDireciton = this.moveDirection;
            this.stateCurrent = ENEMYBEHAVIOUR.WALK;
            this.target = Game.ƒ.Vector3.ZERO().toVector2();
        }

        public update(): void {
            this.flocking.update();
            super.update();
        }

        private startDash = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            this.dash.doAbility();
        }

        private doDash = () => {
            this.moveDirection = this.lastMoveDireciton;
        }

        private onEndDash = () => {
            this.transit(ENEMYBEHAVIOUR.WALK);
        }

        protected walk = () => {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitudeSquared;
            this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            this.moveDirection = this.flocking.getMoveVector().toVector3();
            this.lastMoveDireciton = this.moveDirection;
            if (distance < this.dashDistance && !this.dash.hasCooldown()) {
                this.transit(ENEMYBEHAVIOUR.DASH);
            }
        }


    }

    export class EnemyPatrol extends Enemy {
        patrolPoints: ƒ.Vector2[] = [new ƒ.Vector2(0, 4), new ƒ.Vector2(5, 0)];
        waitTime: number = 1000;
        currenPointIndex: number = 0;
        protected flocking: FlockingBehaviour = new FlockingBehaviour(this, 3, 0.5, 0.1, 1, 4, 1, 0, 0);


        moveBehaviour(): void {
            this.patrol();
        }

        patrol() {
            if (this.mtxLocal.translation.getDistance(ƒ.Vector3.SUM(this.patrolPoints[this.currenPointIndex].toVector3(), Game.currentRoom.mtxLocal.translation)) > 0.3) {
                this.moveDirection = this.moveSimple((ƒ.Vector2.SUM(this.patrolPoints[this.currenPointIndex], Game.currentRoom.mtxLocal.translation.toVector2()))).toVector3();
            } else {
                setTimeout(() => {
                    if (this.currenPointIndex + 1 < this.patrolPoints.length) {
                        this.currenPointIndex++;
                    }
                    else {
                        this.currenPointIndex = 0;
                    }
                }, this.waitTime);
            }
        }

    }

    export class EnemyShoot extends Enemy {
        distanceToPlayer: number = 5 * 5;
        protected flocking: FlockingBehaviour = new FlockingBehaviour(this, 3, 0.5, 0.1, 1, 4, 0, 1, 1);
        private distance: number;

        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _position, _netId);
            this.weapon = new Weapons.RangedWeapon(60, 1, Bullets.BULLETTYPE.SLOW, 1, this.netId, Weapons.AIM.NORMAL);
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.WALK, this.flee);
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.IDLE, this.idle);
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.SHOOT, this.shoot);
            this.instructions = this.stateMachineInstructions;
            this.stateCurrent = ENEMYBEHAVIOUR.IDLE;
            this.spriteScaleFactor = 2;
            this.shadowOffsetY = 0;
            this.shadowOffsetX = -0.1;
            this.updateScale(this.attributes.getScale, false);
        }

        public update(): void {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2();
            this.distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitudeSquared;
            this.flocking.update();
            super.update();
        }

        private flee = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            this.moveDirection = this.flocking.getMoveVector().toVector3();

            // if (!this.weapon.getCoolDown.hasCoolDown) {
            //     this.transit(ENEMYBEHAVIOUR.SHOOT);
            // }
            if (this.distance >= this.distanceToPlayer) {
                this.transit(ENEMYBEHAVIOUR.IDLE);
            }
        }

        private shoot = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            let direction = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation);

            this.weapon.shoot(direction, true);
            this.transit(ENEMYBEHAVIOUR.IDLE);
        }

        private idle = () => {
            this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            this.moveDirection = Game.ƒ.Vector3.ZERO();
            if (this.distance < this.distanceToPlayer) {
                this.transit(ENEMYBEHAVIOUR.WALK);
            }

            if (!this.weapon.getCoolDown.hasCooldown) {
                this.transit(ENEMYBEHAVIOUR.SHOOT);
            }
        }
    }

    export class SummonorAdds extends EnemyDash {
        avatar: Player.Player;

        constructor(_id: Entity.ID, _position: ƒ.Vector2, _target: Player.Player, _netId?: number) {
            super(_id, _position, _netId);
            this.avatar = _target;
            this.stateMachineInstructions.actDefault = this.walk;
            this.stateMachineInstructions.setAction(ENEMYBEHAVIOUR.WALK, this.walk);
            this.flocking.avoidRadius = 2;
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.1);
            this.shadowOffsetY = 0;
        }


        protected walk = () => {
            this.target = this.avatar.mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitudeSquared;
            this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            this.moveDirection = this.flocking.getMoveVector().toVector3();
            this.lastMoveDireciton = this.moveDirection;
            if (distance < this.dashDistance && !this.dash.hasCooldown()) {
                this.transit(ENEMYBEHAVIOUR.DASH);
            }
        }
    }

    export function getEnemyClass(_enemy: Enemy.Enemy): ENEMYCLASS {
        switch (true) {
            case _enemy instanceof EnemyDumb:
                return ENEMYCLASS.ENEMYDUMB;
            case _enemy instanceof EnemyCircle:
                return ENEMYCLASS.ENEMYCIRCLE;
            case _enemy instanceof BigBoom:
                return ENEMYCLASS.BIGBOOM;
            case _enemy instanceof SummonorAdds:
                return ENEMYCLASS.SUMMONORADDS;
            case _enemy instanceof Summonor:
                return ENEMYCLASS.SUMMONER;
            case _enemy instanceof EnemyDash:
                return ENEMYCLASS.ENEMYDASH;
            case _enemy instanceof EnemyPatrol:
                return ENEMYCLASS.ENEMYPATROL;
            case _enemy instanceof EnemyShoot:
                return ENEMYCLASS.ENEMYSHOOT;
            case _enemy instanceof EnemySmash:
                return ENEMYCLASS.ENEMYSMASH;
            default:
                return null;
        }

    }
}