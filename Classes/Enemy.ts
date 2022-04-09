namespace Enemy {
    enum BEHAVIOUR {
        FOLLOW, FLEE
    }
    import ƒAid = FudgeAid;


    class DumbInstructions {
        public static get(): ƒAid.StateMachineInstructions<BEHAVIOUR> {
            let setup: ƒAid.StateMachineInstructions<BEHAVIOUR> = new ƒAid.StateMachineInstructions();
            setup.transitDefault = DumbInstructions.transitDefault;
            setup.actDefault = DumbInstructions.actDefault;
            setup.setAction(BEHAVIOUR.FOLLOW, this.stop);
            return setup;
        }
        static async actDefault(_machine: ƒAid.StateMachine<BEHAVIOUR>) {
            // console.log("defaulAction");
            // _machine.transit(BEHAVIOUR.FOLLOW);
            // _machine.act();
        }

        private static transitDefault(_machine: ƒAid.StateMachine<BEHAVIOUR>) {
            // console.log("transition");
        }

        // private static transit(_machine: ƒAid.StateMachine<BEHAVIOUR>) {
        //     console.log("transit transit");
        // }

        private static async stop(_machine: ƒAid.StateMachine<BEHAVIOUR>) {
            // console.log("stop");
            // _machine.transit(BEHAVIOUR.IDLE);
            // // _machine.act();
        }
    }

    export class Enemy extends Game.ƒAid.NodeSprite implements Interfaces.ISpawnable {
        public tag: Tag.TAG = Tag.TAG.ENEMY;
        public netId: number = Networking.idGenerator();
        public properties: Player.Character;
        public collider: Collider.Collider;
        target: ƒ.Vector3;
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

        constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2, _netId?: number) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.properties = _properties;
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2);
            Networking.spawnEnemy(this, this.netId);
            //TODO: add sprite animation
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

        updateCollider() {
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
        }

        getTarget(): ƒ.Vector3 {
            let target = Game.avatar1;

            if (Game.connected) {
                let distancePlayer1 = this.cmpTransform.mtxLocal.translation.getDistance(Game.avatar1.cmpTransform.mtxLocal.translation);
                let distancePlayer2 = this.cmpTransform.mtxLocal.translation.getDistance(Game.avatar2.cmpTransform.mtxLocal.translation);

                if (distancePlayer1 < distancePlayer2) {
                    target = Game.avatar1;
                }
                else {
                    target = Game.avatar2;
                }
            }

            return target.cmpTransform.mtxLocal.translation;
        }

        public moveSimple() {
            this.target = this.getTarget();

            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.target, this.cmpTransform.mtxLocal.translation);
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
            this.target = this.getTarget();


            let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.cmpTransform.mtxLocal.translation, this.target);
            direction.normalize();

            direction.scale((1 / Game.frameRate * this.properties.attributes.speed));
            // this.cmpTransform.mtxLocal.translate(direction, true);

            this.getCanMoveXY(direction);
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
        private static instructions: ƒAid.StateMachineInstructions<BEHAVIOUR> = DumbInstructions.get();
        stateMachine: ƒAid.ComponentStateMachine<BEHAVIOUR> = new ƒAid.ComponentStateMachine();

        constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2) {
            super(_name, _properties, _position);
            this.stateMachine.instructions = EnemyDumb.instructions;
            this.addComponent(this.stateMachine);
            this.stateMachine.act();
        }

        move(): void {

            // this.moveSimple();
            super.move();
            this.moveBehaviour();
        }

        behaviour() {
            let target = this.getTarget();
            let distance = ƒ.Vector3.DIFFERENCE(target, this.cmpTransform.mtxLocal.translation).magnitude;
            if (distance < 1) {
                this.stateMachine.transit(BEHAVIOUR.FLEE);
                this.stateMachine.act();
            }
            else if (distance > 5) {
                this.stateMachine.transit(BEHAVIOUR.FOLLOW);
                this.stateMachine.act();
            }

        }
        moveBehaviour() {

            this.behaviour();
            switch (this.stateMachine.stateCurrent) {
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
            this.target = this.getTarget();
            console.log(this.target);
            let distancePlayer1 = this.cmpTransform.mtxLocal.translation.getDistance(Game.avatar1.cmpTransform.mtxLocal.translation);
            // let distancePlayer2 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player2.cmpTransform.mtxLocal.translation);
            if (distancePlayer1 > this.distance) {
                this.moveSimple();
            }
            else {
                let degree = InputSystem.calcDegree(this.cmpTransform.mtxLocal.translation, this.target)
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