namespace Enemy {


    export class Enemy extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable {
        public tag: Tag.Tag = Tag.Tag.ENEMY;
        public netId: number = Networking.idGenerator();
        public properties: Player.Character;
        public collider: Game.ƒ.Rectangle;
        target: Player.Player;
        lifetime: number;
        canMoveX: boolean = true;
        canMoveY: boolean = true;

        //#region  animation
        animations: ƒAid.SpriteSheetAnimations;
        private clrWhite: ƒ.Color = ƒ.Color.CSS("white");
        //#endregion
        /**
         * Creates an Enemy
         * @param _name Name of the enemy
         * @param _properties Properties, storing attributes and stuff
         * @param _position position where to spawn
         * @param _aiType optional: standard ai = dumb
         */

        constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2, _id?: number) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.properties = _properties;
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            if (_id != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_id);
                this.netId = _id;
            }
            this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            Networking.spawnEnemy(this, this.netId);
            //TODO: add sprite animation
            // this.startSprite();
        }
        // async startSprite() {
        //     await this.loadSprites();
        //     this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["fly"]);
        //     this.setFrameDirection(1);
        //     this.framerate = 25;
        // }

        // async loadSprites(): Promise<void> {
        //     let imgSpriteSheet: ƒ.TextureImage = new ƒ.TextureImage();
        //     await imgSpriteSheet.load("./Resources/Image/Enemies/fledi.png");

        //     let spriteSheet: ƒ.CoatTextured = new ƒ.CoatTextured(this.clrWhite, imgSpriteSheet);
        //     this.generateSprites(spriteSheet);
        // }

        // generateSprites(_spritesheet: ƒ.CoatTextured): void {
        //     this.animations = {};
        //     let name: string = "fly";
        //     let sprite: ƒAid.SpriteSheetAnimation = new ƒAid.SpriteSheetAnimation(name, _spritesheet);
        //     sprite.generateByGrid(ƒ.Rectangle.GET(0, 0, 25, 20), 4, 22, ƒ.ORIGIN2D.BOTTOMCENTER, ƒ.Vector2.X(20));
        //     this.animations[name] = sprite;
        // }

        move() {
            this.updateCollider();
            Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId);
        }

        updateCollider() {
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
            this.collider.position.subtract(ƒ.Vector2.SCALE(this.collider.size, 0.5));
        }

        moveSimple() {
            this.target = Game.player1;

            if (Game.connected) {
                let distancePlayer1 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player1.cmpTransform.mtxLocal.translation);
                let distancePlayer2 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player2.cmpTransform.mtxLocal.translation);

                if (distancePlayer1 < distancePlayer2) {
                    this.target = Game.player1;
                }
                else {
                    this.target = Game.player2;
                }
            }
            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.target.cmpTransform.mtxLocal.translation, this.cmpTransform.mtxLocal.translation);
            direction.normalize();

            // console.log(direction);

            direction.scale((1 / Game.frameRate * this.properties.attributes.speed));

            // let canMove: [boolean, boolean] = this.getCanMoveXY(direction);
            // let canMoveX: boolean = canMove[0];
            // let canMoveY: boolean = canMove[1];
            this.getCanMoveXY(direction);
            //TODO: in Funktion packen damit man von allem Enemies drauf zugreifen kann

        }

        moveAway() {
            this.target = Game.player1;

            if (Game.connected) {
                let distancePlayer1 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player1.cmpTransform.mtxLocal.translation);
                let distancePlayer2 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player2.cmpTransform.mtxLocal.translation);

                if (distancePlayer1 < distancePlayer2) {
                    this.target = Game.player1;
                } else {
                    this.target = Game.player2;
                }

            }
            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.cmpTransform.mtxLocal.translation, this.target.cmpTransform.mtxLocal.translation);
            direction.normalize();

            direction.scale((1 / Game.frameRate * this.properties.attributes.speed));
            this.cmpTransform.mtxLocal.translate(direction, true);

            this.getCanMoveXY(direction);
        }


        lifespan(_graph: Game.ƒ.Node) {
            if (this.properties.attributes.healthPoints <= 0) {
                Networking.removeEnemy(this.netId);
                Networking.popID(this.netId);
                _graph.removeChild(this);
            }
        }

        getCanMoveXY(direction: ƒ.Vector3) {
            let canMoveX = true;
            let canMoveY = true;
            let colliders: Generation.Wall[] = (<Generation.Room>Game.graph.getChildren().find(element => (<Generation.Room>element).tag == Tag.Tag.ROOM)).walls;
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider)) {

                    let intersection = this.collider.getIntersection(element.collider);
                    let areaBeforeMove = intersection.height * intersection.width;

                    let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                    let newDirection = new Game.ƒ.Vector2(direction.x, 0)
                    this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                    if (this.collider.getIntersection(element.collider) != null) {
                        let newIntersection = this.collider.getIntersection(element.collider);
                        let areaAfterMove = newIntersection.height * newIntersection.width;

                        if (areaBeforeMove < areaAfterMove) {
                            canMoveX = false;
                        }
                    }

                    this.collider.position = oldPosition;
                    newDirection = new Game.ƒ.Vector2(0, direction.y);
                    this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                    if (this.collider.getIntersection(element.collider) != null) {
                        let newIntersection = this.collider.getIntersection(element.collider);
                        let areaAfterMove = newIntersection.height * newIntersection.width;

                        if (areaBeforeMove < areaAfterMove) {
                            canMoveY = false;
                        }
                    }
                    this.collider.position = oldPosition;
                }
            });
            if (canMoveX && canMoveY) {
                this.cmpTransform.mtxLocal.translate(direction);
            } else if (canMoveX && !canMoveY) {
                direction = new ƒ.Vector3(direction.x, 0, direction.z)
                this.cmpTransform.mtxLocal.translate(direction);
            } else if (!canMoveX && canMoveY) {
                direction = new ƒ.Vector3(0, direction.y, direction.z)
                this.cmpTransform.mtxLocal.translate(direction);
            }
        }
    }

    export class EnemyDumb extends Enemy {
        constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2) {
            super(_name, _properties, _position);
        }

        move(): void {
            super.move()
            this.moveSimple();
        }

        lifespan(_graph: ƒ.Node): void {
            super.lifespan(_graph);
        }
    }

    export class EnemyFlee extends Enemy {

        constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2) {
            super(_name, _properties, _position);
        }

        move() {
            super.move();
            this.moveAway();
        }

        lifespan(_graph: ƒ.Node): void {
            super.lifespan(_graph);
        }

    }

    export class EnemyCircle extends Enemy {
        distance: number = 5;

        constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2) {
            super(_name, _properties, _position);
        }

        move(): void {
            super.move();
            this.moveCircle();
        }

        lifespan(_graph: ƒ.Node): void {
            super.lifespan(_graph);
        }

        async moveCircle() {
            this.target = Game.player1;
            console.log(this.target);
            let distancePlayer1 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player1.cmpTransform.mtxLocal.translation);
            // let distancePlayer2 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player2.cmpTransform.mtxLocal.translation);
            if (distancePlayer1 > this.distance) {
                this.moveSimple();
            }
            else {
                let degree = InputSystem.calcDegree(this.cmpTransform.mtxLocal.translation, this.target.cmpTransform.mtxLocal.translation)
                let add = 0;

                // while (distancePlayer1 <= this.distance) {
                //     let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.cmpTransform.mtxLocal.translation, InputSystem.calcPositionFromDegree(degree + add, this.distance).toVector3(0));
                //     direction.normalize();

                //     direction.scale((1 / Game.frameRate * this.properties.attributes.speed));
                //     this.cmpTransform.mtxLocal.translate(direction, true);
                //     add += 5;
                // }

            }

        }
    }
}