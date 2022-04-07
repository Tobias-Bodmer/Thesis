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
    const damper = 3.5;
    //#endregion "PrivateVariables"
    //#region enemies
    //#endregion
    //#region "essential"
    async function init() {
        if (Bullets.bulletTxt == null) {
            loadTextures();
        }
        await loadEnemiesJSON();
        if (Game.player == null) {
            Game.player = new Player.Ranged("Player1", new Player.Character("Thor,", new Player.Attributes(10, 5, 5)));
        }
        // ƒ.Debug.log(player);
        //#region init Items
        item1 = new Items.InternalItem("speedUP", "adds speed and shit", new Game.ƒ.Vector3(0, 2, 0), new Player.Attributes(0, 0, 1), Items.ITEMTYPE.ADD, "./Resources/Image/Items");
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
        Game.graph.appendChild(Game.player);
        Game.graph.appendChild(item1);
        Game.ƒAid.addStandardLightComponents(Game.graph);
        cmpCamera.mtxPivot.translateZ(25);
        cmpCamera.mtxPivot.rotateY(180);
        Game.ƒ.Debug.log(Game.graph);
        Game.viewport.initialize("Viewport", Game.graph, cmpCamera, Game.canvas);
        draw();
        Game.ƒ.Loop.start(Game.ƒ.LOOP_MODE.TIME_GAME, Game.frameRate);
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
    let playerType;
    async function waitOnConnection() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: Networking.FUNCTION.CONNECTED, value: Networking.client.id } });
        if (Networking.clients.length > 1 && Game.player != null) {
            await init();
            Networking.spawnPlayer(playerType);
        }
        else {
            setTimeout(waitOnConnection, 300);
        }
    }
    function playerChoice(_e) {
        if (_e.target.id == "Ranged") {
            Game.player = new Player.Ranged("player", new Player.Character("Thor,", new Player.Attributes(10, 5, 5)));
            playerType = Player.Type.RANGED;
        }
        if (_e.target.id == "Melee") {
            Game.player = new Player.Melee("player", new Player.Character("Thor,", new Player.Attributes(10, 1, 5)));
            playerType = Player.Type.MELEE;
        }
        document.getElementById("Lobbyscreen").style.visibility = "hidden";
    }
    function draw() {
        Game.viewport.draw();
    }
    function update() {
        InputSystem.move();
        if (Game.player2 != undefined && !Game.connected) {
            Game.connected = true;
        }
        draw();
        cameraUpdate();
        Game.player.cooldown();
        if (Game.connected) {
            Game.player2.cooldown();
        }
        if (Game.connected) {
            Networking.updatePosition(Game.player.mtxLocal.translation, Game.player.mtxLocal.rotation);
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
    function cameraUpdate() {
        let direction = Game.ƒ.Vector2.DIFFERENCE(Game.player.cmpTransform.mtxLocal.translation.toVector2(), cmpCamera.mtxPivot.translation.toVector2());
        direction.scale(1 / Game.frameRate * damper);
        cmpCamera.mtxPivot.translate(new Game.ƒ.Vector3(-direction.x, direction.y, 0), true);
    }
    Game.cameraUpdate = cameraUpdate;
    Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
    //#endregion "essential"
})(Game || (Game = {}));
var Enemy;
(function (Enemy_1) {
    class Enemy extends Game.ƒAid.NodeSprite {
        /**
         * Creates an Enemy
         * @param _name Name of the enemy
         * @param _properties Properties, storing attributes and stuff
         * @param _position position where to spawn
         * @param _aiType optional: standard ai = dumb
         */
        constructor(_name, _properties, _position, _id) {
            super(_name);
            this.tag = Tag.Tag.ENEMY;
            this.netId = Networking.idGenerator();
            this.canMoveX = true;
            this.canMoveY = true;
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
        }
        move() {
            this.updateCollider();
            Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId);
        }
        updateCollider() {
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
            this.collider.position.subtract(ƒ.Vector2.SCALE(this.collider.size, 0.5));
        }
        moveSimple() {
            this.target = Game.player;
            if (Game.connected) {
                let distancePlayer1 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player.cmpTransform.mtxLocal.translation);
                let distancePlayer2 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player2.cmpTransform.mtxLocal.translation);
                if (distancePlayer1 < distancePlayer2) {
                    this.target = Game.player;
                }
                else {
                    this.target = Game.player2;
                }
            }
            let direction = Game.ƒ.Vector3.DIFFERENCE(this.target.cmpTransform.mtxLocal.translation, this.cmpTransform.mtxLocal.translation);
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
            this.target = Game.player;
            if (Game.connected) {
                let distancePlayer1 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player.cmpTransform.mtxLocal.translation);
                let distancePlayer2 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player2.cmpTransform.mtxLocal.translation);
                if (distancePlayer1 < distancePlayer2) {
                    this.target = Game.player;
                }
                else {
                    this.target = Game.player2;
                }
            }
            let direction = Game.ƒ.Vector3.DIFFERENCE(this.cmpTransform.mtxLocal.translation, this.target.cmpTransform.mtxLocal.translation);
            direction.normalize();
            direction.scale((1 / Game.frameRate * this.properties.attributes.speed));
            this.cmpTransform.mtxLocal.translate(direction, true);
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
                if (this.collider.collides(element.collider)) {
                    let intersection = this.collider.getIntersection(element.collider);
                    let areaBeforeMove = intersection.height * intersection.width;
                    let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                    let newDirection = new Game.ƒ.Vector2(direction.x, 0);
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
        constructor(_name, _properties, _position) {
            super(_name, _properties, _position);
        }
        move() {
            super.move();
            this.moveSimple();
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
        constructor(_name, _properties, _position) {
            super(_name, _properties, _position);
            this.distance = 5;
        }
        move() {
            super.move();
            this.moveCircle();
        }
        lifespan(_graph) {
            super.lifespan(_graph);
        }
        async moveCircle() {
            this.target = Game.player;
            console.log(this.target);
            let distancePlayer1 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player.cmpTransform.mtxLocal.translation);
            // let distancePlayer2 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player2.cmpTransform.mtxLocal.translation);
            if (distancePlayer1 > this.distance) {
                this.moveSimple();
            }
            else {
                let degree = InputSystem.calcDegree(this.cmpTransform.mtxLocal.translation, this.target.cmpTransform.mtxLocal.translation);
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
        constructor(_name, _description, _position, _imgSrc, _lifetime) {
            super(_name);
            this.tag = Tag.Tag.ITEM;
            this.id = Networking.idGenerator();
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
                if (this.collider.collides(element.collider) && element.properties != undefined) {
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
        constructor(_healthPoints, _attackPoints, _speed) {
            this.healthPoints = _healthPoints;
            this.maxHealthPoints = _healthPoints;
            this.attackPoints = _attackPoints;
            this.speed = _speed;
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
        constructor(_position, _direction) {
            super("normalBullet");
            this.tag = Tag.Tag.BULLET;
            this.hitPoints = 5;
            this.speed = 20;
            this.lifetime = 1 * Game.frameRate;
            this.killcount = 1;
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            this.flyDirection = _direction;
            this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
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
        }
        async lifespan(_graph) {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                }
            }
        }
        async move() {
            this.cmpTransform.mtxLocal.translate(this.flyDirection);
            this.collider.position = new Game.ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y);
            this.collider.position.subtract(ƒ.Vector2.SCALE(this.collider.size, 0.5));
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
        constructor(_name, _attributes) {
            this.name = _name;
            this.attributes = _attributes;
        }
    }
    Player.Character = Character;
})(Player || (Player = {}));
var EnemySpawner;
(function (EnemySpawner) {
    let spawnTime = 3 * Game.frameRate;
    let currentTime = spawnTime;
    function spawnEnemies() {
        if (currentTime == spawnTime) {
            const ref = Game.enemiesJSON.find(elem => elem.name == "bat");
            Game.graph.addChild(new Enemy.EnemyDumb("Enemy", new Player.Character(ref.name, new Player.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed)), new ƒ.Vector2((Math.random() * 7 - (Math.random() * 7)) * 2, (Math.random() * 7 - (Math.random() * 7) * 2))));
        }
        currentTime--;
        if (currentTime <= 0) {
            currentTime = spawnTime;
        }
    }
    EnemySpawner.spawnEnemies = spawnEnemies;
    class EnemySpawnes {
        constructor(_roomSize, _numberOfEnemies) {
            this.spawnPositions = [];
            this.spawnOffset = 5;
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
        Game.player.mtxLocal.rotation = new ƒ.Vector3(0, 0, calcDegree(Game.player.mtxLocal.translation, mousePosition));
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
            Game.player.move(Game.ƒ.Vector3.NORMALIZATION(moveVector, 1));
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
                let direction = ƒ.Vector3.DIFFERENCE(mousePosition, Game.player.mtxLocal.translation);
                rotateToMouse(e_);
                Game.player.attack(direction);
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
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.Type.MELEE, value: Game.player.properties, position: Game.player.cmpTransform.mtxLocal.translation } });
        }
        else if (_type == Player.Type.RANGED) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.Type.RANGED, value: Game.player.properties, position: Game.player.cmpTransform.mtxLocal.translation } });
        }
        else {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.Type.RANGED, value: Game.player.properties, position: Game.player.cmpTransform.mtxLocal.translation } });
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
        constructor(_name, _properties) {
            super(_name);
            this.tag = Tag.Tag.PLAYER;
            this.items = [];
            this.weapon = new Weapons.Weapon(5, 1);
            this.addComponent(new ƒ.ComponentTransform());
            this.properties = _properties;
            this.collider = new ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, ƒ.ORIGIN2D.CENTER);
        }
        move(_direction) {
            let canMoveX = true;
            let canMoveY = true;
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
            this.collider.position.subtract(ƒ.Vector2.SCALE(this.collider.size, 0.5));
            _direction.scale((1 / 60 * this.properties.attributes.speed));
            let colliders = Game.graph.getChildren().find(element => element.tag == Tag.Tag.ROOM).walls;
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider)) {
                    let intersection = this.collider.getIntersection(element.collider);
                    let areaBeforeMove = intersection.height * intersection.width;
                    let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                    let newDirection = new Game.ƒ.Vector2(_direction.x, 0);
                    this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                    if (this.collider.getIntersection(element.collider) != null) {
                        let newIntersection = this.collider.getIntersection(element.collider);
                        let areaAfterMove = newIntersection.height * newIntersection.width;
                        if (areaBeforeMove < areaAfterMove) {
                            canMoveX = false;
                        }
                    }
                    this.collider.position = oldPosition;
                    newDirection = new Game.ƒ.Vector2(0, _direction.y);
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
            if (this.weapon.currentAttackCount <= 0) {
                if (this.weapon.currentCooldownTime <= 0) {
                    this.weapon.currentCooldownTime = this.weapon.cooldownTime;
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
        constructor(_name, _coordiantes, _exits, _roomType) {
            super(_name);
            this.tag = Tag.Tag.ROOM;
            this.walls = [];
            this.roomSize = 30;
            this.mesh = new ƒ.MeshQuad;
            this.cmpMesh = new ƒ.ComponentMesh(this.mesh);
            this.startRoomMat = new ƒ.Material("startRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("yellow")));
            this.normalRoomMat = new ƒ.Material("normalRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            this.merchantRoomMat = new ƒ.Material("merchantRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")));
            this.treasureRoomMat = new ƒ.Material("treasureRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("yellow")));
            this.challengeRoomMat = new ƒ.Material("challengeRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")));
            this.bossRoomMat = new ƒ.Material("bossRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black")));
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
        constructor(_position, _width) {
            super("Wall");
            this.tag = Tag.Tag.WALL;
            this.wallThickness = 3;
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
        player1UI.querySelector("#HP").style.width = (Game.player.properties.attributes.healthPoints / Game.player.properties.attributes.maxHealthPoints * 100) + "%";
        //TODO: Needs testing
        //InventoryUI
        Game.player.items.forEach((element) => {
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
        constructor(_position, _damage) {
            super("damageUI");
            this.tag = Tag.Tag.DAMAGEUI;
            this.lifetime = 0.5 * Game.frameRate;
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
        async lifespan(_graph) {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                }
            }
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
        constructor(_cooldownTime, _attackCount) {
            this.cooldownTime = 10;
            this.currentCooldownTime = this.cooldownTime;
            this.attackCount = 1;
            this.currentAttackCount = this.attackCount;
            this.cooldownTime = _cooldownTime;
            this.attackCount = _attackCount;
        }
    }
    Weapons.Weapon = Weapon;
})(Weapons || (Weapons = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL0NsYXNzZXMvTWFpbi50cyIsIi4uL0NsYXNzZXMvSW50ZXJmYWNlcy50cyIsIi4uL0NsYXNzZXMvRW5lbXkudHMiLCIuLi9DbGFzc2VzL0l0ZW1zLnRzIiwiLi4vQ2xhc3Nlcy9BdHRyaWJ1dGVzLnRzIiwiLi4vQ2xhc3Nlcy9CdWxsZXQudHMiLCIuLi9DbGFzc2VzL0NoYXJhY3Rlci50cyIsIi4uL0NsYXNzZXMvRW5lbXlTcGF3bmVyLnRzIiwiLi4vQ2xhc3Nlcy9JbnB1dFN5c3RlbS50cyIsIi4uL0NsYXNzZXMvTGFuZHNjYXBlLnRzIiwiLi4vQ2xhc3Nlcy9OZXR3b3JraW5nLnRzIiwiLi4vQ2xhc3Nlcy9QbGF5ZXIudHMiLCIuLi9DbGFzc2VzL1Jvb20udHMiLCIuLi9DbGFzc2VzL1Jvb21HZW5lcmF0aW9uLnRzIiwiLi4vQ2xhc3Nlcy9UYWcudHMiLCIuLi9DbGFzc2VzL1VJLnRzIiwiLi4vQ2xhc3Nlcy9XZWFwb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtQkFBbUI7QUFDbkIsd0RBQXdEO0FBQ3hELHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFFdEIsSUFBVSxJQUFJLENBd09iO0FBN09ELG1CQUFtQjtBQUNuQix3REFBd0Q7QUFDeEQsc0RBQXNEO0FBQ3RELHNCQUFzQjtBQUV0QixXQUFVLElBQUk7SUFDSSxNQUFDLEdBQUcsU0FBUyxDQUFDO0lBQ2QsU0FBSSxHQUFHLFFBQVEsQ0FBQztJQUc5Qix1QkFBdUI7SUFDWixXQUFNLEdBQXlDLFFBQVEsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDNUYseUNBQXlDO0lBQ3pDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdkMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFD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LEdBQUcsWUFBWSxDQUFDO3lCQUNqRDt3QkFDRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLElBQUksU0FBUyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUU7NEJBQ3BGLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO3lCQUNuSjt3QkFFRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLElBQUksU0FBUyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLEVBQUU7NEJBQ3hGLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFD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QUFFO29CQUNILE1BQU0sR0FBRyxHQUFBLE1BQU0sQ0FBQztvQkFDaEIsTUFBTTtnQkFDVjtvQkFDSSxNQUFNO2FBQ2I7WUFFRCxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1lBQ3pCLFVBQVUsQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO1FBQ2pDLENBQUM7UUFFRCxLQUFLLENBQUMsSUFBSTtZQUNOLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9ELGdFQUFnRTtRQUNwRSxDQUFDO0tBQ0o7SUF0RlksV0FBUSxXQXNGcEIsQ0FBQTtBQUNMLENBQUMsRUF6SlMsRUFBRSxLQUFGLEVBQUUsUUF5Slg7QUN6SkQsSUFBVSxPQUFPLENBWWhCO0FBWkQsV0FBVSxPQUFPO0lBQ2IsTUFBYSxNQUFNO1FBTWYsWUFBWSxhQUFxQixFQUFFLFlBQW9CO1lBTHZELGlCQUFZLEdBQVcsRUFBRSxDQUFDO1lBQ25CLHdCQUFtQixHQUFXLElBQUksQ0FBQyxZQUFZLENBQUM7WUFDdkQsZ0JBQVcsR0FBVyxDQUFDLENBQUM7WUFDakIsdUJBQWtCLEdBQVcsSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUdqRCxJQUFJLENBQUMsWUFBWSxHQUFHLGFBQWEsQ0FBQztZQUNsQyxJQUFJLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQztRQUNwQyxDQUFDO0tBQ0o7SUFWWSxjQUFNLFNBVWxCLENBQUE7QUFDTCxDQUFDLEVBWlMsT0FBTyxLQUFQLE9BQU8sUUFZaEIiLCJzb3VyY2VzQ29udGVudCI6WyIvLyNyZWdpb24gXCJJbXBvcnRzXCJcclxuLy8vPHJlZmVyZW5jZSB0eXBlcz1cIi4uL0ZVREdFL0NvcmUvQnVpbGQvRnVkZ2VDb3JlLmpzXCIvPlxyXG4vLy88cmVmZXJlbmNlIHR5cGVzPVwiLi4vRlVER0UvQWlkL0J1aWxkL0Z1ZGdlQWlkLmpzXCIvPlxyXG4vLyNlbmRyZWdpb24gXCJJbXBvcnRzXCJcclxuXHJcbm5hbWVzcGFjZSBHYW1lIHtcclxuICAgIGV4cG9ydCBpbXBvcnQgxpIgPSBGdWRnZUNvcmU7XHJcbiAgICBleHBvcnQgaW1wb3J0IMaSQWlkID0gRnVkZ2VBaWQ7XHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBcIkRvbUVsZW1lbnRzXCJcclxuICAgIGV4cG9ydCBsZXQgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCA9IDxIVE1MQ2FudmFzRWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNhbnZhc1wiKTtcclxuICAgIC8vIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBpbml0KTtcclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBzdGFydCk7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJhbmdlZFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcGxheWVyQ2hvaWNlKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTWVsZWVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHBsYXllckNob2ljZSk7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJEb21FbGVtZW50c1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiUHVibGljVmFyaWFibGVzXCJcclxuICAgIGV4cG9ydCBsZXQgdmlld3BvcnQ6IMaSLlZpZXdwb3J0ID0gbmV3IMaSLlZpZXdwb3J0KCk7XHJcbiAgICBleHBvcnQgbGV0IGdyYXBoOiDGki5Ob2RlID0gbmV3IMaSLk5vZGUoXCJHcmFwaFwiKTtcclxuICAgIGV4cG9ydCBsZXQgcGxheWVyOiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgZXhwb3J0IGxldCBwbGF5ZXIyOiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgZXhwb3J0IGxldCBjb25uZWN0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIGV4cG9ydCBsZXQgZnJhbWVSYXRlOiBudW1iZXIgPSA2MDtcclxuICAgIGV4cG9ydCBsZXQgZW5lbWllczogRW5lbXkuRW5lbXlbXSA9IFtdO1xyXG4gICAgZXhwb3J0IGxldCBlbmVtaWVzSlNPTjogUGxheWVyLkNoYXJhY3RlcltdO1xyXG4gICAgZXhwb3J0IGxldCBiYXQ6IEVuZW15LkVuZW15O1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiUHVibGljVmFyaWFibGVzXCJcclxuXHJcbiAgICAvLyNyZWdpb24gXCJQcml2YXRlVmFyaWFibGVzXCJcclxuICAgIGxldCBpdGVtMTogSXRlbXMuSXRlbTtcclxuICAgIGxldCBjbXBDYW1lcmE6IMaSLkNvbXBvbmVudENhbWVyYSA9IG5ldyDGki5Db21wb25lbnRDYW1lcmEoKTtcclxuICAgIGNvbnN0IGRhbXBlcjogbnVtYmVyID0gMy41O1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiUHJpdmF0ZVZhcmlhYmxlc1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIGVuZW1pZXNcclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBcImVzc2VudGlhbFwiXHJcbiAgICBhc3luYyBmdW5jdGlvbiBpbml0KCkge1xyXG4gICAgICAgIGlmIChCdWxsZXRzLmJ1bGxldFR4dCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGxvYWRUZXh0dXJlcygpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhd2FpdCBsb2FkRW5lbWllc0pTT04oKTtcclxuXHJcbiAgICAgICAgaWYgKHBsYXllciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHBsYXllciA9IG5ldyBQbGF5ZXIuUmFuZ2VkKFwiUGxheWVyMVwiLCBuZXcgUGxheWVyLkNoYXJhY3RlcihcIlRob3IsXCIsIG5ldyBQbGF5ZXIuQXR0cmlidXRlcygxMCwgNSwgNSkpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gxpIuRGVidWcubG9nKHBsYXllcik7XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBpbml0IEl0ZW1zXHJcbiAgICAgICAgaXRlbTEgPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKFwic3BlZWRVUFwiLCBcImFkZHMgc3BlZWQgYW5kIHNoaXRcIiwgbmV3IMaSLlZlY3RvcjMoMCwgMiwgMCksIG5ldyBQbGF5ZXIuQXR0cmlidXRlcygwLCAwLCAxKSwgSXRlbXMuSVRFTVRZUEUuQURELCBcIi4vUmVzb3VyY2VzL0ltYWdlL0l0ZW1zXCIpO1xyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICBHZW5lcmF0aW9uLmdlbmVyYXRlUm9vbXMoKTtcclxuXHJcbiAgICAgICAgLy8gbGV0IGVuZW15ID0gbmV3IEVuZW15LkVuZW15Q2lyY2xlKFwic8O2cmtsZXJcIiwgbmV3IFBsYXllci5DaGFyYWN0ZXIoXCJzw7Zya2lcIiwgbmV3IFBsYXllci5BdHRyaWJ1dGVzKDEwLCAyLCAzKSksIG5ldyDGki5WZWN0b3IyKDIsIDMpKTtcclxuICAgICAgICAvLyBncmFwaC5hZGRDaGlsZChlbmVteSk7XHJcbiAgICAgICAgLy8jcmVnaW9uIFRlc3Rpbmcgb2JqZWN0c1xyXG4gICAgICAgIGxldCBub2RlOiDGki5Ob2RlID0gbmV3IMaSLk5vZGUoXCJRdWFkXCIpO1xyXG5cclxuICAgICAgICBub2RlLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG5cclxuICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICBsZXQgY21wTWVzaDogxpIuQ29tcG9uZW50TWVzaCA9IG5ldyDGki5Db21wb25lbnRNZXNoKG1lc2gpO1xyXG4gICAgICAgIG5vZGUuYWRkQ29tcG9uZW50KGNtcE1lc2gpO1xyXG5cclxuICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgbGV0IGNtcE1hdGVyaWFsOiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChtdHJTb2xpZFdoaXRlKTtcclxuICAgICAgICBub2RlLmFkZENvbXBvbmVudChjbXBNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgIGxldCBuZXdUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgICAgICBsZXQgbmV3Q29hdDogxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkID0gbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCgpO1xyXG4gICAgICAgIGxldCBvbGRDb21Db2F0OiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCgpO1xyXG4gICAgICAgIGxldCBuZXdNdHI6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibXRyXCIsIMaSLlNoYWRlckZsYXRUZXh0dXJlZCwgbmV3Q29hdCk7XHJcbiAgICAgICAgbGV0IG9sZFBpdm90OiDGki5NYXRyaXg0eDQgPSBuZXcgxpIuTWF0cml4NHg0KCk7XHJcblxyXG4gICAgICAgIG9sZENvbUNvYXQgPSBub2RlLmdldENvbXBvbmVudCjGki5Db21wb25lbnRNYXRlcmlhbCk7XHJcbiAgICAgICAgb2xkUGl2b3QgPSBub2RlLmdldENvbXBvbmVudCjGki5Db21wb25lbnRNZXNoKS5tdHhQaXZvdDtcclxuXHJcbiAgICAgICAgYXdhaXQgbmV3VHh0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9ncmFzLnBuZ1wiKTtcclxuICAgICAgICBuZXdDb2F0LmNvbG9yID0gxpIuQ29sb3IuQ1NTKFwiV0hJVEVcIik7XHJcbiAgICAgICAgbmV3Q29hdC50ZXh0dXJlID0gbmV3VHh0O1xyXG4gICAgICAgIG9sZENvbUNvYXQubWF0ZXJpYWwgPSBuZXdNdHI7XHJcblxyXG4gICAgICAgIG5vZGUuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKDMwLCAzMCwgMSkpO1xyXG4gICAgICAgIG5vZGUuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZVooLTAuMDEpO1xyXG5cclxuXHJcbiAgICAgICAgZ3JhcGguYXBwZW5kQ2hpbGQocGxheWVyKTtcclxuICAgICAgICBncmFwaC5hcHBlbmRDaGlsZChpdGVtMSk7XHJcblxyXG5cclxuICAgICAgICDGkkFpZC5hZGRTdGFuZGFyZExpZ2h0Q29tcG9uZW50cyhncmFwaCk7XHJcblxyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGVaKDI1KTtcclxuICAgICAgICBjbXBDYW1lcmEubXR4UGl2b3Qucm90YXRlWSgxODApO1xyXG5cclxuICAgICAgICDGki5EZWJ1Zy5sb2coZ3JhcGgpO1xyXG5cclxuICAgICAgICB2aWV3cG9ydC5pbml0aWFsaXplKFwiVmlld3BvcnRcIiwgZ3JhcGgsIGNtcENhbWVyYSwgY2FudmFzKTtcclxuXHJcbiAgICAgICAgZHJhdygpO1xyXG5cclxuICAgICAgICDGki5Mb29wLnN0YXJ0KMaSLkxPT1BfTU9ERS5USU1FX0dBTUUsIGZyYW1lUmF0ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gbG9hZEVuZW1pZXNKU09OKCkge1xyXG4gICAgICAgIGNvbnN0IGxvYWQgPSBhd2FpdCAoYXdhaXQgZmV0Y2goXCIuL1Jlc291cmNlcy9FbmVtaWVzU3RvcmFnZS5qc29uXCIpKS5qc29uKCk7XHJcbiAgICAgICAgZW5lbWllc0pTT04gPSAoKDxQbGF5ZXIuQ2hhcmFjdGVyW10+bG9hZC5lbmVtaWVzKSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gbG9hZFRleHR1cmVzKCkge1xyXG4gICAgICAgIGF3YWl0IEJ1bGxldHMuYnVsbGV0VHh0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9hcnJvdy5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IFVJLnR4dFplcm8ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzAucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dE9uZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvMS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0VG93LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS8yLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRUaHJlZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvMy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0Rm91ci5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvNC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0Rml2ZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvNS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0U2l4LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS82LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRTZXZlbi5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvNy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0RWlnaHQubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzgucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dE5pbmUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzkucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFRlbi5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvMTAucG5nXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHN0YXJ0KCkge1xyXG4gICAgICAgIGxvYWRUZXh0dXJlcygpO1xyXG4gICAgICAgIC8vYWRkIHNwcml0ZSB0byBncmFwaGUgZm9yIHN0YXJ0c2NyZWVuXHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydEdhbWVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5jb25uZXRpbmcoKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJMb2JieXNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgIHdhaXRPbkNvbm5lY3Rpb24oKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cclxuICAgICAgICB9KTtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNyZWRpdHNcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IHBsYXllclR5cGU6IFBsYXllci5UeXBlO1xyXG4gICAgYXN5bmMgZnVuY3Rpb24gd2FpdE9uQ29ubmVjdGlvbigpIHtcclxuICAgICAgICBOZXR3b3JraW5nLmNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IE5ldHdvcmtpbmcuRlVOQ1RJT04uQ09OTkVDVEVELCB2YWx1ZTogTmV0d29ya2luZy5jbGllbnQuaWQgfSB9KVxyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMubGVuZ3RoID4gMSAmJiBwbGF5ZXIgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBhd2FpdCBpbml0KCk7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25QbGF5ZXIocGxheWVyVHlwZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCh3YWl0T25Db25uZWN0aW9uLCAzMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwbGF5ZXJDaG9pY2UoX2U6IEV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCg8SFRNTEJ1dHRvbkVsZW1lbnQ+X2UudGFyZ2V0KS5pZCA9PSBcIlJhbmdlZFwiKSB7XHJcbiAgICAgICAgICAgIHBsYXllciA9IG5ldyBQbGF5ZXIuUmFuZ2VkKFwicGxheWVyXCIsIG5ldyBQbGF5ZXIuQ2hhcmFjdGVyKFwiVGhvcixcIiwgbmV3IFBsYXllci5BdHRyaWJ1dGVzKDEwLCA1LCA1KSkpO1xyXG4gICAgICAgICAgICBwbGF5ZXJUeXBlID0gUGxheWVyLlR5cGUuUkFOR0VEO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoKDxIVE1MQnV0dG9uRWxlbWVudD5fZS50YXJnZXQpLmlkID09IFwiTWVsZWVcIikge1xyXG4gICAgICAgICAgICBwbGF5ZXIgPSBuZXcgUGxheWVyLk1lbGVlKFwicGxheWVyXCIsIG5ldyBQbGF5ZXIuQ2hhcmFjdGVyKFwiVGhvcixcIiwgbmV3IFBsYXllci5BdHRyaWJ1dGVzKDEwLCAxLCA1KSkpO1xyXG4gICAgICAgICAgICBwbGF5ZXJUeXBlID0gUGxheWVyLlR5cGUuTUVMRUU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTG9iYnlzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZHJhdygpOiB2b2lkIHtcclxuICAgICAgICB2aWV3cG9ydC5kcmF3KCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgIElucHV0U3lzdGVtLm1vdmUoKTtcclxuXHJcbiAgICAgICAgaWYgKHBsYXllcjIgIT0gdW5kZWZpbmVkICYmICFjb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgY29ubmVjdGVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRyYXcoKTtcclxuXHJcbiAgICAgICAgY2FtZXJhVXBkYXRlKCk7XHJcblxyXG4gICAgICAgIHBsYXllci5jb29sZG93bigpO1xyXG5cclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgcGxheWVyMi5jb29sZG93bigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlUG9zaXRpb24oR2FtZS5wbGF5ZXIubXR4TG9jYWwudHJhbnNsYXRpb24sIEdhbWUucGxheWVyLm10eExvY2FsLnJvdGF0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gTmV0d29ya2luZy5zcGF3bkVuZW15KGJhdCwgYmF0LmlkKTtcclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIGNvdW50IGl0ZW1zXHJcbiAgICAgICAgbGV0IGl0ZW1zOiBJdGVtcy5JdGVtW10gPSA8SXRlbXMuSXRlbVtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxJdGVtcy5JdGVtPmVsZW1lbnQpLnRhZyA9PSBUYWcuVGFnLklURU0pXHJcbiAgICAgICAgaXRlbXMuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgZWxlbWVudC5saWZlc3BhbihncmFwaCk7XHJcbiAgICAgICAgICAgICg8SXRlbXMuSW50ZXJuYWxJdGVtPmVsZW1lbnQpLmNvbGxpc2lvbkRldGVjdGlvbigpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICBsZXQgYnVsbGV0czogQnVsbGV0cy5CdWxsZXRbXSA9IDxCdWxsZXRzLkJ1bGxldFtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxCdWxsZXRzLkJ1bGxldD5lbGVtZW50KS50YWcgPT0gVGFnLlRhZy5CVUxMRVQpXHJcbiAgICAgICAgYnVsbGV0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICBlbGVtZW50Lm1vdmUoKTtcclxuICAgICAgICAgICAgZWxlbWVudC5saWZlc3BhbihncmFwaCk7XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgbGV0IGRhbWFnZVVJOiBVSS5EYW1hZ2VVSVtdID0gPFVJLkRhbWFnZVVJW10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPFVJLkRhbWFnZVVJPmVsZW1lbnQpLnRhZyA9PSBUYWcuVGFnLkRBTUFHRVVJKVxyXG4gICAgICAgIGRhbWFnZVVJLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZSgpO1xyXG4gICAgICAgICAgICBlbGVtZW50LmxpZmVzcGFuKGdyYXBoKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBlbmVtaWVzID0gPEVuZW15LkVuZW15W10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVuZW15LkVuZW15PmVsZW1lbnQpLnRhZyA9PSBUYWcuVGFnLkVORU1ZKVxyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgZW5lbWllcy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5tb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmxpZmVzcGFuKGdyYXBoKTtcclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIEVuZW15U3Bhd25lci5zcGF3bkVuZW1pZXMoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgVUkudXBkYXRlVUkoKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2FtZXJhVXBkYXRlKCkge1xyXG4gICAgICAgIGxldCBkaXJlY3Rpb24gPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UocGxheWVyLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICBkaXJlY3Rpb24uc2NhbGUoMSAvIGZyYW1lUmF0ZSAqIGRhbXBlcik7XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0ZShuZXcgxpIuVmVjdG9yMygtZGlyZWN0aW9uLngsIGRpcmVjdGlvbi55LCAwKSwgdHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgxpIuTG9vcC5hZGRFdmVudExpc3RlbmVyKMaSLkVWRU5ULkxPT1BfRlJBTUUsIHVwZGF0ZSk7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJlc3NlbnRpYWxcIlxyXG5cclxufVxyXG4iLCJuYW1lc3BhY2UgSW50ZXJmYWNlcyB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElTcGF3bmFibGUge1xyXG4gICAgICAgIGxpZmV0aW1lPzogbnVtYmVyO1xyXG4gICAgICAgIGxpZmVzcGFuKF9hOiDGki5Ob2RlKTogdm9pZDtcclxuICAgIH1cclxufVxyXG5cclxubmFtZXNwYWNlIFBsYXllciB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElLaWxsYWJsZSB7XHJcbiAgICAgICAgb25EZWF0aCgpOiB2b2lkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSURhbWFnYmxlIHtcclxuICAgICAgICBnZXREYW1hZ2UoKTogdm9pZDtcclxuICAgIH1cclxufVxyXG4iLCJuYW1lc3BhY2UgRW5lbXkge1xyXG5cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXkgZXh0ZW5kcyBHYW1lLsaSQWlkLk5vZGVTcHJpdGUgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklTcGF3bmFibGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UYWcgPSBUYWcuVGFnLkVORU1ZO1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyID0gTmV0d29ya2luZy5pZEdlbmVyYXRvcigpO1xyXG4gICAgICAgIHB1YmxpYyBwcm9wZXJ0aWVzOiBQbGF5ZXIuQ2hhcmFjdGVyO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogR2FtZS7Gki5SZWN0YW5nbGU7XHJcbiAgICAgICAgdGFyZ2V0OiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXI7XHJcbiAgICAgICAgY2FuTW92ZVg6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgICAgIGNhbk1vdmVZOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDcmVhdGVzIGFuIEVuZW15XHJcbiAgICAgICAgICogQHBhcmFtIF9uYW1lIE5hbWUgb2YgdGhlIGVuZW15XHJcbiAgICAgICAgICogQHBhcmFtIF9wcm9wZXJ0aWVzIFByb3BlcnRpZXMsIHN0b3JpbmcgYXR0cmlidXRlcyBhbmQgc3R1ZmZcclxuICAgICAgICAgKiBAcGFyYW0gX3Bvc2l0aW9uIHBvc2l0aW9uIHdoZXJlIHRvIHNwYXduXHJcbiAgICAgICAgICogQHBhcmFtIF9haVR5cGUgb3B0aW9uYWw6IHN0YW5kYXJkIGFpID0gZHVtYlxyXG4gICAgICAgICAqL1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3RlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfaWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLnByb3BlcnRpZXMgPSBfcHJvcGVydGllcztcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDApO1xyXG4gICAgICAgICAgICBpZiAoX2lkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuY3VycmVudElEcy5wdXNoKF9pZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5ldElkID0gX2lkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkVuZW15KHRoaXMsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVDb2xsaWRlcigpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVuZW15UG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlQ29sbGlkZXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi5zdWJ0cmFjdCjGki5WZWN0b3IyLlNDQUxFKHRoaXMuY29sbGlkZXIuc2l6ZSwgMC41KSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlU2ltcGxlKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IEdhbWUucGxheWVyO1xyXG5cclxuICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZGlzdGFuY2VQbGF5ZXIxID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24uZ2V0RGlzdGFuY2UoR2FtZS5wbGF5ZXIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjIgPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZShHYW1lLnBsYXllcjIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZGlzdGFuY2VQbGF5ZXIxIDwgZGlzdGFuY2VQbGF5ZXIyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBHYW1lLnBsYXllcjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gR2FtZS5wbGF5ZXIyO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICBkaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhkaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKCgxIC8gR2FtZS5mcmFtZVJhdGUgKiB0aGlzLnByb3BlcnRpZXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG5cclxuICAgICAgICAgICAgLy8gbGV0IGNhbk1vdmU6IFtib29sZWFuLCBib29sZWFuXSA9IHRoaXMuZ2V0Q2FuTW92ZVhZKGRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIC8vIGxldCBjYW5Nb3ZlWDogYm9vbGVhbiA9IGNhbk1vdmVbMF07XHJcbiAgICAgICAgICAgIC8vIGxldCBjYW5Nb3ZlWTogYm9vbGVhbiA9IGNhbk1vdmVbMV07XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q2FuTW92ZVhZKGRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIC8vVE9ETzogaW4gRnVua3Rpb24gcGFja2VuIGRhbWl0IG1hbiB2b24gYWxsZW0gRW5lbWllcyBkcmF1ZiB6dWdyZWlmZW4ga2FublxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVBd2F5KCkge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IEdhbWUucGxheWVyO1xyXG5cclxuICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZGlzdGFuY2VQbGF5ZXIxID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24uZ2V0RGlzdGFuY2UoR2FtZS5wbGF5ZXIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjIgPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZShHYW1lLnBsYXllcjIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZGlzdGFuY2VQbGF5ZXIxIDwgZGlzdGFuY2VQbGF5ZXIyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBHYW1lLnBsYXllcjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBHYW1lLnBsYXllcjI7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLnRhcmdldC5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICBkaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICBkaXJlY3Rpb24uc2NhbGUoKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShkaXJlY3Rpb24sIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5nZXRDYW5Nb3ZlWFkoZGlyZWN0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBsaWZlc3BhbihfZ3JhcGg6IEdhbWUuxpIuTm9kZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucmVtb3ZlRW5lbXkodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgX2dyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRDYW5Nb3ZlWFkoZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGxldCBjYW5Nb3ZlWCA9IHRydWU7XHJcbiAgICAgICAgICAgIGxldCBjYW5Nb3ZlWSA9IHRydWU7XHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlcnM6IEdlbmVyYXRpb24uV2FsbFtdID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbWVudCA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtZW50KS50YWcgPT0gVGFnLlRhZy5ST09NKSkud2FsbHM7XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50LmNvbGxpZGVyKSkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFCZWZvcmVNb3ZlID0gaW50ZXJzZWN0aW9uLmhlaWdodCAqIGludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG9sZFBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMih0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLngsIHRoaXMuY29sbGlkZXIucG9zaXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoZGlyZWN0aW9uLngsIDApXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcikgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uLmhlaWdodCAqIG5ld0ludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKDAsIGRpcmVjdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnRyYW5zZm9ybSjGki5NYXRyaXgzeDMuVFJBTlNMQVRJT04obmV3RGlyZWN0aW9uKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50LmNvbGxpZGVyKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBuZXdJbnRlcnNlY3Rpb24uaGVpZ2h0ICogbmV3SW50ZXJzZWN0aW9uLndpZHRoO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FuTW92ZVkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZiAoY2FuTW92ZVggJiYgY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShkaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNhbk1vdmVYICYmICFjYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoZGlyZWN0aW9uLngsIDAsIGRpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKGRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIWNhbk1vdmVYICYmIGNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMygwLCBkaXJlY3Rpb24ueSwgZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlEdW1iIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9wcm9wZXJ0aWVzOiBQbGF5ZXIuQ2hhcmFjdGVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUsIF9wcm9wZXJ0aWVzLCBfcG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIubW92ZSgpXHJcbiAgICAgICAgICAgIHRoaXMubW92ZVNpbXBsZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGlmZXNwYW4oX2dyYXBoOiDGki5Ob2RlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmxpZmVzcGFuKF9ncmFwaCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteUZsZWUgZXh0ZW5kcyBFbmVteSB7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9wcm9wZXJ0aWVzOiBQbGF5ZXIuQ2hhcmFjdGVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUsIF9wcm9wZXJ0aWVzLCBfcG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZSgpIHtcclxuICAgICAgICAgICAgc3VwZXIubW92ZSgpO1xyXG4gICAgICAgICAgICB0aGlzLm1vdmVBd2F5KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIubGlmZXNwYW4oX2dyYXBoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteUNpcmNsZSBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICBkaXN0YW5jZTogbnVtYmVyID0gNTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX3Byb3BlcnRpZXM6IFBsYXllci5DaGFyYWN0ZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMikge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSwgX3Byb3BlcnRpZXMsIF9wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5tb3ZlKCk7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZUNpcmNsZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGlmZXNwYW4oX2dyYXBoOiDGki5Ob2RlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmxpZmVzcGFuKF9ncmFwaCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBtb3ZlQ2lyY2xlKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IEdhbWUucGxheWVyO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnRhcmdldCk7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjEgPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZShHYW1lLnBsYXllci5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAvLyBsZXQgZGlzdGFuY2VQbGF5ZXIyID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24uZ2V0RGlzdGFuY2UoR2FtZS5wbGF5ZXIyLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZVBsYXllcjEgPiB0aGlzLmRpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVTaW1wbGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxldCBkZWdyZWUgPSBJbnB1dFN5c3RlbS5jYWxjRGVncmVlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLnRhcmdldC5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pXHJcbiAgICAgICAgICAgICAgICBsZXQgYWRkID0gMDtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyB3aGlsZSAoZGlzdGFuY2VQbGF5ZXIxIDw9IHRoaXMuZGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgIC8vICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgSW5wdXRTeXN0ZW0uY2FsY1Bvc2l0aW9uRnJvbURlZ3JlZShkZWdyZWUgKyBhZGQsIHRoaXMuZGlzdGFuY2UpLnRvVmVjdG9yMygwKSk7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vICAgICBkaXJlY3Rpb24uc2NhbGUoKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKGRpcmVjdGlvbiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgYWRkICs9IDU7XHJcbiAgICAgICAgICAgICAgICAvLyB9XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBJdGVtcyB7XHJcbiAgICBleHBvcnQgZW51bSBJVEVNVFlQRSB7XHJcbiAgICAgICAgQURELFxyXG4gICAgICAgIFNVQlNUUkFDVCxcclxuICAgICAgICBQUk9DRU5UVUFMXHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgSXRlbSBleHRlbmRzIEdhbWUuxpJBaWQuTm9kZVNwcml0ZSBpbXBsZW1lbnRzIEludGVyZmFjZXMuSVNwYXduYWJsZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRhZyA9IFRhZy5UYWcuSVRFTTtcclxuICAgICAgICBwdWJsaWMgaWQ6IG51bWJlciA9IE5ldHdvcmtpbmcuaWRHZW5lcmF0b3IoKTtcclxuICAgICAgICBwdWJsaWMgZGVzY3JpcHRpb246IHN0cmluZztcclxuICAgICAgICBwdWJsaWMgaW1nU3JjOiBzdHJpbmc7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBHYW1lLsaSLlJlY3RhbmdsZTtcclxuICAgICAgICBsaWZldGltZTogbnVtYmVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfZGVzY3JpcHRpb246IHN0cmluZywgX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfaW1nU3JjPzogc3RyaW5nLCBfbGlmZXRpbWU/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmRlc2NyaXB0aW9uID0gX2Rlc2NyaXB0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLmltZ1NyYyA9IF9pbWdTcmM7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSBfbGlmZXRpbWU7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfcG9zaXRpb24pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGxpZmVzcGFuKF9ncmFwaDogxpIuTm9kZSk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA+PSAwICYmIHRoaXMubGlmZXRpbWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saWZldGltZS0tO1xyXG4gICAgICAgICAgICAgICAgLy8gxpIuRGVidWcubG9nKHRoaXMubmFtZSArIFwiOiBcIiArIHRoaXMubGlmZXRpbWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2dyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucG9wSUQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIGNvbGxpc2lvbkRldGVjdGlvbigpIHtcclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyczogYW55W10gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxFbmVteS5FbmVteT5lbGVtZW50KS50YWcgPT0gVGFnLlRhZy5QTEFZRVIpO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5wcm9wZXJ0aWVzICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuYWRkQXR0cmlidWVzQnlJdGVtKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkucHJvcGVydGllcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBJbnRlcm5hbEl0ZW0gZXh0ZW5kcyBJdGVtIHtcclxuICAgICAgICBwdWJsaWMgYXR0cmlidXRlczogUGxheWVyLkF0dHJpYnV0ZXM7XHJcbiAgICAgICAgcHVibGljIHR5cGU6IElURU1UWVBFO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENyZWF0ZXMgYW4gaXRlbSB0aGF0IGNhbiBjaGFuZ2UgQXR0cmlidXRlcyBvZiB0aGUgcGxheWVyXHJcbiAgICAgICAgICogQHBhcmFtIF9uYW1lIG5hbWUgb2YgdGhlIEl0ZW1cclxuICAgICAgICAgKiBAcGFyYW0gX2Rlc2NyaXB0aW9uIERlc2NpcnB0aW9uIG9mIHRoZSBpdGVtXHJcbiAgICAgICAgICogQHBhcmFtIF9wb3NpdGlvbiBQb3NpdGlvbiB3aGVyZSB0byBzcGF3blxyXG4gICAgICAgICAqIEBwYXJhbSBfbGlmZXRpbWUgb3B0aW9uYWw6IGhvdyBsb25nIGlzIHRoZSBpdGVtIHZpc2libGVcclxuICAgICAgICAgKiBAcGFyYW0gX2F0dHJpYnV0ZXMgZGVmaW5lIHdoaWNoIGF0dHJpYnV0ZXMgd2lsbCBjaGFuZ2UsIGNvbXBhcmUgd2l0aCB7QGxpbmsgUGxheWVyLkF0dHJpYnV0ZXN9XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX2Rlc2NyaXB0aW9uOiBzdHJpbmcsIF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2F0dHJpYnV0ZXM6IFBsYXllci5BdHRyaWJ1dGVzLCBfdHlwZTogSVRFTVRZUEUsIF9pbWdTcmM/OiBzdHJpbmcsIF9saWZldGltZT86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSwgX2Rlc2NyaXB0aW9uLCBfcG9zaXRpb24sIF9pbWdTcmMsIF9saWZldGltZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IF9hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICB0aGlzLnR5cGUgPSBfdHlwZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIGNvbGxpc2lvbkRldGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyczogYW55W10gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxFbmVteS5FbmVteT5lbGVtZW50KS50YWcgPT0gVGFnLlRhZy5QTEFZRVIpO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5wcm9wZXJ0aWVzICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuYWRkQXR0cmlidWVzQnlJdGVtKHRoaXMuYXR0cmlidXRlcywgdGhpcy50eXBlKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygoPEVuZW15LkVuZW15PmVsZW1lbnQpLnByb3BlcnRpZXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBQbGF5ZXIge1xyXG4gICAgZXhwb3J0IGNsYXNzIEF0dHJpYnV0ZXMge1xyXG5cclxuICAgICAgICBwdWJsaWMgaGVhbHRoUG9pbnRzOiBudW1iZXI7XHJcbiAgICAgICAgbWF4SGVhbHRoUG9pbnRzOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIHNwZWVkOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGF0dGFja1BvaW50czogbnVtYmVyO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2hlYWx0aFBvaW50czogbnVtYmVyLCBfYXR0YWNrUG9pbnRzOiBudW1iZXIsIF9zcGVlZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGVhbHRoUG9pbnRzID0gX2hlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgdGhpcy5tYXhIZWFsdGhQb2ludHMgPSBfaGVhbHRoUG9pbnRzO1xyXG4gICAgICAgICAgICB0aGlzLmF0dGFja1BvaW50cyA9IF9hdHRhY2tQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSBfc3BlZWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBhZGRzIEF0dHJpYnV0ZXMgdG8gdGhlIFBsYXllciBBdHRyaWJ1dGVzXHJcbiAgICAgICAgICogQHBhcmFtIF9hdHRyaWJ1dGVzIGluY29taW5nIGF0dHJpYnV0ZXNcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgYWRkQXR0cmlidWVzQnlJdGVtKF9hdHRyaWJ1dGVzOiBQbGF5ZXIuQXR0cmlidXRlcywgX2l0ZW1UeXBlOiBJdGVtcy5JVEVNVFlQRSk6IHZvaWQge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKF9pdGVtVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5JVEVNVFlQRS5BREQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oZWFsdGhQb2ludHMgKz0gX2F0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWF4SGVhbHRoUG9pbnRzICs9IF9hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkICs9IF9hdHRyaWJ1dGVzLnNwZWVkO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNrUG9pbnRzICs9IF9hdHRyaWJ1dGVzLmF0dGFja1BvaW50cztcclxuICAgICAgICAgICAgICAgICAgICBicmVhazsgLy8gY2FsY3VsYXRlIGF0dHJpYnV0ZXMgYnkgYWRkaW5nIHRoZW1cclxuICAgICAgICAgICAgICAgIGNhc2UgSXRlbXMuSVRFTVRZUEUuU1VCU1RSQUNUOlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBjYWxjdWxhdGUgYXR0cmliZXMgYnkgc3Vic3RhY3RpbmcgdGhlbVxyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5JVEVNVFlQRS5QUk9DRU5UVUFMOlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBjYWxjdWxhdGUgYXR0cmlidXRlcyBieSBnaXZpbmcgc3BlZmljICVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBCdWxsZXRzIHtcclxuXHJcbiAgICBleHBvcnQgbGV0IGJ1bGxldFR4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCdWxsZXQgZXh0ZW5kcyBHYW1lLsaSLk5vZGUgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklTcGF3bmFibGUge1xyXG5cclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVGFnID0gVGFnLlRhZy5CVUxMRVQ7XHJcbiAgICAgICAgcHVibGljIGZseURpcmVjdGlvbjogxpIuVmVjdG9yMztcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlO1xyXG5cclxuICAgICAgICBwdWJsaWMgaGl0UG9pbnRzOiBudW1iZXIgPSA1O1xyXG4gICAgICAgIHB1YmxpYyBzcGVlZDogbnVtYmVyID0gMjA7XHJcbiAgICAgICAgbGlmZXRpbWU6IG51bWJlciA9IDEgKiBHYW1lLmZyYW1lUmF0ZTtcclxuXHJcbiAgICAgICAga2lsbGNvdW50OiBudW1iZXIgPSAxO1xyXG5cclxuICAgICAgICBhc3luYyBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPj0gMCAmJiB0aGlzLmxpZmV0aW1lICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUtLTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7ICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHN1cGVyKFwibm9ybWFsQnVsbGV0XCIpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoX3Bvc2l0aW9uLngsIF9wb3NpdGlvbi55LCAwKTtcclxuICAgICAgICAgICAgdGhpcy5mbHlEaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWVzaCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUoKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5yb3RhdGVaKElucHV0U3lzdGVtLmNhbGNEZWdyZWUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIMaSLlZlY3RvcjMuU1VNKF9kaXJlY3Rpb24sIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKSkgKyA5MCk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxlWSgwLjI1KTtcclxuICAgICAgICAgICAgdGhpcy5mbHlEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlgoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBhc3luYyBtb3ZlKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUodGhpcy5mbHlEaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi5zdWJ0cmFjdCjGki5WZWN0b3IyLlNDQUxFKHRoaXMuY29sbGlkZXIuc2l6ZSwgMC41KSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlzaW9uRGV0ZWN0aW9uKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsb2FkVGV4dHVyZSgpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1R4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3Q29hdDogxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkID0gbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3TXRyOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm10clwiLCDGki5TaGFkZXJGbGF0VGV4dHVyZWQsIG5ld0NvYXQpO1xyXG4gICAgICAgICAgICBsZXQgb2xkQ29tQ29hdDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuXHJcbiAgICAgICAgICAgIG9sZENvbUNvYXQgPSB0aGlzLmdldENvbXBvbmVudCjGki5Db21wb25lbnRNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICBuZXdUeHQgPSBidWxsZXRUeHQ7XHJcbiAgICAgICAgICAgIG5ld0NvYXQuY29sb3IgPSDGki5Db2xvci5DU1MoXCJXSElURVwiKTtcclxuICAgICAgICAgICAgbmV3Q29hdC50ZXh0dXJlID0gbmV3VHh0O1xyXG4gICAgICAgICAgICBvbGRDb21Db2F0Lm1hdGVyaWFsID0gbmV3TXRyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgY29sbGlzaW9uRGV0ZWN0aW9uKCkge1xyXG4gICAgICAgICAgICBsZXQgY29sbGlkZXJzOiBhbnlbXSA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVuZW15LkVuZW15PmVsZW1lbnQpLnRhZyA9PSBUYWcuVGFnLkVORU1ZKTtcclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQuY29sbGlkZXIpICYmIGVsZW1lbnQucHJvcGVydGllcyAhPSB1bmRlZmluZWQgJiYgdGhpcy5raWxsY291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgKDxFbmVteS5FbmVteT5lbGVtZW50KS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC09IHRoaXMuaGl0UG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IFVJLkRhbWFnZVVJKCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLmhpdFBvaW50cykpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkucHJvcGVydGllcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5raWxsY291bnQtLTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIGNvbGxpZGVycyA9IFtdO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMgPSAoPEdlbmVyYXRpb24uUm9vbT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbGVtZW50ID0+ICg8R2VuZXJhdGlvbi5Sb29tPmVsZW1lbnQpLnRhZyA9PSBUYWcuVGFnLlJPT00pKS53YWxscztcclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTbG93QnVsbGV0IGV4dGVuZHMgQnVsbGV0IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgc3VwZXIoX3Bvc2l0aW9uLCBfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IDY7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0UG9pbnRzID0gMTA7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSA1ICogR2FtZS5mcmFtZVJhdGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBNZWxlZUJ1bGxldCBleHRlbmRzIEJ1bGxldCB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9wb3NpdGlvbiwgX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSA2O1xyXG4gICAgICAgICAgICB0aGlzLmhpdFBvaW50cyA9IDEwO1xyXG4gICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gNjtcclxuICAgICAgICAgICAgdGhpcy5raWxsY291bnQgPSA0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgbG9hZFRleHR1cmUoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBQbGF5ZXIge1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBDaGFyYWN0ZXIge1xyXG4gICAgICAgIHB1YmxpYyBuYW1lOiBzdHJpbmc7XHJcbiAgICAgICAgcHVibGljIGF0dHJpYnV0ZXM6IEF0dHJpYnV0ZXM7XHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9hdHRyaWJ1dGVzOiBBdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IF9uYW1lO1xyXG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSBfYXR0cmlidXRlcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXlTcGF3bmVyIHtcclxuICAgIGxldCBzcGF3blRpbWU6IG51bWJlciA9IDMgKiBHYW1lLmZyYW1lUmF0ZTtcclxuICAgIGxldCBjdXJyZW50VGltZTogbnVtYmVyID0gc3Bhd25UaW1lO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkVuZW1pZXMoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKGN1cnJlbnRUaW1lID09IHNwYXduVGltZSkge1xyXG4gICAgICAgICAgICBjb25zdCByZWYgPSBHYW1lLmVuZW1pZXNKU09OLmZpbmQoZWxlbSA9PiBlbGVtLm5hbWUgPT0gXCJiYXRcIik7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IEVuZW15LkVuZW15RHVtYihcIkVuZW15XCIsIG5ldyBQbGF5ZXIuQ2hhcmFjdGVyKHJlZi5uYW1lLCBuZXcgUGxheWVyLkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkKSksIG5ldyDGki5WZWN0b3IyKChNYXRoLnJhbmRvbSgpICogNyAtIChNYXRoLnJhbmRvbSgpICogNykpICogMiwgKE1hdGgucmFuZG9tKCkgKiA3IC0gKE1hdGgucmFuZG9tKCkgKiA3KSAqIDIpKSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjdXJyZW50VGltZS0tO1xyXG4gICAgICAgIGlmIChjdXJyZW50VGltZSA8PSAwKSB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRUaW1lID0gc3Bhd25UaW1lO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteVNwYXduZXMge1xyXG4gICAgICAgIHNwYXduUG9zaXRpb25zOiDGki5WZWN0b3IyW10gPSBbXTtcclxuICAgICAgICBudW1iZXJPZkVOZW1pZXM6IG51bWJlcjtcclxuICAgICAgICBzcGF3bk9mZnNldDogbnVtYmVyID0gNTtcclxuXHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3Rvcihfcm9vbVNpemU6IG51bWJlciwgX251bWJlck9mRW5lbWllczogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubnVtYmVyT2ZFTmVtaWVzID0gX251bWJlck9mRW5lbWllcztcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBnZXRTcGF3blBvc2l0aW9ucyhfcm9vbTogR2VuZXJhdGlvbi5Sb29tKTogxpIuVmVjdG9yMltdIHtcclxuICAgICAgICAgICAgcmV0dXJuIFtuZXcgxpIuVmVjdG9yMigwICsgdGhpcy5zcGF3bk9mZnNldCwgMCArIHRoaXMuc3Bhd25PZmZzZXQpLCBuZXcgxpIuVmVjdG9yMihfcm9vbS5nZXRSb29tU2l6ZSgpIC0gdGhpcy5zcGF3bk9mZnNldCwgX3Jvb20uZ2V0Um9vbVNpemUoKSArIHRoaXMuc3Bhd25PZmZzZXQpXVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgSW5wdXRTeXN0ZW0ge1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGtleWJvYXJkRG93bkV2ZW50KTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBrZXlib2FyZFVwRXZlbnQpO1xyXG4gICAgR2FtZS5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBhdHRhY2spO1xyXG4gICAgR2FtZS5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCByb3RhdGVUb01vdXNlKTtcclxuXHJcbiAgICAvLyNyZWdpb24gcm90YXRlXHJcbiAgICBsZXQgbW91c2VQb3NpdGlvbjogxpIuVmVjdG9yMztcclxuXHJcbiAgICBmdW5jdGlvbiByb3RhdGVUb01vdXNlKF9tb3VzZUV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XHJcbiAgICAgICAgbGV0IHJheTogxpIuUmF5ID0gR2FtZS52aWV3cG9ydC5nZXRSYXlGcm9tQ2xpZW50KG5ldyDGki5WZWN0b3IyKF9tb3VzZUV2ZW50Lm9mZnNldFgsIF9tb3VzZUV2ZW50Lm9mZnNldFkpKTtcclxuICAgICAgICBtb3VzZVBvc2l0aW9uID0gcmF5LmludGVyc2VjdFBsYW5lKG5ldyDGki5WZWN0b3IzKDAsIDAsIDApLCBuZXcgxpIuVmVjdG9yMygwLCAwLCAxKSk7XHJcbiAgICAgICAgR2FtZS5wbGF5ZXIubXR4TG9jYWwucm90YXRpb24gPSBuZXcgxpIuVmVjdG9yMygwLCAwLCBjYWxjRGVncmVlKEdhbWUucGxheWVyLm10eExvY2FsLnRyYW5zbGF0aW9uLCBtb3VzZVBvc2l0aW9uKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGNEZWdyZWUoX2NlbnRlcjogxpIuVmVjdG9yMywgX3RhcmdldDogxpIuVmVjdG9yMyk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IHhEaXN0YW5jZTogbnVtYmVyID0gX3RhcmdldC54IC0gX2NlbnRlci54O1xyXG4gICAgICAgIGxldCB5RGlzdGFuY2U6IG51bWJlciA9IF90YXJnZXQueSAtIF9jZW50ZXIueTtcclxuICAgICAgICBsZXQgZGVncmVlczogbnVtYmVyID0gTWF0aC5hdGFuMih5RGlzdGFuY2UsIHhEaXN0YW5jZSkgKiAoMTgwIC8gTWF0aC5QSSkgLSA5MDtcclxuICAgICAgICByZXR1cm4gZGVncmVlcztcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGNQb3NpdGlvbkZyb21EZWdyZWUoX2RlZ3JlZXM6IG51bWJlciwgX2Rpc3RhbmNlOiBudW1iZXIpOiDGki5WZWN0b3IyIHtcclxuICAgICAgICBsZXQgZGlzdGFuY2UgPSA1O1xyXG4gICAgICAgIGxldCBuZXdEZWcgPSAoX2RlZ3JlZXMgKiBNYXRoLlBJKSAvIDE4MDtcclxuICAgICAgICBsZXQgeSA9IE1hdGguY29zKG5ld0RlZyk7XHJcbiAgICAgICAgbGV0IHggPSBNYXRoLnNpbihuZXdEZWcpICogLTE7XHJcbiAgICAgICAgbGV0IGNvb3JkID0gbmV3IMaSLlZlY3RvcjIoeCwgeSk7XHJcbiAgICAgICAgY29vcmQuc2NhbGUoZGlzdGFuY2UpO1xyXG4gICAgICAgIHJldHVybiBjb29yZDtcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBtb3ZlXHJcbiAgICBsZXQgY29udHJvbGxlciA9IG5ldyBNYXA8c3RyaW5nLCBib29sZWFuPihbXHJcbiAgICAgICAgW1wiV1wiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiQVwiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiU1wiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiRFwiLCBmYWxzZV1cclxuICAgIF0pO1xyXG5cclxuICAgIGZ1bmN0aW9uIGtleWJvYXJkRG93bkV2ZW50KF9lOiBLZXlib2FyZEV2ZW50KSB7XHJcbiAgICAgICAgbGV0IGtleTogc3RyaW5nID0gX2UuY29kZS50b1VwcGVyQ2FzZSgpLnN1YnN0cmluZygzKTtcclxuICAgICAgICBjb250cm9sbGVyLnNldChrZXksIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGtleWJvYXJkVXBFdmVudChfZTogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgICAgIGxldCBrZXk6IHN0cmluZyA9IF9lLmNvZGUudG9VcHBlckNhc2UoKS5zdWJzdHJpbmcoMyk7XHJcbiAgICAgICAgY29udHJvbGxlci5zZXQoa2V5LCBmYWxzZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIG1vdmUoKSB7XHJcbiAgICAgICAgbGV0IG1vdmVWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgbGV0IGhhc0NoYW5nZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiV1wiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnkgKz0gMTtcclxuICAgICAgICAgICAgaGFzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIkFcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci54IC09IDE7XHJcbiAgICAgICAgICAgIGhhc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJTXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueSAtPSAxO1xyXG4gICAgICAgICAgICBoYXNDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiRFwiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnggKz0gMTtcclxuICAgICAgICAgICAgaGFzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoaGFzQ2hhbmdlZCAmJiBtb3ZlVmVjdG9yLm1hZ25pdHVkZSAhPSAwKSB7XHJcbiAgICAgICAgICAgIEdhbWUucGxheWVyLm1vdmUoR2FtZS7Gki5WZWN0b3IzLk5PUk1BTElaQVRJT04obW92ZVZlY3RvciwgMSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBhdHRhY2tcclxuICAgIGZ1bmN0aW9uIGF0dGFjayhlXzogTW91c2VFdmVudCkge1xyXG5cclxuICAgICAgICBsZXQgbW91c2VCdXR0b24gPSBlXy5idXR0b247XHJcbiAgICAgICAgc3dpdGNoIChtb3VzZUJ1dHRvbikge1xyXG4gICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICAvL2xlZnQgbW91c2UgYnV0dG9uIHBsYXllci5hdHRhY2tcclxuICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRShtb3VzZVBvc2l0aW9uLCBHYW1lLnBsYXllci5tdHhMb2NhbC50cmFuc2xhdGlvbilcclxuICAgICAgICAgICAgICAgIHJvdGF0ZVRvTW91c2UoZV8pO1xyXG4gICAgICAgICAgICAgICAgR2FtZS5wbGF5ZXIuYXR0YWNrKGRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1bGxldChkaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgIC8vVE9ETzogcmlnaHQgbW91c2UgYnV0dG9uIHBsYXllci5jaGFyZ2Ugb3Igc29tZXRoaW5nIGxpa2UgdGhhdFxyXG5cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG5cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG59IiwibmFtZXNwYWNlIExldmVsIHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgTGFuZHNjYXBlIGV4dGVuZHMgxpIuTm9kZXtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMuZ2V0Q2hpbGRyZW4oKVswXS5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0pLm10eExvY2FsLnRyYW5zbGF0ZVooLTIpXHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCIvLy88cmVmZXJlbmNlIHBhdGg9XCIuLi9GVURHRS9OZXQvQnVpbGQvQ2xpZW50L0Z1ZGdlQ2xpZW50LmQudHNcIi8+XHJcblxyXG5uYW1lc3BhY2UgTmV0d29ya2luZyB7XHJcbiAgICBleHBvcnQgZW51bSBGVU5DVElPTiB7XHJcbiAgICAgICAgQ09OTkVDVEVELFxyXG4gICAgICAgIFNQQVdOLFxyXG4gICAgICAgIFRSQU5TRk9STSxcclxuICAgICAgICBCVUxMRVQsXHJcbiAgICAgICAgU1BBV05FTkVNWSxcclxuICAgICAgICBFTkVNWVRSQU5TRk9STSxcclxuICAgICAgICBFTkVNWURJRVxyXG4gICAgfVxyXG5cclxuICAgIGltcG9ydCDGkkNsaWVudCA9IEZ1ZGdlTmV0LkZ1ZGdlQ2xpZW50O1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY2xpZW50OiDGkkNsaWVudDtcclxuICAgIGV4cG9ydCBsZXQgY2xpZW50czogc3RyaW5nW10gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgcG9zVXBkYXRlOiDGki5WZWN0b3IzO1xyXG4gICAgZXhwb3J0IGxldCBzb21lb25lSXNIb3N0OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IGVuZW15OiBFbmVteS5FbmVteTtcclxuICAgIGV4cG9ydCBsZXQgY3VycmVudElEczogbnVtYmVyW10gPSBbXTtcclxuXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtzcGF3blBsYXllcigpfSwgdHJ1ZSk7XHJcbiAgICBsZXQgSVBDb25uZWN0aW9uID0gPEhUTUxJbnB1dEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJJUENvbm5lY3Rpb25cIik7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNvbm5lY3RpbmdcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNvbm5ldGluZywgdHJ1ZSk7XHJcblxyXG5cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNvbm5ldGluZygpIHtcclxuICAgICAgICBjbGllbnQgPSBuZXcgxpJDbGllbnQoKTtcclxuICAgICAgICBjbGllbnQuYWRkRXZlbnRMaXN0ZW5lcihGdWRnZU5ldC5FVkVOVC5NRVNTQUdFX1JFQ0VJVkVELCByZWNlaXZlTWVzc2FnZSk7XHJcbiAgICAgICAgY2xpZW50LmNvbm5lY3RUb1NlcnZlcihJUENvbm5lY3Rpb24udmFsdWUpO1xyXG5cclxuICAgICAgICBhZGRDbGllbnRJRCgpXHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGFkZENsaWVudElEKCkge1xyXG4gICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgY2xpZW50cy5wdXNoKGNsaWVudC5pZCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGFkZENsaWVudElELCAzMDApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiByZWNlaXZlTWVzc2FnZShfZXZlbnQ6IEN1c3RvbUV2ZW50IHwgTWVzc2FnZUV2ZW50IHwgRXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBpZiAoX2V2ZW50IGluc3RhbmNlb2YgTWVzc2FnZUV2ZW50KSB7XHJcbiAgICAgICAgICAgIGxldCBtZXNzYWdlOiBGdWRnZU5ldC5NZXNzYWdlID0gSlNPTi5wYXJzZShfZXZlbnQuZGF0YSk7XHJcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlkU291cmNlICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29tbWFuZCAhPSBGdWRnZU5ldC5DT01NQU5ELlNFUlZFUl9IRUFSVEJFQVQgJiYgbWVzc2FnZS5jb21tYW5kICE9IEZ1ZGdlTmV0LkNPTU1BTkQuQ0xJRU5UX0hFQVJUQkVBVCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkNPTk5FQ1RFRC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQudmFsdWUgIT0gY2xpZW50LmlkICYmIGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQgPT0gbWVzc2FnZS5jb250ZW50LnZhbHVlKSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudHMucHVzaChtZXNzYWdlLmNvbnRlbnQudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdOLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS50YWJsZShtZXNzYWdlLmNvbnRlbnQudHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQudHlwZSA9PSBQbGF5ZXIuVHlwZS5NRUxFRSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5wbGF5ZXIyID0gbmV3IFBsYXllci5NZWxlZShcInBsYXllcjJcIiwgbmV3IFBsYXllci5DaGFyYWN0ZXIobWVzc2FnZS5jb250ZW50LnZhbHVlLm5hbWUsIG5ldyBQbGF5ZXIuQXR0cmlidXRlcyhtZXNzYWdlLmNvbnRlbnQudmFsdWUuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIG1lc3NhZ2UuY29udGVudC52YWx1ZS5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgbWVzc2FnZS5jb250ZW50LnZhbHVlLmF0dHJpYnV0ZXMuc3BlZWQpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBsYXllcjIubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hcHBlbmRDaGlsZChHYW1lLnBsYXllcjIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5jb25uZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuY29udGVudC50eXBlID09IFBsYXllci5UeXBlLlJBTkdFRCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5wbGF5ZXIyID0gbmV3IFBsYXllci5SYW5nZWQoXCJwbGF5ZXIyXCIsIG5ldyBQbGF5ZXIuQ2hhcmFjdGVyKG1lc3NhZ2UuY29udGVudC52YWx1ZS5uYW1lLCBuZXcgUGxheWVyLkF0dHJpYnV0ZXMobWVzc2FnZS5jb250ZW50LnZhbHVlLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIG1lc3NhZ2UuY29udGVudC52YWx1ZS5hdHRyaWJ1dGVzLnNwZWVkKSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5wbGF5ZXIyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQoR2FtZS5wbGF5ZXIyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuY29ubmVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5UUkFOU0ZPUk0udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1vdmVWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YVsyXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb3RhdGVWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVsyXSlcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBsYXllcjIubXR4TG9jYWwudHJhbnNsYXRpb24gPSBtb3ZlVmVjdG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5wbGF5ZXIyLm10eExvY2FsLnJvdGF0aW9uID0gcm90YXRlVmVjdG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkJVTExFVC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBsYXllcjIuYXR0YWNrKG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuZGlyZWN0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24uZGF0YVsyXSkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdORU5FTVkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXcgRW5lbXkuRW5lbXkoXCJub3JtYWxFbmVteVwiLCBuZXcgUGxheWVyLkNoYXJhY3RlcihtZXNzYWdlLmNvbnRlbnQuZW5lbXkubmFtZSwgbmV3IFBsYXllci5BdHRyaWJ1dGVzKG1lc3NhZ2UuY29udGVudC5lbmVteS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgbWVzc2FnZS5jb250ZW50LmVuZW15LmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCBtZXNzYWdlLmNvbnRlbnQuZW5lbXkuYXR0cmlidXRlcy5zcGVlZCkpLCBuZXcgxpIuVmVjdG9yMihtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0pLCBtZXNzYWdlLmNvbnRlbnQuaWQpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5FTkVNWVRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5lbXkgPSBHYW1lLmVuZW1pZXMuZmluZChlbmVtID0+IGVuZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50LmlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmVteSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS51cGRhdGVDb2xsaWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkVORU1ZRElFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmVteSA9IEdhbWUuZW5lbWllcy5maW5kKGVuZW0gPT4gZW5lbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZChlbmVteSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3BJRChtZXNzYWdlLmNvbnRlbnQuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vI3JlZ2lvbiBwbGF5ZXJcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3blBsYXllcihfdHlwZT86IFBsYXllci5UeXBlKSB7XHJcbiAgICAgICAgaWYgKGNsaWVudC5pZEhvc3QgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5iZWNvbWVIb3N0KCk7XHJcbiAgICAgICAgICAgIHNvbWVvbmVJc0hvc3QgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKF90eXBlID09IFBsYXllci5UeXBlLk1FTEVFKXtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV04sIHR5cGU6IFBsYXllci5UeXBlLk1FTEVFLCB2YWx1ZTogR2FtZS5wbGF5ZXIucHJvcGVydGllcywgcG9zaXRpb246IEdhbWUucGxheWVyLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiB9IH0pXHJcbiAgICAgICAgfSBlbHNlIGlmIChfdHlwZSA9PSBQbGF5ZXIuVHlwZS5SQU5HRUQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV04sIHR5cGU6IFBsYXllci5UeXBlLlJBTkdFRCwgdmFsdWU6IEdhbWUucGxheWVyLnByb3BlcnRpZXMsIHBvc2l0aW9uOiBHYW1lLnBsYXllci5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gfSB9KVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOLCB0eXBlOiBQbGF5ZXIuVHlwZS5SQU5HRUQsIHZhbHVlOiBHYW1lLnBsYXllci5wcm9wZXJ0aWVzLCBwb3NpdGlvbjogR2FtZS5wbGF5ZXIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIHNlbmRzIHRyYW5zZm9ybSBvdmVyIG5ldHdvcmtcclxuICAgICAqIEBwYXJhbSBfX3Bvc2l0aW9uIGN1cnJlbnQgcG9zaXRpb24gb2YgT2JqZWN0XHJcbiAgICAgKiBAcGFyYW0gX3JvdGF0aW9uIGN1cnJlbnQgcm90YXRpb24gb2YgT2JqZWN0XHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVQb3NpdGlvbihfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9yb3RhdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlRSQU5TRk9STSwgdmFsdWU6IF9wb3NpdGlvbiwgcm90YXRpb246IF9yb3RhdGlvbiB9IH0pXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUJ1bGxldChfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkJVTExFVCwgZGlyZWN0aW9uOiBfZGlyZWN0aW9uIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvLyNyZWdpb24gIGVuZW15XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25FbmVteShfZW5lbXk6IEVuZW15LkVuZW15LCBfaWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhfZW5lbXkucHJvcGVydGllcyk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKF9pZCk7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdORU5FTVksIGVuZW15OiBfZW5lbXkucHJvcGVydGllcywgcG9zaXRpb246IF9lbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgaWQ6IF9pZCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVFbmVteVBvc2l0aW9uKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2lkOiBudW1iZXIpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5FTkVNWVRSQU5TRk9STSwgcG9zaXRpb246IF9wb3NpdGlvbiwgaWQ6IF9pZCB9IH0pXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUVuZW15KF9pZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5FTVlESUUsIGlkOiBfaWQgfSB9KVxyXG5cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBpZEdlbmVyYXRvcigpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBpZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDApO1xyXG4gICAgICAgIGlmIChjdXJyZW50SURzLmZpbmQoY3VySUQgPT4gY3VySUQgPT0gaWQpKSB7XHJcbiAgICAgICAgICAgIGlkR2VuZXJhdG9yKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjdXJyZW50SURzLnB1c2goaWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGlkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBwb3BJRChfaWQ6IG51bWJlcikge1xyXG4gICAgICAgIGxldCBpbmRleDogbnVtYmVyO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3VycmVudElEcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudElEc1tpXSA9PSBfaWQpIHtcclxuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiaWQgdG8gcG9wOiBcIiArIF9pZCk7XHJcbiAgICAgICAgY3VycmVudElEcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiYWZ0ZXJJRHM6IFwiICsgY3VycmVudElEcyk7XHJcbiAgICB9XHJcblxyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJiZWZvcmV1bmxvYWRcIiwgb25VbmxvYWQsIGZhbHNlKTtcclxuXHJcbiAgICBmdW5jdGlvbiBvblVubG9hZCgpIHtcclxuICAgICAgICAvL1RPRE86IFRoaW5ncyB3ZSBkbyBhZnRlciB0aGUgcGxheWVyIGxlZnQgdGhlIGdhbWVcclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBQbGF5ZXIge1xyXG4gICAgZXhwb3J0IGVudW0gVHlwZSB7XHJcbiAgICAgICAgUkFOR0VELFxyXG4gICAgICAgIE1FTEVFXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFBsYXllciBleHRlbmRzIEdhbWUuxpJBaWQuTm9kZVNwcml0ZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRhZyA9IFRhZy5UYWcuUExBWUVSO1xyXG4gICAgICAgIHB1YmxpYyBpdGVtczogQXJyYXk8SXRlbXMuSXRlbT4gPSBbXTtcclxuICAgICAgICBwdWJsaWMgcHJvcGVydGllczogQ2hhcmFjdGVyO1xyXG4gICAgICAgIHB1YmxpYyB3ZWFwb246IFdlYXBvbnMuV2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKDUsMSk7XHJcblxyXG4gICAgICAgIGNvbGxpZGVyOiDGki5SZWN0YW5nbGU7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9wcm9wZXJ0aWVzOiBDaGFyYWN0ZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLnByb3BlcnRpZXMgPSBfcHJvcGVydGllcztcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyDGki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnksIMaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGxldCBjYW5Nb3ZlWDogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgICAgIGxldCBjYW5Nb3ZlWTogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24uc3VidHJhY3QoxpIuVmVjdG9yMi5TQ0FMRSh0aGlzLmNvbGxpZGVyLnNpemUsIDAuNSkpO1xyXG5cclxuICAgICAgICAgICAgX2RpcmVjdGlvbi5zY2FsZSgoMSAvIDYwICogdGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlcnM6IEdlbmVyYXRpb24uV2FsbFtdID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbWVudCA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtZW50KS50YWcgPT0gVGFnLlRhZy5ST09NKSkud2FsbHM7XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50LmNvbGxpZGVyKSkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFCZWZvcmVNb3ZlID0gaW50ZXJzZWN0aW9uLmhlaWdodCAqIGludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG9sZFBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMih0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLngsIHRoaXMuY29sbGlkZXIucG9zaXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoX2RpcmVjdGlvbi54LCAwKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUFmdGVyTW92ZSA9IG5ld0ludGVyc2VjdGlvbi5oZWlnaHQgKiBuZXdJbnRlcnNlY3Rpb24ud2lkdGg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5Nb3ZlWCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMigwLCBfZGlyZWN0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUFmdGVyTW92ZSA9IG5ld0ludGVyc2VjdGlvbi5oZWlnaHQgKiBuZXdJbnRlcnNlY3Rpb24ud2lkdGg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5Nb3ZlWSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIGlmIChjYW5Nb3ZlWCAmJiBjYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24sIGZhbHNlKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChjYW5Nb3ZlWCAmJiAhY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMyhfZGlyZWN0aW9uLngsIDAsIF9kaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIWNhbk1vdmVYICYmIGNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoMCwgX2RpcmVjdGlvbi55LCBfZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbiwgZmFsc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgYXR0YWNrKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMud2VhcG9uLmN1cnJlbnRBdHRhY2tDb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgYnVsbGV0OiBCdWxsZXRzLkJ1bGxldCA9IG5ldyBCdWxsZXRzLkJ1bGxldChuZXcgxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KSwgX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICBidWxsZXQuZmx5RGlyZWN0aW9uLnNjYWxlKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIGJ1bGxldC5zcGVlZCk7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGJ1bGxldCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy53ZWFwb24uY3VycmVudEF0dGFja0NvdW50LS07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjb29sZG93bigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMud2VhcG9uLmN1cnJlbnRBdHRhY2tDb3VudCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy53ZWFwb24uY3VycmVudENvb2xkb3duVGltZSA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53ZWFwb24uY3VycmVudENvb2xkb3duVGltZSA9IHRoaXMud2VhcG9uLmNvb2xkb3duVGltZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLndlYXBvbi5jdXJyZW50QXR0YWNrQ291bnQgPSB0aGlzLndlYXBvbi5hdHRhY2tDb3VudDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2codGhpcy5jdXJyZW50Q29vbGRvd25UaW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53ZWFwb24uY3VycmVudENvb2xkb3duVGltZS0tO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY29sbGVjdG9yKCkge1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBNZWxlZSBleHRlbmRzIFBsYXllciB7XHJcbiAgICAgICAgcHVibGljIGF0dGFjayhfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLndlYXBvbi5jdXJyZW50QXR0YWNrQ291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGJ1bGxldDogQnVsbGV0cy5CdWxsZXQgPSBuZXcgQnVsbGV0cy5NZWxlZUJ1bGxldChuZXcgxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KSwgX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICBidWxsZXQuZmx5RGlyZWN0aW9uLnNjYWxlKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIGJ1bGxldC5zcGVlZCk7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGJ1bGxldCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy53ZWFwb24uY3VycmVudEF0dGFja0NvdW50LS07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFJhbmdlZCBleHRlbmRzIFBsYXllciB7XHJcblxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG4gICAgZXhwb3J0IGVudW0gUk9PTVRZUEUge1xyXG4gICAgICAgIFNUQVJULFxyXG4gICAgICAgIE5PUk1BTCxcclxuICAgICAgICBNRVJDSEFOVCxcclxuICAgICAgICBUUkVBU1VSRSxcclxuICAgICAgICBDSEFMTEVOR0UsXHJcbiAgICAgICAgQk9TU1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBSb29tIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRhZyA9IFRhZy5UYWcuUk9PTTtcclxuICAgICAgICBwdWJsaWMgcm9vbVR5cGU6IFJPT01UWVBFXHJcbiAgICAgICAgcHVibGljIGNvb3JkaW5hdGVzOiBbbnVtYmVyLCBudW1iZXJdOyAvLyBYIFlcclxuICAgICAgICBwdWJsaWMgd2FsbHM6IFdhbGxbXSA9IFtdO1xyXG4gICAgICAgIHJvb21TaXplOiBudW1iZXIgPSAzMDtcclxuICAgICAgICBleGl0czogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dIC8vIE4gRSBTIFdcclxuICAgICAgICBtZXNoOiDGki5NZXNoUXVhZCA9IG5ldyDGki5NZXNoUXVhZDtcclxuICAgICAgICBjbXBNZXNoOiDGki5Db21wb25lbnRNZXNoID0gbmV3IMaSLkNvbXBvbmVudE1lc2godGhpcy5tZXNoKTtcclxuICAgICAgICBzdGFydFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwic3RhcnRSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInllbGxvd1wiKSkpO1xyXG4gICAgICAgIG5vcm1hbFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibm9ybWFsUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgIG1lcmNoYW50Um9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtZXJjaGFudFJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiZ3JlZW5cIikpKTtcclxuICAgICAgICB0cmVhc3VyZVJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwidHJlYXN1cmVSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInllbGxvd1wiKSkpO1xyXG4gICAgICAgIGNoYWxsZW5nZVJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiY2hhbGxlbmdlUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJibHVlXCIpKSk7XHJcbiAgICAgICAgYm9zc1Jvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiYm9zc1Jvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiYmxhY2tcIikpKTtcclxuXHJcbiAgICAgICAgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX2Nvb3JkaWFudGVzOiBbbnVtYmVyLCBudW1iZXJdLCBfZXhpdHM6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSwgX3Jvb21UeXBlOiBST09NVFlQRSkge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29vcmRpbmF0ZXMgPSBfY29vcmRpYW50ZXM7XHJcbiAgICAgICAgICAgIHRoaXMuZXhpdHMgPSBfZXhpdHM7XHJcbiAgICAgICAgICAgIHRoaXMucm9vbVR5cGUgPSBfcm9vbVR5cGU7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX3Jvb21UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLlNUQVJUOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wTWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwodGhpcy5zdGFydFJvb21NYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBST09NVFlQRS5OT1JNQUw6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLm5vcm1hbFJvb21NYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBST09NVFlQRS5NRVJDSEFOVDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMubWVyY2hhbnRSb29tTWF0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgUk9PTVRZUEUuVFJFQVNVUkU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLnRyZWFzdXJlUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLkNIQUxMRU5HRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMuY2hhbGxlbmdlUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLkJPU1M6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLmJvc3NSb29tTWF0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQodGhpcy5jbXBNZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQodGhpcy5jbXBNYXRlcmlhbCk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKHRoaXMucm9vbVNpemUsIHRoaXMucm9vbVNpemUsIDApKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyh0aGlzLmNvb3JkaW5hdGVzWzBdICogdGhpcy5yb29tU2l6ZSwgdGhpcy5jb29yZGluYXRlc1sxXSAqIHRoaXMucm9vbVNpemUsIC0wLjAyKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaChuZXcgV2FsbChuZXcgxpIuVmVjdG9yMigodGhpcy5yb29tU2l6ZSAvIDIpLCAwKSwgdGhpcy5yb29tU2l6ZSkpO1xyXG4gICAgICAgICAgICB0aGlzLndhbGxzLnB1c2gobmV3IFdhbGwobmV3IMaSLlZlY3RvcjIoLSh0aGlzLnJvb21TaXplIC8gMiksIDApLCB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaChuZXcgV2FsbChuZXcgxpIuVmVjdG9yMigwLCAodGhpcy5yb29tU2l6ZSAvIDIpKSwgdGhpcy5yb29tU2l6ZSkpO1xyXG4gICAgICAgICAgICB0aGlzLndhbGxzLnB1c2gobmV3IFdhbGwobmV3IMaSLlZlY3RvcjIoMCwgLSh0aGlzLnJvb21TaXplIC8gMikpLCB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0Um9vbVNpemUoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucm9vbVNpemU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBXYWxsIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRhZyA9IFRhZy5UYWcuV0FMTDtcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlO1xyXG4gICAgICAgIHB1YmxpYyB3YWxsVGhpY2tuZXNzOiBudW1iZXIgPSAzO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMiwgX3dpZHRoOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJXYWxsXCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IMaSLk1lc2hRdWFkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChuZXcgxpIuTWF0ZXJpYWwoXCJyZWRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwicmVkXCIpKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gX3Bvc2l0aW9uLnRvVmVjdG9yMygwKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfcG9zaXRpb24ueCA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3Bvc2l0aW9uLnkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMoX3dpZHRoLCB0aGlzLndhbGxUaGlja25lc3MsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUoX3Bvc2l0aW9uLngsIF9wb3NpdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLngsIHRoaXMud2FsbFRoaWNrbmVzcywgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhfd2lkdGgsIHRoaXMud2FsbFRoaWNrbmVzcywgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZShfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy53YWxsVGhpY2tuZXNzLCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoX3Bvc2l0aW9uLnkgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKF9wb3NpdGlvbi54ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKHRoaXMud2FsbFRoaWNrbmVzcywgX3dpZHRoLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgdGhpcy53YWxsVGhpY2tuZXNzLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy53YWxsVGhpY2tuZXNzLCBfd2lkdGgsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUoX3Bvc2l0aW9uLngsIF9wb3NpdGlvbi55LCB0aGlzLndhbGxUaGlja25lc3MsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG5cclxuICAgIGxldCBudW1iZXJPZlJvb21zOiBudW1iZXIgPSAzO1xyXG4gICAgbGV0IHVzZWRQb3NpdGlvbnM6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtdO1xyXG4gICAgbGV0IHJvb21zOiBSb29tW10gPSBbXTtcclxuXHJcbiAgICAvL3NwYXduIGNoYW5jZXNcclxuICAgIGxldCBjaGFsbGVuZ2VSb29tU3Bhd25DaGFuY2U6IG51bWJlciA9IDIwO1xyXG4gICAgbGV0IHRyZWFzdXJlUm9vbVNwYXduQ2hhbmNlOiBudW1iZXIgPSAxMDtcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVSb29tcygpOiB2b2lkIHtcclxuICAgICAgICBsZXQgc3RhcnRDb29yZHM6IFtudW1iZXIsIG51bWJlcl0gPSBbMCwgMF07XHJcblxyXG4gICAgICAgIHJvb21zLnB1c2gobmV3IFJvb20oXCJyb29tU3RhcnRcIiwgc3RhcnRDb29yZHMsIGNhbGNQYXRoRXhpdHMoc3RhcnRDb29yZHMpLCBHZW5lcmF0aW9uLlJPT01UWVBFLlNUQVJUKSlcclxuICAgICAgICB1c2VkUG9zaXRpb25zLnB1c2goc3RhcnRDb29yZHMpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgbnVtYmVyT2ZSb29tczsgaSsrKSB7XHJcbiAgICAgICAgICAgIGFkZFJvb20ocm9vbXNbcm9vbXMubGVuZ3RoIC0gMV0sIEdlbmVyYXRpb24uUk9PTVRZUEUuTk9STUFMKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYWRkUm9vbShyb29tc1tyb29tcy5sZW5ndGggLSAxXSwgR2VuZXJhdGlvbi5ST09NVFlQRS5CT1NTKTtcclxuICAgICAgICBhZGRTcGVjaWFsUm9vbXMoKTtcclxuICAgICAgICBhZGRSb29tKHJvb21zW3Jvb21zLmxlbmd0aCAtIDNdLCBHZW5lcmF0aW9uLlJPT01UWVBFLk1FUkNIQU5UKTtcclxuICAgICAgICByb29tcy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICByb29tLmV4aXRzID0gY2FsY1Jvb21Eb29ycyhyb29tLmNvb3JkaW5hdGVzKTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cocm9vbS5jb29yZGluYXRlcyArIFwiIFwiICsgcm9vbS5leGl0cyArIFwiIFwiICsgcm9vbS5yb29tVHlwZS50b1N0cmluZygpKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKHJvb21zWzBdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzBdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzFdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzJdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzNdKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGRSb29tKF9jdXJyZW50Um9vbTogUm9vbSwgX3Jvb21UeXBlOiBHZW5lcmF0aW9uLlJPT01UWVBFKTogdm9pZCB7XHJcbiAgICAgICAgbGV0IG51bWJlck9mRXhpdHM6IG51bWJlciA9IGNvdW50Qm9vbChfY3VycmVudFJvb20uZXhpdHMpO1xyXG4gICAgICAgIGxldCByYW5kb21OdW1iZXI6IG51bWJlciA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG51bWJlck9mRXhpdHMpO1xyXG4gICAgICAgIGxldCBwb3NzaWJsZUV4aXRJbmRleDogbnVtYmVyW10gPSBnZXRFeGl0SW5kZXgoX2N1cnJlbnRSb29tLmV4aXRzKTtcclxuICAgICAgICBsZXQgbmV3Um9vbVBvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdO1xyXG5cclxuICAgICAgICBzd2l0Y2ggKHBvc3NpYmxlRXhpdEluZGV4W3JhbmRvbU51bWJlcl0pIHtcclxuICAgICAgICAgICAgY2FzZSAwOiAvLyBub3J0aFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSwgX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzFdICsgMV07XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ldyBSb29tKFwicm9vbU5vcm1hbFwiLCAobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpKTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTogLy8gZWFzdFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSArIDEsIF9jdXJyZW50Um9vbS5jb29yZGluYXRlc1sxXV07XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ldyBSb29tKFwicm9vbU5vcm1hbFwiLCAobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpKTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMjogLy8gc291dGhcclxuICAgICAgICAgICAgICAgIG5ld1Jvb21Qb3NpdGlvbiA9IFtfY3VycmVudFJvb20uY29vcmRpbmF0ZXNbMF0sIF9jdXJyZW50Um9vbS5jb29yZGluYXRlc1sxXSAtIDFdO1xyXG4gICAgICAgICAgICAgICAgcm9vbXMucHVzaChuZXcgUm9vbShcInJvb21Ob3JtYWxcIiwgKG5ld1Jvb21Qb3NpdGlvbiksIGNhbGNQYXRoRXhpdHMobmV3Um9vbVBvc2l0aW9uKSwgX3Jvb21UeXBlKSk7XHJcbiAgICAgICAgICAgICAgICB1c2VkUG9zaXRpb25zLnB1c2gobmV3Um9vbVBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDM6IC8vd2VzdFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSAtIDEsIF9jdXJyZW50Um9vbS5jb29yZGluYXRlc1sxXV07XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ldyBSb29tKFwicm9vbU5vcm1hbFwiLCAobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpKTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkU3BlY2lhbFJvb21zKCk6IHZvaWQge1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIHJvb20uZXhpdHMgPSBjYWxjUGF0aEV4aXRzKHJvb20uY29vcmRpbmF0ZXMpO1xyXG4gICAgICAgICAgICBpZiAoaXNTcGF3bmluZyh0cmVhc3VyZVJvb21TcGF3bkNoYW5jZSkpIHtcclxuICAgICAgICAgICAgICAgIGFkZFJvb20ocm9vbSwgR2VuZXJhdGlvbi5ST09NVFlQRS5UUkVBU1VSRSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGlzU3Bhd25pbmcoY2hhbGxlbmdlUm9vbVNwYXduQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICAgICAgYWRkUm9vbShyb29tLCBHZW5lcmF0aW9uLlJPT01UWVBFLkNIQUxMRU5HRSlcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGlzU3Bhd25pbmcoX3NwYXduQ2hhbmNlOiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgICAgICBsZXQgeCA9IE1hdGgucmFuZG9tKCkgKiAxMDA7XHJcbiAgICAgICAgaWYgKHggPCBfc3Bhd25DaGFuY2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gY291bnRCb29sKF9ib29sOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBjb3VudGVyOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIF9ib29sLmZvckVhY2goYm9vbCA9PiB7XHJcbiAgICAgICAgICAgIGlmIChib29sKSB7XHJcbiAgICAgICAgICAgICAgICBjb3VudGVyKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY291bnRlcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRFeGl0SW5kZXgoX2V4aXRzOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pOiBudW1iZXJbXSB7XHJcbiAgICAgICAgbGV0IG51bWJlcnM6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfZXhpdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKF9leGl0c1tpXSkge1xyXG4gICAgICAgICAgICAgICAgbnVtYmVycy5wdXNoKGkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bWJlcnM7XHJcblxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBjYWxjdWxhdGVzIHBvc3NpYmxlIGV4aXRzIGZvciBuZXcgcm9vbXNcclxuICAgICAqIEBwYXJhbSBfcG9zaXRpb24gcG9zaXRpb24gb2Ygcm9vbVxyXG4gICAgICogQHJldHVybnMgYm9vbGVhbiBmb3IgZWFjaCBkaXJlY3Rpb24gbm9ydGgsIGVhc3QsIHNvdXRoLCB3ZXN0XHJcbiAgICAgKi9cclxuXHJcbiAgICBmdW5jdGlvbiBjYWxjUGF0aEV4aXRzKF9wb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSk6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSB7XHJcbiAgICAgICAgbGV0IG5vcnRoOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGVhc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgc291dGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgd2VzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCByb29tTmVpZ2hib3VyczogW251bWJlciwgbnVtYmVyXVtdO1xyXG4gICAgICAgIHJvb21OZWlnaGJvdXJzID0gc2xpY2VOZWlnaGJvdXJzKGdldE5laWdoYm91cnMoX3Bvc2l0aW9uKSk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb29tTmVpZ2hib3Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAocm9vbU5laWdoYm91cnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHNvdXRoID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocm9vbU5laWdoYm91cnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHdlc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyb29tTmVpZ2hib3Vyc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICBub3J0aCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJvb21OZWlnaGJvdXJzW2ldWzBdIC0gX3Bvc2l0aW9uWzBdID09IDEpIHtcclxuICAgICAgICAgICAgICAgIGVhc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbm9ydGgsIGVhc3QsIHNvdXRoLCB3ZXN0XTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYWxjUm9vbURvb3JzKF9wb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSk6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSB7XHJcbiAgICAgICAgbGV0IG5vcnRoOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGVhc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgc291dGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgd2VzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHVzZWRQb3NpdGlvbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2codXNlZFBvc2l0aW9uc1tpXVswXSAtIF9wb3NpdGlvblsxXSk7XHJcbiAgICAgICAgICAgIGlmICh1c2VkUG9zaXRpb25zW2ldWzFdIC0gX3Bvc2l0aW9uWzFdID09IC0xICYmIHVzZWRQb3NpdGlvbnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgc291dGggPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh1c2VkUG9zaXRpb25zW2ldWzBdIC0gX3Bvc2l0aW9uWzBdID09IC0xICYmIHVzZWRQb3NpdGlvbnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgd2VzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHVzZWRQb3NpdGlvbnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gMSAmJiB1c2VkUG9zaXRpb25zW2ldWzBdIC0gX3Bvc2l0aW9uWzBdID09IDApIHtcclxuICAgICAgICAgICAgICAgIG5vcnRoID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodXNlZFBvc2l0aW9uc1tpXVswXSAtIF9wb3NpdGlvblswXSA9PSAxICYmIHVzZWRQb3NpdGlvbnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgZWFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFtub3J0aCwgZWFzdCwgc291dGgsIHdlc3RdO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBnZXROZWlnaGJvdXJzKF9wb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSk6IFtudW1iZXIsIG51bWJlcl1bXSB7XHJcbiAgICAgICAgbGV0IG5laWdoYm91cnM6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtdXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKFtfcG9zaXRpb25bMF0sIF9wb3NpdGlvblsxXSAtIDFdKTsgLy8gZG93blxyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChbX3Bvc2l0aW9uWzBdIC0gMSwgX3Bvc2l0aW9uWzFdXSk7IC8vIGxlZnRcclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2goW19wb3NpdGlvblswXSwgX3Bvc2l0aW9uWzFdICsgMV0pOyAvLyB1cFxyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChbX3Bvc2l0aW9uWzBdICsgMSwgX3Bvc2l0aW9uWzFdXSk7IC8vIHJpZ2h0XHJcbiAgICAgICAgcmV0dXJuIG5laWdoYm91cnM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2xpY2VOZWlnaGJvdXJzKF9uZWlnaGJvdXJzOiBbbnVtYmVyLCBudW1iZXJdW10pOiBbbnVtYmVyLCBudW1iZXJdW10ge1xyXG4gICAgICAgIGxldCBuZWlnaGJvdXJzID0gX25laWdoYm91cnM7XHJcbiAgICAgICAgbGV0IHRvUmVtb3ZlSW5kZXg6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuZWlnaGJvdXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGljaCBwb3NpdGlvbiBhbHJlYWR5IHVzZWRcclxuICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5laWdoYm91cnNbaV1bMF0gPT0gcm9vbVswXSAmJiBuZWlnaGJvdXJzW2ldWzFdID09IHJvb21bMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICB0b1JlbW92ZUluZGV4LnB1c2goaSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBjb3B5OiBbbnVtYmVyLCBudW1iZXJdW10gPSBbXTtcclxuICAgICAgICB0b1JlbW92ZUluZGV4LmZvckVhY2goaW5kZXggPT4ge1xyXG4gICAgICAgICAgICBkZWxldGUgbmVpZ2hib3Vyc1tpbmRleF07XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgbmVpZ2hib3Vycy5mb3JFYWNoKG4gPT4ge1xyXG4gICAgICAgICAgICBjb3B5LnB1c2gobik7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIGNvcHk7XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgVGFnIHtcclxuICAgIGV4cG9ydCBlbnVtIFRhZ3tcclxuICAgICAgICBQTEFZRVIsXHJcbiAgICAgICAgRU5FTVksXHJcbiAgICAgICAgQlVMTEVULFxyXG4gICAgICAgIElURU0sXHJcbiAgICAgICAgUk9PTSxcclxuICAgICAgICBXQUxMLFxyXG4gICAgICAgIERBTUFHRVVJXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgVUkge1xyXG4gICAgLy9sZXQgZGl2VUk6IEhUTUxEaXZFbGVtZW50ID0gPEhUTUxEaXZFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiVUlcIik7XHJcbiAgICBsZXQgcGxheWVyMVVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjFcIik7XHJcbiAgICBsZXQgcGxheWVyMlVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjJcIik7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVVJKCkge1xyXG4gICAgICAgIC8vUGxheWVyMSBVSVxyXG4gICAgICAgICg8SFRNTERpdkVsZW1lbnQ+cGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSFBcIikpLnN0eWxlLndpZHRoID0gKEdhbWUucGxheWVyLnByb3BlcnRpZXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLyBHYW1lLnBsYXllci5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzICogMTAwKSArIFwiJVwiO1xyXG5cclxuICAgICAgICAvL1RPRE86IE5lZWRzIHRlc3RpbmdcclxuICAgICAgICAvL0ludmVudG9yeVVJXHJcbiAgICAgICAgR2FtZS5wbGF5ZXIuaXRlbXMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgZXhzaXN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgcGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbWdcIikuZm9yRWFjaCgoaW1nRWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGltZ0VsZW1lbnQuc3JjID09IGVsZW1lbnQuaW1nU3JjKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvL25vbmUgZXhzaXN0aW5nIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICBpZiAoIWV4c2lzdCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEhUTUxJbWFnZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgbmV3SXRlbS5zcmMgPSBlbGVtZW50LmltZ1NyYztcclxuICAgICAgICAgICAgICAgIHBsYXllcjFVSS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5hcHBlbmRDaGlsZChuZXdJdGVtKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvL1BsYXllcjIgVUlcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgKDxIVE1MRGl2RWxlbWVudD5wbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNIUFwiKSkuc3R5bGUud2lkdGggPSAoR2FtZS5wbGF5ZXIyLnByb3BlcnRpZXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLyBHYW1lLnBsYXllcjIucHJvcGVydGllcy5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAqIDEwMCkgKyBcIiVcIjtcclxuXHJcbiAgICAgICAgICAgIC8vSW52ZW50b3J5VUlcclxuICAgICAgICAgICAgR2FtZS5wbGF5ZXIyLml0ZW1zLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBleHNpc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgICAgIHBsYXllcjJVSS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5xdWVyeVNlbGVjdG9yQWxsKFwiaW1nXCIpLmZvckVhY2goKGltZ0VsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW1nRWxlbWVudC5zcmMgPT0gZWxlbWVudC5pbWdTcmMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL25vbmUgZXhzaXN0aW5nIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICAgICAgaWYgKCFleHNpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbTogSFRNTEltYWdlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zcmMgPSBlbGVtZW50LmltZ1NyYztcclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikuYXBwZW5kQ2hpbGQobmV3SXRlbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dFplcm86IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0T25lOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFRvdzogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRUaHJlZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRGb3VyOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dEZpdmU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U2l4OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNldmVuOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dEVpZ2h0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE5pbmU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VGVuOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERhbWFnZVVJIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRhZyA9IFRhZy5UYWcuREFNQUdFVUk7XHJcblxyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXIgPSAwLjUgKiBHYW1lLmZyYW1lUmF0ZTtcclxuXHJcbiAgICAgICAgYXN5bmMgbGlmZXNwYW4oX2dyYXBoOiDGki5Ob2RlKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lID49IDAgJiYgdGhpcy5saWZldGltZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lLS07XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBfZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2RhbWFnZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiZGFtYWdlVUlcIik7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKDAuMzMsIDAuMzMsIDAuMzMpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDAuMjUpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG1lc2g6IMaSLk1lc2hRdWFkID0gbmV3IMaSLk1lc2hRdWFkKCk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNZXNoOiDGki5Db21wb25lbnRNZXNoID0gbmV3IMaSLkNvbXBvbmVudE1lc2gobWVzaCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1lc2gpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG10clNvbGlkV2hpdGU6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiU29saWRXaGl0ZVwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgICAgICBsZXQgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG10clNvbGlkV2hpdGUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChjbXBNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKF9kYW1hZ2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZFRleHR1cmUoX3RleHR1cmU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBsZXQgbmV3VHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICAgICAgICAgIGxldCBuZXdDb2F0OiDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQgPSBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKCk7XHJcbiAgICAgICAgICAgIGxldCBuZXdNdHI6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibXRyXCIsIMaSLlNoYWRlckZsYXRUZXh0dXJlZCwgbmV3Q29hdCk7XHJcbiAgICAgICAgICAgIGxldCBvbGRDb21Db2F0OiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCgpO1xyXG5cclxuICAgICAgICAgICAgb2xkQ29tQ29hdCA9IHRoaXMuZ2V0Q29tcG9uZW50KMaSLkNvbXBvbmVudE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAoX3RleHR1cmUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRaZXJvO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dE9uZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRUb3c7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0VGhyZWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0Rm91cjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNTpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRGaXZlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA2OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFNldmVuO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA4OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA5OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dE5pbmU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDEwOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFRlbjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG5ld0NvYXQuY29sb3IgPSDGki5Db2xvci5DU1MoXCJXSElURVwiKTtcclxuICAgICAgICAgICAgbmV3Q29hdC50ZXh0dXJlID0gbmV3VHh0O1xyXG4gICAgICAgICAgICBvbGRDb21Db2F0Lm1hdGVyaWFsID0gbmV3TXRyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgbW92ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKG5ldyDGki5WZWN0b3IzKDAsIDAuMSwgMCkpO1xyXG4gICAgICAgICAgICAvLyB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMygwLjEsMC4xLDAuMSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBXZWFwb25zIHtcclxuICAgIGV4cG9ydCBjbGFzcyBXZWFwb24ge1xyXG4gICAgICAgIGNvb2xkb3duVGltZTogbnVtYmVyID0gMTA7XHJcbiAgICAgICAgcHVibGljIGN1cnJlbnRDb29sZG93blRpbWU6IG51bWJlciA9IHRoaXMuY29vbGRvd25UaW1lO1xyXG4gICAgICAgIGF0dGFja0NvdW50OiBudW1iZXIgPSAxO1xyXG4gICAgICAgIHB1YmxpYyBjdXJyZW50QXR0YWNrQ291bnQ6IG51bWJlciA9IHRoaXMuYXR0YWNrQ291bnQ7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29sZG93blRpbWU6IG51bWJlciwgX2F0dGFja0NvdW50OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5jb29sZG93blRpbWUgPSBfY29vbGRvd25UaW1lO1xyXG4gICAgICAgICAgICB0aGlzLmF0dGFja0NvdW50ID0gX2F0dGFja0NvdW50O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSJdfQ==