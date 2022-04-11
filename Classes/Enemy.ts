namespace Enemy {
    export enum ENEMYNAME {
        BAT,
        TICK,

    }

    export function getNameByID(_id: ENEMYNAME) {
        switch (_id) {
            case ENEMYNAME.BAT:
                return "bat";
            case ENEMYNAME.TICK:
                return "tick";

        }
    }
    enum BEHAVIOUR {
        IDLE, FOLLOW, FLEE
    }
    import ƒAid = FudgeAid;

    export class Enemy extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable, Interfaces.IKnockbackable {
        currentState: BEHAVIOUR;
        public tag: Tag.TAG = Tag.TAG.ENEMY;
        public id: number;
        public netId: number = Networking.idGenerator();
        public properties: Player.Character;
        public collider: Collider.Collider;
        target: ƒ.Vector3;
        lifetime: number;
        canMoveX: boolean = true;
        canMoveY: boolean = true;

        moveDirection: Game.ƒ.Vector3 = Game.ƒ.Vector3.ZERO();

        knockbackForce: number = 6;

        //#region  animation
        animations: ƒAid.SpriteSheetAnimations;
        private clrWhite: ƒ.Color = ƒ.Color.CSS("white");
        //#endregion

        constructor(_id: ENEMYNAME, _properties: Player.Character, _position: ƒ.Vector2, _netId?: number) {
            super(getNameByID(_id));
            this.id = _id;
            this.properties = _properties;
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.1);
            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2);
            Networking.spawnEnemy(this, this.netId);
            this.startSprite();
        }

        async startSprite() {
            await this.loadSprites();
            this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["fly"]);
            this.setFrameDirection(1);
            this.framerate = 12;
        }

        async loadSprites(): Promise<void> {
            let imgSpriteSheet: ƒ.TextureImage = new ƒ.TextureImage();
            await imgSpriteSheet.load("./Resources/Image/Enemies/spinni.png");

            let spriteSheet: ƒ.CoatTextured = new ƒ.CoatTextured(this.clrWhite, imgSpriteSheet);
            this.generateSprites(spriteSheet);
        }

        generateSprites(_spritesheet: ƒ.CoatTextured): void {
            this.animations = {};
            let name: string = "fly";
            let sprite: ƒAid.SpriteSheetAnimation = new ƒAid.SpriteSheetAnimation(name, _spritesheet);
            sprite.generateByGrid(ƒ.Rectangle.GET(0, 0, 18, 14), 4, 22, ƒ.ORIGIN2D.BOTTOMCENTER, ƒ.Vector2.X(18));
            this.animations[name] = sprite;
        }

        public move() {
            this.updateCollider();
            Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId);
        }

        public doKnockback(_body: ƒAid.NodeSprite): void {
            (<Player.Player>_body).getKnockback(this.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }

        public getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3): void {

            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector2.DIFFERENCE(this.cmpTransform.mtxLocal.translation.toVector2(), _position.toVector2()).toVector3(0);

            direction.normalize();

            direction.scale(_knockbackForce * 1 / Game.frameRate);

            this.moveDirection.add(direction);

            helper(direction, this.moveDirection);

            function helper(_direction: Game.ƒ.Vector3, _moveDirection: Game.ƒ.Vector3) {
                if (_knockbackForce > 0.1) {
                    setTimeout(() => {
                        _moveDirection.subtract(direction);

                        _knockbackForce /= 3;

                        direction.scale(_knockbackForce * 1 / Game.frameRate);

                        _moveDirection.add(direction);

                        helper(_direction, _moveDirection);
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

            direction.scale((1 / Game.frameRate * this.properties.attributes.speed));

            this.moveDirection.add(direction)

            this.getCanMoveXY(this.moveDirection);
            //TODO: in Funktion packen damit man von allem Enemies drauf zugreifen kann

            this.moveDirection.subtract(direction);
        }

        moveAway() {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);

            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.cmpTransform.mtxLocal.translation, this.target);
            direction.normalize();

            direction.scale((1 / Game.frameRate * this.properties.attributes.speed));

            this.moveDirection.add(direction)

            this.getCanMoveXY(this.moveDirection);

            this.moveDirection.subtract(direction);
        }


        lifespan(_graph: Game.ƒ.Node) {
            if (this.properties.attributes.healthPoints <= 0) {
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

        constructor(_id: number, _properties: Player.Character, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _properties, _position, _netId);
        }

        move(): void {
            super.move();
            this.moveBehaviour();
        }

        behaviour() {
            let target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
            let distance = ƒ.Vector3.DIFFERENCE(target, this.cmpTransform.mtxLocal.translation).magnitude;
            if (distance < 1) {
                this.currentState = BEHAVIOUR.FLEE;
            }
            else if (distance > 5) {
                this.currentState = BEHAVIOUR.FOLLOW
            }

        }

        moveBehaviour() {

            this.behaviour();
            switch (this.currentState) {
                case BEHAVIOUR.FLEE:
                    this.moveAway();
                    break;
                case BEHAVIOUR.FOLLOW:
                    this.moveSimple()
                    break;
                default:
                    this.moveSimple();
                    break;
            }
        }

    }
    export class EnemyShoot extends Enemy {
        weapon: Weapons.Weapon;
        constructor(_id: number, _properties: Player.Character, _position: ƒ.Vector2, _weapon: Weapons.Weapon, _netId?: number) {
            super(_id, _properties, _position);
            this.weapon = _weapon;
        }

        move() {
            super.move();
            this.shoot();
        }

        shoot() {
            let target: ƒ.Vector3 = Calculation.getCloserAvatarPosition(this.mtxLocal.translation)
            let _direction = ƒ.Vector3.DIFFERENCE(target, this.mtxLocal.translation);
            if (this.weapon.currentAttackCount > 0) {
                _direction.normalize();
                let bullet: Bullets.Bullet = new Bullets.Bullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction, this);
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
                Game.graph.addChild(bullet);

                // if (sync) {
                //     Networking.spawnBullet(_direction, bullet.netId);
                // }

                this.weapon.currentAttackCount--;
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