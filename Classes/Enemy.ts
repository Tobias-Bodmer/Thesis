namespace Enemy {
    export let txtTick: ƒ.TextureImage = new ƒ.TextureImage();

    export enum BEHAVIOUR {
        IDLE, FOLLOW, FLEE, MOVE, SUMMON, DASH
    }

    import ƒAid = FudgeAid;

    export class Enemy extends Entity.Entity implements Interfaces.IKnockbackable {
        currentState: BEHAVIOUR;
        public netId: number = Networking.idGenerator();
        target: ƒ.Vector2;
        lifetime: number;
        moveDirection: Game.ƒ.Vector3 = Game.ƒ.Vector3.ZERO();


        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _attributes);
            this.attributes = _attributes;
            this.currentState = BEHAVIOUR.IDLE;
            this.currentAnimation = Entity.ANIMATIONSTATES.IDLE;
            this.tag = Tag.TAG.ENEMY;


            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.1);
            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            this.mtxLocal.scale(new ƒ.Vector3(this.attributes.scale, this.attributes.scale, 0));
            this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), (this.mtxLocal.scaling.x * this.idleScale) / 2)
            Networking.spawnEnemy(this, this.netId);
        }

        public update() {
            super.update();
            this.moveBehaviour();
            this.move(this.moveDirection);
            Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId, this.currentAnimation);
        }

        public doKnockback(_body: Entity.Entity): void {
            // (<Player.Player>_body).getKnockback(this.attributes.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }

        public getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void {
            super.getKnockback(_knockbackForce, _position);
        }
        move(_direction: ƒ.Vector3) {
            this.moveDirection.add(_direction)
            this.collide(this.moveDirection);
            this.moveDirection.subtract(_direction);
        }

        moveBehaviour() {

        }
        public moveSimple(_target: ƒ.Vector2): ƒ.Vector2 {
            this.target = _target;
            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation);
            direction.normalize();
            direction.scale((1 / Game.frameRate * this.attributes.speed));
            return direction.toVector2();
        }

        moveAway(_target: ƒ.Vector2): ƒ.Vector2 {
            let moveSimple = this.moveSimple(_target);
            moveSimple.x *= -1;
            moveSimple.y *= -1;
            return moveSimple;
        }

        //TODO move patrol


        public getDamage(_value: number): void {
            if (Networking.client.idHost == Networking.client.id) {
                super.getDamage(_value);
                if (this.attributes.healthPoints <= 0) {

                    Networking.removeEnemy(this.netId);
                    Networking.popID(this.netId);
                    this.die();
                }
            }
        }

        die() {
            Game.graph.removeChild(this);
        }


        collide(_direction: ƒ.Vector3) {
            super.collide(_direction);

            let avatarColliders: Player.Player[] = <Player.Player[]>Game.graph.getChildren().filter(element => (<Enemy.Enemy>element).tag == Tag.TAG.PLAYER);
            avatarColliders.forEach((element) => {
                if (this.collider.collides(element.collider)) {
                    let intersection = this.collider.getIntersection(element.collider);
                    let areaBeforeMove = intersection;

                    if (areaBeforeMove < this.collider.radius + element.collider.radius) {
                        let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                        let newDirection = new Game.ƒ.Vector2(_direction.x, 0)
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                        if (this.collider.getIntersection(element.collider) != null) {
                            let newIntersection = this.collider.getIntersection(element.collider);
                            let areaAfterMove = newIntersection;

                            if (areaBeforeMove < areaAfterMove) {
                                this.canMoveX = false;
                            }
                        }

                        this.collider.position = oldPosition;
                        newDirection = new Game.ƒ.Vector2(0, _direction.y);
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                        if (this.collider.getIntersection(element.collider) != null) {
                            let newIntersection = this.collider.getIntersection(element.collider);
                            let areaAfterMove = newIntersection;

                            if (areaBeforeMove < areaAfterMove) {
                                this.canMoveY = false;
                            }
                        }
                        this.collider.position = oldPosition;
                    }

                    if (Networking.client.id == Networking.client.idHost) {
                        if (element == Game.avatar1) {
                            element.getKnockback(this.attributes.knockbackForce, this.mtxLocal.translation);
                        }
                        if (element == Game.avatar2) {
                            Networking.knockbackPush(this.attributes.knockbackForce, this.mtxLocal.translation);
                        }
                    }
                }
            })



            if (this.canMoveX && this.canMoveY) {
                this.cmpTransform.mtxLocal.translate(_direction);
            } else if (this.canMoveX && !this.canMoveY) {
                _direction = new ƒ.Vector3(_direction.x, 0, _direction.z)
                this.cmpTransform.mtxLocal.translate(_direction);
            } else if (!this.canMoveX && this.canMoveY) {
                _direction = new ƒ.Vector3(0, _direction.y, _direction.z)
                this.cmpTransform.mtxLocal.translate(_direction);
            }
        }

        switchAnimation(_name: string) {
            switch (_name) {
                case "idle":
                    if (this.currentAnimation != Entity.ANIMATIONSTATES.IDLE) {
                        this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations[_name]);
                        this.setFrameDirection(1);
                        this.framerate = AnimationGeneration.getAnimationById(this.id).idleFrameRate;
                        this.currentAnimation = Entity.ANIMATIONSTATES.IDLE;
                        Networking.updateEnemyState(this.currentAnimation, this.netId);
                    }
                    break;
                case "walk":
                    if (this.currentAnimation != Entity.ANIMATIONSTATES.WALK) {
                        this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations[_name]);
                        this.setFrameDirection(1);
                        this.framerate = AnimationGeneration.getAnimationById(this.id).walkFrameRate;
                        this.currentAnimation = Entity.ANIMATIONSTATES.WALK;
                        Networking.updateEnemyState(this.currentAnimation, this.netId);
                    }
                    break;
                case "summon":
                    if (this.currentAnimation != Entity.ANIMATIONSTATES.SUMMON) {
                        this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations[_name]);
                        this.setFrameDirection(1);
                        this.framerate = AnimationGeneration.getAnimationById(this.id).walkFrameRate;
                        this.currentAnimation = Entity.ANIMATIONSTATES.SUMMON;
                        Networking.updateEnemyState(this.currentAnimation, this.netId);
                    }

            }

        }
    }


    export class EnemyDumb extends Enemy {

        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _attributes, _position, _netId);
        }

        update(): void {
            super.update();
        }

        behaviour() {
            let target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
            let distance = ƒ.Vector3.DIFFERENCE(target, this.cmpTransform.mtxLocal.translation).magnitude;
            //TODO: set to 3 after testing
            if (distance > -1) {
                this.currentState = BEHAVIOUR.FOLLOW
            }
            else {
                this.currentState = BEHAVIOUR.IDLE;
            }

        }

        moveBehaviour() {
            this.behaviour();
            switch (this.currentState) {
                case BEHAVIOUR.IDLE:
                    this.switchAnimation("idle");
                    break;
                case BEHAVIOUR.FOLLOW:
                    this.switchAnimation("walk");
                    this.moveDirection = this.moveSimple(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
                    break;
                // default:
                //     // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                //     // break;
            }
        }

    }

    // export class EnemyDash extends Enemy {
    //     isAttacking = false;
    //     perfomrAbility = false;
    //     lastMoveDireciton: Game.ƒ.Vector3;
    //     dashCount: number = 1;
    //     avatars: Player.Player[] = [];
    //     randomPlayer = Math.round(Math.random());

    //     constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
    //         super(_id, _attributes, _position, _netId);
    //     }

    //     public update(): void {
    //         super.update();
    //     }

    //     behaviour() {
    //         this.avatars = [Game.avatar1, Game.avatar2]
    //         this.target = (<Player.Player>this.avatars[this.randomPlayer]).mtxLocal.translation.toVector2();


    //         let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;

    //         if (distance > 5) {
    //             this.currentState = BEHAVIOUR.FOLLOW;
    //             this.isAttacking = false;
    //         }
    //         else if (distance < 3 && !this.isAttacking) {
    //             this.doDash();
    //         }
    //         else {
    //             // this.currentState = BEHAVIOUR.IDLE;
    //         }


    //     }


    //     doDash() {
    //         if (!this.isAttacking) {
    //             this.isAttacking = true;
    //             this.attributes.hitable = false;
    //             this.attributes.speed *= 2;
    //             setTimeout(() => {
    //                 this.attributes.speed /= 2;
    //                 this.attributes.hitable = true;
    //             }, 300);
    //         }
    //     }




    //     moveBehaviour(): void {
    //         this.behaviour();
    //         switch (this.currentState) {
    //             case BEHAVIOUR.FOLLOW:
    //                 this.switchAnimation("walk");
    //                 if (this.isAttacking) {
    //                     this.moveDirection = this.moveSimple(this.lastMoveDireciton.toVector2()).toVector3();
    //                 }
    //                 else {
    //                     this.moveDirection = this.moveSimple(this.target).toVector3();
    //                     this.lastMoveDireciton = this.moveDirection;
    //                 }
    //                 break;
    //             case BEHAVIOUR.IDLE:
    //                 this.switchAnimation("idle");
    //                 break;
    //         }
    //     }
    // }

    export class EnemyPatrol extends Enemy {
        patrolPoints: ƒ.Vector2[] = [new ƒ.Vector2(0, 4), new ƒ.Vector2(5, 0)];
        waitTime: number = 1000;
        currenPointIndex: number = 0;

        public update(): void {
            super.update();
        }

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
        weapon: Weapons.Weapon;
        viewRadius: number = 3;
        constructor(_id: number, _attributes: Entity.Attributes, _position: ƒ.Vector2, _weapon: Weapons.Weapon, _netId?: number) {
            super(_id, _attributes, _position, _netId);
            this.weapon = _weapon;
        }

        update() {
            super.update();
            this.shoot();
        }

        public shoot(_netId?: number) {
            let target: ƒ.Vector3 = Calculation.getCloserAvatarPosition(this.mtxLocal.translation)
            let _direction = ƒ.Vector3.DIFFERENCE(target, this.mtxLocal.translation);
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
            this.weapon.shoot(this.tag, this.mtxLocal.translation.toVector2(), _direction, _netId);
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