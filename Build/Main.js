"use strict";
//#region "Imports"
///<reference types="../FUDGE/Core/Build/FudgeCore.js"/>
///<reference types="../FUDGE/Aid/Build/FudgeAid.js"/>
//#endregion "Imports"
var Game;
//#region "Imports"
///<reference types="../FUDGE/Core/Build/FudgeCore.js"/>
///<reference types="../FUDGE/Aid/Build/FudgeAid.js"/>
//#endregion "Imports"
(function (Game) {
    Game.ƒ = FudgeCore;
    Game.ƒAid = FudgeAid;
    //#region "DomElements"
    Game.canvas = document.getElementById("Canvas");
    // window.addEventListener("load", init);
    window.addEventListener("load", start);
    document.getElementById("Ranged").addEventListener("click", playerChoice);
    document.getElementById("Melee").addEventListener("click", playerChoice);
    //#endregion "DomElements"
    //#region "PublicVariables"
    Game.viewport = new Game.ƒ.Viewport();
    Game.graph = new Game.ƒ.Node("Graph");
    Game.connected = false;
    Game.frameRate = 60;
    Game.enemies = [];
    //#endregion "PublicVariables"
    //#region "PrivateVariables"
    let item1;
    let cmpCamera = new Game.ƒ.ComponentCamera();
    let playerType;
    const damper = 3.5;
    //#endregion "PrivateVariables"
    //#region "essential"
    async function init() {
        if (Bullets.bulletTxt == null) {
            loadTextures();
        }
        await loadEnemiesJSON();
        if (Game.player1 == null) {
            Game.player1 = new Player.Ranged("Player1", new Player.Character("Thor,", new Player.Attributes(10, 5, 5)));
        }
        // ƒ.Debug.log(player);
        //#region init Items
        item1 = new Items.InternalItem("cooldown reduction", "adds speed and shit", new Game.ƒ.Vector3(0, 2, 0), new Player.Attributes(0, 0, 0, 100), Items.ITEMTYPE.PROCENTUAL, "./Resources/Image/Items");
        //#endregion
        Generation.generateRooms();
        // let enemy = new Enemy.EnemyCircle("sörkler", new Player.Character("sörki", new Player.Attributes(10, 2, 3)), new ƒ.Vector2(2, 3));
        // graph.addChild(enemy);
        //#region Testing objects
        let node = new Game.ƒ.Node("Quad");
        node.addComponent(new Game.ƒ.ComponentTransform());
        let mesh = new Game.ƒ.MeshQuad();
        let cmpMesh = new Game.ƒ.ComponentMesh(mesh);
        node.addComponent(cmpMesh);
        let mtrSolidWhite = new Game.ƒ.Material("SolidWhite", Game.ƒ.ShaderFlat, new Game.ƒ.CoatRemissive(Game.ƒ.Color.CSS("white")));
        let cmpMaterial = new Game.ƒ.ComponentMaterial(mtrSolidWhite);
        node.addComponent(cmpMaterial);
        let newTxt = new Game.ƒ.TextureImage();
        let newCoat = new Game.ƒ.CoatRemissiveTextured();
        let oldComCoat = new Game.ƒ.ComponentMaterial();
        let newMtr = new Game.ƒ.Material("mtr", Game.ƒ.ShaderFlatTextured, newCoat);
        let oldPivot = new Game.ƒ.Matrix4x4();
        oldComCoat = node.getComponent(Game.ƒ.ComponentMaterial);
        oldPivot = node.getComponent(Game.ƒ.ComponentMesh).mtxPivot;
        await newTxt.load("./Resources/Image/gras.png");
        newCoat.color = Game.ƒ.Color.CSS("WHITE");
        newCoat.texture = newTxt;
        oldComCoat.material = newMtr;
        node.cmpTransform.mtxLocal.scale(new Game.ƒ.Vector3(30, 30, 1));
        node.cmpTransform.mtxLocal.translateZ(-0.01);
        Game.graph.appendChild(Game.player1);
        Game.graph.appendChild(item1);
        Game.ƒAid.addStandardLightComponents(Game.graph);
        cmpCamera.mtxPivot.translateZ(25);
        cmpCamera.mtxPivot.rotateY(180);
        Game.ƒ.Debug.log(Game.graph);
        Game.viewport.initialize("Viewport", Game.graph, cmpCamera, Game.canvas);
        draw();
        Game.ƒ.Loop.start(Game.ƒ.LOOP_MODE.TIME_GAME, Game.frameRate);
    }
    function update() {
        InputSystem.move();
        if (Game.player2 != undefined && !Game.connected) {
            Game.connected = true;
        }
        draw();
        cameraUpdate();
        Game.player1.cooldown();
        if (Game.connected) {
            Game.player2.cooldown();
        }
        if (Game.connected) {
            Networking.updatePosition(Game.player1.mtxLocal.translation, Game.player1.mtxLocal.rotation);
        }
        // Networking.spawnEnemy(bat, bat.id);
        //#region count items
        let items = Game.graph.getChildren().filter(element => element.tag == Tag.Tag.ITEM);
        items.forEach(element => {
            element.lifespan(Game.graph);
            element.collisionDetection();
        });
        //#endregion
        let bullets = Game.graph.getChildren().filter(element => element.tag == Tag.Tag.BULLET);
        bullets.forEach(element => {
            element.move();
            element.lifespan(Game.graph);
        });
        let damageUI = Game.graph.getChildren().filter(element => element.tag == Tag.Tag.DAMAGEUI);
        damageUI.forEach(element => {
            element.move();
            element.lifespan(Game.graph);
        });
        Game.enemies = Game.graph.getChildren().filter(element => element.tag == Tag.Tag.ENEMY);
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Game.enemies.forEach(element => {
                element.move();
                element.lifespan(Game.graph);
            });
            EnemySpawner.spawnEnemies();
        }
        UI.updateUI();
    }
    function start() {
        loadTextures();
        //add sprite to graphe for startscreen
        document.getElementById("Startscreen").style.visibility = "visible";
        document.getElementById("StartGame").addEventListener("click", () => {
            Networking.conneting();
            document.getElementById("Startscreen").style.visibility = "hidden";
            document.getElementById("Lobbyscreen").style.visibility = "visible";
            waitOnConnection();
        });
        document.getElementById("Option").addEventListener("click", () => {
        });
        document.getElementById("Credits").addEventListener("click", () => {
        });
    }
    async function loadEnemiesJSON() {
        const load = await (await fetch("./Resources/EnemiesStorage.json")).json();
        Game.enemiesJSON = load.enemies;
    }
    async function loadTextures() {
        await Bullets.bulletTxt.load("./Resources/Image/arrow.png");
        await UI.txtZero.load("./Resources/Image/0.png");
        await UI.txtOne.load("./Resources/Image/1.png");
        await UI.txtTow.load("./Resources/Image/2.png");
        await UI.txtThree.load("./Resources/Image/3.png");
        await UI.txtFour.load("./Resources/Image/4.png");
        await UI.txtFive.load("./Resources/Image/5.png");
        await UI.txtSix.load("./Resources/Image/6.png");
        await UI.txtSeven.load("./Resources/Image/7.png");
        await UI.txtEight.load("./Resources/Image/8.png");
        await UI.txtNine.load("./Resources/Image/9.png");
        await UI.txtTen.load("./Resources/Image/10.png");
    }
    async function waitOnConnection() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: Networking.FUNCTION.CONNECTED, value: Networking.client.id } });
        if (Networking.clients.length > 1 && Game.player1 != null) {
            await init();
            Networking.spawnPlayer(playerType);
        }
        else {
            setTimeout(waitOnConnection, 300);
        }
    }
    function playerChoice(_e) {
        if (_e.target.id == "Ranged") {
            Game.player1 = new Player.Ranged("player", new Player.Character("Thor,", new Player.Attributes(10, 5, 5)));
            playerType = Player.Type.RANGED;
        }
        if (_e.target.id == "Melee") {
            Game.player1 = new Player.Melee("player", new Player.Character("Thor,", new Player.Attributes(10, 1, 5)));
            playerType = Player.Type.MELEE;
        }
        document.getElementById("Lobbyscreen").style.visibility = "hidden";
    }
    function draw() {
        Game.viewport.draw();
    }
    function cameraUpdate() {
        let direction = Game.ƒ.Vector2.DIFFERENCE(Game.player1.cmpTransform.mtxLocal.translation.toVector2(), cmpCamera.mtxPivot.translation.toVector2());
        direction.scale(1 / Game.frameRate * damper);
        cmpCamera.mtxPivot.translate(new Game.ƒ.Vector3(-direction.x, direction.y, 0), true);
    }
    Game.cameraUpdate = cameraUpdate;
    Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
    //#endregion "essential"
})(Game || (Game = {}));
var Enemy;
(function (Enemy_1) {
    let BEHAVIOUR;
    (function (BEHAVIOUR) {
        BEHAVIOUR[BEHAVIOUR["FOLLOW"] = 0] = "FOLLOW";
        BEHAVIOUR[BEHAVIOUR["FLEE"] = 1] = "FLEE";
    })(BEHAVIOUR || (BEHAVIOUR = {}));
    var ƒAid = FudgeAid;
    class DumbInstructions {
        static get() {
            let setup = new ƒAid.StateMachineInstructions();
            setup.transitDefault = DumbInstructions.transitDefault;
            setup.actDefault = DumbInstructions.actDefault;
            setup.setAction(BEHAVIOUR.FOLLOW, this.stop);
            return setup;
        }
        static async actDefault(_machine) {
            // console.log("defaulAction");
            // _machine.transit(BEHAVIOUR.FOLLOW);
            // _machine.act();
        }
        static transitDefault(_machine) {
            // console.log("transition");
        }
        // private static transit(_machine: ƒAid.StateMachine<BEHAVIOUR>) {
        //     console.log("transit transit");
        // }
        static async stop(_machine) {
            // console.log("stop");
            // _machine.transit(BEHAVIOUR.IDLE);
            // // _machine.act();
        }
    }
    class Enemy extends Game.ƒAid.NodeSprite {
        tag = Tag.Tag.ENEMY;
        netId = Networking.idGenerator();
        properties;
        collider;
        target;
        lifetime;
        canMoveX = true;
        canMoveY = true;
        //#region  animation
        animations;
        clrWhite = ƒ.Color.CSS("white");
        //#endregion
        /**
         * Creates an Enemy
         * @param _name Name of the enemy
         * @param _properties Properties, storing attributes and stuff
         * @param _position position where to spawn
         * @param _aiType optional: standard ai = dumb
         */
        constructor(_name, _properties, _position, _id) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.properties = _properties;
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            if (_id != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_id);
                this.netId = _id;
            }
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2);
            Networking.spawnEnemy(this, this.netId);
            //TODO: add sprite animation
            this.startSprite();
        }
        async startSprite() {
            await this.loadSprites();
            this.setAnimation(this.animations["fly"]);
            this.setFrameDirection(1);
            this.framerate = 12;
        }
        async loadSprites() {
            let imgSpriteSheet = new ƒ.TextureImage();
            await imgSpriteSheet.load("./Resources/Image/Enemies/spinni.png");
            let spriteSheet = new ƒ.CoatTextured(this.clrWhite, imgSpriteSheet);
            this.generateSprites(spriteSheet);
        }
        generateSprites(_spritesheet) {
            this.animations = {};
            let name = "fly";
            let sprite = new ƒAid.SpriteSheetAnimation(name, _spritesheet);
            sprite.generateByGrid(ƒ.Rectangle.GET(0, 0, 18, 14), 4, 22, ƒ.ORIGIN2D.BOTTOMCENTER, ƒ.Vector2.X(18));
            this.animations[name] = sprite;
        }
        move() {
            this.updateCollider();
            Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId);
        }
        updateCollider() {
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
        }
        getTarget() {
            let target = Game.player1;
            if (Game.connected) {
                let distancePlayer1 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player1.cmpTransform.mtxLocal.translation);
                let distancePlayer2 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player2.cmpTransform.mtxLocal.translation);
                if (distancePlayer1 < distancePlayer2) {
                    target = Game.player1;
                }
                else {
                    target = Game.player2;
                }
            }
            return target.cmpTransform.mtxLocal.translation;
        }
        moveSimple() {
            this.target = this.getTarget();
            let direction = Game.ƒ.Vector3.DIFFERENCE(this.target, this.cmpTransform.mtxLocal.translation);
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
            let direction = Game.ƒ.Vector3.DIFFERENCE(this.cmpTransform.mtxLocal.translation, this.target);
            direction.normalize();
            direction.scale((1 / Game.frameRate * this.properties.attributes.speed));
            // this.cmpTransform.mtxLocal.translate(direction, true);
            this.getCanMoveXY(direction);
        }
        lifespan(_graph) {
            if (this.properties.attributes.healthPoints <= 0) {
                Networking.removeEnemy(this.netId);
                Networking.popID(this.netId);
                _graph.removeChild(this);
            }
        }
        getCanMoveXY(direction) {
            let canMoveX = true;
            let canMoveY = true;
            let colliders = Game.graph.getChildren().find(element => element.tag == Tag.Tag.ROOM).walls;
            colliders.forEach((element) => {
                if (this.collider.collidesRect(element.collider)) {
                    let intersection = this.collider.getIntersectionRect(element.collider);
                    let areaBeforeMove = Math.round((intersection.height * intersection.width) * 1000) / 1000;
                    let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                    let newDirection = new Game.ƒ.Vector2(direction.x, 0);
                    this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                    if (this.collider.getIntersectionRect(element.collider) != null) {
                        let newIntersection = this.collider.getIntersectionRect(element.collider);
                        let areaAfterMove = Math.round((newIntersection.height * newIntersection.width) * 1000) / 1000;
                        if (areaBeforeMove < areaAfterMove) {
                            canMoveX = false;
                        }
                    }
                    this.collider.position = oldPosition;
                    newDirection = new Game.ƒ.Vector2(0, direction.y);
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
            if (canMoveX && canMoveY) {
                this.cmpTransform.mtxLocal.translate(direction);
            }
            else if (canMoveX && !canMoveY) {
                direction = new ƒ.Vector3(direction.x, 0, direction.z);
                this.cmpTransform.mtxLocal.translate(direction);
            }
            else if (!canMoveX && canMoveY) {
                direction = new ƒ.Vector3(0, direction.y, direction.z);
                this.cmpTransform.mtxLocal.translate(direction);
            }
        }
    }
    Enemy_1.Enemy = Enemy;
    class EnemyDumb extends Enemy {
        static instructions = DumbInstructions.get();
        stateMachine = new ƒAid.ComponentStateMachine();
        constructor(_name, _properties, _position) {
            super(_name, _properties, _position);
            this.stateMachine.instructions = EnemyDumb.instructions;
            this.addComponent(this.stateMachine);
            this.stateMachine.act();
        }
        move() {
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
                    this.moveSimple();
                    break;
                default:
                    this.moveSimple();
                    break;
            }
        }
        lifespan(_graph) {
            super.lifespan(_graph);
        }
    }
    Enemy_1.EnemyDumb = EnemyDumb;
    class EnemyFlee extends Enemy {
        constructor(_name, _properties, _position) {
            super(_name, _properties, _position);
        }
        move() {
            super.move();
            this.moveAway();
        }
        lifespan(_graph) {
            super.lifespan(_graph);
        }
    }
    Enemy_1.EnemyFlee = EnemyFlee;
    class EnemyCircle extends Enemy {
        distance = 5;
        constructor(_name, _properties, _position) {
            super(_name, _properties, _position);
        }
        move() {
            super.move();
            this.moveCircle();
        }
        lifespan(_graph) {
            super.lifespan(_graph);
        }
        async moveCircle() {
            this.target = this.getTarget();
            console.log(this.target);
            let distancePlayer1 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player1.cmpTransform.mtxLocal.translation);
            // let distancePlayer2 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player2.cmpTransform.mtxLocal.translation);
            if (distancePlayer1 > this.distance) {
                this.moveSimple();
            }
            else {
                let degree = InputSystem.calcDegree(this.cmpTransform.mtxLocal.translation, this.target);
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
    Enemy_1.EnemyCircle = EnemyCircle;
})(Enemy || (Enemy = {}));
var Items;
(function (Items) {
    let ITEMTYPE;
    (function (ITEMTYPE) {
        ITEMTYPE[ITEMTYPE["ADD"] = 0] = "ADD";
        ITEMTYPE[ITEMTYPE["SUBSTRACT"] = 1] = "SUBSTRACT";
        ITEMTYPE[ITEMTYPE["PROCENTUAL"] = 2] = "PROCENTUAL";
    })(ITEMTYPE = Items.ITEMTYPE || (Items.ITEMTYPE = {}));
    class Item extends Game.ƒAid.NodeSprite {
        tag = Tag.Tag.ITEM;
        id = Networking.idGenerator();
        description;
        imgSrc;
        collider;
        lifetime;
        constructor(_name, _description, _position, _imgSrc, _lifetime) {
            super(_name);
            this.description = _description;
            this.imgSrc = _imgSrc;
            this.lifetime = _lifetime;
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.translate(_position);
            this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
        }
        lifespan(_graph) {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                // ƒ.Debug.log(this.name + ": " + this.lifetime);
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                    Networking.popID(this.id);
                }
            }
        }
        async collisionDetection() {
            let colliders = Game.graph.getChildren().filter(element => element.tag == Tag.Tag.PLAYER);
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider) && element.properties != undefined) {
                    // (<Player.Player>element).properties.attributes.addAttribuesByItem(this);
                    // console.log((<Enemy.Enemy>element).properties.attributes.healthPoints);
                    this.lifetime = 0;
                }
            });
        }
    }
    Items.Item = Item;
    class InternalItem extends Item {
        attributes;
        type;
        /**
         * Creates an item that can change Attributes of the player
         * @param _name name of the Item
         * @param _description Descirption of the item
         * @param _position Position where to spawn
         * @param _lifetime optional: how long is the item visible
         * @param _attributes define which attributes will change, compare with {@link Player.Attributes}
         */
        constructor(_name, _description, _position, _attributes, _type, _imgSrc, _lifetime) {
            super(_name, _description, _position, _imgSrc, _lifetime);
            this.attributes = _attributes;
            this.type = _type;
        }
        async collisionDetection() {
            let colliders = Game.graph.getChildren().filter(element => element.tag == Tag.Tag.PLAYER);
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider) && element.properties != undefined && (this.lifetime > 0 || this.lifetime == undefined)) {
                    element.properties.attributes.addAttribuesByItem(this.attributes, this.type);
                    // console.log((<Enemy.Enemy>element).properties.attributes.healthPoints);
                    this.lifetime = 0;
                }
            });
        }
    }
    Items.InternalItem = InternalItem;
})(Items || (Items = {}));
var Player;
(function (Player) {
    class Attributes {
        healthPoints;
        maxHealthPoints;
        speed;
        attackPoints;
        coolDownReduction = 1;
        constructor(_healthPoints, _attackPoints, _speed, _cooldownReduction) {
            this.healthPoints = _healthPoints;
            this.maxHealthPoints = _healthPoints;
            this.attackPoints = _attackPoints;
            this.speed = _speed;
            if (_cooldownReduction != undefined) {
                this.coolDownReduction = _cooldownReduction;
            }
        }
        /**
         * adds Attributes to the Player Attributes
         * @param _attributes incoming attributes
         */
        addAttribuesByItem(_attributes, _itemType) {
            switch (_itemType) {
                case Items.ITEMTYPE.ADD:
                    this.healthPoints += _attributes.healthPoints;
                    this.maxHealthPoints += _attributes.maxHealthPoints;
                    this.speed += _attributes.speed;
                    this.attackPoints += _attributes.attackPoints;
                    break; // calculate attributes by adding them
                case Items.ITEMTYPE.SUBSTRACT:
                    break; // calculate attribes by substacting them
                case Items.ITEMTYPE.PROCENTUAL:
                    this.healthPoints = this.healthPoints * ((100 + _attributes.healthPoints) / 100);
                    this.attackPoints = this.attackPoints * ((100 + _attributes.attackPoints) / 100);
                    this.speed = this.speed * ((100 + _attributes.speed) / 100);
                    console.log(this.coolDownReduction);
                    this.coolDownReduction = this.coolDownReduction * Math.fround((100 / (100 + _attributes.coolDownReduction)));
                    console.log(this.coolDownReduction);
                    break; // calculate attributes by giving spefic %
            }
        }
    }
    Player.Attributes = Attributes;
})(Player || (Player = {}));
var Bullets;
(function (Bullets) {
    Bullets.bulletTxt = new ƒ.TextureImage();
    class Bullet extends Game.ƒ.Node {
        tag = Tag.Tag.BULLET;
        flyDirection;
        collider;
        hitPoints = 5;
        speed = 20;
        lifetime = 1 * Game.frameRate;
        killcount = 1;
        async lifespan(_graph) {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                }
            }
        }
        constructor(_position, _direction) {
            super("normalBullet");
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            this.flyDirection = _direction;
            let mesh = new ƒ.MeshQuad();
            let cmpMesh = new ƒ.ComponentMesh(mesh);
            this.addComponent(cmpMesh);
            let mtrSolidWhite = new ƒ.Material("SolidWhite", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            let cmpMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);
            this.loadTexture();
            this.mtxLocal.rotateZ(InputSystem.calcDegree(this.cmpTransform.mtxLocal.translation, ƒ.Vector3.SUM(_direction, this.cmpTransform.mtxLocal.translation)) + 90);
            this.cmpTransform.mtxLocal.scaleY(0.25);
            this.flyDirection = ƒ.Vector3.X();
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2);
        }
        async move() {
            this.cmpTransform.mtxLocal.translate(this.flyDirection);
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
            this.collisionDetection();
        }
        loadTexture() {
            let newTxt = new ƒ.TextureImage();
            let newCoat = new ƒ.CoatRemissiveTextured();
            let newMtr = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);
            let oldComCoat = new ƒ.ComponentMaterial();
            oldComCoat = this.getComponent(ƒ.ComponentMaterial);
            newTxt = Bullets.bulletTxt;
            newCoat.color = ƒ.Color.CSS("WHITE");
            newCoat.texture = newTxt;
            oldComCoat.material = newMtr;
        }
        async collisionDetection() {
            let colliders = Game.graph.getChildren().filter(element => element.tag == Tag.Tag.ENEMY);
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider) && element.properties != undefined && this.killcount > 0) {
                    element.properties.attributes.healthPoints -= this.hitPoints;
                    Game.graph.addChild(new UI.DamageUI(element.cmpTransform.mtxLocal.translation, this.hitPoints));
                    // console.log((<Enemy.Enemy>element).properties.attributes.healthPoints);
                    this.lifetime = 0;
                    this.killcount--;
                }
            });
            colliders = [];
            colliders = Game.graph.getChildren().find(element => element.tag == Tag.Tag.ROOM).walls;
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider)) {
                    this.lifetime = 0;
                }
            });
        }
    }
    Bullets.Bullet = Bullet;
    class SlowBullet extends Bullet {
        constructor(_position, _direction) {
            super(_position, _direction);
            this.speed = 6;
            this.hitPoints = 10;
            this.lifetime = 5 * Game.frameRate;
        }
    }
    Bullets.SlowBullet = SlowBullet;
    class MeleeBullet extends Bullet {
        constructor(_position, _direction) {
            super(_position, _direction);
            this.speed = 6;
            this.hitPoints = 10;
            this.lifetime = 6;
            this.killcount = 4;
        }
        async loadTexture() {
        }
    }
    Bullets.MeleeBullet = MeleeBullet;
})(Bullets || (Bullets = {}));
var Player;
(function (Player) {
    class Character {
        name;
        attributes;
        constructor(_name, _attributes) {
            this.name = _name;
            this.attributes = _attributes;
        }
    }
    Player.Character = Character;
})(Player || (Player = {}));
var Collider;
(function (Collider_1) {
    class Collider {
        radius;
        position;
        get top() {
            return (this.position.y - this.radius);
        }
        get left() {
            return (this.position.x - this.radius);
        }
        get right() {
            return (this.position.x + this.radius);
        }
        get bottom() {
            return (this.position.y + this.radius);
        }
        constructor(_position, _radius) {
            this.position = _position;
            this.radius = _radius;
        }
        collides(_collider) {
            let distance = ƒ.Vector2.DIFFERENCE(this.position, _collider.position);
            if (this.radius + _collider.radius > distance.magnitude) {
                return true;
            }
            return false;
        }
        collidesRect(_collider) {
            if (this.left > _collider.right)
                return false;
            if (this.right < _collider.left)
                return false;
            if (this.top > _collider.bottom)
                return false;
            if (this.bottom < _collider.top)
                return false;
            return true;
        }
        getIntersection(_collider) {
            if (!this.collides(_collider))
                return null;
            let distance = ƒ.Vector2.DIFFERENCE(this.position, _collider.position);
            let intersection = this.radius + _collider.radius - distance.magnitude;
            return intersection;
        }
        getIntersectionRect(_collider) {
            if (!this.collidesRect(_collider))
                return null;
            let intersection = new ƒ.Rectangle();
            intersection.x = Math.max(this.left, _collider.left);
            intersection.y = Math.max(this.top, _collider.top);
            intersection.width = Math.min(this.right, _collider.right) - intersection.x;
            intersection.height = Math.min(this.bottom, _collider.bottom) - intersection.y;
            return intersection;
        }
    }
    Collider_1.Collider = Collider;
})(Collider || (Collider = {}));
var EnemySpawner;
(function (EnemySpawner) {
    let spawnTime = 1 * Game.frameRate;
    let currentTime = spawnTime;
    let maxEnemies = 20;
    function spawnEnemies() {
        if (Game.enemies.length < maxEnemies) {
            // console.log(Game.enemies.length);
            if (currentTime == spawnTime) {
                const ref = Game.enemiesJSON.find(elem => elem.name == "bat");
                Game.graph.addChild(new Enemy.EnemyDumb("Enemy", new Player.Character(ref.name, new Player.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed)), new ƒ.Vector2((Math.random() * 7 - (Math.random() * 7)) * 2, (Math.random() * 7 - (Math.random() * 7) * 2))));
            }
            currentTime--;
            if (currentTime <= 0) {
                currentTime = spawnTime;
            }
        }
    }
    EnemySpawner.spawnEnemies = spawnEnemies;
    class EnemySpawnes {
        spawnPositions = [];
        numberOfENemies;
        spawnOffset = 5;
        constructor(_roomSize, _numberOfEnemies) {
            this.numberOfENemies = _numberOfEnemies;
        }
        getSpawnPositions(_room) {
            return [new ƒ.Vector2(0 + this.spawnOffset, 0 + this.spawnOffset), new ƒ.Vector2(_room.getRoomSize() - this.spawnOffset, _room.getRoomSize() + this.spawnOffset)];
        }
    }
    EnemySpawner.EnemySpawnes = EnemySpawnes;
})(EnemySpawner || (EnemySpawner = {}));
var InputSystem;
(function (InputSystem) {
    document.addEventListener("keydown", keyboardDownEvent);
    document.addEventListener("keyup", keyboardUpEvent);
    Game.canvas.addEventListener("mousedown", attack);
    Game.canvas.addEventListener("mousemove", rotateToMouse);
    //#region rotate
    let mousePosition;
    function rotateToMouse(_mouseEvent) {
        let ray = Game.viewport.getRayFromClient(new ƒ.Vector2(_mouseEvent.offsetX, _mouseEvent.offsetY));
        mousePosition = ray.intersectPlane(new ƒ.Vector3(0, 0, 0), new ƒ.Vector3(0, 0, 1));
        Game.player1.mtxLocal.rotation = new ƒ.Vector3(0, 0, calcDegree(Game.player1.mtxLocal.translation, mousePosition));
    }
    function calcDegree(_center, _target) {
        let xDistance = _target.x - _center.x;
        let yDistance = _target.y - _center.y;
        let degrees = Math.atan2(yDistance, xDistance) * (180 / Math.PI) - 90;
        return degrees;
    }
    InputSystem.calcDegree = calcDegree;
    function calcPositionFromDegree(_degrees, _distance) {
        let distance = 5;
        let newDeg = (_degrees * Math.PI) / 180;
        let y = Math.cos(newDeg);
        let x = Math.sin(newDeg) * -1;
        let coord = new ƒ.Vector2(x, y);
        coord.scale(distance);
        return coord;
    }
    InputSystem.calcPositionFromDegree = calcPositionFromDegree;
    //#endregion
    //#region move
    let controller = new Map([
        ["W", false],
        ["A", false],
        ["S", false],
        ["D", false]
    ]);
    function keyboardDownEvent(_e) {
        let key = _e.code.toUpperCase().substring(3);
        controller.set(key, true);
    }
    function keyboardUpEvent(_e) {
        let key = _e.code.toUpperCase().substring(3);
        controller.set(key, false);
    }
    function move() {
        let moveVector = Game.ƒ.Vector3.ZERO();
        let hasChanged = false;
        if (controller.get("W")) {
            moveVector.y += 1;
            hasChanged = true;
        }
        if (controller.get("A")) {
            moveVector.x -= 1;
            hasChanged = true;
        }
        if (controller.get("S")) {
            moveVector.y -= 1;
            hasChanged = true;
        }
        if (controller.get("D")) {
            moveVector.x += 1;
            hasChanged = true;
        }
        if (hasChanged && moveVector.magnitude != 0) {
            Game.player1.move(Game.ƒ.Vector3.NORMALIZATION(moveVector, 1));
        }
    }
    InputSystem.move = move;
    //#endregion
    //#region attack
    function attack(e_) {
        let mouseButton = e_.button;
        switch (mouseButton) {
            case 0:
                //left mouse button player.attack
                let direction = ƒ.Vector3.DIFFERENCE(mousePosition, Game.player1.mtxLocal.translation);
                rotateToMouse(e_);
                Game.player1.attack(direction);
                if (Game.connected) {
                    Networking.updateBullet(direction);
                }
                break;
            case 2:
                //TODO: right mouse button player.charge or something like that
                break;
            default:
                break;
        }
    }
    //#endregion
})(InputSystem || (InputSystem = {}));
var Level;
(function (Level) {
    class Landscape extends ƒ.Node {
        constructor(_name) {
            super(_name);
            // this.getChildren()[0].getComponent(Game.ƒ.ComponentTransform).mtxLocal.translateZ(-2)
        }
    }
    Level.Landscape = Landscape;
})(Level || (Level = {}));
///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>
var Networking;
///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>
(function (Networking) {
    let FUNCTION;
    (function (FUNCTION) {
        FUNCTION[FUNCTION["CONNECTED"] = 0] = "CONNECTED";
        FUNCTION[FUNCTION["SPAWN"] = 1] = "SPAWN";
        FUNCTION[FUNCTION["TRANSFORM"] = 2] = "TRANSFORM";
        FUNCTION[FUNCTION["BULLET"] = 3] = "BULLET";
        FUNCTION[FUNCTION["SPAWNENEMY"] = 4] = "SPAWNENEMY";
        FUNCTION[FUNCTION["ENEMYTRANSFORM"] = 5] = "ENEMYTRANSFORM";
        FUNCTION[FUNCTION["ENEMYDIE"] = 6] = "ENEMYDIE";
    })(FUNCTION = Networking.FUNCTION || (Networking.FUNCTION = {}));
    var ƒClient = FudgeNet.FudgeClient;
    Networking.clients = [];
    Networking.someoneIsHost = false;
    Networking.currentIDs = [];
    document.getElementById("Host").addEventListener("click", () => { spawnPlayer(); }, true);
    let IPConnection = document.getElementById("IPConnection");
    document.getElementById("Connecting").addEventListener("click", conneting, true);
    function conneting() {
        Networking.client = new ƒClient();
        Networking.client.addEventListener(FudgeNet.EVENT.MESSAGE_RECEIVED, receiveMessage);
        Networking.client.connectToServer(IPConnection.value);
        addClientID();
        function addClientID() {
            if (Networking.client.id != undefined) {
                Networking.clients.push(Networking.client.id);
            }
            else {
                setTimeout(addClientID, 300);
            }
        }
    }
    Networking.conneting = conneting;
    async function receiveMessage(_event) {
        if (_event instanceof MessageEvent) {
            let message = JSON.parse(_event.data);
            if (message.idSource != Networking.client.id) {
                if (message.command != FudgeNet.COMMAND.SERVER_HEARTBEAT && message.command != FudgeNet.COMMAND.CLIENT_HEARTBEAT) {
                    if (message.content != undefined && message.content.text == FUNCTION.CONNECTED.toString()) {
                        if (message.content.value != Networking.client.id && Networking.clients.find(element => element == message.content.value) == undefined) {
                            Networking.clients.push(message.content.value);
                        }
                    }
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWN.toString()) {
                        console.table(message.content.type);
                        if (message.content.type == Player.Type.MELEE) {
                            Game.player2 = new Player.Melee("player2", new Player.Character(message.content.value.name, new Player.Attributes(message.content.value.attributes.healthPoints, message.content.value.attributes.attackPoints, message.content.value.attributes.speed)));
                            Game.player2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            Game.graph.appendChild(Game.player2);
                            Game.connected = true;
                        }
                        else if (message.content.type == Player.Type.RANGED) {
                            Game.player2 = new Player.Ranged("player2", new Player.Character(message.content.value.name, new Player.Attributes(message.content.value.attributes.healthPoints, message.content.value.attributes.attackPoints, message.content.value.attributes.speed)));
                            Game.player2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            Game.graph.appendChild(Game.player2);
                            Game.connected = true;
                        }
                    }
                    if (Game.connected) {
                        if (message.content != undefined && message.content.text == FUNCTION.TRANSFORM.toString()) {
                            let moveVector = new Game.ƒ.Vector3(message.content.value.data[0], message.content.value.data[1], message.content.value.data[2]);
                            let rotateVector = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);
                            Game.player2.mtxLocal.translation = moveVector;
                            Game.player2.mtxLocal.rotation = rotateVector;
                        }
                        if (message.content != undefined && message.content.text == FUNCTION.BULLET.toString()) {
                            Game.player2.attack(new Game.ƒ.Vector3(message.content.direction.data[0], message.content.direction.data[1], message.content.direction.data[2]));
                        }
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNENEMY.toString()) {
                            Game.graph.addChild(new Enemy.Enemy("normalEnemy", new Player.Character(message.content.enemy.name, new Player.Attributes(message.content.enemy.attributes.healthPoints, message.content.enemy.attributes.attackPoints, message.content.enemy.attributes.speed)), new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]), message.content.id));
                        }
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYTRANSFORM.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.id);
                            if (enemy != undefined) {
                                enemy.cmpTransform.mtxLocal.translation = new ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                enemy.updateCollider();
                            }
                        }
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYDIE.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.id);
                            Game.graph.removeChild(enemy);
                            popID(message.content.id);
                        }
                    }
                }
            }
        }
    }
    //#region player
    function spawnPlayer(_type) {
        if (Networking.client.idHost == undefined) {
            Networking.client.becomeHost();
            Networking.someoneIsHost = true;
        }
        if (_type == Player.Type.MELEE) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.Type.MELEE, value: Game.player1.properties, position: Game.player1.cmpTransform.mtxLocal.translation } });
        }
        else if (_type == Player.Type.RANGED) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.Type.RANGED, value: Game.player1.properties, position: Game.player1.cmpTransform.mtxLocal.translation } });
        }
        else {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.Type.RANGED, value: Game.player1.properties, position: Game.player1.cmpTransform.mtxLocal.translation } });
        }
    }
    Networking.spawnPlayer = spawnPlayer;
    /**
     * sends transform over network
     * @param __position current position of Object
     * @param _rotation current rotation of Object
     */
    function updatePosition(_position, _rotation) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.TRANSFORM, value: _position, rotation: _rotation } });
    }
    Networking.updatePosition = updatePosition;
    function updateBullet(_direction) {
        if (Game.connected) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.BULLET, direction: _direction } });
        }
    }
    Networking.updateBullet = updateBullet;
    //#endregion
    //#region  enemy
    function spawnEnemy(_enemy, _id) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            // console.log(_enemy.properties);
            // console.log(_id);
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWNENEMY, enemy: _enemy.properties, position: _enemy.mtxLocal.translation, id: _id } });
        }
    }
    Networking.spawnEnemy = spawnEnemy;
    function updateEnemyPosition(_position, _id) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.ENEMYTRANSFORM, position: _position, id: _id } });
    }
    Networking.updateEnemyPosition = updateEnemyPosition;
    function removeEnemy(_id) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.ENEMYDIE, id: _id } });
    }
    Networking.removeEnemy = removeEnemy;
    //#endregion
    function idGenerator() {
        let id = Math.floor(Math.random() * 1000);
        if (Networking.currentIDs.find(curID => curID == id)) {
            idGenerator();
        }
        else {
            Networking.currentIDs.push(id);
        }
        return id;
    }
    Networking.idGenerator = idGenerator;
    function popID(_id) {
        let index;
        for (let i = 0; i < Networking.currentIDs.length; i++) {
            if (Networking.currentIDs[i] == _id) {
                index = i;
                break;
            }
        }
        // console.log("id to pop: " + _id);
        Networking.currentIDs.splice(index, 1);
        // console.log("afterIDs: " + currentIDs);
    }
    Networking.popID = popID;
    window.addEventListener("beforeunload", onUnload, false);
    function onUnload() {
        //TODO: Things we do after the player left the game
    }
})(Networking || (Networking = {}));
var Player;
(function (Player_1) {
    let Type;
    (function (Type) {
        Type[Type["RANGED"] = 0] = "RANGED";
        Type[Type["MELEE"] = 1] = "MELEE";
    })(Type = Player_1.Type || (Player_1.Type = {}));
    class Player extends Game.ƒAid.NodeSprite {
        tag = Tag.Tag.PLAYER;
        items = [];
        properties;
        weapon = new Weapons.Weapon(12, 1);
        collider;
        constructor(_name, _properties) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.properties = _properties;
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2);
        }
        move(_direction) {
            let canMoveX = true;
            let canMoveY = true;
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
            _direction.scale((1 / 60 * this.properties.attributes.speed));
            let colliders = Game.graph.getChildren().find(element => element.tag == Tag.Tag.ROOM).walls;
            colliders.forEach((element) => {
                if (this.collider.collidesRect(element.collider)) {
                    let intersection = this.collider.getIntersectionRect(element.collider);
                    let areaBeforeMove = Math.round((intersection.height * intersection.width) * 1000) / 1000;
                    let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                    let newDirection = new Game.ƒ.Vector2(_direction.x, 0);
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
            if (canMoveX && canMoveY) {
                this.cmpTransform.mtxLocal.translate(_direction, false);
            }
            else if (canMoveX && !canMoveY) {
                _direction = new ƒ.Vector3(_direction.x, 0, _direction.z);
                this.cmpTransform.mtxLocal.translate(_direction, false);
            }
            else if (!canMoveX && canMoveY) {
                _direction = new ƒ.Vector3(0, _direction.y, _direction.z);
                this.cmpTransform.mtxLocal.translate(_direction, false);
            }
        }
        attack(_direction) {
            if (this.weapon.currentAttackCount > 0) {
                _direction.normalize();
                let bullet = new Bullets.Bullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction);
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
                Game.graph.addChild(bullet);
                this.weapon.currentAttackCount--;
            }
        }
        cooldown() {
            let specificCoolDownTime = this.weapon.cooldownTime * this.properties.attributes.coolDownReduction;
            // console.log(this.properties.attributes.coolDownReduction);
            if (this.weapon.currentAttackCount <= 0) {
                if (this.weapon.currentCooldownTime <= 0) {
                    this.weapon.currentCooldownTime = specificCoolDownTime;
                    this.weapon.currentAttackCount = this.weapon.attackCount;
                }
                else {
                    // console.log(this.currentCooldownTime);
                    this.weapon.currentCooldownTime--;
                }
            }
        }
        collector() {
        }
    }
    Player_1.Player = Player;
    class Melee extends Player {
        attack(_direction) {
            if (this.weapon.currentAttackCount > 0) {
                _direction.normalize();
                let bullet = new Bullets.MeleeBullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction);
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
                Game.graph.addChild(bullet);
                this.weapon.currentAttackCount--;
            }
        }
    }
    Player_1.Melee = Melee;
    class Ranged extends Player {
    }
    Player_1.Ranged = Ranged;
})(Player || (Player = {}));
var Generation;
(function (Generation) {
    let ROOMTYPE;
    (function (ROOMTYPE) {
        ROOMTYPE[ROOMTYPE["START"] = 0] = "START";
        ROOMTYPE[ROOMTYPE["NORMAL"] = 1] = "NORMAL";
        ROOMTYPE[ROOMTYPE["MERCHANT"] = 2] = "MERCHANT";
        ROOMTYPE[ROOMTYPE["TREASURE"] = 3] = "TREASURE";
        ROOMTYPE[ROOMTYPE["CHALLENGE"] = 4] = "CHALLENGE";
        ROOMTYPE[ROOMTYPE["BOSS"] = 5] = "BOSS";
    })(ROOMTYPE = Generation.ROOMTYPE || (Generation.ROOMTYPE = {}));
    class Room extends ƒ.Node {
        tag = Tag.Tag.ROOM;
        roomType;
        coordinates; // X Y
        walls = [];
        roomSize = 30;
        exits; // N E S W
        mesh = new ƒ.MeshQuad;
        cmpMesh = new ƒ.ComponentMesh(this.mesh);
        startRoomMat = new ƒ.Material("startRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("yellow")));
        normalRoomMat = new ƒ.Material("normalRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
        merchantRoomMat = new ƒ.Material("merchantRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")));
        treasureRoomMat = new ƒ.Material("treasureRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("yellow")));
        challengeRoomMat = new ƒ.Material("challengeRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")));
        bossRoomMat = new ƒ.Material("bossRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black")));
        cmpMaterial;
        constructor(_name, _coordiantes, _exits, _roomType) {
            super(_name);
            this.coordinates = _coordiantes;
            this.exits = _exits;
            this.roomType = _roomType;
            switch (_roomType) {
                case ROOMTYPE.START:
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.startRoomMat);
                    break;
                case ROOMTYPE.NORMAL:
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.normalRoomMat);
                    break;
                case ROOMTYPE.MERCHANT:
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.merchantRoomMat);
                    break;
                case ROOMTYPE.TREASURE:
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.treasureRoomMat);
                    break;
                case ROOMTYPE.CHALLENGE:
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.challengeRoomMat);
                    break;
                case ROOMTYPE.BOSS:
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.bossRoomMat);
                    break;
            }
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(this.cmpMesh);
            this.addComponent(this.cmpMaterial);
            this.cmpTransform.mtxLocal.scale(new ƒ.Vector3(this.roomSize, this.roomSize, 0));
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(this.coordinates[0] * this.roomSize, this.coordinates[1] * this.roomSize, -0.02);
            this.walls.push(new Wall(new ƒ.Vector2((this.roomSize / 2), 0), this.roomSize));
            this.walls.push(new Wall(new ƒ.Vector2(-(this.roomSize / 2), 0), this.roomSize));
            this.walls.push(new Wall(new ƒ.Vector2(0, (this.roomSize / 2)), this.roomSize));
            this.walls.push(new Wall(new ƒ.Vector2(0, -(this.roomSize / 2)), this.roomSize));
        }
        getRoomSize() {
            return this.roomSize;
        }
    }
    Generation.Room = Room;
    class Wall extends ƒ.Node {
        tag = Tag.Tag.WALL;
        collider;
        wallThickness = 2;
        constructor(_position, _width) {
            super("Wall");
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("red", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("red")))));
            this.cmpTransform.mtxLocal.translation = _position.toVector3(0);
            if (_position.x == 0) {
                if (_position.y > 0) {
                    this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(_width, this.wallThickness, 0);
                    this.collider = new Game.ƒ.Rectangle(_position.x, _position.y, this.cmpTransform.mtxLocal.scaling.x, this.wallThickness, Game.ƒ.ORIGIN2D.CENTER);
                }
                else {
                    this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(_width, this.wallThickness, 0);
                    this.collider = new Game.ƒ.Rectangle(_position.x, _position.y, this.cmpTransform.mtxLocal.scaling.x, this.wallThickness, Game.ƒ.ORIGIN2D.CENTER);
                }
            }
            else if (_position.y == 0) {
                if (_position.x > 0) {
                    this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.wallThickness, _width, 0);
                    this.collider = new Game.ƒ.Rectangle(_position.x, _position.y, this.wallThickness, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
                }
                else {
                    this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.wallThickness, _width, 0);
                    this.collider = new Game.ƒ.Rectangle(_position.x, _position.y, this.wallThickness, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
                }
            }
        }
    }
    Generation.Wall = Wall;
})(Generation || (Generation = {}));
var Generation;
(function (Generation) {
    let numberOfRooms = 3;
    let usedPositions = [];
    let rooms = [];
    //spawn chances
    let challengeRoomSpawnChance = 20;
    let treasureRoomSpawnChance = 10;
    function generateRooms() {
        let startCoords = [0, 0];
        rooms.push(new Generation.Room("roomStart", startCoords, calcPathExits(startCoords), Generation.ROOMTYPE.START));
        usedPositions.push(startCoords);
        for (let i = 0; i < numberOfRooms; i++) {
            addRoom(rooms[rooms.length - 1], Generation.ROOMTYPE.NORMAL);
        }
        addRoom(rooms[rooms.length - 1], Generation.ROOMTYPE.BOSS);
        addSpecialRooms();
        addRoom(rooms[rooms.length - 3], Generation.ROOMTYPE.MERCHANT);
        rooms.forEach(room => {
            room.exits = calcRoomDoors(room.coordinates);
            // console.log(room.coordinates + " " + room.exits + " " + room.roomType.toString());
        });
        Game.graph.addChild(rooms[0]);
        Game.graph.appendChild(rooms[0].walls[0]);
        Game.graph.appendChild(rooms[0].walls[1]);
        Game.graph.appendChild(rooms[0].walls[2]);
        Game.graph.appendChild(rooms[0].walls[3]);
    }
    Generation.generateRooms = generateRooms;
    function addRoom(_currentRoom, _roomType) {
        let numberOfExits = countBool(_currentRoom.exits);
        let randomNumber = Math.floor(Math.random() * numberOfExits);
        let possibleExitIndex = getExitIndex(_currentRoom.exits);
        let newRoomPosition;
        switch (possibleExitIndex[randomNumber]) {
            case 0: // north
                newRoomPosition = [_currentRoom.coordinates[0], _currentRoom.coordinates[1] + 1];
                rooms.push(new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;
            case 1: // east
                newRoomPosition = [_currentRoom.coordinates[0] + 1, _currentRoom.coordinates[1]];
                rooms.push(new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;
            case 2: // south
                newRoomPosition = [_currentRoom.coordinates[0], _currentRoom.coordinates[1] - 1];
                rooms.push(new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;
            case 3: //west
                newRoomPosition = [_currentRoom.coordinates[0] - 1, _currentRoom.coordinates[1]];
                rooms.push(new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;
        }
    }
    function addSpecialRooms() {
        rooms.forEach(room => {
            room.exits = calcPathExits(room.coordinates);
            if (isSpawning(treasureRoomSpawnChance)) {
                addRoom(room, Generation.ROOMTYPE.TREASURE);
                return;
            }
            if (isSpawning(challengeRoomSpawnChance)) {
                addRoom(room, Generation.ROOMTYPE.CHALLENGE);
                return;
            }
        });
    }
    function isSpawning(_spawnChance) {
        let x = Math.random() * 100;
        if (x < _spawnChance) {
            return true;
        }
        return false;
    }
    function countBool(_bool) {
        let counter = 0;
        _bool.forEach(bool => {
            if (bool) {
                counter++;
            }
        });
        return counter;
    }
    function getExitIndex(_exits) {
        let numbers = [];
        for (let i = 0; i < _exits.length; i++) {
            if (_exits[i]) {
                numbers.push(i);
            }
        }
        return numbers;
    }
    /**
     * calculates possible exits for new rooms
     * @param _position position of room
     * @returns boolean for each direction north, east, south, west
     */
    function calcPathExits(_position) {
        let north = false;
        let east = false;
        let south = false;
        let west = false;
        let roomNeighbours;
        roomNeighbours = sliceNeighbours(getNeighbours(_position));
        for (let i = 0; i < roomNeighbours.length; i++) {
            if (roomNeighbours[i][1] - _position[1] == -1) {
                south = true;
            }
            if (roomNeighbours[i][0] - _position[0] == -1) {
                west = true;
            }
            if (roomNeighbours[i][1] - _position[1] == 1) {
                north = true;
            }
            if (roomNeighbours[i][0] - _position[0] == 1) {
                east = true;
            }
        }
        return [north, east, south, west];
    }
    function calcRoomDoors(_position) {
        let north = false;
        let east = false;
        let south = false;
        let west = false;
        for (let i = 0; i < usedPositions.length; i++) {
            // console.log(usedPositions[i][0] - _position[1]);
            if (usedPositions[i][1] - _position[1] == -1 && usedPositions[i][0] - _position[0] == 0) {
                south = true;
            }
            if (usedPositions[i][0] - _position[0] == -1 && usedPositions[i][1] - _position[1] == 0) {
                west = true;
            }
            if (usedPositions[i][1] - _position[1] == 1 && usedPositions[i][0] - _position[0] == 0) {
                north = true;
            }
            if (usedPositions[i][0] - _position[0] == 1 && usedPositions[i][1] - _position[1] == 0) {
                east = true;
            }
        }
        return [north, east, south, west];
    }
    function getNeighbours(_position) {
        let neighbours = [];
        neighbours.push([_position[0], _position[1] - 1]); // down
        neighbours.push([_position[0] - 1, _position[1]]); // left
        neighbours.push([_position[0], _position[1] + 1]); // up
        neighbours.push([_position[0] + 1, _position[1]]); // right
        return neighbours;
    }
    function sliceNeighbours(_neighbours) {
        let neighbours = _neighbours;
        let toRemoveIndex = [];
        for (let i = 0; i < neighbours.length; i++) {
            // check ich position already used
            usedPositions.forEach(room => {
                if (neighbours[i][0] == room[0] && neighbours[i][1] == room[1]) {
                    toRemoveIndex.push(i);
                }
            });
        }
        let copy = [];
        toRemoveIndex.forEach(index => {
            delete neighbours[index];
        });
        neighbours.forEach(n => {
            copy.push(n);
        });
        return copy;
    }
})(Generation || (Generation = {}));
var Tag;
(function (Tag_1) {
    let Tag;
    (function (Tag) {
        Tag[Tag["PLAYER"] = 0] = "PLAYER";
        Tag[Tag["ENEMY"] = 1] = "ENEMY";
        Tag[Tag["BULLET"] = 2] = "BULLET";
        Tag[Tag["ITEM"] = 3] = "ITEM";
        Tag[Tag["ROOM"] = 4] = "ROOM";
        Tag[Tag["WALL"] = 5] = "WALL";
        Tag[Tag["DAMAGEUI"] = 6] = "DAMAGEUI";
    })(Tag = Tag_1.Tag || (Tag_1.Tag = {}));
})(Tag || (Tag = {}));
var UI;
(function (UI) {
    //let divUI: HTMLDivElement = <HTMLDivElement>document.getElementById("UI");
    let player1UI = document.getElementById("Player1");
    let player2UI = document.getElementById("Player2");
    function updateUI() {
        //Player1 UI
        player1UI.querySelector("#HP").style.width = (Game.player1.properties.attributes.healthPoints / Game.player1.properties.attributes.maxHealthPoints * 100) + "%";
        //TODO: Needs testing
        //InventoryUI
        Game.player1.items.forEach((element) => {
            let exsist = false;
            //search DOMImg for Item
            player1UI.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                if (imgElement.src == element.imgSrc) {
                    exsist = true;
                }
            });
            //none exsisting DOMImg for Item
            if (!exsist) {
                let newItem = document.createElement("img");
                newItem.src = element.imgSrc;
                player1UI.querySelector("#Inventory").appendChild(newItem);
            }
        });
        //Player2 UI
        if (Game.connected) {
            player2UI.querySelector("#HP").style.width = (Game.player2.properties.attributes.healthPoints / Game.player2.properties.attributes.maxHealthPoints * 100) + "%";
            //InventoryUI
            Game.player2.items.forEach((element) => {
                let exsist = false;
                //search DOMImg for Item
                player2UI.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                    if (imgElement.src == element.imgSrc) {
                        exsist = true;
                    }
                });
                //none exsisting DOMImg for Item
                if (!exsist) {
                    let newItem = document.createElement("img");
                    newItem.src = element.imgSrc;
                    player2UI.querySelector("#Inventory").appendChild(newItem);
                }
            });
        }
    }
    UI.updateUI = updateUI;
    UI.txtZero = new ƒ.TextureImage();
    UI.txtOne = new ƒ.TextureImage();
    UI.txtTow = new ƒ.TextureImage();
    UI.txtThree = new ƒ.TextureImage();
    UI.txtFour = new ƒ.TextureImage();
    UI.txtFive = new ƒ.TextureImage();
    UI.txtSix = new ƒ.TextureImage();
    UI.txtSeven = new ƒ.TextureImage();
    UI.txtEight = new ƒ.TextureImage();
    UI.txtNine = new ƒ.TextureImage();
    UI.txtTen = new ƒ.TextureImage();
    class DamageUI extends ƒ.Node {
        tag = Tag.Tag.DAMAGEUI;
        lifetime = 0.5 * Game.frameRate;
        async lifespan(_graph) {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                }
            }
        }
        constructor(_position, _damage) {
            super("damageUI");
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.scale(new ƒ.Vector3(0.33, 0.33, 0.33));
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.25);
            let mesh = new ƒ.MeshQuad();
            let cmpMesh = new ƒ.ComponentMesh(mesh);
            this.addComponent(cmpMesh);
            let mtrSolidWhite = new ƒ.Material("SolidWhite", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            let cmpMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);
            this.loadTexture(_damage);
        }
        loadTexture(_texture) {
            let newTxt = new ƒ.TextureImage();
            let newCoat = new ƒ.CoatRemissiveTextured();
            let newMtr = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);
            let oldComCoat = new ƒ.ComponentMaterial();
            oldComCoat = this.getComponent(ƒ.ComponentMaterial);
            switch (_texture) {
                case 0:
                    newTxt = UI.txtZero;
                    break;
                case 1:
                    newTxt = UI.txtOne;
                    break;
                case 2:
                    newTxt = UI.txtTow;
                    break;
                case 3:
                    newTxt = UI.txtThree;
                    break;
                case 4:
                    newTxt = UI.txtFour;
                    break;
                case 5:
                    newTxt = UI.txtFive;
                    break;
                case 6:
                    newTxt = UI.txtSeven;
                    break;
                case 7:
                    newTxt = UI.txtEight;
                    break;
                case 8:
                    newTxt = UI.txtEight;
                    break;
                case 9:
                    newTxt = UI.txtNine;
                    break;
                case 10:
                    newTxt = UI.txtTen;
                    break;
                default:
                    break;
            }
            newCoat.color = ƒ.Color.CSS("WHITE");
            newCoat.texture = newTxt;
            oldComCoat.material = newMtr;
        }
        async move() {
            this.cmpTransform.mtxLocal.translate(new ƒ.Vector3(0, 0.1, 0));
            // this.cmpTransform.mtxLocal.scale(new ƒ.Vector3(0.1,0.1,0.1));
        }
    }
    UI.DamageUI = DamageUI;
})(UI || (UI = {}));
var Weapons;
(function (Weapons) {
    class Weapon {
        cooldownTime = 10;
        currentCooldownTime = this.cooldownTime;
        attackCount = 1;
        currentAttackCount = this.attackCount;
        constructor(_cooldownTime, _attackCount) {
            this.cooldownTime = _cooldownTime;
            this.attackCount = _attackCount;
        }
    }
    Weapons.Weapon = Weapon;
})(Weapons || (Weapons = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL0NsYXNzZXMvTWFpbi50cyIsIi4uL0NsYXNzZXMvSW50ZXJmYWNlcy50cyIsIi4uL0NsYXNzZXMvRW5lbXkudHMiLCIuLi9DbGFzc2VzL0l0ZW1zLnRzIiwiLi4vQ2xhc3Nlcy9BdHRyaWJ1dGVzLnRzIiwiLi4vQ2xhc3Nlcy9CdWxsZXQudHMiLCIuLi9DbGFzc2VzL0NoYXJhY3Rlci50cyIsIi4uL0NsYXNzZXMvQ29sbGlkZXIudHMiLCIuLi9DbGFzc2VzL0VuZW15U3Bhd25lci50cyIsIi4uL0NsYXNzZXMvSW5wdXRTeXN0ZW0udHMiLCIuLi9DbGFzc2VzL0xhbmRzY2FwZS50cyIsIi4uL0NsYXNzZXMvTmV0d29ya2luZy50cyIsIi4uL0NsYXNzZXMvUGxheWVyLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tR2VuZXJhdGlvbi50cyIsIi4uL0NsYXNzZXMvVGFnLnRzIiwiLi4vQ2xhc3Nlcy9VSS50cyIsIi4uL0NsYXNzZXMvV2VhcG9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsbUJBQW1CO0FBQ25CLHdEQUF3RDtBQUN4RCxzREFBc0Q7QUFDdEQsc0JBQXNCO0FBRXRCLElBQVUsSUFBSSxDQTBPYjtBQS9PRCxtQkFBbUI7QUFDbkIsd0RBQXdEO0FBQ3hELHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFFdEIsV0FBVSxJQUFJO0lBQ0ksTUFBQyxHQUFHLFNBQVMsQ0FBQztJQUNkLFNBQUksR0FBRyxRQUFRLENBQUM7SUFHOUIsdUJBQXVCO0lBQ1osV0FBTSxHQUF5QyxRQUFRLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVGLHlDQUF5QztJQUN6QyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZDLFFBQVEsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3pFLDBCQUEwQjtJQUUxQiwyQkFBMkI7SUFDaEIsYUFBUSxHQUFlLElBQUksS0FBQSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDeEMsVUFBSyxHQUFXLElBQUksS0FBQSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBR3BDLGNBQVMsR0FBWSxLQUFLLENBQUM7SUFDM0IsY0FBUyxHQUFXLEVBQUUsQ0FBQztJQUN2QixZQUFPLEdBQWtCLEVBQUUsQ0FBQztJQUl2Qyw4QkFBOEI7SUFFOUIsNEJBQTRCO0lBQzVCLElBQUksS0FBaUIsQ0FBQztJQUN0QixJQUFJLFNBQVMsR0FBc0IsSUFBSSxLQUFBLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUMzRCxJQUFJLFVBQXVCLENBQUM7SUFDNUIsTUFBTSxNQUFNLEdBQVcsR0FBRyxDQUFDO0lBQzNCLCtCQUErQjtJQUkvQixxQkFBcUI7SUFDckIsS0FBSyxVQUFVLElBQUk7UUFDZixJQUFJLE9BQU8sQ0FBQyxTQUFTLElBQUksSUFBSSxFQUFFO1lBQzNCLFlBQVksRUFBRSxDQUFDO1NBQ2xCO1FBQ0QsTUFBTSxlQUFlLEVBQUUsQ0FBQztRQUV4QixJQUFJLEtBQUEsT0FBTyxJQUFJLElBQUksRUFBRTtZQUNqQixLQUFBLE9BQU8sR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzFHO1FBQ0QsdUJBQXVCO1FBRXZCLG9CQUFvQjtRQUNwQixLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLG9CQUFvQixFQUFFLHFCQUFxQixFQUFFLElBQUksS0FBQSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLHlCQUF5QixDQUFDLENBQUM7UUFDL0wsWUFBWTtRQUVaLFVBQVUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUUzQixxSUFBcUk7UUFDckkseUJBQXlCO1FBQ3pCLHlCQUF5QjtRQUN6QixJQUFJLElBQUksR0FBVyxJQUFJLEtBQUEsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUV0QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksS0FBQSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBRTlDLElBQUksSUFBSSxHQUFlLElBQUksS0FBQSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDeEMsSUFBSSxPQUFPLEdBQW9CLElBQUksS0FBQSxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pELElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFM0IsSUFBSSxhQUFhLEdBQWUsSUFBSSxLQUFBLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLEtBQUEsQ0FBQyxDQUFDLFVBQVUsRUFBRSxJQUFJLEtBQUEsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFBLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0SCxJQUFJLFdBQVcsR0FBd0IsSUFBSSxLQUFBLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM5RSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRS9CLElBQUksTUFBTSxHQUFtQixJQUFJLEtBQUEsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ2xELElBQUksT0FBTyxHQUE0QixJQUFJLEtBQUEsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDckUsSUFBSSxVQUFVLEdBQXdCLElBQUksS0FBQSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUNoRSxJQUFJLE1BQU0sR0FBZSxJQUFJLEtBQUEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsS0FBQSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDOUUsSUFBSSxRQUFRLEdBQWdCLElBQUksS0FBQSxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFOUMsVUFBVSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBQSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNwRCxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFBLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFFdkQsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDaEQsT0FBTyxDQUFDLEtBQUssR0FBRyxLQUFBLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ3pCLFVBQVUsQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO1FBRTdCLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFHN0MsS0FBQSxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUEsT0FBTyxDQUFDLENBQUM7UUFDM0IsS0FBQSxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBR3pCLEtBQUEsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUEsS0FBSyxDQUFDLENBQUM7UUFFdkMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFaEMsS0FBQSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFBLEtBQUssQ0FBQyxDQUFDO1FBRW5CLEtBQUEsUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsS0FBQSxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUEsTUFBTSxDQUFDLENBQUM7UUFFMUQsSUFBSSxFQUFFLENBQUM7UUFFUCxLQUFBLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsS0FBQSxTQUFTLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBQ0QsU0FBUyxNQUFNO1FBQ1gsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRW5CLElBQUksS0FBQSxPQUFPLElBQUksU0FBUyxJQUFJLENBQUMsS0FBQSxTQUFTLEVBQUU7WUFDcEMsS0FBQSxTQUFTLEdBQUcsSUFBSSxDQUFDO1NBQ3BCO1FBRUQsSUFBSSxFQUFFLENBQUM7UUFFUCxZQUFZLEVBQUUsQ0FBQztRQUVmLEtBQUEsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRW5CLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNoQixLQUFBLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztTQUN0QjtRQUVELElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNoQixVQUFVLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUNoRztRQUNELHNDQUFzQztRQUV0QyxxQkFBcUI7UUFDckIsSUFBSSxLQUFLLEdBQStCLEtBQUEsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFjLE9BQVEsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN4SCxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3BCLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBQSxLQUFLLENBQUMsQ0FBQztZQUNILE9BQVEsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3ZELENBQUMsQ0FBQyxDQUFDO1FBQ0gsWUFBWTtRQUVaLElBQUksT0FBTyxHQUF1QyxLQUFBLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBa0IsT0FBUSxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3hJLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDdEIsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFBLEtBQUssQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxRQUFRLEdBQWlDLEtBQUEsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFlLE9BQVEsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNsSSxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ3ZCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBQSxLQUFLLENBQUMsQ0FBQztRQUM1QixDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUEsT0FBTyxHQUFrQixLQUFBLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBZSxPQUFRLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDM0csSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFO1lBQ3BFLEtBQUEsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDdEIsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNmLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBQSxLQUFLLENBQUMsQ0FBQztZQUM1QixDQUFDLENBQUMsQ0FBQTtZQUVGLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQztTQUMvQjtRQUNELEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsQixDQUFDO0lBRUQsU0FBUyxLQUFLO1FBQ1YsWUFBWSxFQUFFLENBQUM7UUFDZixzQ0FBc0M7UUFDdEMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUNwRSxRQUFRLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDaEUsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3ZCLFFBQVEsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUM7WUFDbkUsUUFBUSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztZQUNwRSxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBRWpFLENBQUMsQ0FBQyxDQUFDO1FBQ0gsUUFBUSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBRWxFLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUNELEtBQUssVUFBVSxlQUFlO1FBQzFCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDM0UsS0FBQSxXQUFXLEdBQXlCLElBQUksQ0FBQyxPQUFTLENBQUM7SUFDdkQsQ0FBQztJQUVELEtBQUssVUFBVSxZQUFZO1FBQ3ZCLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUU1RCxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDakQsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUNoRCxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDbEQsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUNqRCxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDaEQsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUNsRCxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDakQsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFJRCxLQUFLLFVBQVUsZ0JBQWdCO1FBQzNCLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDL0ksSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksS0FBQSxPQUFPLElBQUksSUFBSSxFQUFFO1lBQ2xELE1BQU0sSUFBSSxFQUFFLENBQUM7WUFDYixVQUFVLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3RDO2FBQU07WUFDSCxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDckM7SUFDTCxDQUFDO0lBRUQsU0FBUyxZQUFZLENBQUMsRUFBUztRQUMzQixJQUF3QixFQUFFLENBQUMsTUFBTyxDQUFDLEVBQUUsSUFBSSxRQUFRLEVBQUU7WUFDL0MsS0FBQSxPQUFPLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0RyxVQUFVLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7U0FDbkM7UUFDRCxJQUF3QixFQUFFLENBQUMsTUFBTyxDQUFDLEVBQUUsSUFBSSxPQUFPLEVBQUU7WUFDOUMsS0FBQSxPQUFPLEdBQUcsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRyxVQUFVLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7U0FDbEM7UUFDRCxRQUFRLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDO0lBQ3ZFLENBQUM7SUFFRCxTQUFTLElBQUk7UUFDVCxLQUFBLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNwQixDQUFDO0lBSUQsU0FBZ0IsWUFBWTtRQUN4QixJQUFJLFNBQVMsR0FBRyxLQUFBLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUEsT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDeEksU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBQSxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFDeEMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFBLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDcEYsQ0FBQztJQUplLGlCQUFZLGVBSTNCLENBQUE7SUFFRCxLQUFBLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLCtCQUFxQixNQUFNLENBQUMsQ0FBQztJQUNwRCx3QkFBd0I7QUFFNUIsQ0FBQyxFQTFPUyxJQUFJLEtBQUosSUFBSSxRQTBPYjtBRS9PRCxJQUFVLEtBQUssQ0FxVWQ7QUFyVUQsV0FBVSxPQUFLO0lBQ1gsSUFBSyxTQUVKO0lBRkQsV0FBSyxTQUFTO1FBQ1YsNkNBQU0sQ0FBQTtRQUFFLHlDQUFJLENBQUE7SUFDaEIsQ0FBQyxFQUZJLFNBQVMsS0FBVCxTQUFTLFFBRWI7SUFDRCxJQUFPLElBQUksR0FBRyxRQUFRLENBQUM7SUFHdkIsTUFBTSxnQkFBZ0I7UUFDWCxNQUFNLENBQUMsR0FBRztZQUNiLElBQUksS0FBSyxHQUE2QyxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQzFGLEtBQUssQ0FBQyxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsY0FBYyxDQUFDO1lBQ3ZELEtBQUssQ0FBQyxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsVUFBVSxDQUFDO1lBQy9DLEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0MsT0FBTyxLQUFLLENBQUM7UUFDakIsQ0FBQztRQUNELE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFFBQXNDO1lBQzFELCtCQUErQjtZQUMvQixzQ0FBc0M7WUFDdEMsa0JBQWtCO1FBQ3RCLENBQUM7UUFFTyxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQXNDO1lBQ2hFLDZCQUE2QjtRQUNqQyxDQUFDO1FBRUQsbUVBQW1FO1FBQ25FLHNDQUFzQztRQUN0QyxJQUFJO1FBRUksTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBc0M7WUFDNUQsdUJBQXVCO1lBQ3ZCLG9DQUFvQztZQUNwQyxxQkFBcUI7UUFDekIsQ0FBQztLQUNKO0lBRUQsTUFBYSxLQUFNLFNBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVO1FBQ3BDLEdBQUcsR0FBWSxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUM3QixLQUFLLEdBQVcsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3pDLFVBQVUsQ0FBbUI7UUFDN0IsUUFBUSxDQUFvQjtRQUNuQyxNQUFNLENBQVk7UUFDbEIsUUFBUSxDQUFTO1FBQ2pCLFFBQVEsR0FBWSxJQUFJLENBQUM7UUFDekIsUUFBUSxHQUFZLElBQUksQ0FBQztRQUV6QixvQkFBb0I7UUFDcEIsVUFBVSxDQUE2QjtRQUMvQixRQUFRLEdBQVksQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakQsWUFBWTtRQUNaOzs7Ozs7V0FNRztRQUVILFlBQVksS0FBYSxFQUFFLFdBQTZCLEVBQUUsU0FBb0IsRUFBRSxHQUFZO1lBQ3hGLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1lBQzlDLElBQUksQ0FBQyxVQUFVLEdBQUcsV0FBVyxDQUFDO1lBQzlCLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3BGLElBQUksR0FBRyxJQUFJLFNBQVMsRUFBRTtnQkFDbEIsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzdCLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQzthQUNwQjtZQUNELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3BJLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN4Qyw0QkFBNEI7WUFDNUIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3ZCLENBQUM7UUFDRCxLQUFLLENBQUMsV0FBVztZQUNiLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxZQUFZLENBQTRCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNyRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDeEIsQ0FBQztRQUVELEtBQUssQ0FBQyxXQUFXO1lBQ2IsSUFBSSxjQUFjLEdBQW1CLElBQUksQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzFELE1BQU0sY0FBYyxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO1lBRWxFLElBQUksV0FBVyxHQUFtQixJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUNwRixJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFFRCxlQUFlLENBQUMsWUFBNEI7WUFDeEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7WUFDckIsSUFBSSxJQUFJLEdBQVcsS0FBSyxDQUFDO1lBQ3pCLElBQUksTUFBTSxHQUE4QixJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDMUYsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUM7UUFDbkMsQ0FBQztRQUVNLElBQUk7WUFDUCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdEIsVUFBVSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkYsQ0FBQztRQUVELGNBQWM7WUFDVixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEYsQ0FBQztRQUVELFNBQVM7WUFDTCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBRTFCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtnQkFDaEIsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ3pILElBQUksZUFBZSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUV6SCxJQUFJLGVBQWUsR0FBRyxlQUFlLEVBQUU7b0JBQ25DLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO2lCQUN6QjtxQkFDSTtvQkFDRCxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztpQkFDekI7YUFDSjtZQUVELE9BQU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1FBQ3BELENBQUM7UUFFTSxVQUFVO1lBQ2IsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFFL0IsSUFBSSxTQUFTLEdBQW1CLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQy9HLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUV0QiwwQkFBMEI7WUFFMUIsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFFekUsa0VBQWtFO1lBQ2xFLHNDQUFzQztZQUN0QyxzQ0FBc0M7WUFDdEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM3QiwyRUFBMkU7UUFFL0UsQ0FBQztRQUVELFFBQVE7WUFDSixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUcvQixJQUFJLFNBQVMsR0FBbUIsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDL0csU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBRXRCLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLHlEQUF5RDtZQUV6RCxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFHRCxRQUFRLENBQUMsTUFBbUI7WUFDeEIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxZQUFZLElBQUksQ0FBQyxFQUFFO2dCQUM5QyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbkMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDNUI7UUFDTCxDQUFDO1FBRUQsWUFBWSxDQUFDLFNBQW9CO1lBQzdCLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQztZQUNwQixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDcEIsSUFBSSxTQUFTLEdBQXdDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQW1CLE9BQVEsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxLQUFLLENBQUM7WUFDckosU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUMxQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRTtvQkFFOUMsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3ZFLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7b0JBRTFGLElBQUksV0FBVyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN6RixJQUFJLFlBQVksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7b0JBQ3JELElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO29CQUV4RSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksRUFBRTt3QkFDN0QsSUFBSSxlQUFlLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQzFFLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7d0JBRy9GLElBQUksY0FBYyxHQUFHLGFBQWEsRUFBRTs0QkFDaEMsUUFBUSxHQUFHLEtBQUssQ0FBQzt5QkFDcEI7cUJBQ0o7b0JBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsV0FBVyxDQUFDO29CQUNyQyxZQUFZLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNsRCxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztvQkFFeEUsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLEVBQUU7d0JBQzdELElBQUksZUFBZSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUMxRSxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO3dCQUcvRixJQUFJLGNBQWMsR0FBRyxhQUFhLEVBQUU7NEJBQ2hDLFFBQVEsR0FBRyxLQUFLLENBQUM7eUJBQ3BCO3FCQUNKO29CQUNELElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxHQUFHLFdBQVcsQ0FBQztpQkFDeEM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksUUFBUSxJQUFJLFFBQVEsRUFBRTtnQkFDdEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ25EO2lCQUFNLElBQUksUUFBUSxJQUFJLENBQUMsUUFBUSxFQUFFO2dCQUM5QixTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDdEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ25EO2lCQUFNLElBQUksQ0FBQyxRQUFRLElBQUksUUFBUSxFQUFFO2dCQUM5QixTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDdEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ25EO1FBQ0wsQ0FBQztLQUNKO0lBakxZLGFBQUssUUFpTGpCLENBQUE7SUFFRCxNQUFhLFNBQVUsU0FBUSxLQUFLO1FBQ3hCLE1BQU0sQ0FBQyxZQUFZLEdBQTZDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQy9GLFlBQVksR0FBMEMsSUFBSSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUV2RixZQUFZLEtBQWEsRUFBRSxXQUE2QixFQUFFLFNBQW9CO1lBQzFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUM7WUFDeEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUM1QixDQUFDO1FBRUQsSUFBSTtZQUVBLHFCQUFxQjtZQUNyQixLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDekIsQ0FBQztRQUVELFNBQVM7WUFDTCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDOUIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUM5RixJQUFJLFFBQVEsR0FBRyxDQUFDLEVBQUU7Z0JBQ2QsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMxQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDO2FBQzNCO2lCQUNJLElBQUksUUFBUSxHQUFHLENBQUMsRUFBRTtnQkFDbkIsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM1QyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDO2FBQzNCO1FBRUwsQ0FBQztRQUNELGFBQWE7WUFFVCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDakIsUUFBUSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRTtnQkFDcEMsS0FBSyxTQUFTLENBQUMsSUFBSTtvQkFDZixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ2hCLE1BQU07Z0JBQ1YsS0FBSyxTQUFTLENBQUMsTUFBTTtvQkFDakIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO29CQUNqQixNQUFNO2dCQUNWO29CQUNJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDbEIsTUFBTTthQUNiO1FBQ0wsQ0FBQztRQUVELFFBQVEsQ0FBQyxNQUFjO1lBQ25CLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0IsQ0FBQzs7SUFqRFEsaUJBQVMsWUFxRHJCLENBQUE7SUFFRCxNQUFhLFNBQVUsU0FBUSxLQUFLO1FBQ2hDLFlBQVksS0FBYSxFQUFFLFdBQTZCLEVBQUUsU0FBb0I7WUFDMUUsS0FBSyxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekMsQ0FBQztRQUVELElBQUk7WUFDQSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDcEIsQ0FBQztRQUVELFFBQVEsQ0FBQyxNQUFjO1lBQ25CLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0IsQ0FBQztLQUNKO0lBYlksaUJBQVMsWUFhckIsQ0FBQTtJQUVELE1BQWEsV0FBWSxTQUFRLEtBQUs7UUFDbEMsUUFBUSxHQUFXLENBQUMsQ0FBQztRQUVyQixZQUFZLEtBQWEsRUFBRSxXQUE2QixFQUFFLFNBQW9CO1lBQzFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFFRCxJQUFJO1lBQ0EsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3RCLENBQUM7UUFFRCxRQUFRLENBQUMsTUFBYztZQUNuQixLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFFRCxLQUFLLENBQUMsVUFBVTtZQUNaLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLElBQUksZUFBZSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3pILDRIQUE0SDtZQUM1SCxJQUFJLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFO2dCQUNqQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7YUFDckI7aUJBQ0k7Z0JBQ0QsSUFBSSxNQUFNLEdBQUcsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUN4RixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7Z0JBRVosNkNBQTZDO2dCQUM3Qyx1TEFBdUw7Z0JBQ3ZMLDZCQUE2QjtnQkFFN0IsZ0ZBQWdGO2dCQUNoRiw2REFBNkQ7Z0JBQzdELGdCQUFnQjtnQkFDaEIsSUFBSTthQUVQO1FBQ0wsQ0FBQztLQUNKO0lBdkNZLG1CQUFXLGNBdUN2QixDQUFBO0FBQ0wsQ0FBQyxFQXJVUyxLQUFLLEtBQUwsS0FBSyxRQXFVZDtBQ3JVRCxJQUFVLEtBQUssQ0E0RWQ7QUE1RUQsV0FBVSxLQUFLO0lBQ1gsSUFBWSxRQUlYO0lBSkQsV0FBWSxRQUFRO1FBQ2hCLHFDQUFHLENBQUE7UUFDSCxpREFBUyxDQUFBO1FBQ1QsbURBQVUsQ0FBQTtJQUNkLENBQUMsRUFKVyxRQUFRLEdBQVIsY0FBUSxLQUFSLGNBQVEsUUFJbkI7SUFDRCxNQUFhLElBQUssU0FBUSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVU7UUFDbkMsR0FBRyxHQUFZLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQzVCLEVBQUUsR0FBVyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDdEMsV0FBVyxDQUFTO1FBQ3BCLE1BQU0sQ0FBUztRQUNmLFFBQVEsQ0FBbUI7UUFDbEMsUUFBUSxDQUFTO1FBRWpCLFlBQVksS0FBYSxFQUFFLFlBQW9CLEVBQUUsU0FBb0IsRUFBRSxPQUFnQixFQUFFLFNBQWtCO1lBQ3ZHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNiLElBQUksQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO1lBQzFCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1lBQzlDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUVoRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqTyxDQUFDO1FBRU0sUUFBUSxDQUFDLE1BQWM7WUFDMUIsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksRUFBRTtnQkFDN0MsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNoQixpREFBaUQ7Z0JBQ2pELElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLEVBQUU7b0JBQ25CLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3pCLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUM3QjthQUNKO1FBQ0wsQ0FBQztRQUVELEtBQUssQ0FBQyxrQkFBa0I7WUFDcEIsSUFBSSxTQUFTLEdBQVUsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBZSxPQUFRLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDaEgsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUMxQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxPQUFPLENBQUMsVUFBVSxJQUFJLFNBQVMsRUFBRTtvQkFDN0UsMkVBQTJFO29CQUMzRSwwRUFBMEU7b0JBQzFFLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO2lCQUNyQjtZQUNMLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQztLQUNKO0lBeENZLFVBQUksT0F3Q2hCLENBQUE7SUFFRCxNQUFhLFlBQWEsU0FBUSxJQUFJO1FBQzNCLFVBQVUsQ0FBb0I7UUFDOUIsSUFBSSxDQUFXO1FBQ3RCOzs7Ozs7O1dBT0c7UUFDSCxZQUFZLEtBQWEsRUFBRSxZQUFvQixFQUFFLFNBQW9CLEVBQUUsV0FBOEIsRUFBRSxLQUFlLEVBQUUsT0FBZ0IsRUFBRSxTQUFrQjtZQUN4SixLQUFLLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQzFELElBQUksQ0FBQyxVQUFVLEdBQUcsV0FBVyxDQUFDO1lBQzlCLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLENBQUM7UUFFRCxLQUFLLENBQUMsa0JBQWtCO1lBQ3BCLElBQUksU0FBUyxHQUFVLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQWUsT0FBUSxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2hILFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDMUIsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxTQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLFNBQVMsQ0FBQyxFQUFFO29CQUNsSCxPQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDOUYsMEVBQTBFO29CQUMxRSxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztpQkFDckI7WUFDTCxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUM7S0FDSjtJQTNCWSxrQkFBWSxlQTJCeEIsQ0FBQTtBQUNMLENBQUMsRUE1RVMsS0FBSyxLQUFMLEtBQUssUUE0RWQ7QUM1RUQsSUFBVSxNQUFNLENBNkNmO0FBN0NELFdBQVUsTUFBTTtJQUNaLE1BQWEsVUFBVTtRQUVaLFlBQVksQ0FBUztRQUM1QixlQUFlLENBQVM7UUFDakIsS0FBSyxDQUFTO1FBQ2QsWUFBWSxDQUFTO1FBQ3JCLGlCQUFpQixHQUFXLENBQUMsQ0FBQztRQUdyQyxZQUFZLGFBQXFCLEVBQUUsYUFBcUIsRUFBRSxNQUFjLEVBQUUsa0JBQTJCO1lBQ2pHLElBQUksQ0FBQyxZQUFZLEdBQUcsYUFBYSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxlQUFlLEdBQUcsYUFBYSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxZQUFZLEdBQUcsYUFBYSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO1lBQ3BCLElBQUksa0JBQWtCLElBQUksU0FBUyxFQUFFO2dCQUNqQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsa0JBQWtCLENBQUM7YUFDL0M7UUFDTCxDQUFDO1FBRUQ7OztXQUdHO1FBQ0ksa0JBQWtCLENBQUMsV0FBOEIsRUFBRSxTQUF5QjtZQUMvRSxRQUFRLFNBQVMsRUFBRTtnQkFDZixLQUFLLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRztvQkFDbkIsSUFBSSxDQUFDLFlBQVksSUFBSSxXQUFXLENBQUMsWUFBWSxDQUFDO29CQUM5QyxJQUFJLENBQUMsZUFBZSxJQUFJLFdBQVcsQ0FBQyxlQUFlLENBQUM7b0JBQ3BELElBQUksQ0FBQyxLQUFLLElBQUksV0FBVyxDQUFDLEtBQUssQ0FBQztvQkFDaEMsSUFBSSxDQUFDLFlBQVksSUFBSSxXQUFXLENBQUMsWUFBWSxDQUFDO29CQUM5QyxNQUFNLENBQUMsc0NBQXNDO2dCQUNqRCxLQUFLLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUztvQkFDekIsTUFBTSxDQUFDLHlDQUF5QztnQkFDcEQsS0FBSyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVU7b0JBQzFCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxZQUFZLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztvQkFDakYsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO29CQUNqRixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7b0JBQzVELE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7b0JBQ3BDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzdHLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7b0JBQ3BDLE1BQU0sQ0FBQywwQ0FBMEM7YUFDeEQ7UUFDTCxDQUFDO0tBQ0o7SUEzQ1ksaUJBQVUsYUEyQ3RCLENBQUE7QUFDTCxDQUFDLEVBN0NTLE1BQU0sS0FBTixNQUFNLFFBNkNmO0FDN0NELElBQVUsT0FBTyxDQStHaEI7QUEvR0QsV0FBVSxPQUFPO0lBRUYsaUJBQVMsR0FBbUIsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7SUFFNUQsTUFBYSxNQUFPLFNBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJO1FBRTVCLEdBQUcsR0FBWSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUM5QixZQUFZLENBQVk7UUFDeEIsUUFBUSxDQUFvQjtRQUU1QixTQUFTLEdBQVcsQ0FBQyxDQUFDO1FBQ3RCLEtBQUssR0FBVyxFQUFFLENBQUM7UUFDMUIsUUFBUSxHQUFXLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBRXRDLFNBQVMsR0FBVyxDQUFDLENBQUM7UUFFdEIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFjO1lBQ3pCLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLEVBQUU7Z0JBQzdDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsRUFBRTtvQkFDbkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDNUI7YUFDSjtRQUNMLENBQUM7UUFFRCxZQUFZLFNBQW9CLEVBQUUsVUFBcUI7WUFDbkQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1lBQzlDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdkUsSUFBSSxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUM7WUFFL0IsSUFBSSxJQUFJLEdBQWUsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDeEMsSUFBSSxPQUFPLEdBQW9CLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6RCxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRTNCLElBQUksYUFBYSxHQUFlLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RILElBQUksV0FBVyxHQUF3QixJQUFJLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUM5RSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBRS9CLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUM5SixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3hJLENBQUM7UUFHRCxLQUFLLENBQUMsSUFBSTtZQUNOLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDeEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzVFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQzlCLENBQUM7UUFFRCxXQUFXO1lBQ1AsSUFBSSxNQUFNLEdBQW1CLElBQUksQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ2xELElBQUksT0FBTyxHQUE0QixJQUFJLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ3JFLElBQUksTUFBTSxHQUFlLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzlFLElBQUksVUFBVSxHQUF3QixJQUFJLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBRWhFLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBRXBELE1BQU0sR0FBRyxRQUFBLFNBQVMsQ0FBQztZQUNuQixPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1lBQ3pCLFVBQVUsQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO1FBQ2pDLENBQUM7UUFFRCxLQUFLLENBQUMsa0JBQWtCO1lBQ3BCLElBQUksU0FBUyxHQUFVLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQWUsT0FBUSxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQy9HLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDMUIsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxTQUFTLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUU7b0JBQ3JGLE9BQVEsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUM1RSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQWUsT0FBUSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUMvRywwRUFBMEU7b0JBQzFFLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO29CQUNsQixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7aUJBQ3BCO1lBQ0wsQ0FBQyxDQUFDLENBQUE7WUFFRixTQUFTLEdBQUcsRUFBRSxDQUFDO1lBQ2YsU0FBUyxHQUFxQixJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFtQixPQUFRLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUMsS0FBSyxDQUFDO1lBQzlILFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDMUIsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQzFDLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO2lCQUNyQjtZQUNMLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQztLQUNKO0lBbkZZLGNBQU0sU0FtRmxCLENBQUE7SUFFRCxNQUFhLFVBQVcsU0FBUSxNQUFNO1FBQ2xDLFlBQVksU0FBb0IsRUFBRSxVQUFxQjtZQUNuRCxLQUFLLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQzdCLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ2YsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUN2QyxDQUFDO0tBQ0o7SUFQWSxrQkFBVSxhQU90QixDQUFBO0lBRUQsTUFBYSxXQUFZLFNBQVEsTUFBTTtRQUNuQyxZQUFZLFNBQW9CLEVBQUUsVUFBcUI7WUFDbkQsS0FBSyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztZQUNmLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO1lBQ2xCLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLENBQUM7UUFFRCxLQUFLLENBQUMsV0FBVztRQUVqQixDQUFDO0tBQ0o7SUFaWSxtQkFBVyxjQVl2QixDQUFBO0FBQ0wsQ0FBQyxFQS9HUyxPQUFPLEtBQVAsT0FBTyxRQStHaEI7QUMvR0QsSUFBVSxNQUFNLENBWWY7QUFaRCxXQUFVLE1BQU07SUFFWixNQUFhLFNBQVM7UUFDWCxJQUFJLENBQVM7UUFDYixVQUFVLENBQWE7UUFHOUIsWUFBWSxLQUFhLEVBQUUsV0FBdUI7WUFDOUMsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7WUFDbEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUM7UUFDbEMsQ0FBQztLQUNKO0lBVFksZ0JBQVMsWUFTckIsQ0FBQTtBQUNMLENBQUMsRUFaUyxNQUFNLEtBQU4sTUFBTSxRQVlmO0FDWkQsSUFBVSxRQUFRLENBNkRqQjtBQTdERCxXQUFVLFVBQVE7SUFDZCxNQUFhLFFBQVE7UUFDakIsTUFBTSxDQUFTO1FBQ2YsUUFBUSxDQUFZO1FBQ3BCLElBQUksR0FBRztZQUNILE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUNELElBQUksSUFBSTtZQUNKLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUNELElBQUksS0FBSztZQUNMLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUNELElBQUksTUFBTTtZQUNOLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUVELFlBQVksU0FBb0IsRUFBRSxPQUFlO1lBQzdDLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDO1lBQzFCLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDO1FBQzFCLENBQUM7UUFFRCxRQUFRLENBQUMsU0FBbUI7WUFDeEIsSUFBSSxRQUFRLEdBQWMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbEYsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLFNBQVMsRUFBRTtnQkFDckQsT0FBTyxJQUFJLENBQUM7YUFDZjtZQUNELE9BQU8sS0FBSyxDQUFDO1FBQ2pCLENBQUM7UUFFRCxZQUFZLENBQUMsU0FBMkI7WUFDcEMsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQyxLQUFLO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1lBQzlDLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSTtnQkFBRSxPQUFPLEtBQUssQ0FBQztZQUM5QyxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDLE1BQU07Z0JBQUUsT0FBTyxLQUFLLENBQUM7WUFDOUMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHO2dCQUFFLE9BQU8sS0FBSyxDQUFDO1lBQzlDLE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUM7UUFFRCxlQUFlLENBQUMsU0FBbUI7WUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO2dCQUN6QixPQUFPLElBQUksQ0FBQztZQUVoQixJQUFJLFFBQVEsR0FBYyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRixJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQztZQUV2RSxPQUFPLFlBQVksQ0FBQztRQUN4QixDQUFDO1FBRUQsbUJBQW1CLENBQUMsU0FBc0I7WUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDO2dCQUM3QixPQUFPLElBQUksQ0FBQztZQUVoQixJQUFJLFlBQVksR0FBZ0IsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbEQsWUFBWSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JELFlBQVksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuRCxZQUFZLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUM1RSxZQUFZLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUUvRSxPQUFPLFlBQVksQ0FBQztRQUN4QixDQUFDO0tBQ0o7SUEzRFksbUJBQVEsV0EyRHBCLENBQUE7QUFDTCxDQUFDLEVBN0RTLFFBQVEsS0FBUixRQUFRLFFBNkRqQjtBQzdERCxJQUFVLFlBQVksQ0FzQ3JCO0FBdENELFdBQVUsWUFBWTtJQUNsQixJQUFJLFNBQVMsR0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUMzQyxJQUFJLFdBQVcsR0FBVyxTQUFTLENBQUM7SUFDcEMsSUFBSSxVQUFVLEdBQVcsRUFBRSxDQUFDO0lBRTVCLFNBQWdCLFlBQVk7UUFDeEIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxVQUFVLEVBQUU7WUFDbEMsb0NBQW9DO1lBQ3BDLElBQUksV0FBVyxJQUFJLFNBQVMsRUFBRTtnQkFDMUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDelM7WUFDRCxXQUFXLEVBQUUsQ0FBQztZQUNkLElBQUksV0FBVyxJQUFJLENBQUMsRUFBRTtnQkFDbEIsV0FBVyxHQUFHLFNBQVMsQ0FBQzthQUMzQjtTQUNKO0lBQ0wsQ0FBQztJQVplLHlCQUFZLGVBWTNCLENBQUE7SUFJRCxNQUFhLFlBQVk7UUFDckIsY0FBYyxHQUFnQixFQUFFLENBQUM7UUFDakMsZUFBZSxDQUFTO1FBQ3hCLFdBQVcsR0FBVyxDQUFDLENBQUM7UUFJeEIsWUFBWSxTQUFpQixFQUFFLGdCQUF3QjtZQUNuRCxJQUFJLENBQUMsZUFBZSxHQUFHLGdCQUFnQixDQUFDO1FBQzVDLENBQUM7UUFHRCxpQkFBaUIsQ0FBQyxLQUFzQjtZQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtRQUNySyxDQUFDO0tBRUo7SUFoQlkseUJBQVksZUFnQnhCLENBQUE7QUFDTCxDQUFDLEVBdENTLFlBQVksS0FBWixZQUFZLFFBc0NyQjtBQ3RDRCxJQUFVLFdBQVcsQ0F3R3BCO0FBeEdELFdBQVUsV0FBVztJQUVqQixRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDeEQsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQztJQUNwRCxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNsRCxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUV6RCxnQkFBZ0I7SUFDaEIsSUFBSSxhQUF3QixDQUFDO0lBRTdCLFNBQVMsYUFBYSxDQUFDLFdBQXVCO1FBQzFDLElBQUksR0FBRyxHQUFVLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDekcsYUFBYSxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQ3ZILENBQUM7SUFFRCxTQUFnQixVQUFVLENBQUMsT0FBa0IsRUFBRSxPQUFrQjtRQUM3RCxJQUFJLFNBQVMsR0FBVyxPQUFPLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDOUMsSUFBSSxTQUFTLEdBQVcsT0FBTyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzlDLElBQUksT0FBTyxHQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDOUUsT0FBTyxPQUFPLENBQUM7SUFFbkIsQ0FBQztJQU5lLHNCQUFVLGFBTXpCLENBQUE7SUFFRCxTQUFnQixzQkFBc0IsQ0FBQyxRQUFnQixFQUFFLFNBQWlCO1FBQ3RFLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztRQUNqQixJQUFJLE1BQU0sR0FBRyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUM5QixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEIsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQVJlLGtDQUFzQix5QkFRckMsQ0FBQTtJQUNELFlBQVk7SUFFWixjQUFjO0lBQ2QsSUFBSSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQWtCO1FBQ3RDLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQztRQUNaLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQztRQUNaLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQztRQUNaLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQztLQUNmLENBQUMsQ0FBQztJQUVILFNBQVMsaUJBQWlCLENBQUMsRUFBaUI7UUFDeEMsSUFBSSxHQUFHLEdBQVcsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckQsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVELFNBQVMsZUFBZSxDQUFDLEVBQWlCO1FBQ3RDLElBQUksR0FBRyxHQUFXLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JELFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCxTQUFnQixJQUFJO1FBQ2hCLElBQUksVUFBVSxHQUFtQixJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN2RCxJQUFJLFVBQVUsR0FBWSxLQUFLLENBQUM7UUFFaEMsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3JCLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xCLFVBQVUsR0FBRyxJQUFJLENBQUM7U0FDckI7UUFDRCxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDckIsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEIsVUFBVSxHQUFHLElBQUksQ0FBQztTQUNyQjtRQUNELElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNyQixVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQixVQUFVLEdBQUcsSUFBSSxDQUFDO1NBQ3JCO1FBQ0QsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3JCLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xCLFVBQVUsR0FBRyxJQUFJLENBQUM7U0FDckI7UUFFRCxJQUFJLFVBQVUsSUFBSSxVQUFVLENBQUMsU0FBUyxJQUFJLENBQUMsRUFBRTtZQUN6QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbEU7SUFDTCxDQUFDO0lBeEJlLGdCQUFJLE9Bd0JuQixDQUFBO0lBQ0QsWUFBWTtJQUVaLGdCQUFnQjtJQUNoQixTQUFTLE1BQU0sQ0FBQyxFQUFjO1FBRTFCLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUM7UUFDNUIsUUFBUSxXQUFXLEVBQUU7WUFDakIsS0FBSyxDQUFDO2dCQUNGLGlDQUFpQztnQkFDakMsSUFBSSxTQUFTLEdBQW1CLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDdEcsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDL0IsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO29CQUNoQixVQUFVLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2lCQUN0QztnQkFDRCxNQUFNO1lBQ1YsS0FBSyxDQUFDO2dCQUNGLCtEQUErRDtnQkFFL0QsTUFBTTtZQUNWO2dCQUVJLE1BQU07U0FDYjtJQUNMLENBQUM7SUFDRCxZQUFZO0FBQ2hCLENBQUMsRUF4R1MsV0FBVyxLQUFYLFdBQVcsUUF3R3BCO0FDeEdELElBQVUsS0FBSyxDQVdkO0FBWEQsV0FBVSxLQUFLO0lBRVgsTUFBYSxTQUFVLFNBQVEsQ0FBQyxDQUFDLElBQUk7UUFDakMsWUFBWSxLQUFhO1lBQ3JCLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUViLHdGQUF3RjtRQUU1RixDQUFDO0tBQ0o7SUFQWSxlQUFTLFlBT3JCLENBQUE7QUFFTCxDQUFDLEVBWFMsS0FBSyxLQUFMLEtBQUssUUFXZDtBQ1hELGlFQUFpRTtBQUVqRSxJQUFVLFVBQVUsQ0F1TG5CO0FBekxELGlFQUFpRTtBQUVqRSxXQUFVLFVBQVU7SUFDaEIsSUFBWSxRQVFYO0lBUkQsV0FBWSxRQUFRO1FBQ2hCLGlEQUFTLENBQUE7UUFDVCx5Q0FBSyxDQUFBO1FBQ0wsaURBQVMsQ0FBQTtRQUNULDJDQUFNLENBQUE7UUFDTixtREFBVSxDQUFBO1FBQ1YsMkRBQWMsQ0FBQTtRQUNkLCtDQUFRLENBQUE7SUFDWixDQUFDLEVBUlcsUUFBUSxHQUFSLG1CQUFRLEtBQVIsbUJBQVEsUUFRbkI7SUFFRCxJQUFPLE9BQU8sR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDO0lBRzNCLGtCQUFPLEdBQWEsRUFBRSxDQUFDO0lBRXZCLHdCQUFhLEdBQVksS0FBSyxDQUFDO0lBRS9CLHFCQUFVLEdBQWEsRUFBRSxDQUFDO0lBRXJDLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLFdBQVcsRUFBRSxDQUFBLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3pGLElBQUksWUFBWSxHQUFxQixRQUFRLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzdFLFFBQVEsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUtqRixTQUFnQixTQUFTO1FBQ3JCLFdBQUEsTUFBTSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDdkIsV0FBQSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN6RSxXQUFBLE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTNDLFdBQVcsRUFBRSxDQUFBO1FBRWIsU0FBUyxXQUFXO1lBQ2hCLElBQUksV0FBQSxNQUFNLENBQUMsRUFBRSxJQUFJLFNBQVMsRUFBRTtnQkFDeEIsV0FBQSxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQUEsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzNCO2lCQUFNO2dCQUNILFVBQVUsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDaEM7UUFDTCxDQUFDO0lBQ0wsQ0FBQztJQWRlLG9CQUFTLFlBY3hCLENBQUE7SUFHRCxLQUFLLFVBQVUsY0FBYyxDQUFDLE1BQTBDO1FBQ3BFLElBQUksTUFBTSxZQUFZLFlBQVksRUFBRTtZQUNoQyxJQUFJLE9BQU8sR0FBcUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEQsSUFBSSxPQUFPLENBQUMsUUFBUSxJQUFJLFdBQUEsTUFBTSxDQUFDLEVBQUUsRUFBRTtnQkFDL0IsSUFBSSxPQUFPLENBQUMsT0FBTyxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFO29CQUM5RyxJQUFJLE9BQU8sQ0FBQyxPQUFPLElBQUksU0FBUyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEVBQUU7d0JBQ3ZGLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksV0FBQSxNQUFNLENBQUMsRUFBRSxJQUFJLFdBQUEsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLFNBQVMsRUFBRTs0QkFDOUcsV0FBQSxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7eUJBQ3ZDO3FCQUNKO29CQUNELElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxTQUFTLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRTt3QkFDbkYsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNwQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFOzRCQUMzQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQzFQLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQzdKLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzs0QkFDckMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7eUJBQ3pCOzZCQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7NEJBQ25ELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDM1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDN0osSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDOzRCQUNyQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQzt5QkFDekI7cUJBRUo7b0JBRUQsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO3dCQUNoQixJQUFJLE9BQU8sQ0FBQyxPQUFPLElBQUksU0FBUyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEVBQUU7NEJBQ3ZGLElBQUksVUFBVSxHQUFtQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7NEJBQ2hKLElBQUksWUFBWSxHQUFtQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7NEJBRTNKLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUM7NEJBQy9DLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUM7eUJBQ2pEO3dCQUNELElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxTQUFTLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRTs0QkFDcEYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7eUJBQ25KO3dCQUVELElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxTQUFTLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRTs0QkFDeEYsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7eUJBQzdXO3dCQUNELElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxTQUFTLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsRUFBRTs0QkFDNUYsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7NEJBQ3hFLElBQUksS0FBSyxJQUFJLFNBQVMsRUFBRTtnQ0FDcEIsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUM5SixLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7NkJBQzFCO3lCQUNKO3dCQUNELElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxTQUFTLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRTs0QkFDdEYsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7NEJBQ3hFLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDOzRCQUM5QixLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQzt5QkFDN0I7cUJBQ0o7aUJBQ0o7YUFDSjtTQUNKO0lBQ0wsQ0FBQztJQUVELGdCQUFnQjtJQUNoQixTQUFnQixXQUFXLENBQUMsS0FBbUI7UUFDM0MsSUFBSSxXQUFBLE1BQU0sQ0FBQyxNQUFNLElBQUksU0FBUyxFQUFFO1lBQzVCLFdBQUEsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3BCLFdBQUEsYUFBYSxHQUFHLElBQUksQ0FBQztTQUN4QjtRQUVELElBQUksS0FBSyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQzVCLFdBQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1NBQzlNO2FBQU0sSUFBSSxLQUFLLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDcEMsV0FBQSxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUE7U0FDL007YUFBTTtZQUNILFdBQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FB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T0FBTyxHQUFHLE1BQU0sQ0FBQztZQUN6QixVQUFVLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQztRQUNqQyxDQUFDO1FBRUQsS0FBSyxDQUFDLElBQUk7WUFDTixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvRCxnRUFBZ0U7UUFDcEUsQ0FBQztLQUNKO0lBdEZZLFdBQVEsV0FzRnBCLENBQUE7QUFDTCxDQUFDLEVBekpTLEVBQUUsS0FBRixFQUFFLFFBeUpYO0FDekpELElBQVUsT0FBTyxDQVloQjtBQVpELFdBQVUsT0FBTztJQUNiLE1BQWEsTUFBTTtRQUNmLFlBQVksR0FBVyxFQUFFLENBQUM7UUFDbkIsbUJBQW1CLEdBQVcsSUFBSSxDQUFDLFlBQVksQ0FBQztRQUN2RCxXQUFXLEdBQVcsQ0FBQyxDQUFDO1FBQ2pCLGtCQUFrQixHQUFXLElBQUksQ0FBQyxXQUFXLENBQUM7UUFFckQsWUFBWSxhQUFxQixFQUFFLFlBQW9CO1lBQ25ELElBQUksQ0FBQyxZQUFZLEdBQUcsYUFBYSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDO1FBQ3BDLENBQUM7S0FDSjtJQVZZLGNBQU0sU0FVbEIsQ0FBQTtBQUNMLENBQUMsRUFaUyxPQUFPLEtBQVAsT0FBTyxRQVloQiIsInNvdXJjZXNDb250ZW50IjpbIi8vI3JlZ2lvbiBcIkltcG9ydHNcIlxyXG4vLy88cmVmZXJlbmNlIHR5cGVzPVwiLi4vRlVER0UvQ29yZS9CdWlsZC9GdWRnZUNvcmUuanNcIi8+XHJcbi8vLzxyZWZlcmVuY2UgdHlwZXM9XCIuLi9GVURHRS9BaWQvQnVpbGQvRnVkZ2VBaWQuanNcIi8+XHJcbi8vI2VuZHJlZ2lvbiBcIkltcG9ydHNcIlxyXG5cclxubmFtZXNwYWNlIEdhbWUge1xyXG4gICAgZXhwb3J0IGltcG9ydCDGkiA9IEZ1ZGdlQ29yZTtcclxuICAgIGV4cG9ydCBpbXBvcnQgxpJBaWQgPSBGdWRnZUFpZDtcclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiRG9tRWxlbWVudHNcIlxyXG4gICAgZXhwb3J0IGxldCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50ID0gPEhUTUxDYW52YXNFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ2FudmFzXCIpO1xyXG4gICAgLy8gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGluaXQpO1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIHN0YXJ0KTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiUmFuZ2VkXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBwbGF5ZXJDaG9pY2UpO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJNZWxlZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcGxheWVyQ2hvaWNlKTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcIkRvbUVsZW1lbnRzXCJcclxuXHJcbiAgICAvLyNyZWdpb24gXCJQdWJsaWNWYXJpYWJsZXNcIlxyXG4gICAgZXhwb3J0IGxldCB2aWV3cG9ydDogxpIuVmlld3BvcnQgPSBuZXcgxpIuVmlld3BvcnQoKTtcclxuICAgIGV4cG9ydCBsZXQgZ3JhcGg6IMaSLk5vZGUgPSBuZXcgxpIuTm9kZShcIkdyYXBoXCIpO1xyXG4gICAgZXhwb3J0IGxldCBwbGF5ZXIxOiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgZXhwb3J0IGxldCBwbGF5ZXIyOiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgZXhwb3J0IGxldCBjb25uZWN0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIGV4cG9ydCBsZXQgZnJhbWVSYXRlOiBudW1iZXIgPSA2MDtcclxuICAgIGV4cG9ydCBsZXQgZW5lbWllczogRW5lbXkuRW5lbXlbXSA9IFtdO1xyXG4gICAgZXhwb3J0IGxldCBlbmVtaWVzSlNPTjogUGxheWVyLkNoYXJhY3RlcltdO1xyXG4gICAgZXhwb3J0IGxldCBpdGVtc0pTT046IFBsYXllci5DaGFyYWN0ZXJbXTtcclxuICAgIGV4cG9ydCBsZXQgYmF0OiBFbmVteS5FbmVteTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcIlB1YmxpY1ZhcmlhYmxlc1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiUHJpdmF0ZVZhcmlhYmxlc1wiXHJcbiAgICBsZXQgaXRlbTE6IEl0ZW1zLkl0ZW07XHJcbiAgICBsZXQgY21wQ2FtZXJhOiDGki5Db21wb25lbnRDYW1lcmEgPSBuZXcgxpIuQ29tcG9uZW50Q2FtZXJhKCk7XHJcbiAgICBsZXQgcGxheWVyVHlwZTogUGxheWVyLlR5cGU7XHJcbiAgICBjb25zdCBkYW1wZXI6IG51bWJlciA9IDMuNTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcIlByaXZhdGVWYXJpYWJsZXNcIlxyXG5cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiZXNzZW50aWFsXCJcclxuICAgIGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICAgICAgaWYgKEJ1bGxldHMuYnVsbGV0VHh0ID09IG51bGwpIHtcclxuICAgICAgICAgICAgbG9hZFRleHR1cmVzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGF3YWl0IGxvYWRFbmVtaWVzSlNPTigpO1xyXG5cclxuICAgICAgICBpZiAocGxheWVyMSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHBsYXllcjEgPSBuZXcgUGxheWVyLlJhbmdlZChcIlBsYXllcjFcIiwgbmV3IFBsYXllci5DaGFyYWN0ZXIoXCJUaG9yLFwiLCBuZXcgUGxheWVyLkF0dHJpYnV0ZXMoMTAsIDUsIDUpKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIMaSLkRlYnVnLmxvZyhwbGF5ZXIpO1xyXG5cclxuICAgICAgICAvLyNyZWdpb24gaW5pdCBJdGVtc1xyXG4gICAgICAgIGl0ZW0xID0gbmV3IEl0ZW1zLkludGVybmFsSXRlbShcImNvb2xkb3duIHJlZHVjdGlvblwiLCBcImFkZHMgc3BlZWQgYW5kIHNoaXRcIiwgbmV3IMaSLlZlY3RvcjMoMCwgMiwgMCksIG5ldyBQbGF5ZXIuQXR0cmlidXRlcygwLCAwLCAwLCAxMDApLCBJdGVtcy5JVEVNVFlQRS5QUk9DRU5UVUFMLCBcIi4vUmVzb3VyY2VzL0ltYWdlL0l0ZW1zXCIpO1xyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICBHZW5lcmF0aW9uLmdlbmVyYXRlUm9vbXMoKTtcclxuXHJcbiAgICAgICAgLy8gbGV0IGVuZW15ID0gbmV3IEVuZW15LkVuZW15Q2lyY2xlKFwic8O2cmtsZXJcIiwgbmV3IFBsYXllci5DaGFyYWN0ZXIoXCJzw7Zya2lcIiwgbmV3IFBsYXllci5BdHRyaWJ1dGVzKDEwLCAyLCAzKSksIG5ldyDGki5WZWN0b3IyKDIsIDMpKTtcclxuICAgICAgICAvLyBncmFwaC5hZGRDaGlsZChlbmVteSk7XHJcbiAgICAgICAgLy8jcmVnaW9uIFRlc3Rpbmcgb2JqZWN0c1xyXG4gICAgICAgIGxldCBub2RlOiDGki5Ob2RlID0gbmV3IMaSLk5vZGUoXCJRdWFkXCIpO1xyXG5cclxuICAgICAgICBub2RlLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG5cclxuICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICBsZXQgY21wTWVzaDogxpIuQ29tcG9uZW50TWVzaCA9IG5ldyDGki5Db21wb25lbnRNZXNoKG1lc2gpO1xyXG4gICAgICAgIG5vZGUuYWRkQ29tcG9uZW50KGNtcE1lc2gpO1xyXG5cclxuICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgbGV0IGNtcE1hdGVyaWFsOiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChtdHJTb2xpZFdoaXRlKTtcclxuICAgICAgICBub2RlLmFkZENvbXBvbmVudChjbXBNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgIGxldCBuZXdUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgICAgICBsZXQgbmV3Q29hdDogxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkID0gbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCgpO1xyXG4gICAgICAgIGxldCBvbGRDb21Db2F0OiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCgpO1xyXG4gICAgICAgIGxldCBuZXdNdHI6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibXRyXCIsIMaSLlNoYWRlckZsYXRUZXh0dXJlZCwgbmV3Q29hdCk7XHJcbiAgICAgICAgbGV0IG9sZFBpdm90OiDGki5NYXRyaXg0eDQgPSBuZXcgxpIuTWF0cml4NHg0KCk7XHJcblxyXG4gICAgICAgIG9sZENvbUNvYXQgPSBub2RlLmdldENvbXBvbmVudCjGki5Db21wb25lbnRNYXRlcmlhbCk7XHJcbiAgICAgICAgb2xkUGl2b3QgPSBub2RlLmdldENvbXBvbmVudCjGki5Db21wb25lbnRNZXNoKS5tdHhQaXZvdDtcclxuXHJcbiAgICAgICAgYXdhaXQgbmV3VHh0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9ncmFzLnBuZ1wiKTtcclxuICAgICAgICBuZXdDb2F0LmNvbG9yID0gxpIuQ29sb3IuQ1NTKFwiV0hJVEVcIik7XHJcbiAgICAgICAgbmV3Q29hdC50ZXh0dXJlID0gbmV3VHh0O1xyXG4gICAgICAgIG9sZENvbUNvYXQubWF0ZXJpYWwgPSBuZXdNdHI7XHJcblxyXG4gICAgICAgIG5vZGUuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKDMwLCAzMCwgMSkpO1xyXG4gICAgICAgIG5vZGUuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZVooLTAuMDEpO1xyXG5cclxuXHJcbiAgICAgICAgZ3JhcGguYXBwZW5kQ2hpbGQocGxheWVyMSk7XHJcbiAgICAgICAgZ3JhcGguYXBwZW5kQ2hpbGQoaXRlbTEpO1xyXG5cclxuXHJcbiAgICAgICAgxpJBaWQuYWRkU3RhbmRhcmRMaWdodENvbXBvbmVudHMoZ3JhcGgpO1xyXG5cclxuICAgICAgICBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRlWigyNSk7XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnJvdGF0ZVkoMTgwKTtcclxuXHJcbiAgICAgICAgxpIuRGVidWcubG9nKGdyYXBoKTtcclxuXHJcbiAgICAgICAgdmlld3BvcnQuaW5pdGlhbGl6ZShcIlZpZXdwb3J0XCIsIGdyYXBoLCBjbXBDYW1lcmEsIGNhbnZhcyk7XHJcblxyXG4gICAgICAgIGRyYXcoKTtcclxuXHJcbiAgICAgICAgxpIuTG9vcC5zdGFydCjGki5MT09QX01PREUuVElNRV9HQU1FLCBmcmFtZVJhdGUpO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgIElucHV0U3lzdGVtLm1vdmUoKTtcclxuXHJcbiAgICAgICAgaWYgKHBsYXllcjIgIT0gdW5kZWZpbmVkICYmICFjb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgY29ubmVjdGVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRyYXcoKTtcclxuXHJcbiAgICAgICAgY2FtZXJhVXBkYXRlKCk7XHJcblxyXG4gICAgICAgIHBsYXllcjEuY29vbGRvd24oKTtcclxuXHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIHBsYXllcjIuY29vbGRvd24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZVBvc2l0aW9uKEdhbWUucGxheWVyMS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgR2FtZS5wbGF5ZXIxLm10eExvY2FsLnJvdGF0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gTmV0d29ya2luZy5zcGF3bkVuZW15KGJhdCwgYmF0LmlkKTtcclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIGNvdW50IGl0ZW1zXHJcbiAgICAgICAgbGV0IGl0ZW1zOiBJdGVtcy5JdGVtW10gPSA8SXRlbXMuSXRlbVtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxJdGVtcy5JdGVtPmVsZW1lbnQpLnRhZyA9PSBUYWcuVGFnLklURU0pXHJcbiAgICAgICAgaXRlbXMuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgZWxlbWVudC5saWZlc3BhbihncmFwaCk7XHJcbiAgICAgICAgICAgICg8SXRlbXMuSW50ZXJuYWxJdGVtPmVsZW1lbnQpLmNvbGxpc2lvbkRldGVjdGlvbigpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICBsZXQgYnVsbGV0czogQnVsbGV0cy5CdWxsZXRbXSA9IDxCdWxsZXRzLkJ1bGxldFtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxCdWxsZXRzLkJ1bGxldD5lbGVtZW50KS50YWcgPT0gVGFnLlRhZy5CVUxMRVQpXHJcbiAgICAgICAgYnVsbGV0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICBlbGVtZW50Lm1vdmUoKTtcclxuICAgICAgICAgICAgZWxlbWVudC5saWZlc3BhbihncmFwaCk7XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgbGV0IGRhbWFnZVVJOiBVSS5EYW1hZ2VVSVtdID0gPFVJLkRhbWFnZVVJW10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPFVJLkRhbWFnZVVJPmVsZW1lbnQpLnRhZyA9PSBUYWcuVGFnLkRBTUFHRVVJKVxyXG4gICAgICAgIGRhbWFnZVVJLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZSgpO1xyXG4gICAgICAgICAgICBlbGVtZW50LmxpZmVzcGFuKGdyYXBoKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBlbmVtaWVzID0gPEVuZW15LkVuZW15W10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVuZW15LkVuZW15PmVsZW1lbnQpLnRhZyA9PSBUYWcuVGFnLkVORU1ZKVxyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgZW5lbWllcy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5tb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmxpZmVzcGFuKGdyYXBoKTtcclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIEVuZW15U3Bhd25lci5zcGF3bkVuZW1pZXMoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgVUkudXBkYXRlVUkoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzdGFydCgpIHtcclxuICAgICAgICBsb2FkVGV4dHVyZXMoKTtcclxuICAgICAgICAvL2FkZCBzcHJpdGUgdG8gZ3JhcGhlIGZvciBzdGFydHNjcmVlblxyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRHYW1lXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuY29ubmV0aW5nKCk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTG9iYnlzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgICAgICB3YWl0T25Db25uZWN0aW9uKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDcmVkaXRzXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgZnVuY3Rpb24gbG9hZEVuZW1pZXNKU09OKCkge1xyXG4gICAgICAgIGNvbnN0IGxvYWQgPSBhd2FpdCAoYXdhaXQgZmV0Y2goXCIuL1Jlc291cmNlcy9FbmVtaWVzU3RvcmFnZS5qc29uXCIpKS5qc29uKCk7XHJcbiAgICAgICAgZW5lbWllc0pTT04gPSAoKDxQbGF5ZXIuQ2hhcmFjdGVyW10+bG9hZC5lbmVtaWVzKSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gbG9hZFRleHR1cmVzKCkge1xyXG4gICAgICAgIGF3YWl0IEJ1bGxldHMuYnVsbGV0VHh0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9hcnJvdy5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IFVJLnR4dFplcm8ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzAucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dE9uZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvMS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0VG93LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS8yLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRUaHJlZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvMy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0Rm91ci5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvNC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0Rml2ZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvNS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0U2l4LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS82LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRTZXZlbi5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvNy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0RWlnaHQubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzgucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dE5pbmUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzkucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFRlbi5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvMTAucG5nXCIpO1xyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gd2FpdE9uQ29ubmVjdGlvbigpIHtcclxuICAgICAgICBOZXR3b3JraW5nLmNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IE5ldHdvcmtpbmcuRlVOQ1RJT04uQ09OTkVDVEVELCB2YWx1ZTogTmV0d29ya2luZy5jbGllbnQuaWQgfSB9KVxyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMubGVuZ3RoID4gMSAmJiBwbGF5ZXIxICE9IG51bGwpIHtcclxuICAgICAgICAgICAgYXdhaXQgaW5pdCgpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduUGxheWVyKHBsYXllclR5cGUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQod2FpdE9uQ29ubmVjdGlvbiwgMzAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGxheWVyQ2hvaWNlKF9lOiBFdmVudCkge1xyXG4gICAgICAgIGlmICgoPEhUTUxCdXR0b25FbGVtZW50Pl9lLnRhcmdldCkuaWQgPT0gXCJSYW5nZWRcIikge1xyXG4gICAgICAgICAgICBwbGF5ZXIxID0gbmV3IFBsYXllci5SYW5nZWQoXCJwbGF5ZXJcIiwgbmV3IFBsYXllci5DaGFyYWN0ZXIoXCJUaG9yLFwiLCBuZXcgUGxheWVyLkF0dHJpYnV0ZXMoMTAsIDUsIDUpKSk7XHJcbiAgICAgICAgICAgIHBsYXllclR5cGUgPSBQbGF5ZXIuVHlwZS5SQU5HRUQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICgoPEhUTUxCdXR0b25FbGVtZW50Pl9lLnRhcmdldCkuaWQgPT0gXCJNZWxlZVwiKSB7XHJcbiAgICAgICAgICAgIHBsYXllcjEgPSBuZXcgUGxheWVyLk1lbGVlKFwicGxheWVyXCIsIG5ldyBQbGF5ZXIuQ2hhcmFjdGVyKFwiVGhvcixcIiwgbmV3IFBsYXllci5BdHRyaWJ1dGVzKDEwLCAxLCA1KSkpO1xyXG4gICAgICAgICAgICBwbGF5ZXJUeXBlID0gUGxheWVyLlR5cGUuTUVMRUU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTG9iYnlzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZHJhdygpOiB2b2lkIHtcclxuICAgICAgICB2aWV3cG9ydC5kcmF3KCk7XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2FtZXJhVXBkYXRlKCkge1xyXG4gICAgICAgIGxldCBkaXJlY3Rpb24gPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UocGxheWVyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgZGlyZWN0aW9uLnNjYWxlKDEgLyBmcmFtZVJhdGUgKiBkYW1wZXIpO1xyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGUobmV3IMaSLlZlY3RvcjMoLWRpcmVjdGlvbi54LCBkaXJlY3Rpb24ueSwgMCksIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIMaSLkxvb3AuYWRkRXZlbnRMaXN0ZW5lcijGki5FVkVOVC5MT09QX0ZSQU1FLCB1cGRhdGUpO1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiZXNzZW50aWFsXCJcclxuXHJcbn1cclxuIiwibmFtZXNwYWNlIEludGVyZmFjZXMge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJU3Bhd25hYmxlIHtcclxuICAgICAgICBsaWZldGltZT86IG51bWJlcjtcclxuICAgICAgICBsaWZlc3BhbihfYTogxpIuTm9kZSk6IHZvaWQ7XHJcbiAgICB9XHJcbn1cclxuXHJcbm5hbWVzcGFjZSBQbGF5ZXIge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJS2lsbGFibGUge1xyXG4gICAgICAgIG9uRGVhdGgoKTogdm9pZDtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElEYW1hZ2JsZSB7XHJcbiAgICAgICAgZ2V0RGFtYWdlKCk6IHZvaWQ7XHJcbiAgICB9XHJcbn1cclxuIiwibmFtZXNwYWNlIEVuZW15IHtcclxuICAgIGVudW0gQkVIQVZJT1VSIHtcclxuICAgICAgICBGT0xMT1csIEZMRUVcclxuICAgIH1cclxuICAgIGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG5cclxuXHJcbiAgICBjbGFzcyBEdW1iSW5zdHJ1Y3Rpb25zIHtcclxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldCgpOiDGkkFpZC5TdGF0ZU1hY2hpbmVJbnN0cnVjdGlvbnM8QkVIQVZJT1VSPiB7XHJcbiAgICAgICAgICAgIGxldCBzZXR1cDogxpJBaWQuU3RhdGVNYWNoaW5lSW5zdHJ1Y3Rpb25zPEJFSEFWSU9VUj4gPSBuZXcgxpJBaWQuU3RhdGVNYWNoaW5lSW5zdHJ1Y3Rpb25zKCk7XHJcbiAgICAgICAgICAgIHNldHVwLnRyYW5zaXREZWZhdWx0ID0gRHVtYkluc3RydWN0aW9ucy50cmFuc2l0RGVmYXVsdDtcclxuICAgICAgICAgICAgc2V0dXAuYWN0RGVmYXVsdCA9IER1bWJJbnN0cnVjdGlvbnMuYWN0RGVmYXVsdDtcclxuICAgICAgICAgICAgc2V0dXAuc2V0QWN0aW9uKEJFSEFWSU9VUi5GT0xMT1csIHRoaXMuc3RvcCk7XHJcbiAgICAgICAgICAgIHJldHVybiBzZXR1cDtcclxuICAgICAgICB9XHJcbiAgICAgICAgc3RhdGljIGFzeW5jIGFjdERlZmF1bHQoX21hY2hpbmU6IMaSQWlkLlN0YXRlTWFjaGluZTxCRUhBVklPVVI+KSB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiZGVmYXVsQWN0aW9uXCIpO1xyXG4gICAgICAgICAgICAvLyBfbWFjaGluZS50cmFuc2l0KEJFSEFWSU9VUi5GT0xMT1cpO1xyXG4gICAgICAgICAgICAvLyBfbWFjaGluZS5hY3QoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgc3RhdGljIHRyYW5zaXREZWZhdWx0KF9tYWNoaW5lOiDGkkFpZC5TdGF0ZU1hY2hpbmU8QkVIQVZJT1VSPikge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInRyYW5zaXRpb25cIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBwcml2YXRlIHN0YXRpYyB0cmFuc2l0KF9tYWNoaW5lOiDGkkFpZC5TdGF0ZU1hY2hpbmU8QkVIQVZJT1VSPikge1xyXG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZyhcInRyYW5zaXQgdHJhbnNpdFwiKTtcclxuICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGFzeW5jIHN0b3AoX21hY2hpbmU6IMaSQWlkLlN0YXRlTWFjaGluZTxCRUhBVklPVVI+KSB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwic3RvcFwiKTtcclxuICAgICAgICAgICAgLy8gX21hY2hpbmUudHJhbnNpdChCRUhBVklPVVIuSURMRSk7XHJcbiAgICAgICAgICAgIC8vIC8vIF9tYWNoaW5lLmFjdCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXkgZXh0ZW5kcyBHYW1lLsaSQWlkLk5vZGVTcHJpdGUgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklTcGF3bmFibGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UYWcgPSBUYWcuVGFnLkVORU1ZO1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyID0gTmV0d29ya2luZy5pZEdlbmVyYXRvcigpO1xyXG4gICAgICAgIHB1YmxpYyBwcm9wZXJ0aWVzOiBQbGF5ZXIuQ2hhcmFjdGVyO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7XHJcbiAgICAgICAgdGFyZ2V0OiDGki5WZWN0b3IzO1xyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXI7XHJcbiAgICAgICAgY2FuTW92ZVg6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgICAgIGNhbk1vdmVZOiBib29sZWFuID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgLy8jcmVnaW9uICBhbmltYXRpb25cclxuICAgICAgICBhbmltYXRpb25zOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbnM7XHJcbiAgICAgICAgcHJpdmF0ZSBjbHJXaGl0ZTogxpIuQ29sb3IgPSDGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKTtcclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDcmVhdGVzIGFuIEVuZW15XHJcbiAgICAgICAgICogQHBhcmFtIF9uYW1lIE5hbWUgb2YgdGhlIGVuZW15XHJcbiAgICAgICAgICogQHBhcmFtIF9wcm9wZXJ0aWVzIFByb3BlcnRpZXMsIHN0b3JpbmcgYXR0cmlidXRlcyBhbmQgc3R1ZmZcclxuICAgICAgICAgKiBAcGFyYW0gX3Bvc2l0aW9uIHBvc2l0aW9uIHdoZXJlIHRvIHNwYXduXHJcbiAgICAgICAgICogQHBhcmFtIF9haVR5cGUgb3B0aW9uYWw6IHN0YW5kYXJkIGFpID0gZHVtYlxyXG4gICAgICAgICAqL1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3RlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfaWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLnByb3BlcnRpZXMgPSBfcHJvcGVydGllcztcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDApO1xyXG4gICAgICAgICAgICBpZiAoX2lkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuY3VycmVudElEcy5wdXNoKF9pZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5ldElkID0gX2lkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCAvIDIpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduRW5lbXkodGhpcywgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIC8vVE9ETzogYWRkIHNwcml0ZSBhbmltYXRpb25cclxuICAgICAgICAgICAgdGhpcy5zdGFydFNwcml0ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhc3luYyBzdGFydFNwcml0ZSgpIHtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5sb2FkU3ByaXRlcygpO1xyXG4gICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25zW1wiZmx5XCJdKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRGcmFtZURpcmVjdGlvbigxKTtcclxuICAgICAgICAgICAgdGhpcy5mcmFtZXJhdGUgPSAxMjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIGxvYWRTcHJpdGVzKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgICAgICBsZXQgaW1nU3ByaXRlU2hlZXQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgICAgICAgICAgYXdhaXQgaW1nU3ByaXRlU2hlZXQubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc3Bpbm5pLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBzcHJpdGVTaGVldDogxpIuQ29hdFRleHR1cmVkID0gbmV3IMaSLkNvYXRUZXh0dXJlZCh0aGlzLmNscldoaXRlLCBpbWdTcHJpdGVTaGVldCk7XHJcbiAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVTcHJpdGVzKHNwcml0ZVNoZWV0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdlbmVyYXRlU3ByaXRlcyhfc3ByaXRlc2hlZXQ6IMaSLkNvYXRUZXh0dXJlZCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvbnMgPSB7fTtcclxuICAgICAgICAgICAgbGV0IG5hbWU6IHN0cmluZyA9IFwiZmx5XCI7XHJcbiAgICAgICAgICAgIGxldCBzcHJpdGU6IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uID0gbmV3IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uKG5hbWUsIF9zcHJpdGVzaGVldCk7XHJcbiAgICAgICAgICAgIHNwcml0ZS5nZW5lcmF0ZUJ5R3JpZCjGki5SZWN0YW5nbGUuR0VUKDAsIDAsIDE4LCAxNCksIDQsIDIyLCDGki5PUklHSU4yRC5CT1RUT01DRU5URVIsIMaSLlZlY3RvcjIuWCgxOCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvbnNbbmFtZV0gPSBzcHJpdGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVDb2xsaWRlcigpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVuZW15UG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlQ29sbGlkZXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldFRhcmdldCgpOiDGki5WZWN0b3IzIHtcclxuICAgICAgICAgICAgbGV0IHRhcmdldCA9IEdhbWUucGxheWVyMTtcclxuXHJcbiAgICAgICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGRpc3RhbmNlUGxheWVyMSA9IHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKEdhbWUucGxheWVyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgbGV0IGRpc3RhbmNlUGxheWVyMiA9IHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKEdhbWUucGxheWVyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChkaXN0YW5jZVBsYXllcjEgPCBkaXN0YW5jZVBsYXllcjIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0YXJnZXQgPSBHYW1lLnBsYXllcjE7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0YXJnZXQgPSBHYW1lLnBsYXllcjI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXQuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG1vdmVTaW1wbGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gdGhpcy5nZXRUYXJnZXQoKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGRpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICBkaXJlY3Rpb24uc2NhbGUoKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcblxyXG4gICAgICAgICAgICAvLyBsZXQgY2FuTW92ZTogW2Jvb2xlYW4sIGJvb2xlYW5dID0gdGhpcy5nZXRDYW5Nb3ZlWFkoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgLy8gbGV0IGNhbk1vdmVYOiBib29sZWFuID0gY2FuTW92ZVswXTtcclxuICAgICAgICAgICAgLy8gbGV0IGNhbk1vdmVZOiBib29sZWFuID0gY2FuTW92ZVsxXTtcclxuICAgICAgICAgICAgdGhpcy5nZXRDYW5Nb3ZlWFkoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgLy9UT0RPOiBpbiBGdW5rdGlvbiBwYWNrZW4gZGFtaXQgbWFuIHZvbiBhbGxlbSBFbmVtaWVzIGRyYXVmIHp1Z3JlaWZlbiBrYW5uXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUF3YXkoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gdGhpcy5nZXRUYXJnZXQoKTtcclxuXHJcblxyXG4gICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy50YXJnZXQpO1xyXG4gICAgICAgICAgICBkaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICBkaXJlY3Rpb24uc2NhbGUoKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAgICAgICAgIC8vIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShkaXJlY3Rpb24sIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5nZXRDYW5Nb3ZlWFkoZGlyZWN0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBsaWZlc3BhbihfZ3JhcGg6IEdhbWUuxpIuTm9kZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucmVtb3ZlRW5lbXkodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgX2dyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRDYW5Nb3ZlWFkoZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGxldCBjYW5Nb3ZlWCA9IHRydWU7XHJcbiAgICAgICAgICAgIGxldCBjYW5Nb3ZlWSA9IHRydWU7XHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlcnM6IEdlbmVyYXRpb24uV2FsbFtdID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbWVudCA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtZW50KS50YWcgPT0gVGFnLlRhZy5ST09NKSkud2FsbHM7XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlc1JlY3QoZWxlbWVudC5jb2xsaWRlcikpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUJlZm9yZU1vdmUgPSBNYXRoLnJvdW5kKChpbnRlcnNlY3Rpb24uaGVpZ2h0ICogaW50ZXJzZWN0aW9uLndpZHRoKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG9sZFBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMih0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLngsIHRoaXMuY29sbGlkZXIucG9zaXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoZGlyZWN0aW9uLngsIDApXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBNYXRoLnJvdW5kKChuZXdJbnRlcnNlY3Rpb24uaGVpZ2h0ICogbmV3SW50ZXJzZWN0aW9uLndpZHRoKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5Nb3ZlWCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMigwLCBkaXJlY3Rpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBNYXRoLnJvdW5kKChuZXdJbnRlcnNlY3Rpb24uaGVpZ2h0ICogbmV3SW50ZXJzZWN0aW9uLndpZHRoKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5Nb3ZlWSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGlmIChjYW5Nb3ZlWCAmJiBjYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKGRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2FuTW92ZVggJiYgIWNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMyhkaXJlY3Rpb24ueCwgMCwgZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICghY2FuTW92ZVggJiYgY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIGRpcmVjdGlvbi55LCBkaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShkaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteUR1bWIgZXh0ZW5kcyBFbmVteSB7XHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgaW5zdHJ1Y3Rpb25zOiDGkkFpZC5TdGF0ZU1hY2hpbmVJbnN0cnVjdGlvbnM8QkVIQVZJT1VSPiA9IER1bWJJbnN0cnVjdGlvbnMuZ2V0KCk7XHJcbiAgICAgICAgc3RhdGVNYWNoaW5lOiDGkkFpZC5Db21wb25lbnRTdGF0ZU1hY2hpbmU8QkVIQVZJT1VSPiA9IG5ldyDGkkFpZC5Db21wb25lbnRTdGF0ZU1hY2hpbmUoKTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX3Byb3BlcnRpZXM6IFBsYXllci5DaGFyYWN0ZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMikge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSwgX3Byb3BlcnRpZXMsIF9wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGVNYWNoaW5lLmluc3RydWN0aW9ucyA9IEVuZW15RHVtYi5pbnN0cnVjdGlvbnM7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KHRoaXMuc3RhdGVNYWNoaW5lKTtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZU1hY2hpbmUuYWN0KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlKCk6IHZvaWQge1xyXG5cclxuICAgICAgICAgICAgLy8gdGhpcy5tb3ZlU2ltcGxlKCk7XHJcbiAgICAgICAgICAgIHN1cGVyLm1vdmUoKTtcclxuICAgICAgICAgICAgdGhpcy5tb3ZlQmVoYXZpb3VyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIGxldCB0YXJnZXQgPSB0aGlzLmdldFRhcmdldCgpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGFyZ2V0LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG4gICAgICAgICAgICBpZiAoZGlzdGFuY2UgPCAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlTWFjaGluZS50cmFuc2l0KEJFSEFWSU9VUi5GTEVFKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVNYWNoaW5lLmFjdCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGRpc3RhbmNlID4gNSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZU1hY2hpbmUudHJhbnNpdChCRUhBVklPVVIuRk9MTE9XKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVNYWNoaW5lLmFjdCgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCkge1xyXG5cclxuICAgICAgICAgICAgdGhpcy5iZWhhdmlvdXIoKTtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLnN0YXRlTWFjaGluZS5zdGF0ZUN1cnJlbnQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgQkVIQVZJT1VSLkZMRUU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlQXdheSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCRUhBVklPVVIuRk9MTE9XOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZVNpbXBsZSgpXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZVNpbXBsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIubGlmZXNwYW4oX2dyYXBoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15RmxlZSBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3RlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lLCBfcHJvcGVydGllcywgX3Bvc2l0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmUoKSB7XHJcbiAgICAgICAgICAgIHN1cGVyLm1vdmUoKTtcclxuICAgICAgICAgICAgdGhpcy5tb3ZlQXdheSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGlmZXNwYW4oX2dyYXBoOiDGki5Ob2RlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmxpZmVzcGFuKF9ncmFwaCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteUNpcmNsZSBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICBkaXN0YW5jZTogbnVtYmVyID0gNTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX3Byb3BlcnRpZXM6IFBsYXllci5DaGFyYWN0ZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMikge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSwgX3Byb3BlcnRpZXMsIF9wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5tb3ZlKCk7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZUNpcmNsZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGlmZXNwYW4oX2dyYXBoOiDGki5Ob2RlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmxpZmVzcGFuKF9ncmFwaCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBtb3ZlQ2lyY2xlKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IHRoaXMuZ2V0VGFyZ2V0KCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMudGFyZ2V0KTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlUGxheWVyMSA9IHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKEdhbWUucGxheWVyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAvLyBsZXQgZGlzdGFuY2VQbGF5ZXIyID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24uZ2V0RGlzdGFuY2UoR2FtZS5wbGF5ZXIyLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZVBsYXllcjEgPiB0aGlzLmRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVTaW1wbGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxldCBkZWdyZWUgPSBJbnB1dFN5c3RlbS5jYWxjRGVncmVlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLnRhcmdldClcclxuICAgICAgICAgICAgICAgIGxldCBhZGQgPSAwO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHdoaWxlIChkaXN0YW5jZVBsYXllcjEgPD0gdGhpcy5kaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCBJbnB1dFN5c3RlbS5jYWxjUG9zaXRpb25Gcm9tRGVncmVlKGRlZ3JlZSArIGFkZCwgdGhpcy5kaXN0YW5jZSkudG9WZWN0b3IzKDApKTtcclxuICAgICAgICAgICAgICAgIC8vICAgICBkaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gICAgIGRpcmVjdGlvbi5zY2FsZSgoMSAvIEdhbWUuZnJhbWVSYXRlICogdGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuICAgICAgICAgICAgICAgIC8vICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoZGlyZWN0aW9uLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIC8vICAgICBhZGQgKz0gNTtcclxuICAgICAgICAgICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgSXRlbXMge1xyXG4gICAgZXhwb3J0IGVudW0gSVRFTVRZUEUge1xyXG4gICAgICAgIEFERCxcclxuICAgICAgICBTVUJTVFJBQ1QsXHJcbiAgICAgICAgUFJPQ0VOVFVBTFxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIEl0ZW0gZXh0ZW5kcyBHYW1lLsaSQWlkLk5vZGVTcHJpdGUgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklTcGF3bmFibGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UYWcgPSBUYWcuVGFnLklURU07XHJcbiAgICAgICAgcHVibGljIGlkOiBudW1iZXIgPSBOZXR3b3JraW5nLmlkR2VuZXJhdG9yKCk7XHJcbiAgICAgICAgcHVibGljIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbiAgICAgICAgcHVibGljIGltZ1NyYzogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogR2FtZS7Gki5SZWN0YW5nbGU7XHJcbiAgICAgICAgbGlmZXRpbWU6IG51bWJlcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX2Rlc2NyaXB0aW9uOiBzdHJpbmcsIF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2ltZ1NyYz86IHN0cmluZywgX2xpZmV0aW1lPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5kZXNjcmlwdGlvbiA9IF9kZXNjcmlwdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5pbWdTcmMgPSBfaW1nU3JjO1xyXG4gICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gX2xpZmV0aW1lO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX3Bvc2l0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPj0gMCAmJiB0aGlzLmxpZmV0aW1lICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUtLTtcclxuICAgICAgICAgICAgICAgIC8vIMaSLkRlYnVnLmxvZyh0aGlzLm5hbWUgKyBcIjogXCIgKyB0aGlzLmxpZmV0aW1lKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBjb2xsaXNpb25EZXRlY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlcnM6IGFueVtdID0gR2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkudGFnID09IFRhZy5UYWcuUExBWUVSKTtcclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQuY29sbGlkZXIpICYmIGVsZW1lbnQucHJvcGVydGllcyAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyAoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkucHJvcGVydGllcy5hdHRyaWJ1dGVzLmFkZEF0dHJpYnVlc0J5SXRlbSh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygoPEVuZW15LkVuZW15PmVsZW1lbnQpLnByb3BlcnRpZXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgSW50ZXJuYWxJdGVtIGV4dGVuZHMgSXRlbSB7XHJcbiAgICAgICAgcHVibGljIGF0dHJpYnV0ZXM6IFBsYXllci5BdHRyaWJ1dGVzO1xyXG4gICAgICAgIHB1YmxpYyB0eXBlOiBJVEVNVFlQRTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDcmVhdGVzIGFuIGl0ZW0gdGhhdCBjYW4gY2hhbmdlIEF0dHJpYnV0ZXMgb2YgdGhlIHBsYXllclxyXG4gICAgICAgICAqIEBwYXJhbSBfbmFtZSBuYW1lIG9mIHRoZSBJdGVtXHJcbiAgICAgICAgICogQHBhcmFtIF9kZXNjcmlwdGlvbiBEZXNjaXJwdGlvbiBvZiB0aGUgaXRlbVxyXG4gICAgICAgICAqIEBwYXJhbSBfcG9zaXRpb24gUG9zaXRpb24gd2hlcmUgdG8gc3Bhd25cclxuICAgICAgICAgKiBAcGFyYW0gX2xpZmV0aW1lIG9wdGlvbmFsOiBob3cgbG9uZyBpcyB0aGUgaXRlbSB2aXNpYmxlXHJcbiAgICAgICAgICogQHBhcmFtIF9hdHRyaWJ1dGVzIGRlZmluZSB3aGljaCBhdHRyaWJ1dGVzIHdpbGwgY2hhbmdlLCBjb21wYXJlIHdpdGgge0BsaW5rIFBsYXllci5BdHRyaWJ1dGVzfVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9kZXNjcmlwdGlvbjogc3RyaW5nLCBfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9hdHRyaWJ1dGVzOiBQbGF5ZXIuQXR0cmlidXRlcywgX3R5cGU6IElURU1UWVBFLCBfaW1nU3JjPzogc3RyaW5nLCBfbGlmZXRpbWU/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUsIF9kZXNjcmlwdGlvbiwgX3Bvc2l0aW9uLCBfaW1nU3JjLCBfbGlmZXRpbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSBfYXR0cmlidXRlcztcclxuICAgICAgICAgICAgdGhpcy50eXBlID0gX3R5cGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBjb2xsaXNpb25EZXRlY3Rpb24oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlcnM6IGFueVtdID0gR2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkudGFnID09IFRhZy5UYWcuUExBWUVSKTtcclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQuY29sbGlkZXIpICYmIGVsZW1lbnQucHJvcGVydGllcyAhPSB1bmRlZmluZWQgJiYgKHRoaXMubGlmZXRpbWUgPiAwIHx8IHRoaXMubGlmZXRpbWUgPT0gdW5kZWZpbmVkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuYWRkQXR0cmlidWVzQnlJdGVtKHRoaXMuYXR0cmlidXRlcywgdGhpcy50eXBlKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygoPEVuZW15LkVuZW15PmVsZW1lbnQpLnByb3BlcnRpZXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBQbGF5ZXIge1xyXG4gICAgZXhwb3J0IGNsYXNzIEF0dHJpYnV0ZXMge1xyXG5cclxuICAgICAgICBwdWJsaWMgaGVhbHRoUG9pbnRzOiBudW1iZXI7XHJcbiAgICAgICAgbWF4SGVhbHRoUG9pbnRzOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIHNwZWVkOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGF0dGFja1BvaW50czogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBjb29sRG93blJlZHVjdGlvbjogbnVtYmVyID0gMTtcclxuXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9oZWFsdGhQb2ludHM6IG51bWJlciwgX2F0dGFja1BvaW50czogbnVtYmVyLCBfc3BlZWQ6IG51bWJlciwgX2Nvb2xkb3duUmVkdWN0aW9uPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGVhbHRoUG9pbnRzID0gX2hlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgdGhpcy5tYXhIZWFsdGhQb2ludHMgPSBfaGVhbHRoUG9pbnRzO1xyXG4gICAgICAgICAgICB0aGlzLmF0dGFja1BvaW50cyA9IF9hdHRhY2tQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSBfc3BlZWQ7XHJcbiAgICAgICAgICAgIGlmIChfY29vbGRvd25SZWR1Y3Rpb24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvb2xEb3duUmVkdWN0aW9uID0gX2Nvb2xkb3duUmVkdWN0aW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBhZGRzIEF0dHJpYnV0ZXMgdG8gdGhlIFBsYXllciBBdHRyaWJ1dGVzXHJcbiAgICAgICAgICogQHBhcmFtIF9hdHRyaWJ1dGVzIGluY29taW5nIGF0dHJpYnV0ZXNcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgYWRkQXR0cmlidWVzQnlJdGVtKF9hdHRyaWJ1dGVzOiBQbGF5ZXIuQXR0cmlidXRlcywgX2l0ZW1UeXBlOiBJdGVtcy5JVEVNVFlQRSk6IHZvaWQge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKF9pdGVtVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5JVEVNVFlQRS5BREQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oZWFsdGhQb2ludHMgKz0gX2F0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWF4SGVhbHRoUG9pbnRzICs9IF9hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkICs9IF9hdHRyaWJ1dGVzLnNwZWVkO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNrUG9pbnRzICs9IF9hdHRyaWJ1dGVzLmF0dGFja1BvaW50cztcclxuICAgICAgICAgICAgICAgICAgICBicmVhazsgLy8gY2FsY3VsYXRlIGF0dHJpYnV0ZXMgYnkgYWRkaW5nIHRoZW1cclxuICAgICAgICAgICAgICAgIGNhc2UgSXRlbXMuSVRFTVRZUEUuU1VCU1RSQUNUOlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBjYWxjdWxhdGUgYXR0cmliZXMgYnkgc3Vic3RhY3RpbmcgdGhlbVxyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5JVEVNVFlQRS5QUk9DRU5UVUFMOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGVhbHRoUG9pbnRzID0gdGhpcy5oZWFsdGhQb2ludHMgKiAoKDEwMCArIF9hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cykgLyAxMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNrUG9pbnRzID0gdGhpcy5hdHRhY2tQb2ludHMgKiAoKDEwMCArIF9hdHRyaWJ1dGVzLmF0dGFja1BvaW50cykgLyAxMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWQgPSB0aGlzLnNwZWVkICogKCgxMDAgKyBfYXR0cmlidXRlcy5zcGVlZCkgLyAxMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuY29vbERvd25SZWR1Y3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29vbERvd25SZWR1Y3Rpb24gPSB0aGlzLmNvb2xEb3duUmVkdWN0aW9uICogTWF0aC5mcm91bmQoKDEwMCAvICgxMDAgKyBfYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbikpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmNvb2xEb3duUmVkdWN0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhazsgLy8gY2FsY3VsYXRlIGF0dHJpYnV0ZXMgYnkgZ2l2aW5nIHNwZWZpYyAlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQnVsbGV0cyB7XHJcblxyXG4gICAgZXhwb3J0IGxldCBidWxsZXRUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQnVsbGV0IGV4dGVuZHMgR2FtZS7Gki5Ob2RlIGltcGxlbWVudHMgSW50ZXJmYWNlcy5JU3Bhd25hYmxlIHtcclxuXHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRhZyA9IFRhZy5UYWcuQlVMTEVUO1xyXG4gICAgICAgIHB1YmxpYyBmbHlEaXJlY3Rpb246IMaSLlZlY3RvcjM7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcjtcclxuXHJcbiAgICAgICAgcHVibGljIGhpdFBvaW50czogbnVtYmVyID0gNTtcclxuICAgICAgICBwdWJsaWMgc3BlZWQ6IG51bWJlciA9IDIwO1xyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXIgPSAxICogR2FtZS5mcmFtZVJhdGU7XHJcblxyXG4gICAgICAgIGtpbGxjb3VudDogbnVtYmVyID0gMTtcclxuXHJcbiAgICAgICAgYXN5bmMgbGlmZXNwYW4oX2dyYXBoOiDGki5Ob2RlKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lID49IDAgJiYgdGhpcy5saWZldGltZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lLS07XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBfZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMykgeyAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBzdXBlcihcIm5vcm1hbEJ1bGxldFwiKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgMCk7XHJcbiAgICAgICAgICAgIHRoaXMuZmx5RGlyZWN0aW9uID0gX2RpcmVjdGlvbjtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGxldCBtZXNoOiDGki5NZXNoUXVhZCA9IG5ldyDGki5NZXNoUXVhZCgpO1xyXG4gICAgICAgICAgICBsZXQgY21wTWVzaDogxpIuQ29tcG9uZW50TWVzaCA9IG5ldyDGki5Db21wb25lbnRNZXNoKG1lc2gpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChjbXBNZXNoKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGxldCBtdHJTb2xpZFdoaXRlOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIlNvbGlkV2hpdGVcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIikpKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1hdGVyaWFsOiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChtdHJTb2xpZFdoaXRlKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWF0ZXJpYWwpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSgpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnJvdGF0ZVooSW5wdXRTeXN0ZW0uY2FsY0RlZ3JlZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgxpIuVmVjdG9yMy5TVU0oX2RpcmVjdGlvbiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pKSArIDkwKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGVZKDAuMjUpO1xyXG4gICAgICAgICAgICB0aGlzLmZseURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWCgpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBhc3luYyBtb3ZlKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUodGhpcy5mbHlEaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlzaW9uRGV0ZWN0aW9uKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsb2FkVGV4dHVyZSgpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1R4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3Q29hdDogxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkID0gbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3TXRyOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm10clwiLCDGki5TaGFkZXJGbGF0VGV4dHVyZWQsIG5ld0NvYXQpO1xyXG4gICAgICAgICAgICBsZXQgb2xkQ29tQ29hdDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuXHJcbiAgICAgICAgICAgIG9sZENvbUNvYXQgPSB0aGlzLmdldENvbXBvbmVudCjGki5Db21wb25lbnRNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICBuZXdUeHQgPSBidWxsZXRUeHQ7XHJcbiAgICAgICAgICAgIG5ld0NvYXQuY29sb3IgPSDGki5Db2xvci5DU1MoXCJXSElURVwiKTtcclxuICAgICAgICAgICAgbmV3Q29hdC50ZXh0dXJlID0gbmV3VHh0O1xyXG4gICAgICAgICAgICBvbGRDb21Db2F0Lm1hdGVyaWFsID0gbmV3TXRyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgY29sbGlzaW9uRGV0ZWN0aW9uKCkge1xyXG4gICAgICAgICAgICBsZXQgY29sbGlkZXJzOiBhbnlbXSA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVuZW15LkVuZW15PmVsZW1lbnQpLnRhZyA9PSBUYWcuVGFnLkVORU1ZKTtcclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQuY29sbGlkZXIpICYmIGVsZW1lbnQucHJvcGVydGllcyAhPSB1bmRlZmluZWQgJiYgdGhpcy5raWxsY291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgKDxFbmVteS5FbmVteT5lbGVtZW50KS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC09IHRoaXMuaGl0UG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IFVJLkRhbWFnZVVJKCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLmhpdFBvaW50cykpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkucHJvcGVydGllcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5raWxsY291bnQtLTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIGNvbGxpZGVycyA9IFtdO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMgPSAoPEdlbmVyYXRpb24uUm9vbT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbGVtZW50ID0+ICg8R2VuZXJhdGlvbi5Sb29tPmVsZW1lbnQpLnRhZyA9PSBUYWcuVGFnLlJPT00pKS53YWxscztcclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTbG93QnVsbGV0IGV4dGVuZHMgQnVsbGV0IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgc3VwZXIoX3Bvc2l0aW9uLCBfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IDY7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0UG9pbnRzID0gMTA7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSA1ICogR2FtZS5mcmFtZVJhdGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBNZWxlZUJ1bGxldCBleHRlbmRzIEJ1bGxldCB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9wb3NpdGlvbiwgX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSA2O1xyXG4gICAgICAgICAgICB0aGlzLmhpdFBvaW50cyA9IDEwO1xyXG4gICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gNjtcclxuICAgICAgICAgICAgdGhpcy5raWxsY291bnQgPSA0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgbG9hZFRleHR1cmUoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBQbGF5ZXIge1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBDaGFyYWN0ZXIge1xyXG4gICAgICAgIHB1YmxpYyBuYW1lOiBzdHJpbmc7XHJcbiAgICAgICAgcHVibGljIGF0dHJpYnV0ZXM6IEF0dHJpYnV0ZXM7XHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9hdHRyaWJ1dGVzOiBBdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IF9uYW1lO1xyXG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSBfYXR0cmlidXRlcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQ29sbGlkZXIge1xyXG4gICAgZXhwb3J0IGNsYXNzIENvbGxpZGVyIHtcclxuICAgICAgICByYWRpdXM6IG51bWJlcjtcclxuICAgICAgICBwb3NpdGlvbjogxpIuVmVjdG9yMjtcclxuICAgICAgICBnZXQgdG9wKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi55IC0gdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgbGVmdCgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueCAtIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IHJpZ2h0KCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi54ICsgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgYm90dG9tKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi55ICsgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfcmFkaXVzOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IF9wb3NpdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5yYWRpdXMgPSBfcmFkaXVzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29sbGlkZXMoX2NvbGxpZGVyOiBDb2xsaWRlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2U6IMaSLlZlY3RvcjIgPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5wb3NpdGlvbiwgX2NvbGxpZGVyLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMucmFkaXVzICsgX2NvbGxpZGVyLnJhZGl1cyA+IGRpc3RhbmNlLm1hZ25pdHVkZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29sbGlkZXNSZWN0KF9jb2xsaWRlcjogR2FtZS7Gki5SZWN0YW5nbGUpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGVmdCA+IF9jb2xsaWRlci5yaWdodCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5yaWdodCA8IF9jb2xsaWRlci5sZWZ0KSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRvcCA+IF9jb2xsaWRlci5ib3R0b20pIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYm90dG9tIDwgX2NvbGxpZGVyLnRvcCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEludGVyc2VjdGlvbihfY29sbGlkZXI6IENvbGxpZGVyKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbGxpZGVzKF9jb2xsaWRlcikpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZTogxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvc2l0aW9uLCBfY29sbGlkZXIucG9zaXRpb24pO1xyXG4gICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5yYWRpdXMgKyBfY29sbGlkZXIucmFkaXVzIC0gZGlzdGFuY2UubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGludGVyc2VjdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEludGVyc2VjdGlvblJlY3QoX2NvbGxpZGVyOiDGki5SZWN0YW5nbGUpOiDGki5SZWN0YW5nbGUge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29sbGlkZXNSZWN0KF9jb2xsaWRlcikpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb246IMaSLlJlY3RhbmdsZSA9IG5ldyDGki5SZWN0YW5nbGUoKTtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLnggPSBNYXRoLm1heCh0aGlzLmxlZnQsIF9jb2xsaWRlci5sZWZ0KTtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLnkgPSBNYXRoLm1heCh0aGlzLnRvcCwgX2NvbGxpZGVyLnRvcCk7XHJcbiAgICAgICAgICAgIGludGVyc2VjdGlvbi53aWR0aCA9IE1hdGgubWluKHRoaXMucmlnaHQsIF9jb2xsaWRlci5yaWdodCkgLSBpbnRlcnNlY3Rpb24ueDtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLmhlaWdodCA9IE1hdGgubWluKHRoaXMuYm90dG9tLCBfY29sbGlkZXIuYm90dG9tKSAtIGludGVyc2VjdGlvbi55O1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGludGVyc2VjdGlvbjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXlTcGF3bmVyIHtcclxuICAgIGxldCBzcGF3blRpbWU6IG51bWJlciA9IDEgKiBHYW1lLmZyYW1lUmF0ZTtcclxuICAgIGxldCBjdXJyZW50VGltZTogbnVtYmVyID0gc3Bhd25UaW1lO1xyXG4gICAgbGV0IG1heEVuZW1pZXM6IG51bWJlciA9IDIwO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkVuZW1pZXMoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKEdhbWUuZW5lbWllcy5sZW5ndGggPCBtYXhFbmVtaWVzKSB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKEdhbWUuZW5lbWllcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPT0gc3Bhd25UaW1lKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWYgPSBHYW1lLmVuZW1pZXNKU09OLmZpbmQoZWxlbSA9PiBlbGVtLm5hbWUgPT0gXCJiYXRcIik7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBFbmVteS5FbmVteUR1bWIoXCJFbmVteVwiLCBuZXcgUGxheWVyLkNoYXJhY3RlcihyZWYubmFtZSwgbmV3IFBsYXllci5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCkpLCBuZXcgxpIuVmVjdG9yMigoTWF0aC5yYW5kb20oKSAqIDcgLSAoTWF0aC5yYW5kb20oKSAqIDcpKSAqIDIsIChNYXRoLnJhbmRvbSgpICogNyAtIChNYXRoLnJhbmRvbSgpICogNykgKiAyKSkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjdXJyZW50VGltZS0tO1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgY3VycmVudFRpbWUgPSBzcGF3blRpbWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlTcGF3bmVzIHtcclxuICAgICAgICBzcGF3blBvc2l0aW9uczogxpIuVmVjdG9yMltdID0gW107XHJcbiAgICAgICAgbnVtYmVyT2ZFTmVtaWVzOiBudW1iZXI7XHJcbiAgICAgICAgc3Bhd25PZmZzZXQ6IG51bWJlciA9IDU7XHJcblxyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Jvb21TaXplOiBudW1iZXIsIF9udW1iZXJPZkVuZW1pZXM6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLm51bWJlck9mRU5lbWllcyA9IF9udW1iZXJPZkVuZW1pZXM7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgZ2V0U3Bhd25Qb3NpdGlvbnMoX3Jvb206IEdlbmVyYXRpb24uUm9vbSk6IMaSLlZlY3RvcjJbXSB7XHJcbiAgICAgICAgICAgIHJldHVybiBbbmV3IMaSLlZlY3RvcjIoMCArIHRoaXMuc3Bhd25PZmZzZXQsIDAgKyB0aGlzLnNwYXduT2Zmc2V0KSwgbmV3IMaSLlZlY3RvcjIoX3Jvb20uZ2V0Um9vbVNpemUoKSAtIHRoaXMuc3Bhd25PZmZzZXQsIF9yb29tLmdldFJvb21TaXplKCkgKyB0aGlzLnNwYXduT2Zmc2V0KV1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIElucHV0U3lzdGVtIHtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBrZXlib2FyZERvd25FdmVudCk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwga2V5Ym9hcmRVcEV2ZW50KTtcclxuICAgIEdhbWUuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgYXR0YWNrKTtcclxuICAgIEdhbWUuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgcm90YXRlVG9Nb3VzZSk7XHJcblxyXG4gICAgLy8jcmVnaW9uIHJvdGF0ZVxyXG4gICAgbGV0IG1vdXNlUG9zaXRpb246IMaSLlZlY3RvcjM7XHJcblxyXG4gICAgZnVuY3Rpb24gcm90YXRlVG9Nb3VzZShfbW91c2VFdmVudDogTW91c2VFdmVudCk6IHZvaWQge1xyXG4gICAgICAgIGxldCByYXk6IMaSLlJheSA9IEdhbWUudmlld3BvcnQuZ2V0UmF5RnJvbUNsaWVudChuZXcgxpIuVmVjdG9yMihfbW91c2VFdmVudC5vZmZzZXRYLCBfbW91c2VFdmVudC5vZmZzZXRZKSk7XHJcbiAgICAgICAgbW91c2VQb3NpdGlvbiA9IHJheS5pbnRlcnNlY3RQbGFuZShuZXcgxpIuVmVjdG9yMygwLCAwLCAwKSwgbmV3IMaSLlZlY3RvcjMoMCwgMCwgMSkpO1xyXG4gICAgICAgIEdhbWUucGxheWVyMS5tdHhMb2NhbC5yb3RhdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIDAsIGNhbGNEZWdyZWUoR2FtZS5wbGF5ZXIxLm10eExvY2FsLnRyYW5zbGF0aW9uLCBtb3VzZVBvc2l0aW9uKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGNEZWdyZWUoX2NlbnRlcjogxpIuVmVjdG9yMywgX3RhcmdldDogxpIuVmVjdG9yMyk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IHhEaXN0YW5jZTogbnVtYmVyID0gX3RhcmdldC54IC0gX2NlbnRlci54O1xyXG4gICAgICAgIGxldCB5RGlzdGFuY2U6IG51bWJlciA9IF90YXJnZXQueSAtIF9jZW50ZXIueTtcclxuICAgICAgICBsZXQgZGVncmVlczogbnVtYmVyID0gTWF0aC5hdGFuMih5RGlzdGFuY2UsIHhEaXN0YW5jZSkgKiAoMTgwIC8gTWF0aC5QSSkgLSA5MDtcclxuICAgICAgICByZXR1cm4gZGVncmVlcztcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGNQb3NpdGlvbkZyb21EZWdyZWUoX2RlZ3JlZXM6IG51bWJlciwgX2Rpc3RhbmNlOiBudW1iZXIpOiDGki5WZWN0b3IyIHtcclxuICAgICAgICBsZXQgZGlzdGFuY2UgPSA1O1xyXG4gICAgICAgIGxldCBuZXdEZWcgPSAoX2RlZ3JlZXMgKiBNYXRoLlBJKSAvIDE4MDtcclxuICAgICAgICBsZXQgeSA9IE1hdGguY29zKG5ld0RlZyk7XHJcbiAgICAgICAgbGV0IHggPSBNYXRoLnNpbihuZXdEZWcpICogLTE7XHJcbiAgICAgICAgbGV0IGNvb3JkID0gbmV3IMaSLlZlY3RvcjIoeCwgeSk7XHJcbiAgICAgICAgY29vcmQuc2NhbGUoZGlzdGFuY2UpO1xyXG4gICAgICAgIHJldHVybiBjb29yZDtcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBtb3ZlXHJcbiAgICBsZXQgY29udHJvbGxlciA9IG5ldyBNYXA8c3RyaW5nLCBib29sZWFuPihbXHJcbiAgICAgICAgW1wiV1wiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiQVwiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiU1wiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiRFwiLCBmYWxzZV1cclxuICAgIF0pO1xyXG5cclxuICAgIGZ1bmN0aW9uIGtleWJvYXJkRG93bkV2ZW50KF9lOiBLZXlib2FyZEV2ZW50KSB7XHJcbiAgICAgICAgbGV0IGtleTogc3RyaW5nID0gX2UuY29kZS50b1VwcGVyQ2FzZSgpLnN1YnN0cmluZygzKTtcclxuICAgICAgICBjb250cm9sbGVyLnNldChrZXksIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGtleWJvYXJkVXBFdmVudChfZTogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgICAgIGxldCBrZXk6IHN0cmluZyA9IF9lLmNvZGUudG9VcHBlckNhc2UoKS5zdWJzdHJpbmcoMyk7XHJcbiAgICAgICAgY29udHJvbGxlci5zZXQoa2V5LCBmYWxzZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIG1vdmUoKSB7XHJcbiAgICAgICAgbGV0IG1vdmVWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgbGV0IGhhc0NoYW5nZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiV1wiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnkgKz0gMTtcclxuICAgICAgICAgICAgaGFzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIkFcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci54IC09IDE7XHJcbiAgICAgICAgICAgIGhhc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJTXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueSAtPSAxO1xyXG4gICAgICAgICAgICBoYXNDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiRFwiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnggKz0gMTtcclxuICAgICAgICAgICAgaGFzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaGFzQ2hhbmdlZCAmJiBtb3ZlVmVjdG9yLm1hZ25pdHVkZSAhPSAwKSB7XHJcbiAgICAgICAgICAgIEdhbWUucGxheWVyMS5tb3ZlKEdhbWUuxpIuVmVjdG9yMy5OT1JNQUxJWkFUSU9OKG1vdmVWZWN0b3IsIDEpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvLyNyZWdpb24gYXR0YWNrXHJcbiAgICBmdW5jdGlvbiBhdHRhY2soZV86IE1vdXNlRXZlbnQpIHtcclxuXHJcbiAgICAgICAgbGV0IG1vdXNlQnV0dG9uID0gZV8uYnV0dG9uO1xyXG4gICAgICAgIHN3aXRjaCAobW91c2VCdXR0b24pIHtcclxuICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgLy9sZWZ0IG1vdXNlIGJ1dHRvbiBwbGF5ZXIuYXR0YWNrXHJcbiAgICAgICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UobW91c2VQb3NpdGlvbiwgR2FtZS5wbGF5ZXIxLm10eExvY2FsLnRyYW5zbGF0aW9uKVxyXG4gICAgICAgICAgICAgICAgcm90YXRlVG9Nb3VzZShlXyk7XHJcbiAgICAgICAgICAgICAgICBHYW1lLnBsYXllcjEuYXR0YWNrKGRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1bGxldChkaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgIC8vVE9ETzogcmlnaHQgbW91c2UgYnV0dG9uIHBsYXllci5jaGFyZ2Ugb3Igc29tZXRoaW5nIGxpa2UgdGhhdFxyXG5cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG5cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG59IiwibmFtZXNwYWNlIExldmVsIHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgTGFuZHNjYXBlIGV4dGVuZHMgxpIuTm9kZXtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMuZ2V0Q2hpbGRyZW4oKVswXS5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0pLm10eExvY2FsLnRyYW5zbGF0ZVooLTIpXHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCIvLy88cmVmZXJlbmNlIHBhdGg9XCIuLi9GVURHRS9OZXQvQnVpbGQvQ2xpZW50L0Z1ZGdlQ2xpZW50LmQudHNcIi8+XHJcblxyXG5uYW1lc3BhY2UgTmV0d29ya2luZyB7XHJcbiAgICBleHBvcnQgZW51bSBGVU5DVElPTiB7XHJcbiAgICAgICAgQ09OTkVDVEVELFxyXG4gICAgICAgIFNQQVdOLFxyXG4gICAgICAgIFRSQU5TRk9STSxcclxuICAgICAgICBCVUxMRVQsXHJcbiAgICAgICAgU1BBV05FTkVNWSxcclxuICAgICAgICBFTkVNWVRSQU5TRk9STSxcclxuICAgICAgICBFTkVNWURJRVxyXG4gICAgfVxyXG5cclxuICAgIGltcG9ydCDGkkNsaWVudCA9IEZ1ZGdlTmV0LkZ1ZGdlQ2xpZW50O1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY2xpZW50OiDGkkNsaWVudDtcclxuICAgIGV4cG9ydCBsZXQgY2xpZW50czogc3RyaW5nW10gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgcG9zVXBkYXRlOiDGki5WZWN0b3IzO1xyXG4gICAgZXhwb3J0IGxldCBzb21lb25lSXNIb3N0OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IGVuZW15OiBFbmVteS5FbmVteTtcclxuICAgIGV4cG9ydCBsZXQgY3VycmVudElEczogbnVtYmVyW10gPSBbXTtcclxuXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHsgc3Bhd25QbGF5ZXIoKSB9LCB0cnVlKTtcclxuICAgIGxldCBJUENvbm5lY3Rpb24gPSA8SFRNTElucHV0RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIklQQ29ubmVjdGlvblwiKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ29ubmVjdGluZ1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY29ubmV0aW5nLCB0cnVlKTtcclxuXHJcblxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY29ubmV0aW5nKCkge1xyXG4gICAgICAgIGNsaWVudCA9IG5ldyDGkkNsaWVudCgpO1xyXG4gICAgICAgIGNsaWVudC5hZGRFdmVudExpc3RlbmVyKEZ1ZGdlTmV0LkVWRU5ULk1FU1NBR0VfUkVDRUlWRUQsIHJlY2VpdmVNZXNzYWdlKTtcclxuICAgICAgICBjbGllbnQuY29ubmVjdFRvU2VydmVyKElQQ29ubmVjdGlvbi52YWx1ZSk7XHJcblxyXG4gICAgICAgIGFkZENsaWVudElEKClcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gYWRkQ2xpZW50SUQoKSB7XHJcbiAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBjbGllbnRzLnB1c2goY2xpZW50LmlkKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoYWRkQ2xpZW50SUQsIDMwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIHJlY2VpdmVNZXNzYWdlKF9ldmVudDogQ3VzdG9tRXZlbnQgfCBNZXNzYWdlRXZlbnQgfCBFdmVudCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIGlmIChfZXZlbnQgaW5zdGFuY2VvZiBNZXNzYWdlRXZlbnQpIHtcclxuICAgICAgICAgICAgbGV0IG1lc3NhZ2U6IEZ1ZGdlTmV0Lk1lc3NhZ2UgPSBKU09OLnBhcnNlKF9ldmVudC5kYXRhKTtcclxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaWRTb3VyY2UgIT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kICE9IEZ1ZGdlTmV0LkNPTU1BTkQuU0VSVkVSX0hFQVJUQkVBVCAmJiBtZXNzYWdlLmNvbW1hbmQgIT0gRnVkZ2VOZXQuQ09NTUFORC5DTElFTlRfSEVBUlRCRUFUKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQ09OTkVDVEVELnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudC52YWx1ZSAhPSBjbGllbnQuaWQgJiYgY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudCA9PSBtZXNzYWdlLmNvbnRlbnQudmFsdWUpID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpZW50cy5wdXNoKG1lc3NhZ2UuY29udGVudC52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV04udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLnRhYmxlKG1lc3NhZ2UuY29udGVudC50eXBlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudC50eXBlID09IFBsYXllci5UeXBlLk1FTEVFKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBsYXllcjIgPSBuZXcgUGxheWVyLk1lbGVlKFwicGxheWVyMlwiLCBuZXcgUGxheWVyLkNoYXJhY3RlcihtZXNzYWdlLmNvbnRlbnQudmFsdWUubmFtZSwgbmV3IFBsYXllci5BdHRyaWJ1dGVzKG1lc3NhZ2UuY29udGVudC52YWx1ZS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgbWVzc2FnZS5jb250ZW50LnZhbHVlLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUuYXR0cmlidXRlcy5zcGVlZCkpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUucGxheWVyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKEdhbWUucGxheWVyMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmNvbm5lY3RlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5jb250ZW50LnR5cGUgPT0gUGxheWVyLlR5cGUuUkFOR0VEKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBsYXllcjIgPSBuZXcgUGxheWVyLlJhbmdlZChcInBsYXllcjJcIiwgbmV3IFBsYXllci5DaGFyYWN0ZXIobWVzc2FnZS5jb250ZW50LnZhbHVlLm5hbWUsIG5ldyBQbGF5ZXIuQXR0cmlidXRlcyhtZXNzYWdlLmNvbnRlbnQudmFsdWUuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIG1lc3NhZ2UuY29udGVudC52YWx1ZS5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgbWVzc2FnZS5jb250ZW50LnZhbHVlLmF0dHJpYnV0ZXMuc3BlZWQpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBsYXllcjIubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hcHBlbmRDaGlsZChHYW1lLnBsYXllcjIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5jb25uZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbW92ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhWzJdKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJvdGF0ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzJdKVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUucGxheWVyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG1vdmVWZWN0b3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBsYXllcjIubXR4TG9jYWwucm90YXRpb24gPSByb3RhdGVWZWN0b3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQlVMTEVULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUucGxheWVyMi5hdHRhY2sobmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQuZGlyZWN0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbi5kYXRhWzJdKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05FTkVNWS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBFbmVteS5FbmVteShcIm5vcm1hbEVuZW15XCIsIG5ldyBQbGF5ZXIuQ2hhcmFjdGVyKG1lc3NhZ2UuY29udGVudC5lbmVteS5uYW1lLCBuZXcgUGxheWVyLkF0dHJpYnV0ZXMobWVzc2FnZS5jb250ZW50LmVuZW15LmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCBtZXNzYWdlLmNvbnRlbnQuZW5lbXkuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIG1lc3NhZ2UuY29udGVudC5lbmVteS5hdHRyaWJ1dGVzLnNwZWVkKSksIG5ldyDGki5WZWN0b3IyKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSksIG1lc3NhZ2UuY29udGVudC5pZCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkVORU1ZVFJBTlNGT1JNLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmVteSA9IEdhbWUuZW5lbWllcy5maW5kKGVuZW0gPT4gZW5lbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVuZW15ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZW15LmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZW15LnVwZGF0ZUNvbGxpZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5FTVlESUUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuZW15ID0gR2FtZS5lbmVtaWVzLmZpbmQoZW5lbSA9PiBlbmVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKGVuZW15KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcElEKG1lc3NhZ2UuY29udGVudC5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8jcmVnaW9uIHBsYXllclxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduUGxheWVyKF90eXBlPzogUGxheWVyLlR5cGUpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmJlY29tZUhvc3QoKTtcclxuICAgICAgICAgICAgc29tZW9uZUlzSG9zdCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoX3R5cGUgPT0gUGxheWVyLlR5cGUuTUVMRUUpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV04sIHR5cGU6IFBsYXllci5UeXBlLk1FTEVFLCB2YWx1ZTogR2FtZS5wbGF5ZXIxLnByb3BlcnRpZXMsIHBvc2l0aW9uOiBHYW1lLnBsYXllcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uIH0gfSlcclxuICAgICAgICB9IGVsc2UgaWYgKF90eXBlID09IFBsYXllci5UeXBlLlJBTkdFRCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTiwgdHlwZTogUGxheWVyLlR5cGUuUkFOR0VELCB2YWx1ZTogR2FtZS5wbGF5ZXIxLnByb3BlcnRpZXMsIHBvc2l0aW9uOiBHYW1lLnBsYXllcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uIH0gfSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTiwgdHlwZTogUGxheWVyLlR5cGUuUkFOR0VELCB2YWx1ZTogR2FtZS5wbGF5ZXIxLnByb3BlcnRpZXMsIHBvc2l0aW9uOiBHYW1lLnBsYXllcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIHNlbmRzIHRyYW5zZm9ybSBvdmVyIG5ldHdvcmtcclxuICAgICAqIEBwYXJhbSBfX3Bvc2l0aW9uIGN1cnJlbnQgcG9zaXRpb24gb2YgT2JqZWN0XHJcbiAgICAgKiBAcGFyYW0gX3JvdGF0aW9uIGN1cnJlbnQgcm90YXRpb24gb2YgT2JqZWN0XHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVQb3NpdGlvbihfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9yb3RhdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlRSQU5TRk9STSwgdmFsdWU6IF9wb3NpdGlvbiwgcm90YXRpb246IF9yb3RhdGlvbiB9IH0pXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUJ1bGxldChfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkJVTExFVCwgZGlyZWN0aW9uOiBfZGlyZWN0aW9uIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvLyNyZWdpb24gIGVuZW15XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25FbmVteShfZW5lbXk6IEVuZW15LkVuZW15LCBfaWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhfZW5lbXkucHJvcGVydGllcyk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKF9pZCk7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdORU5FTVksIGVuZW15OiBfZW5lbXkucHJvcGVydGllcywgcG9zaXRpb246IF9lbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgaWQ6IF9pZCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVFbmVteVBvc2l0aW9uKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2lkOiBudW1iZXIpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5FTkVNWVRSQU5TRk9STSwgcG9zaXRpb246IF9wb3NpdGlvbiwgaWQ6IF9pZCB9IH0pXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUVuZW15KF9pZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5FTVlESUUsIGlkOiBfaWQgfSB9KVxyXG5cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBpZEdlbmVyYXRvcigpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBpZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDApO1xyXG4gICAgICAgIGlmIChjdXJyZW50SURzLmZpbmQoY3VySUQgPT4gY3VySUQgPT0gaWQpKSB7XHJcbiAgICAgICAgICAgIGlkR2VuZXJhdG9yKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjdXJyZW50SURzLnB1c2goaWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGlkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBwb3BJRChfaWQ6IG51bWJlcikge1xyXG4gICAgICAgIGxldCBpbmRleDogbnVtYmVyO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3VycmVudElEcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudElEc1tpXSA9PSBfaWQpIHtcclxuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiaWQgdG8gcG9wOiBcIiArIF9pZCk7XHJcbiAgICAgICAgY3VycmVudElEcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiYWZ0ZXJJRHM6IFwiICsgY3VycmVudElEcyk7XHJcbiAgICB9XHJcblxyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJiZWZvcmV1bmxvYWRcIiwgb25VbmxvYWQsIGZhbHNlKTtcclxuXHJcbiAgICBmdW5jdGlvbiBvblVubG9hZCgpIHtcclxuICAgICAgICAvL1RPRE86IFRoaW5ncyB3ZSBkbyBhZnRlciB0aGUgcGxheWVyIGxlZnQgdGhlIGdhbWVcclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBQbGF5ZXIge1xyXG4gICAgZXhwb3J0IGVudW0gVHlwZSB7XHJcbiAgICAgICAgUkFOR0VELFxyXG4gICAgICAgIE1FTEVFXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFBsYXllciBleHRlbmRzIEdhbWUuxpJBaWQuTm9kZVNwcml0ZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRhZyA9IFRhZy5UYWcuUExBWUVSO1xyXG4gICAgICAgIHB1YmxpYyBpdGVtczogQXJyYXk8SXRlbXMuSXRlbT4gPSBbXTtcclxuICAgICAgICBwdWJsaWMgcHJvcGVydGllczogQ2hhcmFjdGVyO1xyXG4gICAgICAgIHB1YmxpYyB3ZWFwb246IFdlYXBvbnMuV2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKDEyLCAxKTtcclxuXHJcbiAgICAgICAgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvciggX25hbWU6IHN0cmluZywgX3Byb3BlcnRpZXM6IENoYXJhY3Rlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMucHJvcGVydGllcyA9IF9wcm9wZXJ0aWVzO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBtb3ZlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgbGV0IGNhbk1vdmVYOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICAgICAgbGV0IGNhbk1vdmVZOiBib29sZWFuID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuXHJcbiAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUoKDEgLyA2MCAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcblxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyczogR2VuZXJhdGlvbi5XYWxsW10gPSAoPEdlbmVyYXRpb24uUm9vbT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbGVtZW50ID0+ICg8R2VuZXJhdGlvbi5Sb29tPmVsZW1lbnQpLnRhZyA9PSBUYWcuVGFnLlJPT00pKS53YWxscztcclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzUmVjdChlbGVtZW50LmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFCZWZvcmVNb3ZlID0gTWF0aC5yb3VuZCgoaW50ZXJzZWN0aW9uLmhlaWdodCAqIGludGVyc2VjdGlvbi53aWR0aCkqMTAwMCkvMTAwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG9sZFBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMih0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLngsIHRoaXMuY29sbGlkZXIucG9zaXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoX2RpcmVjdGlvbi54LCAwKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50LmNvbGxpZGVyKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gTWF0aC5yb3VuZCgobmV3SW50ZXJzZWN0aW9uLmhlaWdodCAqIG5ld0ludGVyc2VjdGlvbi53aWR0aCkqMTAwMCkvMTAwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKDAsIF9kaXJlY3Rpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBNYXRoLnJvdW5kKChuZXdJbnRlcnNlY3Rpb24uaGVpZ2h0ICogbmV3SW50ZXJzZWN0aW9uLndpZHRoKSoxMDAwKS8xMDAwO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FuTW92ZVkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICBpZiAoY2FuTW92ZVggJiYgY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2FuTW92ZVggJiYgIWNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoX2RpcmVjdGlvbi54LCAwLCBfZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbiwgZmFsc2UpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFjYW5Nb3ZlWCAmJiBjYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIF9kaXJlY3Rpb24ueSwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24sIGZhbHNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGF0dGFjayhfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLndlYXBvbi5jdXJyZW50QXR0YWNrQ291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGJ1bGxldDogQnVsbGV0cy5CdWxsZXQgPSBuZXcgQnVsbGV0cy5CdWxsZXQobmV3IMaSLlZlY3RvcjIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSksIF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgYnVsbGV0LmZseURpcmVjdGlvbi5zY2FsZSgxIC8gR2FtZS5mcmFtZVJhdGUgKiBidWxsZXQuc3BlZWQpO1xyXG4gICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChidWxsZXQpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMud2VhcG9uLmN1cnJlbnRBdHRhY2tDb3VudC0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY29vbGRvd24oKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgc3BlY2lmaWNDb29sRG93blRpbWU6IG51bWJlciA9IHRoaXMud2VhcG9uLmNvb2xkb3duVGltZSAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLnByb3BlcnRpZXMuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbik7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLndlYXBvbi5jdXJyZW50QXR0YWNrQ291bnQgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMud2VhcG9uLmN1cnJlbnRDb29sZG93blRpbWUgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMud2VhcG9uLmN1cnJlbnRDb29sZG93blRpbWUgPSBzcGVjaWZpY0Nvb2xEb3duVGltZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLndlYXBvbi5jdXJyZW50QXR0YWNrQ291bnQgPSB0aGlzLndlYXBvbi5hdHRhY2tDb3VudDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2codGhpcy5jdXJyZW50Q29vbGRvd25UaW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53ZWFwb24uY3VycmVudENvb2xkb3duVGltZS0tO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY29sbGVjdG9yKCkge1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBNZWxlZSBleHRlbmRzIFBsYXllciB7XHJcbiAgICAgICAgcHVibGljIGF0dGFjayhfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLndlYXBvbi5jdXJyZW50QXR0YWNrQ291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGJ1bGxldDogQnVsbGV0cy5CdWxsZXQgPSBuZXcgQnVsbGV0cy5NZWxlZUJ1bGxldChuZXcgxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KSwgX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICBidWxsZXQuZmx5RGlyZWN0aW9uLnNjYWxlKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIGJ1bGxldC5zcGVlZCk7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGJ1bGxldCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy53ZWFwb24uY3VycmVudEF0dGFja0NvdW50LS07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFJhbmdlZCBleHRlbmRzIFBsYXllciB7XHJcblxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG4gICAgZXhwb3J0IGVudW0gUk9PTVRZUEUge1xyXG4gICAgICAgIFNUQVJULFxyXG4gICAgICAgIE5PUk1BTCxcclxuICAgICAgICBNRVJDSEFOVCxcclxuICAgICAgICBUUkVBU1VSRSxcclxuICAgICAgICBDSEFMTEVOR0UsXHJcbiAgICAgICAgQk9TU1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBSb29tIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRhZyA9IFRhZy5UYWcuUk9PTTtcclxuICAgICAgICBwdWJsaWMgcm9vbVR5cGU6IFJPT01UWVBFXHJcbiAgICAgICAgcHVibGljIGNvb3JkaW5hdGVzOiBbbnVtYmVyLCBudW1iZXJdOyAvLyBYIFlcclxuICAgICAgICBwdWJsaWMgd2FsbHM6IFdhbGxbXSA9IFtdO1xyXG4gICAgICAgIHJvb21TaXplOiBudW1iZXIgPSAzMDtcclxuICAgICAgICBleGl0czogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dIC8vIE4gRSBTIFdcclxuICAgICAgICBtZXNoOiDGki5NZXNoUXVhZCA9IG5ldyDGki5NZXNoUXVhZDtcclxuICAgICAgICBjbXBNZXNoOiDGki5Db21wb25lbnRNZXNoID0gbmV3IMaSLkNvbXBvbmVudE1lc2godGhpcy5tZXNoKTtcclxuICAgICAgICBzdGFydFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwic3RhcnRSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInllbGxvd1wiKSkpO1xyXG4gICAgICAgIG5vcm1hbFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibm9ybWFsUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgIG1lcmNoYW50Um9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtZXJjaGFudFJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiZ3JlZW5cIikpKTtcclxuICAgICAgICB0cmVhc3VyZVJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwidHJlYXN1cmVSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInllbGxvd1wiKSkpO1xyXG4gICAgICAgIGNoYWxsZW5nZVJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiY2hhbGxlbmdlUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJibHVlXCIpKSk7XHJcbiAgICAgICAgYm9zc1Jvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiYm9zc1Jvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiYmxhY2tcIikpKTtcclxuXHJcbiAgICAgICAgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX2Nvb3JkaWFudGVzOiBbbnVtYmVyLCBudW1iZXJdLCBfZXhpdHM6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSwgX3Jvb21UeXBlOiBST09NVFlQRSkge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29vcmRpbmF0ZXMgPSBfY29vcmRpYW50ZXM7XHJcbiAgICAgICAgICAgIHRoaXMuZXhpdHMgPSBfZXhpdHM7XHJcbiAgICAgICAgICAgIHRoaXMucm9vbVR5cGUgPSBfcm9vbVR5cGU7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX3Jvb21UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLlNUQVJUOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wTWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwodGhpcy5zdGFydFJvb21NYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBST09NVFlQRS5OT1JNQUw6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLm5vcm1hbFJvb21NYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBST09NVFlQRS5NRVJDSEFOVDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMubWVyY2hhbnRSb29tTWF0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgUk9PTVRZUEUuVFJFQVNVUkU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLnRyZWFzdXJlUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLkNIQUxMRU5HRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMuY2hhbGxlbmdlUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLkJPU1M6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLmJvc3NSb29tTWF0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQodGhpcy5jbXBNZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQodGhpcy5jbXBNYXRlcmlhbCk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKHRoaXMucm9vbVNpemUsIHRoaXMucm9vbVNpemUsIDApKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyh0aGlzLmNvb3JkaW5hdGVzWzBdICogdGhpcy5yb29tU2l6ZSwgdGhpcy5jb29yZGluYXRlc1sxXSAqIHRoaXMucm9vbVNpemUsIC0wLjAyKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaChuZXcgV2FsbChuZXcgxpIuVmVjdG9yMigodGhpcy5yb29tU2l6ZSAvIDIpLCAwKSwgdGhpcy5yb29tU2l6ZSkpO1xyXG4gICAgICAgICAgICB0aGlzLndhbGxzLnB1c2gobmV3IFdhbGwobmV3IMaSLlZlY3RvcjIoLSh0aGlzLnJvb21TaXplIC8gMiksIDApLCB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaChuZXcgV2FsbChuZXcgxpIuVmVjdG9yMigwLCAodGhpcy5yb29tU2l6ZSAvIDIpKSwgdGhpcy5yb29tU2l6ZSkpO1xyXG4gICAgICAgICAgICB0aGlzLndhbGxzLnB1c2gobmV3IFdhbGwobmV3IMaSLlZlY3RvcjIoMCwgLSh0aGlzLnJvb21TaXplIC8gMikpLCB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0Um9vbVNpemUoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucm9vbVNpemU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBXYWxsIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRhZyA9IFRhZy5UYWcuV0FMTDtcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlO1xyXG4gICAgICAgIHB1YmxpYyB3YWxsVGhpY2tuZXNzOiBudW1iZXIgPSAyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMiwgX3dpZHRoOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJXYWxsXCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IMaSLk1lc2hRdWFkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChuZXcgxpIuTWF0ZXJpYWwoXCJyZWRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwicmVkXCIpKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gX3Bvc2l0aW9uLnRvVmVjdG9yMygwKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfcG9zaXRpb24ueCA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3Bvc2l0aW9uLnkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMoX3dpZHRoLCB0aGlzLndhbGxUaGlja25lc3MsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUoX3Bvc2l0aW9uLngsIF9wb3NpdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLngsIHRoaXMud2FsbFRoaWNrbmVzcywgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhfd2lkdGgsIHRoaXMud2FsbFRoaWNrbmVzcywgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZShfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy53YWxsVGhpY2tuZXNzLCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoX3Bvc2l0aW9uLnkgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKF9wb3NpdGlvbi54ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKHRoaXMud2FsbFRoaWNrbmVzcywgX3dpZHRoLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgdGhpcy53YWxsVGhpY2tuZXNzLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy53YWxsVGhpY2tuZXNzLCBfd2lkdGgsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUoX3Bvc2l0aW9uLngsIF9wb3NpdGlvbi55LCB0aGlzLndhbGxUaGlja25lc3MsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG5cclxuICAgIGxldCBudW1iZXJPZlJvb21zOiBudW1iZXIgPSAzO1xyXG4gICAgbGV0IHVzZWRQb3NpdGlvbnM6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtdO1xyXG4gICAgbGV0IHJvb21zOiBSb29tW10gPSBbXTtcclxuXHJcbiAgICAvL3NwYXduIGNoYW5jZXNcclxuICAgIGxldCBjaGFsbGVuZ2VSb29tU3Bhd25DaGFuY2U6IG51bWJlciA9IDIwO1xyXG4gICAgbGV0IHRyZWFzdXJlUm9vbVNwYXduQ2hhbmNlOiBudW1iZXIgPSAxMDtcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVSb29tcygpOiB2b2lkIHtcclxuICAgICAgICBsZXQgc3RhcnRDb29yZHM6IFtudW1iZXIsIG51bWJlcl0gPSBbMCwgMF07XHJcblxyXG4gICAgICAgIHJvb21zLnB1c2gobmV3IFJvb20oXCJyb29tU3RhcnRcIiwgc3RhcnRDb29yZHMsIGNhbGNQYXRoRXhpdHMoc3RhcnRDb29yZHMpLCBHZW5lcmF0aW9uLlJPT01UWVBFLlNUQVJUKSlcclxuICAgICAgICB1c2VkUG9zaXRpb25zLnB1c2goc3RhcnRDb29yZHMpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgbnVtYmVyT2ZSb29tczsgaSsrKSB7XHJcbiAgICAgICAgICAgIGFkZFJvb20ocm9vbXNbcm9vbXMubGVuZ3RoIC0gMV0sIEdlbmVyYXRpb24uUk9PTVRZUEUuTk9STUFMKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYWRkUm9vbShyb29tc1tyb29tcy5sZW5ndGggLSAxXSwgR2VuZXJhdGlvbi5ST09NVFlQRS5CT1NTKTtcclxuICAgICAgICBhZGRTcGVjaWFsUm9vbXMoKTtcclxuICAgICAgICBhZGRSb29tKHJvb21zW3Jvb21zLmxlbmd0aCAtIDNdLCBHZW5lcmF0aW9uLlJPT01UWVBFLk1FUkNIQU5UKTtcclxuICAgICAgICByb29tcy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICByb29tLmV4aXRzID0gY2FsY1Jvb21Eb29ycyhyb29tLmNvb3JkaW5hdGVzKTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cocm9vbS5jb29yZGluYXRlcyArIFwiIFwiICsgcm9vbS5leGl0cyArIFwiIFwiICsgcm9vbS5yb29tVHlwZS50b1N0cmluZygpKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKHJvb21zWzBdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzBdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzFdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzJdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzNdKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGRSb29tKF9jdXJyZW50Um9vbTogUm9vbSwgX3Jvb21UeXBlOiBHZW5lcmF0aW9uLlJPT01UWVBFKTogdm9pZCB7XHJcbiAgICAgICAgbGV0IG51bWJlck9mRXhpdHM6IG51bWJlciA9IGNvdW50Qm9vbChfY3VycmVudFJvb20uZXhpdHMpO1xyXG4gICAgICAgIGxldCByYW5kb21OdW1iZXI6IG51bWJlciA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG51bWJlck9mRXhpdHMpO1xyXG4gICAgICAgIGxldCBwb3NzaWJsZUV4aXRJbmRleDogbnVtYmVyW10gPSBnZXRFeGl0SW5kZXgoX2N1cnJlbnRSb29tLmV4aXRzKTtcclxuICAgICAgICBsZXQgbmV3Um9vbVBvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdO1xyXG5cclxuICAgICAgICBzd2l0Y2ggKHBvc3NpYmxlRXhpdEluZGV4W3JhbmRvbU51bWJlcl0pIHtcclxuICAgICAgICAgICAgY2FzZSAwOiAvLyBub3J0aFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSwgX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzFdICsgMV07XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ldyBSb29tKFwicm9vbU5vcm1hbFwiLCAobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpKTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTogLy8gZWFzdFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSArIDEsIF9jdXJyZW50Um9vbS5jb29yZGluYXRlc1sxXV07XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ldyBSb29tKFwicm9vbU5vcm1hbFwiLCAobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpKTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMjogLy8gc291dGhcclxuICAgICAgICAgICAgICAgIG5ld1Jvb21Qb3NpdGlvbiA9IFtfY3VycmVudFJvb20uY29vcmRpbmF0ZXNbMF0sIF9jdXJyZW50Um9vbS5jb29yZGluYXRlc1sxXSAtIDFdO1xyXG4gICAgICAgICAgICAgICAgcm9vbXMucHVzaChuZXcgUm9vbShcInJvb21Ob3JtYWxcIiwgKG5ld1Jvb21Qb3NpdGlvbiksIGNhbGNQYXRoRXhpdHMobmV3Um9vbVBvc2l0aW9uKSwgX3Jvb21UeXBlKSk7XHJcbiAgICAgICAgICAgICAgICB1c2VkUG9zaXRpb25zLnB1c2gobmV3Um9vbVBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDM6IC8vd2VzdFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSAtIDEsIF9jdXJyZW50Um9vbS5jb29yZGluYXRlc1sxXV07XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ldyBSb29tKFwicm9vbU5vcm1hbFwiLCAobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpKTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkU3BlY2lhbFJvb21zKCk6IHZvaWQge1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIHJvb20uZXhpdHMgPSBjYWxjUGF0aEV4aXRzKHJvb20uY29vcmRpbmF0ZXMpO1xyXG4gICAgICAgICAgICBpZiAoaXNTcGF3bmluZyh0cmVhc3VyZVJvb21TcGF3bkNoYW5jZSkpIHtcclxuICAgICAgICAgICAgICAgIGFkZFJvb20ocm9vbSwgR2VuZXJhdGlvbi5ST09NVFlQRS5UUkVBU1VSRSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGlzU3Bhd25pbmcoY2hhbGxlbmdlUm9vbVNwYXduQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICAgICAgYWRkUm9vbShyb29tLCBHZW5lcmF0aW9uLlJPT01UWVBFLkNIQUxMRU5HRSlcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGlzU3Bhd25pbmcoX3NwYXduQ2hhbmNlOiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgICAgICBsZXQgeCA9IE1hdGgucmFuZG9tKCkgKiAxMDA7XHJcbiAgICAgICAgaWYgKHggPCBfc3Bhd25DaGFuY2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gY291bnRCb29sKF9ib29sOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBjb3VudGVyOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIF9ib29sLmZvckVhY2goYm9vbCA9PiB7XHJcbiAgICAgICAgICAgIGlmIChib29sKSB7XHJcbiAgICAgICAgICAgICAgICBjb3VudGVyKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY291bnRlcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRFeGl0SW5kZXgoX2V4aXRzOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pOiBudW1iZXJbXSB7XHJcbiAgICAgICAgbGV0IG51bWJlcnM6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfZXhpdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKF9leGl0c1tpXSkge1xyXG4gICAgICAgICAgICAgICAgbnVtYmVycy5wdXNoKGkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bWJlcnM7XHJcblxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBjYWxjdWxhdGVzIHBvc3NpYmxlIGV4aXRzIGZvciBuZXcgcm9vbXNcclxuICAgICAqIEBwYXJhbSBfcG9zaXRpb24gcG9zaXRpb24gb2Ygcm9vbVxyXG4gICAgICogQHJldHVybnMgYm9vbGVhbiBmb3IgZWFjaCBkaXJlY3Rpb24gbm9ydGgsIGVhc3QsIHNvdXRoLCB3ZXN0XHJcbiAgICAgKi9cclxuXHJcbiAgICBmdW5jdGlvbiBjYWxjUGF0aEV4aXRzKF9wb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSk6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSB7XHJcbiAgICAgICAgbGV0IG5vcnRoOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGVhc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgc291dGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgd2VzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCByb29tTmVpZ2hib3VyczogW251bWJlciwgbnVtYmVyXVtdO1xyXG4gICAgICAgIHJvb21OZWlnaGJvdXJzID0gc2xpY2VOZWlnaGJvdXJzKGdldE5laWdoYm91cnMoX3Bvc2l0aW9uKSk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb29tTmVpZ2hib3Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAocm9vbU5laWdoYm91cnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHNvdXRoID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocm9vbU5laWdoYm91cnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHdlc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyb29tTmVpZ2hib3Vyc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICBub3J0aCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJvb21OZWlnaGJvdXJzW2ldWzBdIC0gX3Bvc2l0aW9uWzBdID09IDEpIHtcclxuICAgICAgICAgICAgICAgIGVhc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbm9ydGgsIGVhc3QsIHNvdXRoLCB3ZXN0XTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYWxjUm9vbURvb3JzKF9wb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSk6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSB7XHJcbiAgICAgICAgbGV0IG5vcnRoOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGVhc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgc291dGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgd2VzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHVzZWRQb3NpdGlvbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2codXNlZFBvc2l0aW9uc1tpXVswXSAtIF9wb3NpdGlvblsxXSk7XHJcbiAgICAgICAgICAgIGlmICh1c2VkUG9zaXRpb25zW2ldWzFdIC0gX3Bvc2l0aW9uWzFdID09IC0xICYmIHVzZWRQb3NpdGlvbnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgc291dGggPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh1c2VkUG9zaXRpb25zW2ldWzBdIC0gX3Bvc2l0aW9uWzBdID09IC0xICYmIHVzZWRQb3NpdGlvbnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgd2VzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHVzZWRQb3NpdGlvbnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gMSAmJiB1c2VkUG9zaXRpb25zW2ldWzBdIC0gX3Bvc2l0aW9uWzBdID09IDApIHtcclxuICAgICAgICAgICAgICAgIG5vcnRoID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodXNlZFBvc2l0aW9uc1tpXVswXSAtIF9wb3NpdGlvblswXSA9PSAxICYmIHVzZWRQb3NpdGlvbnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgZWFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFtub3J0aCwgZWFzdCwgc291dGgsIHdlc3RdO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBnZXROZWlnaGJvdXJzKF9wb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSk6IFtudW1iZXIsIG51bWJlcl1bXSB7XHJcbiAgICAgICAgbGV0IG5laWdoYm91cnM6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtdXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKFtfcG9zaXRpb25bMF0sIF9wb3NpdGlvblsxXSAtIDFdKTsgLy8gZG93blxyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChbX3Bvc2l0aW9uWzBdIC0gMSwgX3Bvc2l0aW9uWzFdXSk7IC8vIGxlZnRcclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2goW19wb3NpdGlvblswXSwgX3Bvc2l0aW9uWzFdICsgMV0pOyAvLyB1cFxyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChbX3Bvc2l0aW9uWzBdICsgMSwgX3Bvc2l0aW9uWzFdXSk7IC8vIHJpZ2h0XHJcbiAgICAgICAgcmV0dXJuIG5laWdoYm91cnM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2xpY2VOZWlnaGJvdXJzKF9uZWlnaGJvdXJzOiBbbnVtYmVyLCBudW1iZXJdW10pOiBbbnVtYmVyLCBudW1iZXJdW10ge1xyXG4gICAgICAgIGxldCBuZWlnaGJvdXJzID0gX25laWdoYm91cnM7XHJcbiAgICAgICAgbGV0IHRvUmVtb3ZlSW5kZXg6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuZWlnaGJvdXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGljaCBwb3NpdGlvbiBhbHJlYWR5IHVzZWRcclxuICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5laWdoYm91cnNbaV1bMF0gPT0gcm9vbVswXSAmJiBuZWlnaGJvdXJzW2ldWzFdID09IHJvb21bMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICB0b1JlbW92ZUluZGV4LnB1c2goaSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBjb3B5OiBbbnVtYmVyLCBudW1iZXJdW10gPSBbXTtcclxuICAgICAgICB0b1JlbW92ZUluZGV4LmZvckVhY2goaW5kZXggPT4ge1xyXG4gICAgICAgICAgICBkZWxldGUgbmVpZ2hib3Vyc1tpbmRleF07XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgbmVpZ2hib3Vycy5mb3JFYWNoKG4gPT4ge1xyXG4gICAgICAgICAgICBjb3B5LnB1c2gobik7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIGNvcHk7XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgVGFnIHtcclxuICAgIGV4cG9ydCBlbnVtIFRhZ3tcclxuICAgICAgICBQTEFZRVIsXHJcbiAgICAgICAgRU5FTVksXHJcbiAgICAgICAgQlVMTEVULFxyXG4gICAgICAgIElURU0sXHJcbiAgICAgICAgUk9PTSxcclxuICAgICAgICBXQUxMLFxyXG4gICAgICAgIERBTUFHRVVJXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgVUkge1xyXG4gICAgLy9sZXQgZGl2VUk6IEhUTUxEaXZFbGVtZW50ID0gPEhUTUxEaXZFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiVUlcIik7XHJcbiAgICBsZXQgcGxheWVyMVVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjFcIik7XHJcbiAgICBsZXQgcGxheWVyMlVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjJcIik7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVVJKCkge1xyXG4gICAgICAgIC8vUGxheWVyMSBVSVxyXG4gICAgICAgICg8SFRNTERpdkVsZW1lbnQ+cGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSFBcIikpLnN0eWxlLndpZHRoID0gKEdhbWUucGxheWVyMS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC8gR2FtZS5wbGF5ZXIxLnByb3BlcnRpZXMuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgKiAxMDApICsgXCIlXCI7XHJcblxyXG4gICAgICAgIC8vVE9ETzogTmVlZHMgdGVzdGluZ1xyXG4gICAgICAgIC8vSW52ZW50b3J5VUlcclxuICAgICAgICBHYW1lLnBsYXllcjEuaXRlbXMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgZXhzaXN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgcGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbWdcIikuZm9yRWFjaCgoaW1nRWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGltZ0VsZW1lbnQuc3JjID09IGVsZW1lbnQuaW1nU3JjKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvL25vbmUgZXhzaXN0aW5nIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICBpZiAoIWV4c2lzdCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEhUTUxJbWFnZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgbmV3SXRlbS5zcmMgPSBlbGVtZW50LmltZ1NyYztcclxuICAgICAgICAgICAgICAgIHBsYXllcjFVSS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5hcHBlbmRDaGlsZChuZXdJdGVtKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvL1BsYXllcjIgVUlcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgKDxIVE1MRGl2RWxlbWVudD5wbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNIUFwiKSkuc3R5bGUud2lkdGggPSAoR2FtZS5wbGF5ZXIyLnByb3BlcnRpZXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLyBHYW1lLnBsYXllcjIucHJvcGVydGllcy5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAqIDEwMCkgKyBcIiVcIjtcclxuXHJcbiAgICAgICAgICAgIC8vSW52ZW50b3J5VUlcclxuICAgICAgICAgICAgR2FtZS5wbGF5ZXIyLml0ZW1zLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBleHNpc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgICAgIHBsYXllcjJVSS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5xdWVyeVNlbGVjdG9yQWxsKFwiaW1nXCIpLmZvckVhY2goKGltZ0VsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW1nRWxlbWVudC5zcmMgPT0gZWxlbWVudC5pbWdTcmMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL25vbmUgZXhzaXN0aW5nIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICAgICAgaWYgKCFleHNpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbTogSFRNTEltYWdlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zcmMgPSBlbGVtZW50LmltZ1NyYztcclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikuYXBwZW5kQ2hpbGQobmV3SXRlbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dFplcm86IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0T25lOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFRvdzogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRUaHJlZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRGb3VyOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dEZpdmU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U2l4OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNldmVuOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dEVpZ2h0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE5pbmU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VGVuOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERhbWFnZVVJIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRhZyA9IFRhZy5UYWcuREFNQUdFVUk7XHJcblxyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXIgPSAwLjUgKiBHYW1lLmZyYW1lUmF0ZTtcclxuXHJcbiAgICAgICAgYXN5bmMgbGlmZXNwYW4oX2dyYXBoOiDGki5Ob2RlKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lID49IDAgJiYgdGhpcy5saWZldGltZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lLS07XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBfZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2RhbWFnZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiZGFtYWdlVUlcIik7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKDAuMzMsIDAuMzMsIDAuMzMpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDAuMjUpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG1lc2g6IMaSLk1lc2hRdWFkID0gbmV3IMaSLk1lc2hRdWFkKCk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNZXNoOiDGki5Db21wb25lbnRNZXNoID0gbmV3IMaSLkNvbXBvbmVudE1lc2gobWVzaCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1lc2gpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG10clNvbGlkV2hpdGU6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiU29saWRXaGl0ZVwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgICAgICBsZXQgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG10clNvbGlkV2hpdGUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChjbXBNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKF9kYW1hZ2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZFRleHR1cmUoX3RleHR1cmU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBsZXQgbmV3VHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICAgICAgICAgIGxldCBuZXdDb2F0OiDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQgPSBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKCk7XHJcbiAgICAgICAgICAgIGxldCBuZXdNdHI6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibXRyXCIsIMaSLlNoYWRlckZsYXRUZXh0dXJlZCwgbmV3Q29hdCk7XHJcbiAgICAgICAgICAgIGxldCBvbGRDb21Db2F0OiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCgpO1xyXG5cclxuICAgICAgICAgICAgb2xkQ29tQ29hdCA9IHRoaXMuZ2V0Q29tcG9uZW50KMaSLkNvbXBvbmVudE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAoX3RleHR1cmUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRaZXJvO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dE9uZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRUb3c7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0VGhyZWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0Rm91cjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNTpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRGaXZlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA2OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFNldmVuO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA4OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA5OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dE5pbmU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDEwOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFRlbjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG5ld0NvYXQuY29sb3IgPSDGki5Db2xvci5DU1MoXCJXSElURVwiKTtcclxuICAgICAgICAgICAgbmV3Q29hdC50ZXh0dXJlID0gbmV3VHh0O1xyXG4gICAgICAgICAgICBvbGRDb21Db2F0Lm1hdGVyaWFsID0gbmV3TXRyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgbW92ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKG5ldyDGki5WZWN0b3IzKDAsIDAuMSwgMCkpO1xyXG4gICAgICAgICAgICAvLyB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMygwLjEsMC4xLDAuMSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBXZWFwb25zIHtcclxuICAgIGV4cG9ydCBjbGFzcyBXZWFwb24ge1xyXG4gICAgICAgIGNvb2xkb3duVGltZTogbnVtYmVyID0gMTA7XHJcbiAgICAgICAgcHVibGljIGN1cnJlbnRDb29sZG93blRpbWU6IG51bWJlciA9IHRoaXMuY29vbGRvd25UaW1lO1xyXG4gICAgICAgIGF0dGFja0NvdW50OiBudW1iZXIgPSAxO1xyXG4gICAgICAgIHB1YmxpYyBjdXJyZW50QXR0YWNrQ291bnQ6IG51bWJlciA9IHRoaXMuYXR0YWNrQ291bnQ7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29sZG93blRpbWU6IG51bWJlciwgX2F0dGFja0NvdW50OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5jb29sZG93blRpbWUgPSBfY29vbGRvd25UaW1lO1xyXG4gICAgICAgICAgICB0aGlzLmF0dGFja0NvdW50ID0gX2F0dGFja0NvdW50O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSJdfQ==