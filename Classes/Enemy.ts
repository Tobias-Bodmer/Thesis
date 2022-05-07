namespace Enemy {

    export enum ENEMYCLASS {
        ENEMYDUMB,
        ENEMYDASH,
        ENEMYSMASH,
        ENEMYPATROL,
        ENEMYSHOOT,
        SUMMONOR,
        SUMMONORADDS
    }

    import ƒAid = FudgeAid;

    export class Enemy extends Entity.Entity implements Interfaces.IKnockbackable {
        currentBehaviour: Entity.BEHAVIOUR;
        target: ƒ.Vector2;
        moveDirection: Game.ƒ.Vector3 = Game.ƒ.Vector3.ZERO();
        flocking: FlockingBehaviour;


        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _netId);
            this.tag = Tag.TAG.ENEMY;

            let ref = Game.enemiesJSON.find(enemy => enemy.name == Entity.ID[_id].toLowerCase())
            console.log(ref);
            this.attributes = new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, ref.attributes.knockbackForce, ref.attributes.armor, ref.attributes.coolDownReduction);

            this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animationContainer.animations["idle"]);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.1);
            this.mtxLocal.scaling = new ƒ.Vector3(this.attributes.scale, this.attributes.scale, this.attributes.scale);
            this.offsetColliderX = ref.offsetColliderX;
            this.offsetColliderY = ref.offsetColliderY;
            this.colliderScaleFaktor = ref.colliderScaleFaktor;
            this.collider = new Collider.Collider(new ƒ.Vector2(this.mtxLocal.translation.x + (ref.offsetColliderX * this.mtxLocal.scaling.x), this.mtxLocal.translation.y + (ref.offsetColliderY * this.mtxLocal.scaling.y)), ((this.mtxLocal.scaling.x * this.idleScale) / 2) * this.colliderScaleFaktor, this.netId);
        }

        public update() {
            if (Networking.client.id == Networking.client.idHost) {
                super.update();
                this.moveBehaviour();
                this.move(this.moveDirection);
                Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId);
            }
        };

        public doKnockback(_body: Entity.Entity): void {
            // (<Player.Player>_body).getKnockback(this.attributes.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }

        public getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void {
            super.getKnockback(_knockbackForce, _position);
        }
        move(_direction: ƒ.Vector3) {
            // this.moveDirection.add(_direction);
            this.collide(_direction);
            // this.moveDirection.subtract(_direction);
        }

        moveBehaviour() {

        }
        public moveSimple(_target: ƒ.Vector2): ƒ.Vector2 {
            this.target = _target;
            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation);
            return direction.toVector2();
        }

        moveAway(_target: ƒ.Vector2): ƒ.Vector2 {
            let moveSimple = this.moveSimple(_target);
            moveSimple.x *= -1;
            moveSimple.y *= -1;
            return moveSimple;
        }

        die() {
            Game.graph.removeChild(this);
        }

        collide(_direction: ƒ.Vector3) {
            let knockback = this.currentKnockback.clone;
            if (knockback.magnitude > 0) {
                // console.log("direction: " + knockback.magnitude);
            }
            if (_direction.magnitude > 0) {
                _direction.normalize();
                _direction.add(knockback);


                _direction.scale((Game.deltaTime * this.attributes.speed));
                knockback.scale((Game.deltaTime * this.attributes.speed));


                super.collide(_direction);

                let avatar: Player.Player[] = (<Player.Player[]>Game.graph.getChildren().filter(element => (<Player.Player>element).tag == Tag.TAG.PLAYER));
                let avatarColliders: Collider.Collider[] = [];
                avatar.forEach((elem) => {
                    avatarColliders.push((<Player.Player>elem).collider);
                });

                this.calculateCollision(avatarColliders, _direction);

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
                if (knockback.magnitude > 0) {
                    // console.log("knockback: " + knockback.magnitude);
                    // console.log("direction: " + _direction.magnitude);
                }
            }

            this.reduceKnockback();
        }
    }


    export class EnemyDumb extends Enemy {


        behaviour() {
            let target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
            let distance = ƒ.Vector3.DIFFERENCE(target, this.cmpTransform.mtxLocal.translation).magnitude;
            //TODO: set to 3 after testing
            if (distance > 2) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW
            }
            else {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }

        }

        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveSimple(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
                    break;
                // default:
                //     // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                //     // break;
            }
        }

    }

    export class EnemySmash extends Enemy {
        coolDown = new Ability.Cooldown(5);
        avatars: Player.Player[] = [];
        randomPlayer = Math.round(Math.random());
        currentBehaviour: Entity.BEHAVIOUR = Entity.BEHAVIOUR.IDLE;


        behaviour() {
            this.avatars = [Game.avatar1, Game.avatar2];
            this.target = (<Player.Player>this.avatars[this.randomPlayer]).mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;

            if (this.currentBehaviour == Entity.BEHAVIOUR.ATTACK && this.getCurrentFrame >= (<ƒAid.SpriteSheetAnimation>this.animationContainer.animations["attack"]).frames.length - 1) {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }
            if (distance < 4 && !this.coolDown.hasCoolDown) {
                this.coolDown.startCoolDown();
                this.currentBehaviour = Entity.BEHAVIOUR.ATTACK;
            }
            if (this.coolDown.hasCoolDown && this.currentBehaviour != Entity.BEHAVIOUR.IDLE) {
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
        protected dash = new Ability.Dash(this.netId, 12, 1, 5 * 60, 3);
        lastMoveDireciton: Game.ƒ.Vector3;
        dashCount: number = 1;
        avatars: Player.Player[] = [];
        randomPlayer = Math.round(Math.random());

        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _position, _netId);
            this.flocking = new FlockingBehaviour(this, 3, 0.8, 1.5, 1, 1, 0.1, 0);

        }



        behaviour() {
            this.avatars = [Game.avatar1, Game.avatar2]
            this.target = (<Player.Player>this.avatars[this.randomPlayer]).mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitudeSquared;
            this.flocking.update();

            if (!this.dash.hasCooldown()) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
            if (Math.random() * 100 < 0.1) {
                this.dash.doAbility();

            }


            if (this.moveDirection.magnitudeSquared > 0.0005) {
                this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            }
            else {
                this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            }

        }

        moveBehaviour(): void {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    if (!this.dash.doesAbility) {
                        this.moveDirection = this.flocking.getMoveVector().toVector3();
                        this.lastMoveDireciton = this.moveDirection;
                    }
                    break;
                case Entity.BEHAVIOUR.IDLE:
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveAway(this.target).toVector3();
                    break;
            }
        }
    }

    export class EnemyPatrol extends Enemy {
        patrolPoints: ƒ.Vector2[] = [new ƒ.Vector2(0, 4), new ƒ.Vector2(5, 0)];
        waitTime: number = 1000;
        currenPointIndex: number = 0;

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
        viewRadius: number = 3;
        gotRecognized: boolean = false;

        constructor(_id: Entity.ID, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _position, _netId);

            this.weapon = new Weapons.Weapon(60, 1, Bullets.BULLETTYPE.STANDARD, 2, this.netId, Weapons.AIM.NORMAL);
        }

        moveBehaviour(): void {
            this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;

            if (distance < 5) {
                this.moveDirection = this.moveAway(this.target).toVector3();
                this.gotRecognized = true;
            } else {
                this.moveDirection = ƒ.Vector3.ZERO();
            }

            this.shoot();
        }

        public getDamage(_value: number): void {
            super.getDamage(_value);
            this.gotRecognized = true;
        }

        public shoot(_netId?: number) {
            this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
            let _direction = ƒ.Vector3.DIFFERENCE(this.target.toVector3(0), this.mtxLocal.translation);

            if (_direction.magnitude < 3 || this.gotRecognized) {
                this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, true);
            }


            // if (this.weapon.currentAttackCount > 0 && _direction.magnitude < this.viewRadius) {
            //     _direction.normalize();
            //     // let bullet: Bullets.Bullet = new Bullets.HomingBullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction, Calculation.getCloserAvatarPosition(this.mtxLocal.translation), _netId);
            //     bullet.owner = this.tag;
            //     bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
            //     Game.graph.addChild(bullet);
            //     if (Networking.client.id == Networking.client.idHost) {
            //         Networking.spawnBulletAtEnemy(bullet.netId, this.netId);
            //         this.weapon.currentAttackCount--;
            //     }

            // }
        }
    }

    export class SummonorAdds extends EnemyDash {
        avatar: Player.Player;
        randomPlayer = Math.round(Math.random());

        constructor(_id: Entity.ID, _position: ƒ.Vector2, _target: Player.Player, _netId?: number) {
            super(_id, _position, _netId);
            this.avatar = _target;
            this.flocking = new FlockingBehaviour(this, 3, 0.8, 1.5, 1, 1, 0.1, 0);

        }

        behaviour() {
            this.target = this.avatar.mtxLocal.translation.toVector2();

            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;

            if (distance > 5) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;

            }
            else if (distance < 3) {
                this.dash.doAbility();
            }
            this.flocking.update();
        }

        moveBehaviour(): void {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    if (!this.dash.doesAbility) {
                        this.lastMoveDireciton = this.moveDirection;
                        this.moveDirection = this.flocking.getMoveVector().toVector3();
                    }
                    break;
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveAway(this.target).toVector3();
                    break;
            }
        }
    }



    // export class EnemyCircle extends Enemy {
    //     distance: number = 5;

    //     constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2) {
    //         super(_name, _properties, _position);
    //     }

    //     move(): void {
    //         super.move();
    //         this.moveCircle();
    //     }

    //     lifespan(_graph: ƒ.Node): void {
    //         super.lifespan(_graph);
    //     }

    //     async moveCircle() {
    //         this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
    //         console.log(this.target);
    //         let distancePlayer1 = this.cmpTransform.mtxLocal.translation.getDistance(Game.avatar1.cmpTransform.mtxLocal.translation);
    //         // let distancePlayer2 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player2.cmpTransform.mtxLocal.translation);
    //         if (distancePlayer1 > this.distance) {
    //             this.moveSimple();
    //         }
    //         else {
    //             let degree = Calculation.calcDegree(this.cmpTransform.mtxLocal.translation, this.target)
    //             let add = 0;

    //             // while (distancePlayer1 <= this.distance) {
    //             //     let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.cmpTransform.mtxLocal.translation, InputSystem.calcPositionFromDegree(degree + add, this.distance).toVector3(0));
    //             //     direction.normalize();

    //             //     direction.scale((1 / Game.frameRate * this.properties.attributes.speed));
    //             //     this.cmpTransform.mtxLocal.translate(direction, true);
    //             //     add += 5;
    //             // }

    //         }
    //     }
    // }
}