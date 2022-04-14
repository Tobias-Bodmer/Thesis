namespace Enemy {
    export let txtTick: ƒ.TextureImage = new ƒ.TextureImage();

    export enum ENEMYNAME {
        BAT,
        REDTICK,
        SMALLTICK,
        SKELETON
    }
    export function getNameByID(_id: ENEMYNAME) {
        switch (_id) {
            case ENEMYNAME.BAT:
                return "bat";
            case ENEMYNAME.REDTICK:
                return "redTick";
            case ENEMYNAME.SMALLTICK:
                return "smallTick";
            case ENEMYNAME.SKELETON:
                return "skeleton";
        }
    }

    import ƒAid = FudgeAid;

    export class Enemy extends Entity.Entity implements Interfaces.ISpawnable, Interfaces.IKnockbackable {
        public id: number;
        public netId: number = Networking.idGenerator();
        sizeDivideFactor: number = 2;
        target: ƒ.Vector3;
        lifetime: number;
        canMoveX: boolean = true;
        canMoveY: boolean = true;
        moveDirection: Game.ƒ.Vector3 = Game.ƒ.Vector3.ZERO();


        constructor(_id: ENEMYNAME, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(getNameByID(_id), _attributes);
            this.id = _id;
            this.attributes = _attributes;
            this.currentState = Entity.BEHAVIOUR.IDLE;
            this.currentAnimation = Entity.ANIMATIONSTATES.IDLE;
            this.tag = Tag.TAG.ENEMY;

            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.1);
            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            this.mtxLocal.scale(new ƒ.Vector3(this.attributes.scale, this.attributes.scale, 0));
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / this.sizeDivideFactor);
            this.animations = AnimationGeneration.getAnimationById(this.id).animations;
            this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);

            Networking.spawnEnemy(this, this.netId);
        }

        public enemyUpdate() {
            this.updateCollider();
            this.mtxLocal.translate(this.moveDirection);
            Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId, this.currentAnimation);
        }

        public doKnockback(_body: ƒAid.NodeSprite): void {
            (<Player.Player>_body).getKnockback(this.attributes.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }

        public getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void {
            //TODO: apply scaling correct for knockback
            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector2.DIFFERENCE(this.cmpTransform.mtxLocal.translation.toVector2(), _position.toVector2()).toVector3(0);
            let knockBackScaling: number = Game.frameRate * this.attributes.scale;

            direction.normalize();

            direction.scale(_knockbackForce * 1 / knockBackScaling);

            this.moveDirection.add(direction);

            reduceKnockback(direction, this.moveDirection);

            function reduceKnockback(_direction: Game.ƒ.Vector3, _moveDirection: Game.ƒ.Vector3) {
                // _knockbackForce = _knockbackForce / knockBackScaling;
                if (_knockbackForce > 0.1) {
                    setTimeout(() => {
                        _moveDirection.subtract(direction);

                        _knockbackForce /= 3;

                        direction.scale(_knockbackForce * (1 / knockBackScaling));

                        _moveDirection.add(direction);

                        reduceKnockback(_direction, _moveDirection);
                    }, 200);
                } else {
                    _moveDirection.subtract(direction);
                }
            }

        }

        updateCollider() {
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
        }

        public moveSimple() {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);

            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.target, this.cmpTransform.mtxLocal.translation);

            direction.normalize();

            direction.scale((1 / Game.frameRate * this.attributes.speed));

            this.moveDirection.add(direction)

            this.getCanMoveXY(this.moveDirection);

            this.moveDirection.subtract(direction);
        }

        moveAway() {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);

            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.cmpTransform.mtxLocal.translation, this.target);
            direction.normalize();

            direction.scale((1 / Game.frameRate * this.attributes.speed));

            this.moveDirection.add(direction)

            this.getCanMoveXY(this.moveDirection);

            this.moveDirection.subtract(direction);
        }
        public getDamage(_damage: number) {
            if (_damage != null && this.attributes.hitable) {
                this.attributes.healthPoints -= _damage;
            }
        }

        lifespan(_graph: Game.ƒ.Node) {
            if (this.attributes.healthPoints <= 0) {
                Networking.removeEnemy(this.netId);
                Networking.popID(this.netId);
                _graph.removeChild(this);
            }
        }

        getCanMoveXY(_direction: ƒ.Vector3) {
            let canMoveX = true;
            let canMoveY = true;
            let colliders: Generation.Wall[] = (<Generation.Room>Game.graph.getChildren().find(element => (<Generation.Room>element).tag == Tag.TAG.ROOM)).walls;
            colliders.forEach((element) => {
                if (this.collider.collidesRect(element.collider)) {

                    let intersection = this.collider.getIntersectionRect(element.collider);
                    let areaBeforeMove = Math.round((intersection.height * intersection.width) * 1000) / 1000;

                    let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                    let newDirection = new Game.ƒ.Vector2(_direction.x, 0)
                    this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                    if (this.collider.getIntersectionRect(element.collider) != null) {
                        let newIntersection = this.collider.getIntersectionRect(element.collider);
                        let areaAfterMove = Math.round((newIntersection.height * newIntersection.width) * 1000) / 1000;


                        if (areaBeforeMove < areaAfterMove) {
                            canMoveX = false;
                        }
                    }

                    this.collider.position = oldPosition;
                    newDirection = new Game.ƒ.Vector2(0, _direction.y);
                    this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                    if (this.collider.getIntersectionRect(element.collider) != null) {
                        let newIntersection = this.collider.getIntersectionRect(element.collider);
                        let areaAfterMove = Math.round((newIntersection.height * newIntersection.width) * 1000) / 1000;


                        if (areaBeforeMove < areaAfterMove) {
                            canMoveY = false;
                        }
                    }
                    this.collider.position = oldPosition;
                }
            });

            let avatarColliders: Player.Player[] = <Player.Player[]>Game.graph.getChildren().filter(element => (<Enemy.Enemy>element).tag == Tag.TAG.PLAYER);
            avatarColliders.forEach((element) => {
                if (this.collider.collides(element.collider)) {
                    let intersection = this.collider.getIntersection(element.collider);
                    let areaBeforeMove = Math.round((intersection) * 1000) / 1000;

                    let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                    let newDirection = new Game.ƒ.Vector2(_direction.x, 0)
                    this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                    if (this.collider.getIntersection(element.collider) != null) {
                        let newIntersection = this.collider.getIntersection(element.collider);
                        let areaAfterMove = Math.round((newIntersection) * 1000) / 1000;

                        if (areaBeforeMove < areaAfterMove) {
                            canMoveX = false;
                        }
                    }

                    this.collider.position = oldPosition;
                    newDirection = new Game.ƒ.Vector2(0, _direction.y);
                    this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                    if (this.collider.getIntersection(element.collider) != null) {
                        let newIntersection = this.collider.getIntersection(element.collider);
                        let areaAfterMove = Math.round((newIntersection) * 1000) / 1000;

                        if (areaBeforeMove < areaAfterMove) {
                            canMoveY = false;
                        }
                    }
                    this.collider.position = oldPosition;
                }
            })

            if (canMoveX && canMoveY) {
                this.cmpTransform.mtxLocal.translate(_direction);
            } else if (canMoveX && !canMoveY) {
                _direction = new ƒ.Vector3(_direction.x, 0, _direction.z)
                this.cmpTransform.mtxLocal.translate(_direction);
            } else if (!canMoveX && canMoveY) {
                _direction = new ƒ.Vector3(0, _direction.y, _direction.z)
                this.cmpTransform.mtxLocal.translate(_direction);
            }
        }
    }


    export class EnemyDumb extends Enemy {

        constructor(_id: ENEMYNAME, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _attributes, _position, _netId);
        }

        enemyUpdate(): void {
            super.enemyUpdate();
            this.moveBehaviour();
        }

        behaviour() {
            let target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
            let distance = ƒ.Vector3.DIFFERENCE(target, this.cmpTransform.mtxLocal.translation).magnitude;
            if (distance > 3) {
                this.currentState = Entity.BEHAVIOUR.FOLLOW
            }
            else {
                this.currentState = Entity.BEHAVIOUR.IDLE;
            }

        }

        moveBehaviour() {

            this.behaviour();
            switch (this.currentState) {
                case Entity.BEHAVIOUR.IDLE:
                    if (this.currentAnimation != Entity.ANIMATIONSTATES.IDLE) {
                        this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                        this.setFrameDirection(1);
                        this.framerate = AnimationGeneration.getAnimationById(this.id).walkFrameRate;
                        this.currentAnimation = Entity.ANIMATIONSTATES.IDLE;
                        Networking.updateEnemyState(this.currentAnimation, this.netId);
                    }
                    this.setFrameDirection(1);
                    this.framerate = AnimationGeneration.getAnimationById(this.id).walkFrameRate;
                    break;
                case Entity.BEHAVIOUR.FOLLOW:
                    if (this.currentAnimation != Entity.ANIMATIONSTATES.WALK) {
                        this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["walk"]);
                        this.setFrameDirection(1);
                        this.framerate = AnimationGeneration.getAnimationById(this.id).walkFrameRate;
                        this.currentAnimation = Entity.ANIMATIONSTATES.WALK;
                        Networking.updateEnemyState(this.currentAnimation, this.netId);
                    }
                    this.moveSimple()
                    break;
                // default:
                //     // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                //     // break;
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

        enemyUpdate() {
            super.enemyUpdate();
            this.shoot();
        }

        public shoot(_netId?: number) {
            let target: ƒ.Vector3 = Calculation.getCloserAvatarPosition(this.mtxLocal.translation)
            let _direction = ƒ.Vector3.DIFFERENCE(target, this.mtxLocal.translation);
            if (this.weapon.currentAttackCount > 0 && _direction.magnitude < this.viewRadius) {
                _direction.normalize();
                let bullet: Bullets.Bullet = new Bullets.HomingBullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction, Calculation.getCloserAvatarPosition(this.mtxLocal.translation), this, _netId);
                bullet.owner = this.tag;
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
                Game.graph.addChild(bullet);
                if (Networking.client.id == Networking.client.idHost) {
                    Networking.spawnBulletAtEnemy(bullet.netId, this.netId);
                    this.weapon.currentAttackCount--;
                }

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