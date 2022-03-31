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
    window.addEventListener("load", init);
    //#endregion "DomElements"
    //#region "PublicVariables"
    Game.viewport = new Game.ƒ.Viewport();
    Game.graph = new Game.ƒ.Node("Graph");
    Game.connected = false;
    Game.frameRate = 60;
    //#endregion "PublicVariables"
    //#region "PrivateVariables"
    let item1;
    let cmpCamera = new Game.ƒ.ComponentCamera();
    const damper = 3.5;
    //#endregion "PrivateVariables"
    //#region "essential"
    async function init() {
        Game.player = new Player.Player("Player1", new Player.Character("Thor,", new Player.Attributes(10, 5, 5)));
        Game.ƒ.Debug.log(Game.player);
        //#region init Items
        item1 = new Items.Item("Item1", "", new Game.ƒ.Vector3(0, 5, 0), "./Resources/Image/Items");
        //#endregion
        Generation.generateRooms();
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
        Game.graph.addChild(node);
        for (let i = 0; i < 3; i++) {
            Game.graph.addChild(new Enemy.Enemy("Enemy", new Player.Character("bat", new Player.Attributes(10, 5, Math.random() * 3 + 1)), new Game.ƒ.Vector2(i * 0.3, 5)));
        }
        //#endregion
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
    function waitOnConnection() {
        if (Networking.client != undefined && Networking.client.id != null || undefined) {
            document.getElementById("ConnectionGUI").style.visibility = "hidden";
            init();
        }
        else {
            setTimeout(waitOnConnection, 300);
        }
    }
    function draw() {
        Game.viewport.draw();
    }
    function update() {
        InputSystem.move();
        draw();
        cameraUpdate();
        //#region count items
        let items = Game.graph.getChildren().filter(element => element.tag == Tag.Tag.ITEM);
        items.forEach(element => {
            element.lifespan(Game.graph);
        });
        //#endregion
        let bullets = Game.graph.getChildren().filter(element => element.tag == Tag.Tag.BULLET);
        bullets.forEach(element => {
            element.move();
            element.lifespan(Game.graph);
        });
        let enemys = Game.graph.getChildren().filter(element => element.tag == Tag.Tag.ENEMY);
        enemys.forEach(element => {
            element.move();
            element.lifespan(Game.graph);
        });
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
var Items;
(function (Items) {
    class Item extends Game.ƒAid.NodeSprite {
        tag = Tag.Tag.ITEM;
        description;
        imgSrc;
        lifetime;
        constructor(_name, _description, _position, _imgSrc, _lifetime) {
            super(_name);
            this.description = _description;
            this.imgSrc = _imgSrc;
            this.lifetime = _lifetime;
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.translate(_position);
        }
        lifespan(_graph) {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                ƒ.Debug.log(this.name + ": " + this.lifetime);
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                }
            }
        }
    }
    Items.Item = Item;
})(Items || (Items = {}));
var Items;
(function (Items) {
    let ITEMTYPE;
    (function (ITEMTYPE) {
        ITEMTYPE[ITEMTYPE["ADD"] = 0] = "ADD";
        ITEMTYPE[ITEMTYPE["SUBSTRACT"] = 1] = "SUBSTRACT";
        ITEMTYPE[ITEMTYPE["PROCENTUAL"] = 2] = "PROCENTUAL";
    })(ITEMTYPE = Items.ITEMTYPE || (Items.ITEMTYPE = {}));
    class AttributeItem extends Items.Item {
        type;
        attributes;
        /**
         * Creates an item that can change Attributes of the player
         * @param _name name of the Item
         * @param _description Descirption of the item
         * @param _position Position where to spawn
         * @param _lifetime optional: how long is the item visible
         * @param _attributes define which attributes will change, compare with {@link Player.Attributes}
         */
        constructor(_name, _description, _position, _imgSrc, _lifetime, _attributes, _type) {
            super(_name, _description, _position, _imgSrc, _lifetime);
            this.attributes = _attributes;
            this.type = _type;
        }
    }
    Items.AttributeItem = AttributeItem;
})(Items || (Items = {}));
var Player;
(function (Player) {
    class Attributes {
        healthPoints;
        maxhealthPoints;
        speed;
        attackPoints;
        constructor(_healthPoints, _attackPoints, _speed) {
            this.healthPoints = _healthPoints;
            this.maxhealthPoints = _healthPoints;
            this.attackPoints = _attackPoints;
            this.speed = _speed;
        }
    }
    Player.Attributes = Attributes;
})(Player || (Player = {}));
var Items;
(function (Items) {
    class Bullet extends Game.ƒAid.NodeSprite {
        tag = Tag.Tag.BULLET;
        hitPoints;
        flyDirection;
        speed;
        collider;
        lifetime;
        killcount = 1;
        async lifespan(_graph) {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                }
            }
        }
        constructor(_name, _position, _direction, _attackPoints, _lifetime, _speed) {
            super(_name);
            this.hitPoints = _attackPoints;
            this.lifetime = _lifetime * Game.frameRate;
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            this.speed = _speed;
            this.flyDirection = _direction;
            this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
        }
        async move() {
            this.cmpTransform.mtxLocal.translate(this.flyDirection);
            this.collider.position = new Game.ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y);
            this.collisionDetection();
        }
        async collisionDetection() {
            let colliders = Game.graph.getChildren().filter(element => element.collider != undefined);
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider) && element.properties != undefined && this.killcount > 0) {
                    element.properties.attributes.healthPoints -= this.hitPoints;
                    this.lifetime = 0;
                    this.killcount--;
                }
            });
        }
    }
    Items.Bullet = Bullet;
})(Items || (Items = {}));
var Player;
(function (Player) {
    class Character {
        name;
        attributes;
        constructor(name, attributes) {
            this.name = name;
            this.attributes = attributes;
        }
    }
    Player.Character = Character;
})(Player || (Player = {}));
var Enemy;
(function (Enemy_1) {
    class Enemy extends Game.ƒAid.NodeSprite {
        tag = Tag.Tag.ENEMY;
        properties;
        smart = false;
        target;
        collider;
        lifetime;
        constructor(_name, _properties, _position) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.properties = _properties;
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
        }
        async move() {
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
            if (this.smart) {
            }
            else {
                this.moveSimple();
            }
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
        }
        async moveSimple() {
            let direction = Game.ƒ.Vector3.DIFFERENCE(this.target.cmpTransform.mtxLocal.translation, this.cmpTransform.mtxLocal.translation);
            direction.normalize();
            direction.scale((1 / Game.frameRate * this.properties.attributes.speed));
            this.cmpTransform.mtxLocal.translate(direction, true);
        }
        async moveAway() {
            let direction = Game.ƒ.Vector3.DIFFERENCE(this.cmpTransform.mtxLocal.translation, this.target.cmpTransform.mtxLocal.translation);
            direction.normalize();
            direction.scale((1 / Game.frameRate * this.properties.attributes.speed));
            this.cmpTransform.mtxLocal.translate(direction, true);
        }
        async lifespan(_graph) {
            if (this.properties.attributes.healthPoints <= 0) {
                _graph.removeChild(this);
            }
        }
    }
    Enemy_1.Enemy = Enemy;
})(Enemy || (Enemy = {}));
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
        ƒ.Debug.log(mousePosition);
        Game.player.mtxLocal.rotation = new ƒ.Vector3(0, 0, calcDegree(Game.player.mtxLocal.translation, mousePosition));
    }
    function calcDegree(_center, _target) {
        let xDistance = _target.x - _center.x;
        let yDistance = _target.y - _center.y;
        let degrees = Math.atan2(yDistance, xDistance) * (180 / Math.PI) - 90;
        return degrees;
    }
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
        if (Game.connected) {
            Networking.updatePosition(Game.player.mtxLocal.translation, Game.player.mtxLocal.rotation);
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
            console.log();
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
        FUNCTION[FUNCTION["SPAWN"] = 0] = "SPAWN";
        FUNCTION[FUNCTION["TRANSFORM"] = 1] = "TRANSFORM";
        FUNCTION[FUNCTION["BULLET"] = 2] = "BULLET";
    })(FUNCTION = Networking.FUNCTION || (Networking.FUNCTION = {}));
    var ƒClient = FudgeNet.FudgeClient;
    document.getElementById("Host").addEventListener("click", hostServer, true);
    let IPConnection = document.getElementById("IPConnection");
    document.getElementById("Connecting").addEventListener("click", conneting, true);
    function hostServer() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, value: Game.player.hero, position: Game.player.cmpTransform.mtxLocal.translation } });
        Game.connected = true;
        ƒ.Debug.log("Connected to Server");
    }
    function conneting() {
        Networking.client = new ƒClient();
        Networking.client.addEventListener(FudgeNet.EVENT.MESSAGE_RECEIVED, receiveMessage);
        Networking.client.connectToServer(IPConnection.value);
    }
    async function receiveMessage(_event) {
        if (_event instanceof MessageEvent) {
            let message = JSON.parse(_event.data);
            if (message.idSource != Networking.client.id) {
                if (message.command != FudgeNet.COMMAND.SERVER_HEARTBEAT && message.command != FudgeNet.COMMAND.CLIENT_HEARTBEAT) {
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWN.toString()) {
                        console.log(message.content.value);
                        Game.player2 = new Player.Player("player2", new Player.Character("Thorian", new Player.Attributes(100, 10, 5)));
                        Game.player2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                        Game.graph.appendChild(Game.player2);
                    }
                    if (message.content != undefined && message.content.text == FUNCTION.TRANSFORM.toString()) {
                        let moveVector = new Game.ƒ.Vector3(message.content.value.data[0], message.content.value.data[1], message.content.value.data[2]);
                        let rotateVector = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);
                        Game.player2.mtxLocal.translation = moveVector;
                        Game.player2.mtxLocal.rotation = rotateVector;
                    }
                    if (message.content != undefined && message.content.text == FUNCTION.BULLET.toString()) {
                        Game.player2.attack(new Game.ƒ.Vector3(message.content.direction.data[0], message.content.direction.data[1], message.content.direction.data[2]));
                    }
                }
            }
        }
    }
    /**
     * sends transform over network
     * @param __position current position of Object
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
    window.addEventListener("beforeunload", onUnload, false);
    function onUnload() {
        //TODO: Things we do after the player left the game
    }
})(Networking || (Networking = {}));
var Player;
(function (Player_1) {
    class Player extends Game.ƒAid.NodeSprite {
        tag = Tag.Tag.PLAYER;
        items = [];
        hero;
        rect1;
        constructor(_name, _properties) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.hero = _properties;
        }
        move(_direction) {
            _direction.scale((1 / 60 * this.hero.attributes.speed));
            this.cmpTransform.mtxLocal.translate(_direction, false);
        }
        attack(_direction) {
            _direction.normalize();
            let bullet = new Items.Bullet("bullet", new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction, 5, 0.5, 30);
            bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
            Game.graph.addChild(bullet);
        }
        collector() {
        }
        /**
         * adds Attributes to the Player Attributes
         * @param _attributes incoming attributes
         */
        addAttribuesByItem(_item) {
            switch (_item.type) {
                case Items.ITEMTYPE.ADD:
                    break; // calculate attributes by adding them
                case Items.ITEMTYPE.SUBSTRACT:
                    break; // calculate attribes by substacting them
                case Items.ITEMTYPE.PROCENTUAL:
                    break; // calculate attributes by giving spefic %
            }
        }
    }
    Player_1.Player = Player;
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
        roomType;
        coordinates; // X Y
        exits; // N E S W
        node = new ƒ.Node("Quad");
        mesh = new ƒ.MeshQuad;
        cmpMesh = new ƒ.ComponentMesh(this.mesh);
        startRoomMat = new ƒ.Material("startRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("red")));
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
            this.node.addComponent(new ƒ.ComponentTransform());
            this.node.addComponent(this.cmpMesh);
            this.node.addComponent(this.cmpMaterial);
            Game.graph.addChild(this.node);
            this.node.cmpTransform.mtxLocal.translation = new ƒ.Vector3(this.coordinates[0], this.coordinates[1], 0);
        }
    }
    Generation.Room = Room;
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
            console.log(room.coordinates + " " + room.exits + " " + room.roomType.toString());
        });
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
        Tag[Tag["WALL"] = 4] = "WALL";
    })(Tag = Tag_1.Tag || (Tag_1.Tag = {}));
})(Tag || (Tag = {}));
var UI;
(function (UI) {
    //let divUI: HTMLDivElement = <HTMLDivElement>document.getElementById("UI");
    let player1UI = document.getElementById("Player1");
    let player2UI = document.getElementById("Player2");
    function updateUI() {
        //Player1 UI
        player1UI.querySelector("#HP").style.width = (Game.player.hero.attributes.healthPoints / Game.player.hero.attributes.maxhealthPoints * 100) + "%";
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
            player2UI.querySelector("#HP").style.width = (Game.player2.hero.attributes.healthPoints / Game.player2.hero.attributes.maxhealthPoints * 100) + "%";
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
})(UI || (UI = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL0NsYXNzZXMvTWFpbi50cyIsIi4uL0NsYXNzZXMvSW50ZXJmYWNlcy50cyIsIi4uL0NsYXNzZXMvSXRlbXMudHMiLCIuLi9DbGFzc2VzL0F0dHJpYnV0ZUl0ZW0udHMiLCIuLi9DbGFzc2VzL0F0dHJpYnV0ZXMudHMiLCIuLi9DbGFzc2VzL0J1bGxldC50cyIsIi4uL0NsYXNzZXMvQ2hhcmFjdGVyLnRzIiwiLi4vQ2xhc3Nlcy9FbmVteS50cyIsIi4uL0NsYXNzZXMvSW5wdXRTeXN0ZW0udHMiLCIuLi9DbGFzc2VzL0xhbmRzY2FwZS50cyIsIi4uL0NsYXNzZXMvTmV0d29ya2luZy50cyIsIi4uL0NsYXNzZXMvUGxheWVyLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tR2VuZXJhdGlvbi50cyIsIi4uL0NsYXNzZXMvVGFnLnRzIiwiLi4vQ2xhc3Nlcy9VSS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsbUJBQW1CO0FBQ25CLHdEQUF3RDtBQUN4RCxzREFBc0Q7QUFDdEQsc0JBQXNCO0FBRXRCLElBQVUsSUFBSSxDQTZJYjtBQWxKRCxtQkFBbUI7QUFDbkIsd0RBQXdEO0FBQ3hELHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFFdEIsV0FBVSxJQUFJO0lBQ0ksTUFBQyxHQUFHLFNBQVMsQ0FBQztJQUNkLFNBQUksR0FBRyxRQUFRLENBQUM7SUFFOUIsdUJBQXVCO0lBQ1osV0FBTSxHQUF5QyxRQUFRLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVGLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEMsMEJBQTBCO0lBRTFCLDJCQUEyQjtJQUNoQixhQUFRLEdBQWUsSUFBSSxLQUFBLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUN4QyxVQUFLLEdBQVcsSUFBSSxLQUFBLENBQUMsQ0FBQyxJQUFJ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O29CQUM5RCxPQUFPLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7b0JBQzdCLFNBQVMsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUM5RDtZQUNMLENBQUMsQ0FBQyxDQUFDO1NBQ047SUFDTCxDQUFDO0lBL0NlLFdBQVEsV0ErQ3ZCLENBQUE7QUFDTCxDQUFDLEVBckRTLEVBQUUsS0FBRixFQUFFLFFBcURYIiwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIFwiSW1wb3J0c1wiXHJcbi8vLzxyZWZlcmVuY2UgdHlwZXM9XCIuLi9GVURHRS9Db3JlL0J1aWxkL0Z1ZGdlQ29yZS5qc1wiLz5cclxuLy8vPHJlZmVyZW5jZSB0eXBlcz1cIi4uL0ZVREdFL0FpZC9CdWlsZC9GdWRnZUFpZC5qc1wiLz5cclxuLy8jZW5kcmVnaW9uIFwiSW1wb3J0c1wiXHJcblxyXG5uYW1lc3BhY2UgR2FtZSB7XHJcbiAgICBleHBvcnQgaW1wb3J0IMaSID0gRnVkZ2VDb3JlO1xyXG4gICAgZXhwb3J0IGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG5cclxuICAgIC8vI3JlZ2lvbiBcIkRvbUVsZW1lbnRzXCJcclxuICAgIGV4cG9ydCBsZXQgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCA9IDxIVE1MQ2FudmFzRWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNhbnZhc1wiKTtcclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBpbml0KTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcIkRvbUVsZW1lbnRzXCJcclxuXHJcbiAgICAvLyNyZWdpb24gXCJQdWJsaWNWYXJpYWJsZXNcIlxyXG4gICAgZXhwb3J0IGxldCB2aWV3cG9ydDogxpIuVmlld3BvcnQgPSBuZXcgxpIuVmlld3BvcnQoKTtcclxuICAgIGV4cG9ydCBsZXQgZ3JhcGg6IMaSLk5vZGUgPSBuZXcgxpIuTm9kZShcIkdyYXBoXCIpO1xyXG4gICAgZXhwb3J0IGxldCBwbGF5ZXI6IFBsYXllci5QbGF5ZXI7XHJcbiAgICBleHBvcnQgbGV0IHBsYXllcjI6IFBsYXllci5QbGF5ZXI7XHJcbiAgICBleHBvcnQgbGV0IGNvbm5lY3RlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgZXhwb3J0IGxldCBmcmFtZVJhdGU6IG51bWJlciA9IDYwO1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiUHVibGljVmFyaWFibGVzXCJcclxuXHJcbiAgICAvLyNyZWdpb24gXCJQcml2YXRlVmFyaWFibGVzXCJcclxuICAgIGxldCBpdGVtMTogSXRlbXMuSXRlbTtcclxuICAgIGxldCBjbXBDYW1lcmE6IMaSLkNvbXBvbmVudENhbWVyYSA9IG5ldyDGki5Db21wb25lbnRDYW1lcmEoKTtcclxuICAgIGNvbnN0IGRhbXBlcjogbnVtYmVyID0gMy41O1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiUHJpdmF0ZVZhcmlhYmxlc1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiZXNzZW50aWFsXCJcclxuICAgIGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICAgICAgcGxheWVyID0gbmV3IFBsYXllci5QbGF5ZXIoXCJQbGF5ZXIxXCIsIG5ldyBQbGF5ZXIuQ2hhcmFjdGVyKFwiVGhvcixcIiwgbmV3IFBsYXllci5BdHRyaWJ1dGVzKDEwLCA1LCA1KSkpO1xyXG4gICAgICAgIMaSLkRlYnVnLmxvZyhwbGF5ZXIpO1xyXG5cclxuICAgICAgICAvLyNyZWdpb24gaW5pdCBJdGVtc1xyXG4gICAgICAgIGl0ZW0xID0gbmV3IEl0ZW1zLkl0ZW0oXCJJdGVtMVwiLCBcIlwiLCBuZXcgxpIuVmVjdG9yMygwLCA1LCAwKSwgXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtc1wiKTtcclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgR2VuZXJhdGlvbi5nZW5lcmF0ZVJvb21zKCk7XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBUZXN0aW5nIG9iamVjdHNcclxuICAgICAgICBsZXQgbm9kZTogxpIuTm9kZSA9IG5ldyDGki5Ob2RlKFwiUXVhZFwiKTtcclxuXHJcbiAgICAgICAgbm9kZS5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuXHJcbiAgICAgICAgbGV0IG1lc2g6IMaSLk1lc2hRdWFkID0gbmV3IMaSLk1lc2hRdWFkKCk7XHJcbiAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICBub2RlLmFkZENvbXBvbmVudChjbXBNZXNoKTtcclxuXHJcbiAgICAgICAgbGV0IG10clNvbGlkV2hpdGU6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiU29saWRXaGl0ZVwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgbm9kZS5hZGRDb21wb25lbnQoY21wTWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICBsZXQgbmV3VHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICAgICAgbGV0IG5ld0NvYXQ6IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCA9IG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoKTtcclxuICAgICAgICBsZXQgb2xkQ29tQ29hdDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuICAgICAgICBsZXQgbmV3TXRyOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm10clwiLCDGki5TaGFkZXJGbGF0VGV4dHVyZWQsIG5ld0NvYXQpO1xyXG4gICAgICAgIGxldCBvbGRQaXZvdDogxpIuTWF0cml4NHg0ID0gbmV3IMaSLk1hdHJpeDR4NCgpO1xyXG5cclxuICAgICAgICBvbGRDb21Db2F0ID0gbm9kZS5nZXRDb21wb25lbnQoxpIuQ29tcG9uZW50TWF0ZXJpYWwpO1xyXG4gICAgICAgIG9sZFBpdm90ID0gbm9kZS5nZXRDb21wb25lbnQoxpIuQ29tcG9uZW50TWVzaCkubXR4UGl2b3Q7XHJcblxyXG4gICAgICAgIGF3YWl0IG5ld1R4dC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvZ3Jhcy5wbmdcIik7XHJcbiAgICAgICAgbmV3Q29hdC5jb2xvciA9IMaSLkNvbG9yLkNTUyhcIldISVRFXCIpO1xyXG4gICAgICAgIG5ld0NvYXQudGV4dHVyZSA9IG5ld1R4dDtcclxuICAgICAgICBvbGRDb21Db2F0Lm1hdGVyaWFsID0gbmV3TXRyO1xyXG5cclxuICAgICAgICBub2RlLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMygzMCwgMzAsIDEpKTtcclxuICAgICAgICBub2RlLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGVaKC0wLjAxKTtcclxuXHJcbiAgICAgICAgZ3JhcGguYWRkQ2hpbGQobm9kZSk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcclxuICAgICAgICAgICAgZ3JhcGguYWRkQ2hpbGQobmV3IEVuZW15LkVuZW15KFwiRW5lbXlcIiwgbmV3IFBsYXllci5DaGFyYWN0ZXIoXCJiYXRcIiwgbmV3IFBsYXllci5BdHRyaWJ1dGVzKDEwLCA1LCBNYXRoLnJhbmRvbSgpICogMyArIDEpKSwgbmV3IMaSLlZlY3RvcjIoaSAqIDAuMywgNSkpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuICAgICAgICBncmFwaC5hcHBlbmRDaGlsZChwbGF5ZXIpO1xyXG4gICAgICAgIGdyYXBoLmFwcGVuZENoaWxkKGl0ZW0xKTtcclxuXHJcblxyXG4gICAgICAgIMaSQWlkLmFkZFN0YW5kYXJkTGlnaHRDb21wb25lbnRzKGdyYXBoKTtcclxuXHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0ZVooMjUpO1xyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC5yb3RhdGVZKDE4MCk7XHJcblxyXG4gICAgICAgIMaSLkRlYnVnLmxvZyhncmFwaCk7XHJcblxyXG4gICAgICAgIHZpZXdwb3J0LmluaXRpYWxpemUoXCJWaWV3cG9ydFwiLCBncmFwaCwgY21wQ2FtZXJhLCBjYW52YXMpO1xyXG5cclxuICAgICAgICBkcmF3KCk7XHJcblxyXG4gICAgICAgIMaSLkxvb3Auc3RhcnQoxpIuTE9PUF9NT0RFLlRJTUVfR0FNRSwgZnJhbWVSYXRlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB3YWl0T25Db25uZWN0aW9uKCkge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudCAhPSB1bmRlZmluZWQgJiYgTmV0d29ya2luZy5jbGllbnQuaWQgIT0gbnVsbCB8fCB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDb25uZWN0aW9uR1VJXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICBpbml0KCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCh3YWl0T25Db25uZWN0aW9uLCAzMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmF3KCk6IHZvaWQge1xyXG4gICAgICAgIHZpZXdwb3J0LmRyYXcoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgSW5wdXRTeXN0ZW0ubW92ZSgpO1xyXG5cclxuICAgICAgICBkcmF3KCk7XHJcblxyXG4gICAgICAgIGNhbWVyYVVwZGF0ZSgpO1xyXG5cclxuICAgICAgICAvLyNyZWdpb24gY291bnQgaXRlbXNcclxuICAgICAgICBsZXQgaXRlbXM6IEl0ZW1zLkl0ZW1bXSA9IDxJdGVtcy5JdGVtW10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEl0ZW1zLkl0ZW0+ZWxlbWVudCkudGFnID09IFRhZy5UYWcuSVRFTSlcclxuICAgICAgICBpdGVtcy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICBlbGVtZW50LmxpZmVzcGFuKGdyYXBoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgbGV0IGJ1bGxldHM6IEl0ZW1zLkJ1bGxldFtdID0gPEl0ZW1zLkJ1bGxldFtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxJdGVtcy5CdWxsZXQ+ZWxlbWVudCkudGFnID09IFRhZy5UYWcuQlVMTEVUKVxyXG4gICAgICAgIGJ1bGxldHMuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgZWxlbWVudC5tb3ZlKCk7XHJcbiAgICAgICAgICAgIGVsZW1lbnQubGlmZXNwYW4oZ3JhcGgpO1xyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGxldCBlbmVteXM6IEVuZW15LkVuZW15W10gPSA8RW5lbXkuRW5lbXlbXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkudGFnID09IFRhZy5UYWcuRU5FTVkpXHJcbiAgICAgICAgZW5lbXlzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZSgpO1xyXG4gICAgICAgICAgICBlbGVtZW50LmxpZmVzcGFuKGdyYXBoKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBVSS51cGRhdGVVSSgpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjYW1lcmFVcGRhdGUoKSB7XHJcbiAgICAgICAgbGV0IGRpcmVjdGlvbiA9IMaSLlZlY3RvcjIuRElGRkVSRU5DRShwbGF5ZXIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgIGRpcmVjdGlvbi5zY2FsZSgxIC8gZnJhbWVSYXRlICogZGFtcGVyKTtcclxuICAgICAgICBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRlKG5ldyDGki5WZWN0b3IzKC1kaXJlY3Rpb24ueCwgZGlyZWN0aW9uLnksIDApLCB0cnVlKTtcclxuICAgIH1cclxuXHJcbiAgICDGki5Mb29wLmFkZEV2ZW50TGlzdGVuZXIoxpIuRVZFTlQuTE9PUF9GUkFNRSwgdXBkYXRlKTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcImVzc2VudGlhbFwiXHJcblxyXG59XHJcbiIsIm5hbWVzcGFjZSBJbnRlcmZhY2VzIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSVNwYXduYWJsZSB7XHJcbiAgICAgICAgbGlmZXRpbWU/OiBudW1iZXI7XHJcbiAgICAgICAgbGlmZXNwYW4oX2E6IMaSLk5vZGUpOiB2b2lkO1xyXG4gICAgfVxyXG59XHJcblxyXG5uYW1lc3BhY2UgUGxheWVyIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUtpbGxhYmxlIHtcclxuICAgICAgICBvbkRlYXRoKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRGFtYWdibGUge1xyXG4gICAgICAgIGdldERhbWFnZSgpOiB2b2lkO1xyXG4gICAgfVxyXG59XHJcbiIsIm5hbWVzcGFjZSBJdGVtcyB7XHJcbiAgICBleHBvcnQgY2xhc3MgSXRlbSBleHRlbmRzIEdhbWUuxpJBaWQuTm9kZVNwcml0ZSBpbXBsZW1lbnRzIEludGVyZmFjZXMuSVNwYXduYWJsZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRhZyA9IFRhZy5UYWcuSVRFTTtcclxuICAgICAgICBwdWJsaWMgZGVzY3JpcHRpb246IHN0cmluZztcclxuICAgICAgICBwdWJsaWMgaW1nU3JjOiBzdHJpbmc7XHJcbiAgICAgICAgbGlmZXRpbWU6IG51bWJlcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX2Rlc2NyaXB0aW9uOiBzdHJpbmcsIF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2ltZ1NyYzogc3RyaW5nLCBfbGlmZXRpbWU/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmRlc2NyaXB0aW9uID0gX2Rlc2NyaXB0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLmltZ1NyYyA9IF9pbWdTcmM7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSBfbGlmZXRpbWU7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfcG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGxpZmVzcGFuKF9ncmFwaDogxpIuTm9kZSk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA+PSAwICYmIHRoaXMubGlmZXRpbWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saWZldGltZS0tO1xyXG4gICAgICAgICAgICAgICAgxpIuRGVidWcubG9nKHRoaXMubmFtZSArIFwiOiBcIiArIHRoaXMubGlmZXRpbWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2dyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEl0ZW1zIHtcclxuXHJcbiAgICBleHBvcnQgZW51bSBJVEVNVFlQRSB7XHJcbiAgICAgICAgQURELFxyXG4gICAgICAgIFNVQlNUUkFDVCxcclxuICAgICAgICBQUk9DRU5UVUFMXHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgQXR0cmlidXRlSXRlbSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgICAgIHB1YmxpYyB0eXBlOiBJVEVNVFlQRTtcclxuICAgICAgICBwdWJsaWMgYXR0cmlidXRlczogUGxheWVyLkF0dHJpYnV0ZXM7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ3JlYXRlcyBhbiBpdGVtIHRoYXQgY2FuIGNoYW5nZSBBdHRyaWJ1dGVzIG9mIHRoZSBwbGF5ZXJcclxuICAgICAgICAgKiBAcGFyYW0gX25hbWUgbmFtZSBvZiB0aGUgSXRlbVxyXG4gICAgICAgICAqIEBwYXJhbSBfZGVzY3JpcHRpb24gRGVzY2lycHRpb24gb2YgdGhlIGl0ZW1cclxuICAgICAgICAgKiBAcGFyYW0gX3Bvc2l0aW9uIFBvc2l0aW9uIHdoZXJlIHRvIHNwYXduXHJcbiAgICAgICAgICogQHBhcmFtIF9saWZldGltZSBvcHRpb25hbDogaG93IGxvbmcgaXMgdGhlIGl0ZW0gdmlzaWJsZVxyXG4gICAgICAgICAqIEBwYXJhbSBfYXR0cmlidXRlcyBkZWZpbmUgd2hpY2ggYXR0cmlidXRlcyB3aWxsIGNoYW5nZSwgY29tcGFyZSB3aXRoIHtAbGluayBQbGF5ZXIuQXR0cmlidXRlc31cclxuICAgICAgICAgKi9cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfZGVzY3JpcHRpb246IHN0cmluZywgX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfaW1nU3JjOiBzdHJpbmcsIF9saWZldGltZTogbnVtYmVyLCBfYXR0cmlidXRlczogUGxheWVyLkF0dHJpYnV0ZXMsIF90eXBlOiBJVEVNVFlQRSkge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSwgX2Rlc2NyaXB0aW9uLCBfcG9zaXRpb24sIF9pbWdTcmMsIF9saWZldGltZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IF9hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICB0aGlzLnR5cGUgPSBfdHlwZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgUGxheWVyIHtcclxuICAgIGV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVzIHtcclxuXHJcbiAgICAgICAgcHVibGljIGhlYWx0aFBvaW50czogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBtYXhoZWFsdGhQb2ludHM6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgc3BlZWQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgYXR0YWNrUG9pbnRzOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9oZWFsdGhQb2ludHM6IG51bWJlciwgX2F0dGFja1BvaW50czogbnVtYmVyLCBfc3BlZWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLmhlYWx0aFBvaW50cyA9IF9oZWFsdGhQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMubWF4aGVhbHRoUG9pbnRzID0gX2hlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgdGhpcy5hdHRhY2tQb2ludHMgPSBfYXR0YWNrUG9pbnRzO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gX3NwZWVkO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBJdGVtcyB7XHJcbiAgICBleHBvcnQgY2xhc3MgQnVsbGV0IGV4dGVuZHMgR2FtZS7GkkFpZC5Ob2RlU3ByaXRlIGltcGxlbWVudHMgSW50ZXJmYWNlcy5JU3Bhd25hYmxlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVGFnID0gVGFnLlRhZy5CVUxMRVQ7XHJcbiAgICAgICAgcHVibGljIGhpdFBvaW50czogbnVtYmVyXHJcbiAgICAgICAgcHVibGljIGZseURpcmVjdGlvbjogxpIuVmVjdG9yMztcclxuICAgICAgICBwdWJsaWMgc3BlZWQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlO1xyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXI7XHJcblxyXG4gICAgICAgIHByaXZhdGUga2lsbGNvdW50OiBudW1iZXIgPSAxO1xyXG5cclxuICAgICAgICBhc3luYyBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPj0gMCAmJiB0aGlzLmxpZmV0aW1lICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUtLTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfYXR0YWNrUG9pbnRzOiBudW1iZXIsIF9saWZldGltZTogbnVtYmVyLCBfc3BlZWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSlcclxuICAgICAgICAgICAgdGhpcy5oaXRQb2ludHMgPSBfYXR0YWNrUG9pbnRzO1xyXG4gICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gX2xpZmV0aW1lICogR2FtZS5mcmFtZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDApO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gX3NwZWVkO1xyXG4gICAgICAgICAgICB0aGlzLmZseURpcmVjdGlvbiA9IF9kaXJlY3Rpb247XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBtb3ZlKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUodGhpcy5mbHlEaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaXNpb25EZXRlY3Rpb24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIGNvbGxpc2lvbkRldGVjdGlvbigpIHtcclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyczogYW55W10gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxhbnk+ZWxlbWVudCkuY29sbGlkZXIgIT0gdW5kZWZpbmVkKTtcclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQuY29sbGlkZXIpICYmIGVsZW1lbnQucHJvcGVydGllcyAhPSB1bmRlZmluZWQgJiYgdGhpcy5raWxsY291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgKDxFbmVteS5FbmVteT5lbGVtZW50KS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC09IHRoaXMuaGl0UG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMua2lsbGNvdW50LS07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFBsYXllciB7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIENoYXJhY3RlciB7XHJcbiAgICAgICAgcHVibGljIG5hbWU6IHN0cmluZztcclxuICAgICAgICBwdWJsaWMgYXR0cmlidXRlczogQXR0cmlidXRlcztcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBhdHRyaWJ1dGVzOiBBdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IGF0dHJpYnV0ZXM7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEVuZW15IHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXkgZXh0ZW5kcyBHYW1lLsaSQWlkLk5vZGVTcHJpdGUgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklTcGF3bmFibGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UYWcgPSBUYWcuVGFnLkVORU1ZO1xyXG4gICAgICAgIHB1YmxpYyBwcm9wZXJ0aWVzOiBQbGF5ZXIuQ2hhcmFjdGVyO1xyXG4gICAgICAgIHB1YmxpYyBzbWFydDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIHB1YmxpYyB0YXJnZXQ6IFBsYXllci5QbGF5ZXI7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBHYW1lLsaSLlJlY3RhbmdsZTtcclxuICAgICAgICBsaWZldGltZTogbnVtYmVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3RlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5wcm9wZXJ0aWVzID0gX3Byb3BlcnRpZXM7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgMCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBtb3ZlKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IEdhbWUucGxheWVyO1xyXG5cclxuICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZGlzdGFuY2VQbGF5ZXIxID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24uZ2V0RGlzdGFuY2UoR2FtZS5wbGF5ZXIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjIgPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZShHYW1lLnBsYXllcjIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZGlzdGFuY2VQbGF5ZXIxIDwgZGlzdGFuY2VQbGF5ZXIyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBHYW1lLnBsYXllcjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBHYW1lLnBsYXllcjI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNtYXJ0KSB7XHJcblxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlU2ltcGxlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgbW92ZVNpbXBsZSgpIHtcclxuICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZSgoMSAvIEdhbWUuZnJhbWVSYXRlICogdGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKGRpcmVjdGlvbiwgdHJ1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBtb3ZlQXdheSgpIHtcclxuICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMudGFyZ2V0LmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZSgoMSAvIEdhbWUuZnJhbWVSYXRlICogdGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKGRpcmVjdGlvbiwgdHJ1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBsaWZlc3BhbihfZ3JhcGg6IEdhbWUuxpIuTm9kZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIF9ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBJbnB1dFN5c3RlbSB7XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwga2V5Ym9hcmREb3duRXZlbnQpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGtleWJvYXJkVXBFdmVudCk7XHJcbiAgICBHYW1lLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGF0dGFjayk7XHJcbiAgICBHYW1lLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIHJvdGF0ZVRvTW91c2UpO1xyXG5cclxuICAgIC8vI3JlZ2lvbiByb3RhdGVcclxuICAgIGxldCBtb3VzZVBvc2l0aW9uOiDGki5WZWN0b3IzO1xyXG5cclxuICAgIGZ1bmN0aW9uIHJvdGF0ZVRvTW91c2UoX21vdXNlRXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcclxuICAgICAgICBsZXQgcmF5OiDGki5SYXkgPSBHYW1lLnZpZXdwb3J0LmdldFJheUZyb21DbGllbnQobmV3IMaSLlZlY3RvcjIoX21vdXNlRXZlbnQub2Zmc2V0WCwgX21vdXNlRXZlbnQub2Zmc2V0WSkpO1xyXG4gICAgICAgIG1vdXNlUG9zaXRpb24gPSByYXkuaW50ZXJzZWN0UGxhbmUobmV3IMaSLlZlY3RvcjMoMCwgMCwgMCksIG5ldyDGki5WZWN0b3IzKDAsIDAsIDEpKTtcclxuXHJcbiAgICAgICAgxpIuRGVidWcubG9nKG1vdXNlUG9zaXRpb24pO1xyXG5cclxuICAgICAgICBHYW1lLnBsYXllci5tdHhMb2NhbC5yb3RhdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIDAsIGNhbGNEZWdyZWUoR2FtZS5wbGF5ZXIubXR4TG9jYWwudHJhbnNsYXRpb24sIG1vdXNlUG9zaXRpb24pKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYWxjRGVncmVlKF9jZW50ZXI6IMaSLlZlY3RvcjMsIF90YXJnZXQ6IMaSLlZlY3RvcjMpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCB4RGlzdGFuY2U6IG51bWJlciA9IF90YXJnZXQueCAtIF9jZW50ZXIueDtcclxuICAgICAgICBsZXQgeURpc3RhbmNlOiBudW1iZXIgPSBfdGFyZ2V0LnkgLSBfY2VudGVyLnk7XHJcbiAgICAgICAgbGV0IGRlZ3JlZXM6IG51bWJlciA9IE1hdGguYXRhbjIoeURpc3RhbmNlLCB4RGlzdGFuY2UpICogKDE4MCAvIE1hdGguUEkpIC0gOTA7XHJcbiAgICAgICAgcmV0dXJuIGRlZ3JlZXM7XHJcblxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIG1vdmVcclxuICAgIGxldCBjb250cm9sbGVyID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KFtcclxuICAgICAgICBbXCJXXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJBXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJTXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJEXCIsIGZhbHNlXVxyXG4gICAgXSk7XHJcblxyXG4gICAgZnVuY3Rpb24ga2V5Ym9hcmREb3duRXZlbnQoX2U6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBsZXQga2V5OiBzdHJpbmcgPSBfZS5jb2RlLnRvVXBwZXJDYXNlKCkuc3Vic3RyaW5nKDMpO1xyXG4gICAgICAgIGNvbnRyb2xsZXIuc2V0KGtleSwgdHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24ga2V5Ym9hcmRVcEV2ZW50KF9lOiBLZXlib2FyZEV2ZW50KSB7XHJcbiAgICAgICAgbGV0IGtleTogc3RyaW5nID0gX2UuY29kZS50b1VwcGVyQ2FzZSgpLnN1YnN0cmluZygzKTtcclxuICAgICAgICBjb250cm9sbGVyLnNldChrZXksIGZhbHNlKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbW92ZSgpIHtcclxuICAgICAgICBsZXQgbW92ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICBsZXQgaGFzQ2hhbmdlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJXXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueSArPSAxO1xyXG4gICAgICAgICAgICBoYXNDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiQVwiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnggLT0gMTtcclxuICAgICAgICAgICAgaGFzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIlNcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci55IC09IDE7XHJcbiAgICAgICAgICAgIGhhc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJEXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueCArPSAxO1xyXG4gICAgICAgICAgICBoYXNDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChoYXNDaGFuZ2VkICYmIG1vdmVWZWN0b3IubWFnbml0dWRlICE9IDApIHtcclxuICAgICAgICAgICAgR2FtZS5wbGF5ZXIubW92ZShHYW1lLsaSLlZlY3RvcjMuTk9STUFMSVpBVElPTihtb3ZlVmVjdG9yLCAxKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZVBvc2l0aW9uKEdhbWUucGxheWVyLm10eExvY2FsLnRyYW5zbGF0aW9uLCBHYW1lLnBsYXllci5tdHhMb2NhbC5yb3RhdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIGF0dGFja1xyXG4gICAgZnVuY3Rpb24gYXR0YWNrKGVfOiBNb3VzZUV2ZW50KSB7XHJcblxyXG4gICAgICAgIGxldCBtb3VzZUJ1dHRvbiA9IGVfLmJ1dHRvbjtcclxuXHJcbiAgICAgICAgc3dpdGNoIChtb3VzZUJ1dHRvbikge1xyXG4gICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICAvL2xlZnQgbW91c2UgYnV0dG9uIHBsYXllci5hdHRhY2tcclxuICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRShtb3VzZVBvc2l0aW9uLCBHYW1lLnBsYXllci5tdHhMb2NhbC50cmFuc2xhdGlvbilcclxuICAgICAgICAgICAgICAgIEdhbWUucGxheWVyLmF0dGFjayhkaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVCdWxsZXQoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAvL1RPRE86IHJpZ2h0IG1vdXNlIGJ1dHRvbiBwbGF5ZXIuY2hhcmdlIG9yIHNvbWV0aGluZyBsaWtlIHRoYXRcclxuXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxufSIsIm5hbWVzcGFjZSBMZXZlbCB7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIExhbmRzY2FwZSBleHRlbmRzIMaSLk5vZGV7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZykge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSk7XHJcblxyXG4gICAgICAgICAgICAvLyB0aGlzLmdldENoaWxkcmVuKClbMF0uZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50VHJhbnNmb3JtKS5tdHhMb2NhbC50cmFuc2xhdGVaKC0yKVxyXG5cclxuICAgICAgICAgICAgY29uc29sZS5sb2coKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59IiwiLy8vPHJlZmVyZW5jZSBwYXRoPVwiLi4vRlVER0UvTmV0L0J1aWxkL0NsaWVudC9GdWRnZUNsaWVudC5kLnRzXCIvPlxyXG5cclxubmFtZXNwYWNlIE5ldHdvcmtpbmcge1xyXG4gICAgZXhwb3J0IGVudW0gRlVOQ1RJT04ge1xyXG4gICAgICAgIFNQQVdOLFxyXG4gICAgICAgIFRSQU5TRk9STSxcclxuICAgICAgICBCVUxMRVRcclxuICAgIH1cclxuXHJcbiAgICBpbXBvcnQgxpJDbGllbnQgPSBGdWRnZU5ldC5GdWRnZUNsaWVudDtcclxuXHJcbiAgICBleHBvcnQgbGV0IGNsaWVudDogxpJDbGllbnQ7XHJcbiAgICBleHBvcnQgbGV0IHBvc1VwZGF0ZTogxpIuVmVjdG9yMztcclxuXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGhvc3RTZXJ2ZXIsIHRydWUpO1xyXG4gICAgbGV0IElQQ29ubmVjdGlvbiA9IDxIVE1MSW5wdXRFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSVBDb25uZWN0aW9uXCIpO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDb25uZWN0aW5nXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjb25uZXRpbmcsIHRydWUpO1xyXG5cclxuICAgIGZ1bmN0aW9uIGhvc3RTZXJ2ZXIoKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV04sIHZhbHVlOiBHYW1lLnBsYXllci5oZXJvLCBwb3NpdGlvbjogR2FtZS5wbGF5ZXIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uIH0gfSlcclxuICAgICAgICBHYW1lLmNvbm5lY3RlZCA9IHRydWU7XHJcbiAgICAgICAgxpIuRGVidWcubG9nKFwiQ29ubmVjdGVkIHRvIFNlcnZlclwiKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb25uZXRpbmcoKSB7XHJcbiAgICAgICAgY2xpZW50ID0gbmV3IMaSQ2xpZW50KCk7XHJcbiAgICAgICAgY2xpZW50LmFkZEV2ZW50TGlzdGVuZXIoRnVkZ2VOZXQuRVZFTlQuTUVTU0FHRV9SRUNFSVZFRCwgcmVjZWl2ZU1lc3NhZ2UpO1xyXG4gICAgICAgIGNsaWVudC5jb25uZWN0VG9TZXJ2ZXIoSVBDb25uZWN0aW9uLnZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiByZWNlaXZlTWVzc2FnZShfZXZlbnQ6IEN1c3RvbUV2ZW50IHwgTWVzc2FnZUV2ZW50IHwgRXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBpZiAoX2V2ZW50IGluc3RhbmNlb2YgTWVzc2FnZUV2ZW50KSB7XHJcbiAgICAgICAgICAgIGxldCBtZXNzYWdlOiBGdWRnZU5ldC5NZXNzYWdlID0gSlNPTi5wYXJzZShfZXZlbnQuZGF0YSk7XHJcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlkU291cmNlICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29tbWFuZCAhPSBGdWRnZU5ldC5DT01NQU5ELlNFUlZFUl9IRUFSVEJFQVQgJiYgbWVzc2FnZS5jb21tYW5kICE9IEZ1ZGdlTmV0LkNPTU1BTkQuQ0xJRU5UX0hFQVJUQkVBVCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdOLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWVzc2FnZS5jb250ZW50LnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5wbGF5ZXIyID0gbmV3IFBsYXllci5QbGF5ZXIoXCJwbGF5ZXIyXCIsIG5ldyBQbGF5ZXIuQ2hhcmFjdGVyKFwiVGhvcmlhblwiLCBuZXcgUGxheWVyLkF0dHJpYnV0ZXMoMTAwLCAxMCwgNSkpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5wbGF5ZXIyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hcHBlbmRDaGlsZChHYW1lLnBsYXllcjIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5UUkFOU0ZPUk0udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbW92ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhWzJdKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcm90YXRlVmVjdG9yOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMl0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUucGxheWVyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG1vdmVWZWN0b3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUucGxheWVyMi5tdHhMb2NhbC5yb3RhdGlvbiA9IHJvdGF0ZVZlY3RvcjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQlVMTEVULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5wbGF5ZXIyLmF0dGFjayhuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24uZGF0YVswXSxtZXNzYWdlLmNvbnRlbnQuZGlyZWN0aW9uLmRhdGFbMV0sbWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbi5kYXRhWzJdKSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIHNlbmRzIHRyYW5zZm9ybSBvdmVyIG5ldHdvcmtcclxuICAgICAqIEBwYXJhbSBfX3Bvc2l0aW9uIGN1cnJlbnQgcG9zaXRpb24gb2YgT2JqZWN0XHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVQb3NpdGlvbihfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9yb3RhdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlRSQU5TRk9STSwgdmFsdWU6IF9wb3NpdGlvbiwgcm90YXRpb246IF9yb3RhdGlvbiB9IH0pXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUJ1bGxldChfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkJVTExFVCwgZGlyZWN0aW9uOiBfZGlyZWN0aW9uIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJiZWZvcmV1bmxvYWRcIiwgb25VbmxvYWQsIGZhbHNlKTtcclxuXHJcbiAgICBmdW5jdGlvbiBvblVubG9hZCgpIHtcclxuICAgICAgICAvL1RPRE86IFRoaW5ncyB3ZSBkbyBhZnRlciB0aGUgcGxheWVyIGxlZnQgdGhlIGdhbWVcclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBQbGF5ZXIge1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBQbGF5ZXIgZXh0ZW5kcyBHYW1lLsaSQWlkLk5vZGVTcHJpdGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UYWcgPSBUYWcuVGFnLlBMQVlFUjtcclxuICAgICAgICBwdWJsaWMgaXRlbXM6IEFycmF5PEl0ZW1zLkl0ZW0+ID0gW107XHJcbiAgICAgICAgcHVibGljIGhlcm86IENoYXJhY3RlcjtcclxuICAgICAgICByZWN0MTogxpIuUmVjdGFuZ2xlO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogQ2hhcmFjdGVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5oZXJvID0gX3Byb3BlcnRpZXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUoKDEgLyA2MCAqIHRoaXMuaGVyby5hdHRyaWJ1dGVzLnNwZWVkKSlcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24sIGZhbHNlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBhdHRhY2soX2RpcmVjdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICBsZXQgYnVsbGV0OiBJdGVtcy5CdWxsZXQgPSBuZXcgSXRlbXMuQnVsbGV0KFwiYnVsbGV0XCIsIG5ldyDGki5WZWN0b3IyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpLCBfZGlyZWN0aW9uLCA1LCAwLjUsIDMwKTtcclxuICAgICAgICAgICAgYnVsbGV0LmZseURpcmVjdGlvbi5zY2FsZSgxIC8gR2FtZS5mcmFtZVJhdGUgKiBidWxsZXQuc3BlZWQpO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGJ1bGxldCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY29sbGVjdG9yKCkge1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogYWRkcyBBdHRyaWJ1dGVzIHRvIHRoZSBQbGF5ZXIgQXR0cmlidXRlc1xyXG4gICAgICAgICAqIEBwYXJhbSBfYXR0cmlidXRlcyBpbmNvbWluZyBhdHRyaWJ1dGVzXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGFkZEF0dHJpYnVlc0J5SXRlbShfaXRlbTogSXRlbXMuQXR0cmlidXRlSXRlbSk6IHZvaWQge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKF9pdGVtLnR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgSXRlbXMuSVRFTVRZUEUuQUREOlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBjYWxjdWxhdGUgYXR0cmlidXRlcyBieSBhZGRpbmcgdGhlbVxyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5JVEVNVFlQRS5TVUJTVFJBQ1Q6XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7IC8vIGNhbGN1bGF0ZSBhdHRyaWJlcyBieSBzdWJzdGFjdGluZyB0aGVtXHJcbiAgICAgICAgICAgICAgICBjYXNlIEl0ZW1zLklURU1UWVBFLlBST0NFTlRVQUw6XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7IC8vIGNhbGN1bGF0ZSBhdHRyaWJ1dGVzIGJ5IGdpdmluZyBzcGVmaWMgJVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG4gICAgZXhwb3J0IGVudW0gUk9PTVRZUEUge1xyXG4gICAgICAgIFNUQVJULFxyXG4gICAgICAgIE5PUk1BTCxcclxuICAgICAgICBNRVJDSEFOVCxcclxuICAgICAgICBUUkVBU1VSRSxcclxuICAgICAgICBDSEFMTEVOR0UsXHJcbiAgICAgICAgQk9TU1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBSb29tIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHJvb21UeXBlOiBST09NVFlQRVxyXG4gICAgICAgIHB1YmxpYyBjb29yZGluYXRlczogW251bWJlciwgbnVtYmVyXTsgLy8gWCBZXHJcbiAgICAgICAgZXhpdHM6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSAvLyBOIEUgUyBXXHJcbiAgICAgICAgbm9kZTogxpIuTm9kZSA9IG5ldyDGki5Ob2RlKFwiUXVhZFwiKTtcclxuICAgICAgICBtZXNoOiDGki5NZXNoUXVhZCA9IG5ldyDGki5NZXNoUXVhZDtcclxuICAgICAgICBjbXBNZXNoOiDGki5Db21wb25lbnRNZXNoID0gbmV3IMaSLkNvbXBvbmVudE1lc2godGhpcy5tZXNoKTtcclxuICAgICAgICBzdGFydFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwic3RhcnRSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInJlZFwiKSkpO1xyXG4gICAgICAgIG5vcm1hbFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibm9ybWFsUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgIG1lcmNoYW50Um9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtZXJjaGFudFJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiZ3JlZW5cIikpKTtcclxuICAgICAgICB0cmVhc3VyZVJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwidHJlYXN1cmVSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInllbGxvd1wiKSkpO1xyXG4gICAgICAgIGNoYWxsZW5nZVJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiY2hhbGxlbmdlUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJibHVlXCIpKSk7XHJcbiAgICAgICAgYm9zc1Jvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiYm9zc1Jvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiYmxhY2tcIikpKTtcclxuXHJcbiAgICAgICAgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfY29vcmRpYW50ZXM6IFtudW1iZXIsIG51bWJlcl0sIF9leGl0czogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dLCBfcm9vbVR5cGU6IFJPT01UWVBFKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5jb29yZGluYXRlcyA9IF9jb29yZGlhbnRlcztcclxuICAgICAgICAgICAgdGhpcy5leGl0cyA9IF9leGl0cztcclxuICAgICAgICAgICAgdGhpcy5yb29tVHlwZSA9IF9yb29tVHlwZTtcclxuICAgICAgICAgICAgc3dpdGNoIChfcm9vbVR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgUk9PTVRZUEUuU1RBUlQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLnN0YXJ0Um9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMubm9ybWFsUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLk1FUkNIQU5UOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wTWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwodGhpcy5tZXJjaGFudFJvb21NYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBST09NVFlQRS5UUkVBU1VSRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMudHJlYXN1cmVSb29tTWF0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgUk9PTVRZUEUuQ0hBTExFTkdFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wTWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwodGhpcy5jaGFsbGVuZ2VSb29tTWF0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgUk9PTVRZUEUuQk9TUzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMuYm9zc1Jvb21NYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLm5vZGUuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubm9kZS5hZGRDb21wb25lbnQodGhpcy5jbXBNZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5ub2RlLmFkZENvbXBvbmVudCh0aGlzLmNtcE1hdGVyaWFsKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZCh0aGlzLm5vZGUpO1xyXG4gICAgICAgICAgICB0aGlzLm5vZGUuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjModGhpcy5jb29yZGluYXRlc1swXSwgdGhpcy5jb29yZGluYXRlc1sxXSwgMCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG5cclxuICAgIGxldCBudW1iZXJPZlJvb21zOiBudW1iZXIgPSAzO1xyXG4gICAgbGV0IHVzZWRQb3NpdGlvbnM6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtdO1xyXG4gICAgbGV0IHJvb21zOiBSb29tW10gPSBbXTtcclxuXHJcbiAgICAvL3NwYXduIGNoYW5jZXNcclxuICAgIGxldCBjaGFsbGVuZ2VSb29tU3Bhd25DaGFuY2U6IG51bWJlciA9IDIwO1xyXG4gICAgbGV0IHRyZWFzdXJlUm9vbVNwYXduQ2hhbmNlOiBudW1iZXIgPSAxMDtcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVSb29tcygpOiB2b2lkIHtcclxuICAgICAgICBsZXQgc3RhcnRDb29yZHM6IFtudW1iZXIsIG51bWJlcl0gPSBbMCwgMF07XHJcblxyXG4gICAgICAgIHJvb21zLnB1c2gobmV3IFJvb20oXCJyb29tU3RhcnRcIiwgc3RhcnRDb29yZHMsIGNhbGNQYXRoRXhpdHMoc3RhcnRDb29yZHMpLCBHZW5lcmF0aW9uLlJPT01UWVBFLlNUQVJUKSlcclxuICAgICAgICB1c2VkUG9zaXRpb25zLnB1c2goc3RhcnRDb29yZHMpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgbnVtYmVyT2ZSb29tczsgaSsrKSB7XHJcbiAgICAgICAgICAgIGFkZFJvb20ocm9vbXNbcm9vbXMubGVuZ3RoIC0gMV0sIEdlbmVyYXRpb24uUk9PTVRZUEUuTk9STUFMKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYWRkUm9vbShyb29tc1tyb29tcy5sZW5ndGggLSAxXSwgR2VuZXJhdGlvbi5ST09NVFlQRS5CT1NTKTtcclxuICAgICAgICBhZGRTcGVjaWFsUm9vbXMoKTtcclxuICAgICAgICBhZGRSb29tKHJvb21zW3Jvb21zLmxlbmd0aCAtIDNdLCBHZW5lcmF0aW9uLlJPT01UWVBFLk1FUkNIQU5UKTtcclxuICAgICAgICByb29tcy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICByb29tLmV4aXRzID0gY2FsY1Jvb21Eb29ycyhyb29tLmNvb3JkaW5hdGVzKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cocm9vbS5jb29yZGluYXRlcyArIFwiIFwiICsgcm9vbS5leGl0cyArIFwiIFwiICsgcm9vbS5yb29tVHlwZS50b1N0cmluZygpKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZFJvb20oX2N1cnJlbnRSb29tOiBSb29tLCBfcm9vbVR5cGU6IEdlbmVyYXRpb24uUk9PTVRZUEUpOiB2b2lkIHtcclxuICAgICAgICBsZXQgbnVtYmVyT2ZFeGl0czogbnVtYmVyID0gY291bnRCb29sKF9jdXJyZW50Um9vbS5leGl0cyk7XHJcbiAgICAgICAgbGV0IHJhbmRvbU51bWJlcjogbnVtYmVyID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbnVtYmVyT2ZFeGl0cyk7XHJcbiAgICAgICAgbGV0IHBvc3NpYmxlRXhpdEluZGV4OiBudW1iZXJbXSA9IGdldEV4aXRJbmRleChfY3VycmVudFJvb20uZXhpdHMpO1xyXG4gICAgICAgIGxldCBuZXdSb29tUG9zaXRpb246IFtudW1iZXIsIG51bWJlcl07XHJcblxyXG4gICAgICAgIHN3aXRjaCAocG9zc2libGVFeGl0SW5kZXhbcmFuZG9tTnVtYmVyXSkge1xyXG4gICAgICAgICAgICBjYXNlIDA6IC8vIG5vcnRoXHJcbiAgICAgICAgICAgICAgICBuZXdSb29tUG9zaXRpb24gPSBbX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzBdLCBfY3VycmVudFJvb20uY29vcmRpbmF0ZXNbMV0gKyAxXTtcclxuICAgICAgICAgICAgICAgIHJvb21zLnB1c2gobmV3IFJvb20oXCJyb29tTm9ybWFsXCIsIChuZXdSb29tUG9zaXRpb24pLCBjYWxjUGF0aEV4aXRzKG5ld1Jvb21Qb3NpdGlvbiksIF9yb29tVHlwZSkpO1xyXG4gICAgICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5wdXNoKG5ld1Jvb21Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOiAvLyBlYXN0XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tUG9zaXRpb24gPSBbX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzBdICsgMSwgX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzFdXTtcclxuICAgICAgICAgICAgICAgIHJvb21zLnB1c2gobmV3IFJvb20oXCJyb29tTm9ybWFsXCIsIChuZXdSb29tUG9zaXRpb24pLCBjYWxjUGF0aEV4aXRzKG5ld1Jvb21Qb3NpdGlvbiksIF9yb29tVHlwZSkpO1xyXG4gICAgICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5wdXNoKG5ld1Jvb21Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOiAvLyBzb3V0aFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSwgX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzFdIC0gMV07XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ldyBSb29tKFwicm9vbU5vcm1hbFwiLCAobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpKTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMzogLy93ZXN0XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tUG9zaXRpb24gPSBbX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzBdIC0gMSwgX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzFdXTtcclxuICAgICAgICAgICAgICAgIHJvb21zLnB1c2gobmV3IFJvb20oXCJyb29tTm9ybWFsXCIsIChuZXdSb29tUG9zaXRpb24pLCBjYWxjUGF0aEV4aXRzKG5ld1Jvb21Qb3NpdGlvbiksIF9yb29tVHlwZSkpO1xyXG4gICAgICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5wdXNoKG5ld1Jvb21Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGRTcGVjaWFsUm9vbXMoKTogdm9pZCB7XHJcbiAgICAgICAgcm9vbXMuZm9yRWFjaChyb29tID0+IHtcclxuICAgICAgICAgICAgcm9vbS5leGl0cyA9IGNhbGNQYXRoRXhpdHMocm9vbS5jb29yZGluYXRlcyk7XHJcbiAgICAgICAgICAgIGlmIChpc1NwYXduaW5nKHRyZWFzdXJlUm9vbVNwYXduQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICAgICAgYWRkUm9vbShyb29tLCBHZW5lcmF0aW9uLlJPT01UWVBFLlRSRUFTVVJFKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoaXNTcGF3bmluZyhjaGFsbGVuZ2VSb29tU3Bhd25DaGFuY2UpKSB7XHJcbiAgICAgICAgICAgICAgICBhZGRSb29tKHJvb20sIEdlbmVyYXRpb24uUk9PTVRZUEUuQ0hBTExFTkdFKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaXNTcGF3bmluZyhfc3Bhd25DaGFuY2U6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCB4ID0gTWF0aC5yYW5kb20oKSAqIDEwMDtcclxuICAgICAgICBpZiAoeCA8IF9zcGF3bkNoYW5jZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBjb3VudEJvb2woX2Jvb2w6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IGNvdW50ZXI6IG51bWJlciA9IDA7XHJcbiAgICAgICAgX2Jvb2wuZm9yRWFjaChib29sID0+IHtcclxuICAgICAgICAgICAgaWYgKGJvb2wpIHtcclxuICAgICAgICAgICAgICAgIGNvdW50ZXIrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBjb3VudGVyO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdldEV4aXRJbmRleChfZXhpdHM6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSk6IG51bWJlcltdIHtcclxuICAgICAgICBsZXQgbnVtYmVyczogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF9leGl0cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoX2V4aXRzW2ldKSB7XHJcbiAgICAgICAgICAgICAgICBudW1iZXJzLnB1c2goaSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVtYmVycztcclxuXHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIGNhbGN1bGF0ZXMgcG9zc2libGUgZXhpdHMgZm9yIG5ldyByb29tc1xyXG4gICAgICogQHBhcmFtIF9wb3NpdGlvbiBwb3NpdGlvbiBvZiByb29tXHJcbiAgICAgKiBAcmV0dXJucyBib29sZWFuIGZvciBlYWNoIGRpcmVjdGlvbiBub3J0aCwgZWFzdCwgc291dGgsIHdlc3RcclxuICAgICAqL1xyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGNQYXRoRXhpdHMoX3Bvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdKTogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dIHtcclxuICAgICAgICBsZXQgbm9ydGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgZWFzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBzb3V0aDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCB3ZXN0OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IHJvb21OZWlnaGJvdXJzOiBbbnVtYmVyLCBudW1iZXJdW107XHJcbiAgICAgICAgcm9vbU5laWdoYm91cnMgPSBzbGljZU5laWdoYm91cnMoZ2V0TmVpZ2hib3VycyhfcG9zaXRpb24pKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJvb21OZWlnaGJvdXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChyb29tTmVpZ2hib3Vyc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgc291dGggPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyb29tTmVpZ2hib3Vyc1tpXVswXSAtIF9wb3NpdGlvblswXSA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgd2VzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJvb21OZWlnaGJvdXJzW2ldWzFdIC0gX3Bvc2l0aW9uWzFdID09IDEpIHtcclxuICAgICAgICAgICAgICAgIG5vcnRoID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocm9vbU5laWdoYm91cnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gMSkge1xyXG4gICAgICAgICAgICAgICAgZWFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFtub3J0aCwgZWFzdCwgc291dGgsIHdlc3RdO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGNSb29tRG9vcnMoX3Bvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdKTogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dIHtcclxuICAgICAgICBsZXQgbm9ydGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgZWFzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBzb3V0aDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCB3ZXN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdXNlZFBvc2l0aW9ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh1c2VkUG9zaXRpb25zW2ldWzBdIC0gX3Bvc2l0aW9uWzFdKTtcclxuICAgICAgICAgICAgaWYgKHVzZWRQb3NpdGlvbnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gLTEgJiYgdXNlZFBvc2l0aW9uc1tpXVswXSAtIF9wb3NpdGlvblswXSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBzb3V0aCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHVzZWRQb3NpdGlvbnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gLTEgJiYgdXNlZFBvc2l0aW9uc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB3ZXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodXNlZFBvc2l0aW9uc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAxICYmIHVzZWRQb3NpdGlvbnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgbm9ydGggPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh1c2VkUG9zaXRpb25zW2ldWzBdIC0gX3Bvc2l0aW9uWzBdID09IDEgJiYgdXNlZFBvc2l0aW9uc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBlYXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW25vcnRoLCBlYXN0LCBzb3V0aCwgd2VzdF07XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGdldE5laWdoYm91cnMoX3Bvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdKTogW251bWJlciwgbnVtYmVyXVtdIHtcclxuICAgICAgICBsZXQgbmVpZ2hib3VyczogW251bWJlciwgbnVtYmVyXVtdID0gW11cclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2goW19wb3NpdGlvblswXSwgX3Bvc2l0aW9uWzFdIC0gMV0pOyAvLyBkb3duXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKFtfcG9zaXRpb25bMF0gLSAxLCBfcG9zaXRpb25bMV1dKTsgLy8gbGVmdFxyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChbX3Bvc2l0aW9uWzBdLCBfcG9zaXRpb25bMV0gKyAxXSk7IC8vIHVwXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKFtfcG9zaXRpb25bMF0gKyAxLCBfcG9zaXRpb25bMV1dKTsgLy8gcmlnaHRcclxuICAgICAgICByZXR1cm4gbmVpZ2hib3VycztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzbGljZU5laWdoYm91cnMoX25laWdoYm91cnM6IFtudW1iZXIsIG51bWJlcl1bXSk6IFtudW1iZXIsIG51bWJlcl1bXSB7XHJcbiAgICAgICAgbGV0IG5laWdoYm91cnMgPSBfbmVpZ2hib3VycztcclxuICAgICAgICBsZXQgdG9SZW1vdmVJbmRleDogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5laWdoYm91cnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgLy8gY2hlY2sgaWNoIHBvc2l0aW9uIGFscmVhZHkgdXNlZFxyXG4gICAgICAgICAgICB1c2VkUG9zaXRpb25zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3Vyc1tpXVswXSA9PSByb29tWzBdICYmIG5laWdoYm91cnNbaV1bMV0gPT0gcm9vbVsxXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvUmVtb3ZlSW5kZXgucHVzaChpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGNvcHk6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtdO1xyXG4gICAgICAgIHRvUmVtb3ZlSW5kZXguZm9yRWFjaChpbmRleCA9PiB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBuZWlnaGJvdXJzW2luZGV4XTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBuZWlnaGJvdXJzLmZvckVhY2gobiA9PiB7XHJcbiAgICAgICAgICAgIGNvcHkucHVzaChuKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY29weTtcclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBUYWcge1xyXG4gICAgZXhwb3J0IGVudW0gVGFne1xyXG4gICAgICAgIFBMQVlFUixcclxuICAgICAgICBFTkVNWSxcclxuICAgICAgICBCVUxMRVQsXHJcbiAgICAgICAgSVRFTSxcclxuICAgICAgICBXQUxMXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgVUkge1xyXG4gICAgLy9sZXQgZGl2VUk6IEhUTUxEaXZFbGVtZW50ID0gPEhUTUxEaXZFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiVUlcIik7XHJcbiAgICBsZXQgcGxheWVyMVVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjFcIik7XHJcbiAgICBsZXQgcGxheWVyMlVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjJcIik7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVVJKCkge1xyXG4gICAgICAgIC8vUGxheWVyMSBVSVxyXG4gICAgICAgICg8SFRNTERpdkVsZW1lbnQ+cGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSFBcIikpLnN0eWxlLndpZHRoID0gKEdhbWUucGxheWVyLmhlcm8uYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLyBHYW1lLnBsYXllci5oZXJvLmF0dHJpYnV0ZXMubWF4aGVhbHRoUG9pbnRzICogMTAwKSArIFwiJVwiO1xyXG5cclxuICAgICAgICAvL1RPRE86IE5lZWRzIHRlc3RpbmdcclxuICAgICAgICAvL0ludmVudG9yeVVJXHJcbiAgICAgICAgR2FtZS5wbGF5ZXIuaXRlbXMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgZXhzaXN0OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgcGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbWdcIikuZm9yRWFjaCgoaW1nRWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGltZ0VsZW1lbnQuc3JjID09IGVsZW1lbnQuaW1nU3JjKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvL25vbmUgZXhzaXN0aW5nIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICBpZiAoIWV4c2lzdCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEhUTUxJbWFnZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgbmV3SXRlbS5zcmMgPSBlbGVtZW50LmltZ1NyYztcclxuICAgICAgICAgICAgICAgIHBsYXllcjFVSS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5hcHBlbmRDaGlsZChuZXdJdGVtKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvL1BsYXllcjIgVUlcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgKDxIVE1MRGl2RWxlbWVudD5wbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNIUFwiKSkuc3R5bGUud2lkdGggPSAoR2FtZS5wbGF5ZXIyLmhlcm8uYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLyBHYW1lLnBsYXllcjIuaGVyby5hdHRyaWJ1dGVzLm1heGhlYWx0aFBvaW50cyAqIDEwMCkgKyBcIiVcIjtcclxuXHJcbiAgICAgICAgICAgIC8vSW52ZW50b3J5VUlcclxuICAgICAgICAgICAgR2FtZS5wbGF5ZXIyLml0ZW1zLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBleHNpc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy9zZWFyY2ggRE9NSW1nIGZvciBJdGVtXHJcbiAgICAgICAgICAgICAgICBwbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikucXVlcnlTZWxlY3RvckFsbChcImltZ1wiKS5mb3JFYWNoKChpbWdFbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGltZ0VsZW1lbnQuc3JjID09IGVsZW1lbnQuaW1nU3JjKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4c2lzdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vbm9uZSBleHNpc3RpbmcgRE9NSW1nIGZvciBJdGVtXHJcbiAgICAgICAgICAgICAgICBpZiAoIWV4c2lzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBuZXdJdGVtOiBIVE1MSW1hZ2VFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcclxuICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnNyYyA9IGVsZW1lbnQuaW1nU3JjO1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllcjJVSS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5hcHBlbmRDaGlsZChuZXdJdGVtKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59Il19