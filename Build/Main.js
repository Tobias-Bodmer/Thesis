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
    let crc2 = Game.canvas.getContext("2d");
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
    //#endregion "PrivateVariables"
    //#region "essential"
    async function init() {
        Game.player = new Player.Player("Player1", new Player.Character("Thor,", new Player.Attributes(10, 5, 5)));
        Game.ƒ.Debug.log(Game.player);
        //#region init Items
        item1 = new Items.Item("Item1", "", new Game.ƒ.Vector3(0, 5, 0));
        //#endregion
        Generation.generateGrid();
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
        node.cmpTransform.mtxLocal.scale(new Game.ƒ.Vector3(50, 50, 1));
        node.cmpTransform.mtxLocal.translateZ(-0.01);
        Game.graph.addChild(node);
        Game.graph.addChild(new Enemy.Enemy("Enemy", new Player.Character("bat", new Player.Attributes(5, 5, 2))));
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
        //#region count items
        let items = Game.graph.getChildren().filter(element => element.lifetime != null);
        items.forEach(element => {
            element.lifespan(Game.graph);
        });
        //#endregion
        let bullets = Game.graph.getChildren().filter(element => element.lifetime != null);
        bullets.forEach(element => {
            element.move();
            element.lifespan(Game.graph);
        });
        let enemys = Game.graph.getChildren().filter(element => element.properties != null);
        enemys.forEach(element => {
            element.move();
            element.destroy(Game.graph);
        });
    }
    Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
    //#endregion "essential"
})(Game || (Game = {}));
var Items;
(function (Items) {
    class Item extends Game.ƒAid.NodeSprite {
        description;
        lifetime;
        constructor(_name, _description, _position, _lifetime) {
            super(_name);
            this.description = _description;
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
        constructor(_name, _description, _position, _lifetime, _attributes, _type) {
            super(_name, _description, _position, _lifetime);
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
        speed;
        attackPoints;
        constructor(_healthPoints, _attackPoints, _speed) {
            this.healthPoints = _healthPoints;
            this.attackPoints = _attackPoints;
            this.speed = _speed;
        }
    }
    Player.Attributes = Attributes;
})(Player || (Player = {}));
var Items;
(function (Items) {
    class Bullet extends Game.ƒAid.NodeSprite {
        hitPoints;
        flyDirection;
        speed;
        lifetime;
        collider;
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
            this.mtxLocal.translation = _position;
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
                if (this.collider.collides(element.collider) && element.properties != undefined) {
                    element.properties.attributes.healthPoints -= this.hitPoints;
                    this.lifetime = 0;
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
        properties;
        smart = false;
        target;
        collider;
        constructor(_name, _properties) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.properties = _properties;
            this.cmpTransform.mtxLocal.translateX(5);
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
            direction.scale((1 / 60 * this.properties.attributes.speed));
            this.cmpTransform.mtxLocal.translate(direction, true);
        }
        async destroy(_graph) {
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
    let controller = new Map([
        ["W", false],
        ["A", false],
        ["S", false],
        ["D", false]
    ]);
    let mousePosition;
    function keyboardDownEvent(_e) {
        let key = _e.code.toUpperCase().substring(3);
        controller.set(key, true);
    }
    function keyboardUpEvent(_e) {
        let key = _e.code.toUpperCase().substring(3);
        controller.set(key, false);
    }
    //#region rotate
    function rotateToMouse(_mouseEvent) {
        let ray = Game.viewport.getRayFromClient(new ƒ.Vector2(_mouseEvent.clientX, _mouseEvent.clientY));
        mousePosition = ray.intersectPlane(new ƒ.Vector3(0, 0, 0), new ƒ.Vector3(0, 0, 1));
        Game.player.mtxLocal.rotation = new ƒ.Vector3(0, 0, calcDegree(Game.player.mtxLocal.translation, mousePosition));
    }
    function calcDegree(_center, _target) {
        let xDistance = _target.x - _center.x;
        let yDistance = _target.y - _center.y;
        let degrees = Math.atan2(yDistance, xDistance) * (180 / Math.PI) - 90;
        return degrees;
    }
    //#endregion
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
    function attack(e_) {
        let mouseButton = e_.button;
        switch (mouseButton) {
            case 0:
                //TODO: left mouse button player.attack
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
                        // console.log(moveVector + " " + rotateVector);
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
        items;
        hero;
        rect1;
        constructor(_name, _hero) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.hero = _hero;
        }
        move(_direction) {
            // if (Networking.client.id == this.authority) {
            _direction.scale((1 / 60 * this.hero.attributes.speed));
            this.cmpTransform.mtxLocal.translate(_direction, false);
            // }
        }
        attack(_direction) {
            _direction.normalize();
            let bullet = new Items.Bullet("bullet", this.cmpTransform.mtxLocal.translation, _direction, 5, 0.5, 30);
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
        ROOMTYPE[ROOMTYPE["CHALLENGE"] = 2] = "CHALLENGE";
        ROOMTYPE[ROOMTYPE["BOSS"] = 3] = "BOSS";
    })(ROOMTYPE = Generation.ROOMTYPE || (Generation.ROOMTYPE = {}));
    class Room {
        roomType;
        coordinates; // X Y
        exits; // N E S W
        constructor(_coordiantes, _exits, _roomType) {
            this.coordinates = _coordiantes;
            this.exits = _exits;
            this.roomType = _roomType;
        }
    }
    Generation.Room = Room;
})(Generation || (Generation = {}));
var Generation;
(function (Generation) {
    let maxX = 9;
    let maxY = 9;
    let numberOfRooms = 2;
    let usedPositions = [];
    let rooms = [];
    function generateGrid() {
        generateRooms();
    }
    Generation.generateGrid = generateGrid;
    function generateRooms() {
        let midX = Math.floor((maxX - 1) / 2);
        let midY = Math.floor((maxY - 1) / 2);
        let startCoords = [midX, midY];
        rooms.push(new Generation.Room(startCoords, calcPathExits(startCoords), Generation.ROOMTYPE.START));
        usedPositions.push(startCoords);
        for (let i = 0; i < numberOfRooms; i++) {
            addRoom(rooms[rooms.length - 1], Generation.ROOMTYPE.NORMAL);
        }
        addRoom(rooms[rooms.length - 1], Generation.ROOMTYPE.BOSS);
        rooms.forEach(room => {
            console.log(room.coordinates + " " + room.exits);
            room.exits = calcRoomDoors(room.coordinates);
        });
        rooms.forEach(room => {
            console.log("calced: " + room.coordinates + " " + room.exits);
        });
    }
    function addRoom(_currentRoom, _roomType) {
        let numberOfExits = countBool(_currentRoom.exits);
        let randomNumber = Math.floor(Math.random() * numberOfExits);
        let possibleExitIndex = getExitIndex(_currentRoom.exits);
        let newRoomPosition;
        switch (possibleExitIndex[randomNumber]) {
            case 0: // north
                newRoomPosition = [_currentRoom.coordinates[0], _currentRoom.coordinates[1] + 1];
                rooms.push(new Generation.Room((newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;
            case 1: // east
                newRoomPosition = [_currentRoom.coordinates[0] + 1, _currentRoom.coordinates[1]];
                rooms.push(new Generation.Room((newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;
            case 2: // south
                newRoomPosition = [_currentRoom.coordinates[0], _currentRoom.coordinates[1] - 1];
                rooms.push(new Generation.Room((newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;
            case 3: //west
                newRoomPosition = [_currentRoom.coordinates[0] - 1, _currentRoom.coordinates[1]];
                rooms.push(new Generation.Room((newRoomPosition), calcPathExits(newRoomPosition), _roomType));
                usedPositions.push(newRoomPosition);
                break;
        }
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
            if (neighbours[i][0] < 0 || neighbours[i][1] < 0 || neighbours[i][0] > maxX || neighbours[i][1] > maxY) {
                toRemoveIndex.push(i);
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL0NsYXNzZXMvTWFpbi50cyIsIi4uL0NsYXNzZXMvSW50ZXJmYWNlcy50cyIsIi4uL0NsYXNzZXMvSXRlbXMudHMiLCIuLi9DbGFzc2VzL0F0dHJpYnV0ZUl0ZW0udHMiLCIuLi9DbGFzc2VzL0F0dHJpYnV0ZXMudHMiLCIuLi9DbGFzc2VzL0J1bGxldC50cyIsIi4uL0NsYXNzZXMvQ2hhcmFjdGVyLnRzIiwiLi4vQ2xhc3Nlcy9FbmVteS50cyIsIi4uL0NsYXNzZXMvSW5wdXRTeXN0ZW0udHMiLCIuLi9DbGFzc2VzL0xhbmRzY2FwZS50cyIsIi4uL0NsYXNzZXMvTmV0d29ya2luZy50cyIsIi4uL0NsYXNzZXMvUGxheWVyLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tR2VuZXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsbUJBQW1CO0FBQ25CLHdEQUF3RDtBQUN4RCxzREFBc0Q7QUFDdEQsc0JBQXNCO0FBRXRCLElBQVUsSUFBSSxDQWdJYjtBQXJJRCxtQkFBbUI7QUFDbkIsd0RBQXdEO0FBQ3hELHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFFdEIsV0FBVSxJQUFJO0lBQ0ksTUFBQyxHQUFHLFNBQVMsQ0FBQztJQUNkLFNBQUksR0FBRyxRQUFRLENBQUM7SUFFOUIsdUJBQXVCO0lBQ1osV0FBTSxHQUF5QyxRQUFRLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVGLElBQUksSUFBSSxHQUE2QixLQUFBLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0QsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN0QywwQkFBMEI7SUFFMUIsMkJBQTJCO0lBQ2hCLGFBQVEsR0FBZSxJQUFJLEtBQUEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3hDLFVBQUssR0FBVyxJ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Q2pCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztBQUNMLENBQUMsRUF4S1MsVUFBVSxLQUFWLFVBQVUsUUF3S25CIiwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIFwiSW1wb3J0c1wiXHJcbi8vLzxyZWZlcmVuY2UgdHlwZXM9XCIuLi9GVURHRS9Db3JlL0J1aWxkL0Z1ZGdlQ29yZS5qc1wiLz5cclxuLy8vPHJlZmVyZW5jZSB0eXBlcz1cIi4uL0ZVREdFL0FpZC9CdWlsZC9GdWRnZUFpZC5qc1wiLz5cclxuLy8jZW5kcmVnaW9uIFwiSW1wb3J0c1wiXHJcblxyXG5uYW1lc3BhY2UgR2FtZSB7XHJcbiAgICBleHBvcnQgaW1wb3J0IMaSID0gRnVkZ2VDb3JlO1xyXG4gICAgZXhwb3J0IGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG5cclxuICAgIC8vI3JlZ2lvbiBcIkRvbUVsZW1lbnRzXCJcclxuICAgIGV4cG9ydCBsZXQgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCA9IDxIVE1MQ2FudmFzRWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNhbnZhc1wiKTtcclxuICAgIGxldCBjcmMyOiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGluaXQpO1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiRG9tRWxlbWVudHNcIlxyXG5cclxuICAgIC8vI3JlZ2lvbiBcIlB1YmxpY1ZhcmlhYmxlc1wiXHJcbiAgICBleHBvcnQgbGV0IHZpZXdwb3J0OiDGki5WaWV3cG9ydCA9IG5ldyDGki5WaWV3cG9ydCgpO1xyXG4gICAgZXhwb3J0IGxldCBncmFwaDogxpIuTm9kZSA9IG5ldyDGki5Ob2RlKFwiR3JhcGhcIik7XHJcbiAgICBleHBvcnQgbGV0IHBsYXllcjogUGxheWVyLlBsYXllcjtcclxuICAgIGV4cG9ydCBsZXQgcGxheWVyMjogUGxheWVyLlBsYXllcjtcclxuICAgIGV4cG9ydCBsZXQgY29ubmVjdGVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IGZyYW1lUmF0ZTogbnVtYmVyID0gNjA7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJQdWJsaWNWYXJpYWJsZXNcIlxyXG5cclxuICAgIC8vI3JlZ2lvbiBcIlByaXZhdGVWYXJpYWJsZXNcIlxyXG4gICAgbGV0IGl0ZW0xOiBJdGVtcy5JdGVtO1xyXG4gICAgbGV0IGNtcENhbWVyYTogxpIuQ29tcG9uZW50Q2FtZXJhID0gbmV3IMaSLkNvbXBvbmVudENhbWVyYSgpO1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiUHJpdmF0ZVZhcmlhYmxlc1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiZXNzZW50aWFsXCJcclxuICAgIGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICAgICAgcGxheWVyID0gbmV3IFBsYXllci5QbGF5ZXIoXCJQbGF5ZXIxXCIsIG5ldyBQbGF5ZXIuQ2hhcmFjdGVyKFwiVGhvcixcIiwgbmV3IFBsYXllci5BdHRyaWJ1dGVzKDEwLCA1LCA1KSkpO1xyXG4gICAgICAgIMaSLkRlYnVnLmxvZyhwbGF5ZXIpO1xyXG5cclxuICAgICAgICAvLyNyZWdpb24gaW5pdCBJdGVtc1xyXG4gICAgICAgIGl0ZW0xID0gbmV3IEl0ZW1zLkl0ZW0oXCJJdGVtMVwiLCBcIlwiLCBuZXcgxpIuVmVjdG9yMygwLCA1LCAwKSk7XHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIEdlbmVyYXRpb24uZ2VuZXJhdGVHcmlkKCk7XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBUZXN0aW5nIG9iamVjdHNcclxuICAgICAgICBsZXQgbm9kZTogxpIuTm9kZSA9IG5ldyDGki5Ob2RlKFwiUXVhZFwiKTtcclxuXHJcbiAgICAgICAgbm9kZS5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuXHJcbiAgICAgICAgbGV0IG1lc2g6IMaSLk1lc2hRdWFkID0gbmV3IMaSLk1lc2hRdWFkKCk7XHJcbiAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICBub2RlLmFkZENvbXBvbmVudChjbXBNZXNoKTtcclxuXHJcbiAgICAgICAgbGV0IG10clNvbGlkV2hpdGU6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiU29saWRXaGl0ZVwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgbm9kZS5hZGRDb21wb25lbnQoY21wTWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICBsZXQgbmV3VHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICAgICAgbGV0IG5ld0NvYXQ6IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCA9IG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoKTtcclxuICAgICAgICBsZXQgb2xkQ29tQ29hdDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuICAgICAgICBsZXQgbmV3TXRyOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm10clwiLCDGki5TaGFkZXJGbGF0VGV4dHVyZWQsIG5ld0NvYXQpO1xyXG4gICAgICAgIGxldCBvbGRQaXZvdDogxpIuTWF0cml4NHg0ID0gbmV3IMaSLk1hdHJpeDR4NCgpO1xyXG5cclxuICAgICAgICBvbGRDb21Db2F0ID0gbm9kZS5nZXRDb21wb25lbnQoxpIuQ29tcG9uZW50TWF0ZXJpYWwpO1xyXG4gICAgICAgIG9sZFBpdm90ID0gbm9kZS5nZXRDb21wb25lbnQoxpIuQ29tcG9uZW50TWVzaCkubXR4UGl2b3Q7XHJcblxyXG4gICAgICAgIGF3YWl0IG5ld1R4dC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvZ3Jhcy5wbmdcIik7XHJcbiAgICAgICAgbmV3Q29hdC5jb2xvciA9IMaSLkNvbG9yLkNTUyhcIldISVRFXCIpO1xyXG4gICAgICAgIG5ld0NvYXQudGV4dHVyZSA9IG5ld1R4dDtcclxuICAgICAgICBvbGRDb21Db2F0Lm1hdGVyaWFsID0gbmV3TXRyO1xyXG5cclxuICAgICAgICBub2RlLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMyg1MCwgNTAsIDEpKTtcclxuICAgICAgICBub2RlLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGVaKC0wLjAxKTtcclxuXHJcbiAgICAgICAgZ3JhcGguYWRkQ2hpbGQobm9kZSk7XHJcblxyXG4gICAgICAgIGdyYXBoLmFkZENoaWxkKG5ldyBFbmVteS5FbmVteShcIkVuZW15XCIsIG5ldyBQbGF5ZXIuQ2hhcmFjdGVyKFwiYmF0XCIsIG5ldyBQbGF5ZXIuQXR0cmlidXRlcyg1LDUsMikpKSk7XHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuICAgICAgICBncmFwaC5hcHBlbmRDaGlsZChwbGF5ZXIpO1xyXG4gICAgICAgIGdyYXBoLmFwcGVuZENoaWxkKGl0ZW0xKTtcclxuXHJcblxyXG4gICAgICAgIMaSQWlkLmFkZFN0YW5kYXJkTGlnaHRDb21wb25lbnRzKGdyYXBoKTtcclxuXHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0ZVooMjUpO1xyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC5yb3RhdGVZKDE4MCk7XHJcblxyXG4gICAgICAgIMaSLkRlYnVnLmxvZyhncmFwaCk7XHJcblxyXG4gICAgICAgIHZpZXdwb3J0LmluaXRpYWxpemUoXCJWaWV3cG9ydFwiLCBncmFwaCwgY21wQ2FtZXJhLCBjYW52YXMpO1xyXG5cclxuICAgICAgICBkcmF3KCk7XHJcblxyXG4gICAgICAgIMaSLkxvb3Auc3RhcnQoxpIuTE9PUF9NT0RFLlRJTUVfR0FNRSwgZnJhbWVSYXRlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB3YWl0T25Db25uZWN0aW9uKCkge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudCAhPSB1bmRlZmluZWQgJiYgTmV0d29ya2luZy5jbGllbnQuaWQgIT0gbnVsbCB8fCB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDb25uZWN0aW9uR1VJXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICBpbml0KCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCh3YWl0T25Db25uZWN0aW9uLCAzMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmF3KCk6IHZvaWQge1xyXG4gICAgICAgIHZpZXdwb3J0LmRyYXcoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgSW5wdXRTeXN0ZW0ubW92ZSgpO1xyXG4gICAgICAgIGRyYXcoKTtcclxuICAgICAgICAvLyNyZWdpb24gY291bnQgaXRlbXNcclxuICAgICAgICBsZXQgaXRlbXM6IEl0ZW1zLkl0ZW1bXSA9IDxJdGVtcy5JdGVtW10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEl0ZW1zLkl0ZW0+ZWxlbWVudCkubGlmZXRpbWUgIT0gbnVsbClcclxuICAgICAgICBpdGVtcy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICBlbGVtZW50LmxpZmVzcGFuKGdyYXBoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgbGV0IGJ1bGxldHM6IEl0ZW1zLkJ1bGxldFtdID0gPEl0ZW1zLkJ1bGxldFtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxJdGVtcy5CdWxsZXQ+ZWxlbWVudCkubGlmZXRpbWUgIT0gbnVsbClcclxuICAgICAgICBidWxsZXRzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZSgpO1xyXG4gICAgICAgICAgICBlbGVtZW50LmxpZmVzcGFuKGdyYXBoKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBsZXQgZW5lbXlzOiBFbmVteS5FbmVteVtdID0gPEVuZW15LkVuZW15W10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVuZW15LkVuZW15PmVsZW1lbnQpLnByb3BlcnRpZXMgIT0gbnVsbClcclxuICAgICAgICBlbmVteXMuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgZWxlbWVudC5tb3ZlKCk7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuZGVzdHJveShncmFwaCk7XHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICDGki5Mb29wLmFkZEV2ZW50TGlzdGVuZXIoxpIuRVZFTlQuTE9PUF9GUkFNRSwgdXBkYXRlKTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcImVzc2VudGlhbFwiXHJcblxyXG59XHJcbiIsIm5hbWVzcGFjZSBJbnRlcmZhY2VzIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSVNwYXduYWJsZSB7XHJcbiAgICAgICAgbGlmZXRpbWU6IG51bWJlcjtcclxuXHJcbiAgICAgICAgbGlmZXNwYW4oX2E6IMaSLk5vZGUpOiB2b2lkO1xyXG4gICAgfVxyXG59XHJcblxyXG5uYW1lc3BhY2UgUGxheWVyIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUtpbGxhYmxlIHtcclxuICAgICAgICBvbkRlYXRoKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRGFtYWdibGUge1xyXG4gICAgICAgIGdldERhbWFnZSgpOiB2b2lkO1xyXG4gICAgfVxyXG59XHJcbiIsIm5hbWVzcGFjZSBJdGVtcyB7XHJcbiAgICBleHBvcnQgY2xhc3MgSXRlbSBleHRlbmRzIEdhbWUuxpJBaWQuTm9kZVNwcml0ZSBpbXBsZW1lbnRzIEludGVyZmFjZXMuSVNwYXduYWJsZSB7XHJcbiAgICAgICAgcHVibGljIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbiAgICAgICAgbGlmZXRpbWU6IG51bWJlcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX2Rlc2NyaXB0aW9uOiBzdHJpbmcsIF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2xpZmV0aW1lPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5kZXNjcmlwdGlvbiA9IF9kZXNjcmlwdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IF9saWZldGltZTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbGlmZXNwYW4oX2dyYXBoOiDGki5Ob2RlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lID49IDAgJiYgdGhpcy5saWZldGltZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lLS07XHJcbiAgICAgICAgICAgICAgICDGki5EZWJ1Zy5sb2codGhpcy5uYW1lICsgXCI6IFwiICsgdGhpcy5saWZldGltZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBfZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgSXRlbXMge1xyXG5cclxuICAgIGV4cG9ydCBlbnVtIElURU1UWVBFIHtcclxuICAgICAgICBBREQsXHJcbiAgICAgICAgU1VCU1RSQUNULFxyXG4gICAgICAgIFBST0NFTlRVQUxcclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVJdGVtIGV4dGVuZHMgSXRlbSB7XHJcbiAgICAgICAgcHVibGljIHR5cGU6IElURU1UWVBFO1xyXG4gICAgICAgIHB1YmxpYyBhdHRyaWJ1dGVzOiBQbGF5ZXIuQXR0cmlidXRlcztcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDcmVhdGVzIGFuIGl0ZW0gdGhhdCBjYW4gY2hhbmdlIEF0dHJpYnV0ZXMgb2YgdGhlIHBsYXllclxyXG4gICAgICAgICAqIEBwYXJhbSBfbmFtZSBuYW1lIG9mIHRoZSBJdGVtXHJcbiAgICAgICAgICogQHBhcmFtIF9kZXNjcmlwdGlvbiBEZXNjaXJwdGlvbiBvZiB0aGUgaXRlbVxyXG4gICAgICAgICAqIEBwYXJhbSBfcG9zaXRpb24gUG9zaXRpb24gd2hlcmUgdG8gc3Bhd25cclxuICAgICAgICAgKiBAcGFyYW0gX2xpZmV0aW1lIG9wdGlvbmFsOiBob3cgbG9uZyBpcyB0aGUgaXRlbSB2aXNpYmxlXHJcbiAgICAgICAgICogQHBhcmFtIF9hdHRyaWJ1dGVzIGRlZmluZSB3aGljaCBhdHRyaWJ1dGVzIHdpbGwgY2hhbmdlLCBjb21wYXJlIHdpdGgge0BsaW5rIFBsYXllci5BdHRyaWJ1dGVzfVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9kZXNjcmlwdGlvbjogc3RyaW5nLCBfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9saWZldGltZTogbnVtYmVyLCBfYXR0cmlidXRlczogUGxheWVyLkF0dHJpYnV0ZXMsIF90eXBlOiBJVEVNVFlQRSkge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSwgX2Rlc2NyaXB0aW9uLCBfcG9zaXRpb24sIF9saWZldGltZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IF9hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICB0aGlzLnR5cGUgPSBfdHlwZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgUGxheWVyIHtcclxuICAgIGV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVzIHtcclxuXHJcbiAgICAgICAgcHVibGljIGhlYWx0aFBvaW50czogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBzcGVlZDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBhdHRhY2tQb2ludHM6IG51bWJlcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2hlYWx0aFBvaW50czogbnVtYmVyLCBfYXR0YWNrUG9pbnRzOiBudW1iZXIsIF9zcGVlZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGVhbHRoUG9pbnRzID0gX2hlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgdGhpcy5hdHRhY2tQb2ludHMgPSBfYXR0YWNrUG9pbnRzO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gX3NwZWVkO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBJdGVtcyB7XHJcbiAgICBleHBvcnQgY2xhc3MgQnVsbGV0IGV4dGVuZHMgR2FtZS7GkkFpZC5Ob2RlU3ByaXRlIGltcGxlbWVudHMgSW50ZXJmYWNlcy5JU3Bhd25hYmxlIHtcclxuICAgICAgICBwdWJsaWMgaGl0UG9pbnRzOiBudW1iZXJcclxuICAgICAgICBwdWJsaWMgZmx5RGlyZWN0aW9uOiDGki5WZWN0b3IzO1xyXG4gICAgICAgIHB1YmxpYyBzcGVlZDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBsaWZldGltZTogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogR2FtZS7Gki5SZWN0YW5nbGU7XHJcblxyXG4gICAgICAgIGFzeW5jIGxpZmVzcGFuKF9ncmFwaDogxpIuTm9kZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA+PSAwICYmIHRoaXMubGlmZXRpbWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saWZldGltZS0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2dyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9hdHRhY2tQb2ludHM6IG51bWJlciwgX2xpZmV0aW1lOiBudW1iZXIsIF9zcGVlZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKVxyXG4gICAgICAgICAgICB0aGlzLmhpdFBvaW50cyA9IF9hdHRhY2tQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSBfbGlmZXRpbWUgKiBHYW1lLmZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IF9wb3NpdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IF9zcGVlZDtcclxuICAgICAgICAgICAgdGhpcy5mbHlEaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgbW92ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKHRoaXMuZmx5RGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlzaW9uRGV0ZWN0aW9uKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBjb2xsaXNpb25EZXRlY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlcnM6IGFueVtdID0gR2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8YW55PmVsZW1lbnQpLmNvbGxpZGVyICE9IHVuZGVmaW5lZCk7XHJcblxyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5wcm9wZXJ0aWVzICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkucHJvcGVydGllcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyAtPSB0aGlzLmhpdFBvaW50cztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgUGxheWVyIHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQ2hhcmFjdGVyIHtcclxuICAgICAgICBwdWJsaWMgbmFtZTogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBhdHRyaWJ1dGVzOiBBdHRyaWJ1dGVzO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIGF0dHJpYnV0ZXM6IEF0dHJpYnV0ZXMpIHtcclxuICAgICAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0gYXR0cmlidXRlcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXkge1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteSBleHRlbmRzIEdhbWUuxpJBaWQuTm9kZVNwcml0ZSB7XHJcbiAgICAgICAgcHVibGljIHByb3BlcnRpZXM6IFBsYXllci5DaGFyYWN0ZXI7XHJcbiAgICAgICAgcHVibGljIHNtYXJ0OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgcHVibGljIHRhcmdldDogUGxheWVyLlBsYXllcjtcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3Rlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMucHJvcGVydGllcyA9IF9wcm9wZXJ0aWVzO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlWCg1KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgYXN5bmMgbW92ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBHYW1lLnBsYXllcjtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGRpc3RhbmNlUGxheWVyMSA9IHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKEdhbWUucGxheWVyLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7IFxyXG4gICAgICAgICAgICAgICAgbGV0IGRpc3RhbmNlUGxheWVyMiA9IHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKEdhbWUucGxheWVyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pOyBcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYoZGlzdGFuY2VQbGF5ZXIxIDwgZGlzdGFuY2VQbGF5ZXIyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBHYW1lLnBsYXllcjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBHYW1lLnBsYXllcjI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnNtYXJ0KSB7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZVNpbXBsZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIG1vdmVTaW1wbGUoKSB7XHJcbiAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICBkaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICBkaXJlY3Rpb24uc2NhbGUoKDEgLyA2MCAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShkaXJlY3Rpb24sIHRydWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgZGVzdHJveShfZ3JhcGg6IEdhbWUuxpIuTm9kZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIF9ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBJbnB1dFN5c3RlbSB7XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwga2V5Ym9hcmREb3duRXZlbnQpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGtleWJvYXJkVXBFdmVudCk7XHJcbiAgICBHYW1lLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGF0dGFjayk7XHJcbiAgICBHYW1lLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIHJvdGF0ZVRvTW91c2UpO1xyXG5cclxuICAgIGxldCBjb250cm9sbGVyID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KFtcclxuICAgICAgICBbXCJXXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJBXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJTXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJEXCIsIGZhbHNlXVxyXG4gICAgXSk7XHJcblxyXG4gICAgbGV0IG1vdXNlUG9zaXRpb246IMaSLlZlY3RvcjM7XHJcblxyXG4gICAgZnVuY3Rpb24ga2V5Ym9hcmREb3duRXZlbnQoX2U6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBsZXQga2V5OiBzdHJpbmcgPSBfZS5jb2RlLnRvVXBwZXJDYXNlKCkuc3Vic3RyaW5nKDMpO1xyXG4gICAgICAgIGNvbnRyb2xsZXIuc2V0KGtleSwgdHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24ga2V5Ym9hcmRVcEV2ZW50KF9lOiBLZXlib2FyZEV2ZW50KSB7XHJcbiAgICAgICAgbGV0IGtleTogc3RyaW5nID0gX2UuY29kZS50b1VwcGVyQ2FzZSgpLnN1YnN0cmluZygzKTtcclxuICAgICAgICBjb250cm9sbGVyLnNldChrZXksIGZhbHNlKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyNyZWdpb24gcm90YXRlXHJcbiAgICBmdW5jdGlvbiByb3RhdGVUb01vdXNlKF9tb3VzZUV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XHJcbiAgICAgICAgbGV0IHJheTogxpIuUmF5ID0gR2FtZS52aWV3cG9ydC5nZXRSYXlGcm9tQ2xpZW50KG5ldyDGki5WZWN0b3IyKF9tb3VzZUV2ZW50LmNsaWVudFgsIF9tb3VzZUV2ZW50LmNsaWVudFkpKTtcclxuICAgICAgICBtb3VzZVBvc2l0aW9uID0gcmF5LmludGVyc2VjdFBsYW5lKG5ldyDGki5WZWN0b3IzKDAsIDAsIDApLCBuZXcgxpIuVmVjdG9yMygwLCAwLCAxKSk7XHJcbiAgICAgICAgR2FtZS5wbGF5ZXIubXR4TG9jYWwucm90YXRpb24gPSBuZXcgxpIuVmVjdG9yMygwLCAwLCBjYWxjRGVncmVlKEdhbWUucGxheWVyLm10eExvY2FsLnRyYW5zbGF0aW9uLCBtb3VzZVBvc2l0aW9uKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FsY0RlZ3JlZShfY2VudGVyOiDGki5WZWN0b3IzLCBfdGFyZ2V0OiDGki5WZWN0b3IzKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgeERpc3RhbmNlOiBudW1iZXIgPSBfdGFyZ2V0LnggLSBfY2VudGVyLng7XHJcbiAgICAgICAgbGV0IHlEaXN0YW5jZTogbnVtYmVyID0gX3RhcmdldC55IC0gX2NlbnRlci55O1xyXG4gICAgICAgIGxldCBkZWdyZWVzOiBudW1iZXIgPSBNYXRoLmF0YW4yKHlEaXN0YW5jZSwgeERpc3RhbmNlKSAqICgxODAgLyBNYXRoLlBJKSAtIDkwO1xyXG4gICAgICAgIHJldHVybiBkZWdyZWVzO1xyXG5cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbW92ZSgpIHtcclxuICAgICAgICBsZXQgbW92ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICBsZXQgaGFzQ2hhbmdlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJXXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueSArPSAxO1xyXG4gICAgICAgICAgICBoYXNDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiQVwiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnggLT0gMTtcclxuICAgICAgICAgICAgaGFzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIlNcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci55IC09IDE7XHJcbiAgICAgICAgICAgIGhhc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJEXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueCArPSAxO1xyXG4gICAgICAgICAgICBoYXNDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgaWYgKGhhc0NoYW5nZWQgJiYgbW92ZVZlY3Rvci5tYWduaXR1ZGUgIT0gMCkge1xyXG4gICAgICAgICAgICBHYW1lLnBsYXllci5tb3ZlKEdhbWUuxpIuVmVjdG9yMy5OT1JNQUxJWkFUSU9OKG1vdmVWZWN0b3IsIDEpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlUG9zaXRpb24oR2FtZS5wbGF5ZXIubXR4TG9jYWwudHJhbnNsYXRpb24sIEdhbWUucGxheWVyLm10eExvY2FsLnJvdGF0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYXR0YWNrKGVfOiBNb3VzZUV2ZW50KSB7XHJcblxyXG4gICAgICAgIGxldCBtb3VzZUJ1dHRvbiA9IGVfLmJ1dHRvbjtcclxuXHJcbiAgICAgICAgc3dpdGNoIChtb3VzZUJ1dHRvbikge1xyXG4gICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICAvL1RPRE86IGxlZnQgbW91c2UgYnV0dG9uIHBsYXllci5hdHRhY2tcclxuICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRShtb3VzZVBvc2l0aW9uLCBHYW1lLnBsYXllci5tdHhMb2NhbC50cmFuc2xhdGlvbilcclxuICAgICAgICAgICAgICAgIEdhbWUucGxheWVyLmF0dGFjayhkaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVCdWxsZXQoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAvL1RPRE86IHJpZ2h0IG1vdXNlIGJ1dHRvbiBwbGF5ZXIuY2hhcmdlIG9yIHNvbWV0aGluZyBsaWtlIHRoYXRcclxuXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59IiwibmFtZXNwYWNlIExldmVsIHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgTGFuZHNjYXBlIGV4dGVuZHMgxpIuTm9kZXtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMuZ2V0Q2hpbGRyZW4oKVswXS5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0pLm10eExvY2FsLnRyYW5zbGF0ZVooLTIpXHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCIvLy88cmVmZXJlbmNlIHBhdGg9XCIuLi9GVURHRS9OZXQvQnVpbGQvQ2xpZW50L0Z1ZGdlQ2xpZW50LmQudHNcIi8+XHJcblxyXG5uYW1lc3BhY2UgTmV0d29ya2luZyB7XHJcbiAgICBleHBvcnQgZW51bSBGVU5DVElPTiB7XHJcbiAgICAgICAgU1BBV04sXHJcbiAgICAgICAgVFJBTlNGT1JNLFxyXG4gICAgICAgIEJVTExFVFxyXG4gICAgfVxyXG5cclxuICAgIGltcG9ydCDGkkNsaWVudCA9IEZ1ZGdlTmV0LkZ1ZGdlQ2xpZW50O1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY2xpZW50OiDGkkNsaWVudDtcclxuICAgIGV4cG9ydCBsZXQgcG9zVXBkYXRlOiDGki5WZWN0b3IzO1xyXG5cclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSG9zdFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgaG9zdFNlcnZlciwgdHJ1ZSk7XHJcbiAgICBsZXQgSVBDb25uZWN0aW9uID0gPEhUTUxJbnB1dEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJJUENvbm5lY3Rpb25cIik7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNvbm5lY3RpbmdcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNvbm5ldGluZywgdHJ1ZSk7XHJcblxyXG4gICAgZnVuY3Rpb24gaG9zdFNlcnZlcigpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTiwgdmFsdWU6IEdhbWUucGxheWVyLmhlcm8sIHBvc2l0aW9uOiBHYW1lLnBsYXllci5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gfSB9KVxyXG4gICAgICAgIEdhbWUuY29ubmVjdGVkID0gdHJ1ZTtcclxuICAgICAgICDGki5EZWJ1Zy5sb2coXCJDb25uZWN0ZWQgdG8gU2VydmVyXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNvbm5ldGluZygpIHtcclxuICAgICAgICBjbGllbnQgPSBuZXcgxpJDbGllbnQoKTtcclxuICAgICAgICBjbGllbnQuYWRkRXZlbnRMaXN0ZW5lcihGdWRnZU5ldC5FVkVOVC5NRVNTQUdFX1JFQ0VJVkVELCByZWNlaXZlTWVzc2FnZSk7XHJcbiAgICAgICAgY2xpZW50LmNvbm5lY3RUb1NlcnZlcihJUENvbm5lY3Rpb24udmFsdWUpO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIHJlY2VpdmVNZXNzYWdlKF9ldmVudDogQ3VzdG9tRXZlbnQgfCBNZXNzYWdlRXZlbnQgfCBFdmVudCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIGlmIChfZXZlbnQgaW5zdGFuY2VvZiBNZXNzYWdlRXZlbnQpIHtcclxuICAgICAgICAgICAgbGV0IG1lc3NhZ2U6IEZ1ZGdlTmV0Lk1lc3NhZ2UgPSBKU09OLnBhcnNlKF9ldmVudC5kYXRhKTtcclxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaWRTb3VyY2UgIT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kICE9IEZ1ZGdlTmV0LkNPTU1BTkQuU0VSVkVSX0hFQVJUQkVBVCAmJiBtZXNzYWdlLmNvbW1hbmQgIT0gRnVkZ2VOZXQuQ09NTUFORC5DTElFTlRfSEVBUlRCRUFUKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV04udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlLmNvbnRlbnQudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBsYXllcjIgPSBuZXcgUGxheWVyLlBsYXllcihcInBsYXllcjJcIiwgbmV3IFBsYXllci5DaGFyYWN0ZXIoXCJUaG9yaWFuXCIsIG5ldyBQbGF5ZXIuQXR0cmlidXRlcygxMDAsIDEwLCA1KSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBsYXllcjIubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKEdhbWUucGxheWVyMik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBtb3ZlVmVjdG9yOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGFbMl0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb3RhdGVWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVsyXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5wbGF5ZXIyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbW92ZVZlY3RvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5wbGF5ZXIyLm10eExvY2FsLnJvdGF0aW9uID0gcm90YXRlVmVjdG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhtb3ZlVmVjdG9yICsgXCIgXCIgKyByb3RhdGVWZWN0b3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5CVUxMRVQudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBsYXllcjIuYXR0YWNrKG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbi5kYXRhWzBdLG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24uZGF0YVsxXSxtZXNzYWdlLmNvbnRlbnQuZGlyZWN0aW9uLmRhdGFbMl0pKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogc2VuZHMgdHJhbnNmb3JtIG92ZXIgbmV0d29ya1xyXG4gICAgICogQHBhcmFtIF9fcG9zaXRpb24gY3VycmVudCBwb3NpdGlvbiBvZiBPYmplY3RcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVBvc2l0aW9uKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX3JvdGF0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVFJBTlNGT1JNLCB2YWx1ZTogX3Bvc2l0aW9uLCByb3RhdGlvbjogX3JvdGF0aW9uIH0gfSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQnVsbGV0KF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQlVMTEVULCBkaXJlY3Rpb246IF9kaXJlY3Rpb24gfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXVubG9hZFwiLCBvblVubG9hZCwgZmFsc2UpO1xyXG5cclxuICAgIGZ1bmN0aW9uIG9uVW5sb2FkKCkge1xyXG4gICAgICAgIC8vVE9ETzogVGhpbmdzIHdlIGRvIGFmdGVyIHRoZSBwbGF5ZXIgbGVmdCB0aGUgZ2FtZVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFBsYXllciB7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFBsYXllciBleHRlbmRzIEdhbWUuxpJBaWQuTm9kZVNwcml0ZSB7XHJcbiAgICAgICAgcHVibGljIGl0ZW1zOiBBcnJheTxJdGVtcy5JdGVtPjtcclxuICAgICAgICBwdWJsaWMgaGVybzogQ2hhcmFjdGVyO1xyXG4gICAgICAgIHJlY3QxOiDGki5SZWN0YW5nbGU7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9oZXJvOiBDaGFyYWN0ZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmhlcm8gPSBfaGVybztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBtb3ZlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgLy8gaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IHRoaXMuYXV0aG9yaXR5KSB7XHJcbiAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUoKDEgLyA2MCAqIHRoaXMuaGVyby5hdHRyaWJ1dGVzLnNwZWVkKSlcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24sIGZhbHNlKTtcclxuICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGF0dGFjayhfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIGxldCBidWxsZXQ6IEl0ZW1zLkJ1bGxldCA9IG5ldyBJdGVtcy5CdWxsZXQoXCJidWxsZXRcIiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sX2RpcmVjdGlvbiw1LDAuNSwzMCk7XHJcbiAgICAgICAgICAgIGJ1bGxldC5mbHlEaXJlY3Rpb24uc2NhbGUoMSAvIEdhbWUuZnJhbWVSYXRlICogYnVsbGV0LnNwZWVkKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChidWxsZXQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNvbGxlY3RvcigpIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIGFkZHMgQXR0cmlidXRlcyB0byB0aGUgUGxheWVyIEF0dHJpYnV0ZXNcclxuICAgICAgICAgKiBAcGFyYW0gX2F0dHJpYnV0ZXMgaW5jb21pbmcgYXR0cmlidXRlc1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBhZGRBdHRyaWJ1ZXNCeUl0ZW0oX2l0ZW06IEl0ZW1zLkF0dHJpYnV0ZUl0ZW0pOiB2b2lkIHtcclxuICAgICAgICAgICAgc3dpdGNoIChfaXRlbS50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEl0ZW1zLklURU1UWVBFLkFERDpcclxuICAgICAgICAgICAgICAgICAgICBicmVhazsgLy8gY2FsY3VsYXRlIGF0dHJpYnV0ZXMgYnkgYWRkaW5nIHRoZW1cclxuICAgICAgICAgICAgICAgIGNhc2UgSXRlbXMuSVRFTVRZUEUuU1VCU1RSQUNUOlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBjYWxjdWxhdGUgYXR0cmliZXMgYnkgc3Vic3RhY3RpbmcgdGhlbVxyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5JVEVNVFlQRS5QUk9DRU5UVUFMOlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBjYWxjdWxhdGUgYXR0cmlidXRlcyBieSBnaXZpbmcgc3BlZmljICVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBHZW5lcmF0aW9uIHtcclxuICAgIGV4cG9ydCBlbnVtIFJPT01UWVBFIHtcclxuICAgICAgICBTVEFSVCxcclxuICAgICAgICBOT1JNQUwsXHJcbiAgICAgICAgQ0hBTExFTkdFLFxyXG4gICAgICAgIEJPU1NcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgUm9vbSB7XHJcbiAgICAgICAgcHVibGljIHJvb21UeXBlOiBST09NVFlQRVxyXG4gICAgICAgIHB1YmxpYyBjb29yZGluYXRlczogW251bWJlciwgbnVtYmVyXTsgLy8gWCBZXHJcbiAgICAgICAgZXhpdHM6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSAvLyBOIEUgUyBXXHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vcmRpYW50ZXM6IFtudW1iZXIsIG51bWJlcl0sIF9leGl0czogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dLCBfcm9vbVR5cGU6IFJPT01UWVBFKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29vcmRpbmF0ZXMgPSBfY29vcmRpYW50ZXM7XHJcbiAgICAgICAgICAgIHRoaXMuZXhpdHMgPSBfZXhpdHM7XHJcbiAgICAgICAgICAgIHRoaXMucm9vbVR5cGUgPSBfcm9vbVR5cGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG5cclxuICAgIGxldCBtYXhYOiBudW1iZXIgPSA5O1xyXG4gICAgbGV0IG1heFk6IG51bWJlciA9IDk7XHJcbiAgICBsZXQgbnVtYmVyT2ZSb29tczogbnVtYmVyID0gMjtcclxuICAgIGxldCB1c2VkUG9zaXRpb25zOiBbbnVtYmVyLCBudW1iZXJdW10gPSBbXTtcclxuICAgIGxldCByb29tczogUm9vbVtdID0gW107XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVHcmlkKCk6IHZvaWQge1xyXG4gICAgICAgIGdlbmVyYXRlUm9vbXMoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZVJvb21zKCkge1xyXG4gICAgICAgIGxldCBtaWRYID0gTWF0aC5mbG9vcigobWF4WCAtIDEpIC8gMik7XHJcbiAgICAgICAgbGV0IG1pZFkgPSBNYXRoLmZsb29yKChtYXhZIC0gMSkgLyAyKTtcclxuICAgICAgICBsZXQgc3RhcnRDb29yZHM6IFtudW1iZXIsIG51bWJlcl0gPSBbbWlkWCwgbWlkWV07XHJcblxyXG4gICAgICAgIHJvb21zLnB1c2gobmV3IFJvb20oc3RhcnRDb29yZHMsIGNhbGNQYXRoRXhpdHMoc3RhcnRDb29yZHMpLCBHZW5lcmF0aW9uLlJPT01UWVBFLlNUQVJUKSlcclxuICAgICAgICB1c2VkUG9zaXRpb25zLnB1c2goc3RhcnRDb29yZHMpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bWJlck9mUm9vbXM7IGkrKykge1xyXG4gICAgICAgICAgICBhZGRSb29tKHJvb21zW3Jvb21zLmxlbmd0aCAtIDFdLCBHZW5lcmF0aW9uLlJPT01UWVBFLk5PUk1BTCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGFkZFJvb20ocm9vbXNbcm9vbXMubGVuZ3RoIC0gMV0sIEdlbmVyYXRpb24uUk9PTVRZUEUuQk9TUyk7XHJcbiAgICAgICAgcm9vbXMuZm9yRWFjaChyb29tID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cocm9vbS5jb29yZGluYXRlcyArIFwiIFwiICsgcm9vbS5leGl0cyk7XHJcbiAgICAgICAgICAgIHJvb20uZXhpdHMgPSBjYWxjUm9vbURvb3JzKHJvb20uY29vcmRpbmF0ZXMpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgcm9vbXMuZm9yRWFjaChyb29tID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJjYWxjZWQ6IFwiICsgcm9vbS5jb29yZGluYXRlcyArIFwiIFwiICsgcm9vbS5leGl0cyk7XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkUm9vbShfY3VycmVudFJvb206IFJvb20sIF9yb29tVHlwZTogR2VuZXJhdGlvbi5ST09NVFlQRSkge1xyXG4gICAgICAgIGxldCBudW1iZXJPZkV4aXRzOiBudW1iZXIgPSBjb3VudEJvb2woX2N1cnJlbnRSb29tLmV4aXRzKTtcclxuICAgICAgICBsZXQgcmFuZG9tTnVtYmVyOiBudW1iZXIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBudW1iZXJPZkV4aXRzKTtcclxuICAgICAgICBsZXQgcG9zc2libGVFeGl0SW5kZXg6IG51bWJlcltdID0gZ2V0RXhpdEluZGV4KF9jdXJyZW50Um9vbS5leGl0cyk7XHJcbiAgICAgICAgbGV0IG5ld1Jvb21Qb3NpdGlvbjogW251bWJlciwgbnVtYmVyXTtcclxuXHJcbiAgICAgICAgc3dpdGNoIChwb3NzaWJsZUV4aXRJbmRleFtyYW5kb21OdW1iZXJdKSB7XHJcbiAgICAgICAgICAgIGNhc2UgMDogLy8gbm9ydGhcclxuICAgICAgICAgICAgICAgIG5ld1Jvb21Qb3NpdGlvbiA9IFtfY3VycmVudFJvb20uY29vcmRpbmF0ZXNbMF0sIF9jdXJyZW50Um9vbS5jb29yZGluYXRlc1sxXSArIDFdO1xyXG4gICAgICAgICAgICAgICAgcm9vbXMucHVzaChuZXcgUm9vbSgobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpKTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTogLy8gZWFzdFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSArIDEsIF9jdXJyZW50Um9vbS5jb29yZGluYXRlc1sxXV07XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ldyBSb29tKChuZXdSb29tUG9zaXRpb24pLCBjYWxjUGF0aEV4aXRzKG5ld1Jvb21Qb3NpdGlvbiksIF9yb29tVHlwZSkpO1xyXG4gICAgICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5wdXNoKG5ld1Jvb21Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOiAvLyBzb3V0aFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSwgX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzFdIC0gMV07XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ldyBSb29tKChuZXdSb29tUG9zaXRpb24pLCBjYWxjUGF0aEV4aXRzKG5ld1Jvb21Qb3NpdGlvbiksIF9yb29tVHlwZSkpO1xyXG4gICAgICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5wdXNoKG5ld1Jvb21Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAzOiAvL3dlc3RcclxuICAgICAgICAgICAgICAgIG5ld1Jvb21Qb3NpdGlvbiA9IFtfY3VycmVudFJvb20uY29vcmRpbmF0ZXNbMF0gLSAxLCBfY3VycmVudFJvb20uY29vcmRpbmF0ZXNbMV1dO1xyXG4gICAgICAgICAgICAgICAgcm9vbXMucHVzaChuZXcgUm9vbSgobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpKTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgXHJcblxyXG4gICAgZnVuY3Rpb24gY291bnRCb29sKF9ib29sOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBjb3VudGVyOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIF9ib29sLmZvckVhY2goYm9vbCA9PiB7XHJcbiAgICAgICAgICAgIGlmIChib29sKSB7XHJcbiAgICAgICAgICAgICAgICBjb3VudGVyKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY291bnRlcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRFeGl0SW5kZXgoX2V4aXRzOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pOiBudW1iZXJbXSB7XHJcbiAgICAgICAgbGV0IG51bWJlcnM6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfZXhpdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKF9leGl0c1tpXSkge1xyXG4gICAgICAgICAgICAgICAgbnVtYmVycy5wdXNoKGkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bWJlcnM7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGNQYXRoRXhpdHMoX3Bvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdKTogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dIHtcclxuICAgICAgICBsZXQgbm9ydGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgZWFzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBzb3V0aDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCB3ZXN0OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IHJvb21OZWlnaGJvdXJzOiBbbnVtYmVyLCBudW1iZXJdW107XHJcbiAgICAgICAgcm9vbU5laWdoYm91cnMgPSBzbGljZU5laWdoYm91cnMoZ2V0TmVpZ2hib3VycyhfcG9zaXRpb24pKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJvb21OZWlnaGJvdXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChyb29tTmVpZ2hib3Vyc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgc291dGggPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyb29tTmVpZ2hib3Vyc1tpXVswXSAtIF9wb3NpdGlvblswXSA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgd2VzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJvb21OZWlnaGJvdXJzW2ldWzFdIC0gX3Bvc2l0aW9uWzFdID09IDEpIHtcclxuICAgICAgICAgICAgICAgIG5vcnRoID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocm9vbU5laWdoYm91cnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gMSkge1xyXG4gICAgICAgICAgICAgICAgZWFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFtub3J0aCwgZWFzdCwgc291dGgsIHdlc3RdO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGNSb29tRG9vcnMoX3Bvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdKTogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dIHtcclxuICAgICAgICBsZXQgbm9ydGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgZWFzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBzb3V0aDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCB3ZXN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdXNlZFBvc2l0aW9ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh1c2VkUG9zaXRpb25zW2ldWzBdIC0gX3Bvc2l0aW9uWzFdKTtcclxuICAgICAgICAgICAgaWYgKHVzZWRQb3NpdGlvbnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gLTEgJiYgdXNlZFBvc2l0aW9uc1tpXVswXSAtIF9wb3NpdGlvblswXSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBzb3V0aCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHVzZWRQb3NpdGlvbnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gLTEgJiYgdXNlZFBvc2l0aW9uc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB3ZXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodXNlZFBvc2l0aW9uc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAxICYmIHVzZWRQb3NpdGlvbnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgbm9ydGggPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh1c2VkUG9zaXRpb25zW2ldWzBdIC0gX3Bvc2l0aW9uWzBdID09IDEgJiYgdXNlZFBvc2l0aW9uc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBlYXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW25vcnRoLCBlYXN0LCBzb3V0aCwgd2VzdF07XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGdldE5laWdoYm91cnMoX3Bvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdKTogW251bWJlciwgbnVtYmVyXVtdIHtcclxuICAgICAgICBsZXQgbmVpZ2hib3VyczogW251bWJlciwgbnVtYmVyXVtdID0gW11cclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2goW19wb3NpdGlvblswXSwgX3Bvc2l0aW9uWzFdIC0gMV0pOyAvLyBkb3duXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKFtfcG9zaXRpb25bMF0gLSAxLCBfcG9zaXRpb25bMV1dKTsgLy8gbGVmdFxyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChbX3Bvc2l0aW9uWzBdLCBfcG9zaXRpb25bMV0gKyAxXSk7IC8vIHVwXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKFtfcG9zaXRpb25bMF0gKyAxLCBfcG9zaXRpb25bMV1dKTsgLy8gcmlnaHRcclxuICAgICAgICByZXR1cm4gbmVpZ2hib3VycztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzbGljZU5laWdoYm91cnMoX25laWdoYm91cnM6IFtudW1iZXIsIG51bWJlcl1bXSk6IFtudW1iZXIsIG51bWJlcl1bXSB7XHJcbiAgICAgICAgbGV0IG5laWdoYm91cnMgPSBfbmVpZ2hib3VycztcclxuICAgICAgICBsZXQgdG9SZW1vdmVJbmRleDogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5laWdoYm91cnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKG5laWdoYm91cnNbaV1bMF0gPCAwIHx8IG5laWdoYm91cnNbaV1bMV0gPCAwIHx8IG5laWdoYm91cnNbaV1bMF0gPiBtYXhYIHx8IG5laWdoYm91cnNbaV1bMV0gPiBtYXhZKSB7XHJcbiAgICAgICAgICAgICAgICB0b1JlbW92ZUluZGV4LnB1c2goaSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5laWdoYm91cnNbaV1bMF0gPT0gcm9vbVswXSAmJiBuZWlnaGJvdXJzW2ldWzFdID09IHJvb21bMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICB0b1JlbW92ZUluZGV4LnB1c2goaSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBjb3B5OiBbbnVtYmVyLCBudW1iZXJdW10gPSBbXTtcclxuICAgICAgICB0b1JlbW92ZUluZGV4LmZvckVhY2goaW5kZXggPT4ge1xyXG4gICAgICAgICAgICBkZWxldGUgbmVpZ2hib3Vyc1tpbmRleF07XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgbmVpZ2hib3Vycy5mb3JFYWNoKG4gPT4ge1xyXG4gICAgICAgICAgICBjb3B5LnB1c2gobik7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIGNvcHk7XHJcbiAgICB9XHJcbn0iXX0=