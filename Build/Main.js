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
    let GAMESTATES;
    (function (GAMESTATES) {
        GAMESTATES[GAMESTATES["PLAYING"] = 0] = "PLAYING";
        GAMESTATES[GAMESTATES["PAUSE"] = 1] = "PAUSE";
    })(GAMESTATES = Game.GAMESTATES || (Game.GAMESTATES = {}));
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
    Game.gamestate = GAMESTATES.PAUSE;
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
        await loadEnemiesJSON();
        Generation.generateRooms();
        Game.graph.appendChild(Game.avatar1);
        Game.ƒAid.addStandardLightComponents(Game.graph);
        cmpCamera.mtxPivot.translateZ(25);
        cmpCamera.mtxPivot.rotateY(180);
        Game.viewport.initialize("Viewport", Game.graph, cmpCamera, Game.canvas);
        draw();
        helper();
        function helper() {
            if (Game.avatar2 != undefined) {
                Game.ƒ.Loop.start(Game.ƒ.LOOP_MODE.TIME_GAME, Game.frameRate);
            }
            else {
                setTimeout(() => {
                    helper();
                }, 100);
            }
        }
    }
    function update() {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            InputSystem.move();
        }
        draw();
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            cameraUpdate();
            Game.avatar1.cooldown();
            if (Game.connected) {
                Game.avatar2.cooldown();
                Networking.updateAvatarPosition(Game.avatar1.mtxLocal.translation, Game.avatar1.mtxLocal.rotation);
            }
            // Networking.spawnEnemy(bat, bat.id);
            //#region count items
            let items = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ITEM);
            items.forEach(element => {
                element.lifespan(Game.graph);
                element.collisionDetection();
            });
            //#endregion
            Game.bullets = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.BULLET);
            if (Game.connected) {
                Game.bullets.forEach(element => {
                    element.move();
                    element.lifespan(Game.graph);
                });
            }
            let damageUI = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.DAMAGEUI);
            damageUI.forEach(element => {
                element.move();
                element.lifespan(Game.graph);
            });
            Game.enemies = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ENEMY);
            if (Game.connected && Networking.client.idHost == Networking.client.id) {
                Game.enemies.forEach(element => {
                    element.move();
                    element.lifespan(Game.graph);
                    if (element instanceof Enemy.EnemyShoot) {
                        element.weapon.cooldown(element.properties.attributes.coolDownReduction);
                    }
                });
                EnemySpawner.spawnEnemies();
            }
            UI.updateUI();
        }
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
        await Bullets.bulletTxt.load("./Resources/Image/arrow01.png");
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
        Networking.connected();
        if (Networking.clients.filter(elem => elem.ready == true).length >= 2 && Networking.client.idHost != undefined) {
            Game.connected = true;
            await init();
            Game.gamestate = GAMESTATES.PLAYING;
            Networking.spawnPlayer(playerType);
            //#region init Items
            if (Networking.client.id == Networking.client.idHost) {
                item1 = new Items.InternalItem("cooldown reduction", "adds speed and shit", new Game.ƒ.Vector3(0, 2, 0), new Player.Attributes(0, 0, 0, 100), Items.ITEMTYPE.PROCENTUAL, "./Resources/Image/Items");
                let item2 = new Items.InternalItem("cooldown reduction", "adds speed and shit", new Game.ƒ.Vector3(0, -2, 0), new Player.Attributes(0, 0, 0, 100), Items.ITEMTYPE.PROCENTUAL, "./Resources/Image/Items");
                Game.graph.appendChild(item1);
                Game.graph.appendChild(item2);
            }
            //#endregion
        }
        else {
            setTimeout(waitOnConnection, 300);
        }
    }
    function playerChoice(_e) {
        if (_e.target.id == "Ranged") {
            Game.avatar1 = new Player.Ranged("player", new Player.Character("Thor,", new Player.Attributes(10, 5, 5)));
            playerType = Player.PLAYERTYPE.RANGED;
        }
        if (_e.target.id == "Melee") {
            Game.avatar1 = new Player.Melee("player", new Player.Character("Thor,", new Player.Attributes(10, 1, 5)));
            playerType = Player.PLAYERTYPE.MELEE;
        }
        document.getElementById("Lobbyscreen").style.visibility = "hidden";
        readySate();
        function readySate() {
            if (Networking.client.idHost != undefined) {
                Networking.setClientReady();
            }
            if (Networking.clients.filter(elem => elem.ready == true).length < 2) {
                setTimeout(() => { readySate(); }, 200);
            }
        }
    }
    function draw() {
        Game.viewport.draw();
    }
    function cameraUpdate() {
        let direction = Game.ƒ.Vector2.DIFFERENCE(Game.avatar1.cmpTransform.mtxLocal.translation.toVector2(), cmpCamera.mtxPivot.translation.toVector2());
        direction.scale(1 / Game.frameRate * damper);
        cmpCamera.mtxPivot.translate(new Game.ƒ.Vector3(-direction.x, direction.y, 0), true);
    }
    Game.cameraUpdate = cameraUpdate;
    Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
    //#endregion "essential"
})(Game || (Game = {}));
var Enemy;
(function (Enemy_1) {
    let ENEMYNAME;
    (function (ENEMYNAME) {
        ENEMYNAME[ENEMYNAME["BAT"] = 0] = "BAT";
        ENEMYNAME[ENEMYNAME["TICK"] = 1] = "TICK";
    })(ENEMYNAME = Enemy_1.ENEMYNAME || (Enemy_1.ENEMYNAME = {}));
    function getNameByID(_id) {
        switch (_id) {
            case ENEMYNAME.BAT:
                return "bat";
            case ENEMYNAME.TICK:
                return "tick";
        }
    }
    Enemy_1.getNameByID = getNameByID;
    let BEHAVIOUR;
    (function (BEHAVIOUR) {
        BEHAVIOUR[BEHAVIOUR["IDLE"] = 0] = "IDLE";
        BEHAVIOUR[BEHAVIOUR["FOLLOW"] = 1] = "FOLLOW";
        BEHAVIOUR[BEHAVIOUR["FLEE"] = 2] = "FLEE";
    })(BEHAVIOUR || (BEHAVIOUR = {}));
    var ƒAid = FudgeAid;
    class Enemy extends Game.ƒAid.NodeSprite {
        currentState;
        tag = Tag.TAG.ENEMY;
        id;
        netId = Networking.idGenerator();
        properties;
        collider;
        target;
        lifetime;
        canMoveX = true;
        canMoveY = true;
        moveDirection = Game.ƒ.Vector3.ZERO();
        knockbackForce = 6;
        //#region  animation
        animations;
        clrWhite = ƒ.Color.CSS("white");
        //#endregion
        constructor(_id, _properties, _position, _netId) {
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
        doKnockback(_body) {
            _body.getKnockback(this.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }
        getKnockback(_knockbackForce, _position) {
            let direction = Game.ƒ.Vector2.DIFFERENCE(this.cmpTransform.mtxLocal.translation.toVector2(), _position.toVector2()).toVector3(0);
            direction.normalize();
            direction.scale(_knockbackForce * 1 / Game.frameRate);
            this.moveDirection.add(direction);
            helper(direction, this.moveDirection);
            function helper(_direction, _moveDirection) {
                if (_knockbackForce > 0.1) {
                    setTimeout(() => {
                        _moveDirection.subtract(direction);
                        _knockbackForce /= 3;
                        direction.scale(_knockbackForce * 1 / Game.frameRate);
                        _moveDirection.add(direction);
                        helper(_direction, _moveDirection);
                    }, 200);
                }
                else {
                    _moveDirection.subtract(direction);
                }
            }
        }
        updateCollider() {
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
        }
        moveSimple() {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
            let direction = Game.ƒ.Vector3.DIFFERENCE(this.target, this.cmpTransform.mtxLocal.translation);
            direction.normalize();
            direction.scale((1 / Game.frameRate * this.properties.attributes.speed));
            this.moveDirection.add(direction);
            this.getCanMoveXY(this.moveDirection);
            //TODO: in Funktion packen damit man von allem Enemies drauf zugreifen kann
            this.moveDirection.subtract(direction);
        }
        moveAway() {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
            let direction = Game.ƒ.Vector3.DIFFERENCE(this.cmpTransform.mtxLocal.translation, this.target);
            direction.normalize();
            direction.scale((1 / Game.frameRate * this.properties.attributes.speed));
            this.moveDirection.add(direction);
            this.getCanMoveXY(this.moveDirection);
            this.moveDirection.subtract(direction);
        }
        lifespan(_graph) {
            if (this.properties.attributes.healthPoints <= 0) {
                Networking.removeEnemy(this.netId);
                Networking.popID(this.netId);
                _graph.removeChild(this);
            }
        }
        getCanMoveXY(_direction) {
            let canMoveX = true;
            let canMoveY = true;
            let colliders = Game.graph.getChildren().find(element => element.tag == Tag.TAG.ROOM).walls;
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
            let avatarColliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.PLAYER);
            avatarColliders.forEach((element) => {
                if (this.collider.collides(element.collider)) {
                    let intersection = this.collider.getIntersection(element.collider);
                    let areaBeforeMove = Math.round((intersection) * 1000) / 1000;
                    let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                    let newDirection = new Game.ƒ.Vector2(_direction.x, 0);
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
            });
            if (canMoveX && canMoveY) {
                this.cmpTransform.mtxLocal.translate(_direction);
            }
            else if (canMoveX && !canMoveY) {
                _direction = new ƒ.Vector3(_direction.x, 0, _direction.z);
                this.cmpTransform.mtxLocal.translate(_direction);
            }
            else if (!canMoveX && canMoveY) {
                _direction = new ƒ.Vector3(0, _direction.y, _direction.z);
                this.cmpTransform.mtxLocal.translate(_direction);
            }
        }
    }
    Enemy_1.Enemy = Enemy;
    class EnemyDumb extends Enemy {
        constructor(_id, _properties, _position, _netId) {
            super(_id, _properties, _position, _netId);
        }
        move() {
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
                this.currentState = BEHAVIOUR.FOLLOW;
            }
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentState) {
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
    }
    Enemy_1.EnemyDumb = EnemyDumb;
    class EnemyShoot extends Enemy {
        weapon;
        constructor(_id, _properties, _position, _weapon, _netId) {
            super(_id, _properties, _position, _netId);
            this.weapon = _weapon;
        }
        move() {
            super.move();
            this.shoot();
        }
        shoot(_netId) {
            let target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation);
            let _direction = ƒ.Vector3.DIFFERENCE(target, this.mtxLocal.translation);
            if (this.weapon.currentAttackCount > 0) {
                _direction.normalize();
                let bullet = new Bullets.Bullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction, this, _netId);
                bullet.owner = this.tag;
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
                Game.graph.addChild(bullet);
                console.log("im shoooting baby");
                if (Networking.client.id == Networking.client.idHost) {
                    Networking.spawnBulletAtEnemy(bullet.netId, this.netId);
                    this.weapon.currentAttackCount--;
                }
            }
        }
    }
    Enemy_1.EnemyShoot = EnemyShoot;
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
        tag = Tag.TAG.ITEM;
        netId = Networking.idGenerator();
        description;
        imgSrc;
        collider;
        lifetime;
        constructor(_name, _description, _position, _imgSrc, _lifetime, _netId) {
            super(_name);
            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
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
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                    Networking.popID(this.netId);
                    Networking.removeItem(this.netId);
                }
            }
        }
        async collisionDetection() {
            let colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.PLAYER);
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
        constructor(_name, _description, _position, _attributes, _type, _imgSrc, _lifetime, _netId) {
            super(_name, _description, _position, _imgSrc, _lifetime, _netId);
            this.attributes = _attributes;
            this.type = _type;
            Networking.spawnItem(this.name, this.description, _position, this.imgSrc, this.lifetime, this.netId, this.attributes, this.type);
        }
        async collisionDetection() {
            let colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.PLAYER);
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider) && element.properties != undefined && (this.lifetime > 0 || this.lifetime == undefined)) {
                    element.properties.attributes.addAttribuesByItem(this.attributes, this.type);
                    Networking.updateAvatarAttributes(this.attributes, this.type);
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
                    this.healthPoints -= _attributes.healthPoints;
                    this.maxHealthPoints -= _attributes.maxHealthPoints;
                    this.speed -= _attributes.speed;
                    this.attackPoints -= _attributes.attackPoints;
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
        owner = Tag.TAG.PLAYER;
        netId = Networking.idGenerator();
        tick = 0;
        positions = [];
        hostPositions = [];
        tag = Tag.TAG.BULLET;
        flyDirection;
        collider;
        hitPoints = 5;
        speed = 20;
        lifetime = 1 * Game.frameRate;
        time = 0;
        killcount = 1;
        avatar;
        async lifespan(_graph) {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                    Networking.popID(this.netId);
                    Networking.removeBullet(this.netId);
                    // console.log(this.hostPositions);
                    // console.log(this.positions);
                }
            }
        }
        constructor(_position, _direction, _avatar, _netId) {
            super("normalBullet");
            this.avatar = _avatar;
            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            // this.addComponent(new ƒ.ComponentLight(new ƒ.LightPoint(ƒ.Color.CSS("white"))));
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            let mesh = new ƒ.MeshQuad();
            let cmpMesh = new ƒ.ComponentMesh(mesh);
            this.addComponent(cmpMesh);
            let mtrSolidWhite = new ƒ.Material("SolidWhite", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            let cmpMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);
            let newPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider = new Collider.Collider(newPosition, this.cmpTransform.mtxLocal.scaling.y / 1.5);
            this.updateRotation(_direction);
            this.loadTexture();
            this.flyDirection = ƒ.Vector3.X();
        }
        async move() {
            this.cmpTransform.mtxLocal.translate(this.flyDirection);
            this.bulletPrediction();
            this.collisionDetection();
        }
        updateRotation(_direction) {
            this.mtxLocal.rotateZ(Calculation.calcDegree(this.cmpTransform.mtxLocal.translation, ƒ.Vector3.SUM(_direction, this.cmpTransform.mtxLocal.translation)) + 90);
        }
        bulletPrediction() {
            this.time += Game.ƒ.Loop.timeFrameGame;
            while (this.time >= 1) {
                this.positions.push(new ƒ.Vector3(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.translation.z));
                if (Game.connected) {
                    Networking.updateBullet(this.cmpTransform.mtxLocal.translation, this.netId, this.tick);
                }
                this.tick++;
                this.time -= 1;
            }
            if (Networking.client.id != Networking.client.idHost) {
                if (this.tick >= 1 && this.hostPositions[this.tick - 1] != undefined && this.positions[this.tick - 1] != undefined) {
                    if (this.hostPositions[this.tick - 1].x != this.positions[this.tick - 1].x || this.hostPositions[this.tick - 1].y != this.positions[this.tick - 1].y) {
                        this.correctPosition();
                    }
                }
            }
        }
        async correctPosition() {
            if (this.hostPositions[this.tick] != undefined) {
                this.cmpTransform.mtxLocal.translation = this.hostPositions[this.tick];
            }
            else {
                setTimeout(() => { this.correctPosition; }, 100);
            }
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
            let newPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider.position = newPosition;
            let colliders = [];
            if (this.owner == Tag.TAG.PLAYER) {
                colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ENEMY);
            }
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider) && element.properties != undefined && this.killcount > 0) {
                    if (element.properties.attributes.healthPoints > 0) {
                        element.properties.attributes.healthPoints -= this.hitPoints;
                        this.avatar.doKnockback(element);
                        Game.graph.addChild(new UI.DamageUI(element.cmpTransform.mtxLocal.translation, this.hitPoints));
                        this.lifetime = 0;
                        this.killcount--;
                    }
                }
            });
            if (this.owner == Tag.TAG.ENEMY) {
                colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.PLAYER);
                colliders.forEach((element) => {
                    if (this.collider.collides(element.collider) && element.properties != undefined && this.killcount > 0) {
                        if (element.properties.attributes.healthPoints > 0) {
                            element.properties.attributes.healthPoints -= this.hitPoints;
                            this.avatar.doKnockback(element);
                            Game.graph.addChild(new UI.DamageUI(element.cmpTransform.mtxLocal.translation, this.hitPoints));
                            this.lifetime = 0;
                            this.killcount--;
                        }
                    }
                });
            }
            colliders = [];
            colliders = Game.graph.getChildren().find(element => element.tag == Tag.TAG.ROOM).walls;
            colliders.forEach((element) => {
                if (this.collider.collidesRect(element.collider)) {
                    this.lifetime = 0;
                }
            });
        }
    }
    Bullets.Bullet = Bullet;
    class SlowBullet extends Bullet {
        constructor(_position, _direction, _avatar, _netId) {
            super(_position, _direction, _avatar, _netId);
            this.speed = 6;
            this.hitPoints = 10;
            this.lifetime = 5 * Game.frameRate;
        }
    }
    Bullets.SlowBullet = SlowBullet;
    class MeleeBullet extends Bullet {
        constructor(_position, _direction, _avatar, _netId) {
            super(_position, _direction, _avatar, _netId);
            this.speed = 6;
            this.hitPoints = 10;
            this.lifetime = 6;
            this.killcount = 4;
        }
        async loadTexture() {
        }
    }
    Bullets.MeleeBullet = MeleeBullet;
    class HomingBullet extends Bullet {
        target = new ƒ.Vector3(0, 0, 0);
        rotateSpeed = 3;
        targetDirection;
        constructor(_position, _direction, _target, _avatar, _netId) {
            super(_position, _direction, _avatar, _netId);
            this.speed = 20;
            this.hitPoints = 5;
            this.lifetime = 1 * Game.frameRate;
            this.killcount = 1;
            this.target = _target;
            this.targetDirection = _direction;
        }
        async move() {
            this.calculateHoming();
            super.move();
        }
        calculateHoming() {
            let newDirection = ƒ.Vector3.DIFFERENCE(this.target, this.mtxLocal.translation);
            if (newDirection.x != 0 && newDirection.y != 0) {
                newDirection.normalize();
            }
            let rotateAmount2 = ƒ.Vector3.CROSS(newDirection, this.targetDirection).z;
            this.mtxLocal.rotateZ(-rotateAmount2 * this.rotateSpeed);
            this.targetDirection = Calculation.getRotatedVectorByAngle2D(this.targetDirection, -rotateAmount2 * this.rotateSpeed);
        }
    }
    Bullets.HomingBullet = HomingBullet;
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
                Game.graph.addChild(new Enemy.EnemyShoot(Enemy.ENEMYNAME.TICK, new Player.Character(ref.name, new Player.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed)), new ƒ.Vector2((Math.random() * 7 - (Math.random() * 7)) * 2, (Math.random() * 7 - (Math.random() * 7) * 2)), new Weapons.Weapon(60, 1)));
                // Game.graph.addChild(new Enemy.EnemyDumb(Enemy.ENEMYNAME.TICK, new Player.Character(ref.name, new Player.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed)), new ƒ.Vector2((Math.random() * 7 - (Math.random() * 7)) * 2, (Math.random() * 7 - (Math.random() * 7) * 2))));
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
var Calculation;
(function (Calculation) {
    function getCloserAvatarPosition(_startPoint) {
        let target = Game.avatar1;
        if (Game.connected) {
            let distancePlayer1 = _startPoint.getDistance(Game.avatar1.cmpTransform.mtxLocal.translation);
            let distancePlayer2 = _startPoint.getDistance(Game.avatar2.cmpTransform.mtxLocal.translation);
            if (distancePlayer1 < distancePlayer2) {
                target = Game.avatar1;
            }
            else {
                target = Game.avatar2;
            }
        }
        return target.cmpTransform.mtxLocal.translation;
    }
    Calculation.getCloserAvatarPosition = getCloserAvatarPosition;
    function calcDegree(_center, _target) {
        let xDistance = _target.x - _center.x;
        let yDistance = _target.y - _center.y;
        let degrees = Math.atan2(yDistance, xDistance) * (180 / Math.PI) - 90;
        return degrees;
    }
    Calculation.calcDegree = calcDegree;
    function getRotatedVectorByAngle2D(_vectorToRotate, _angle) {
        let angleToRadian = _angle * (Math.PI / 180);
        let newX = _vectorToRotate.x * Math.cos(angleToRadian) - _vectorToRotate.y * Math.sin(angleToRadian);
        let newY = _vectorToRotate.x * Math.sin(angleToRadian) + _vectorToRotate.y * Math.cos(angleToRadian);
        return new ƒ.Vector3(newX, newY, _vectorToRotate.z);
    }
    Calculation.getRotatedVectorByAngle2D = getRotatedVectorByAngle2D;
})(Calculation || (Calculation = {}));
var InputSystem;
(function (InputSystem) {
    document.addEventListener("keydown", keyboardDownEvent);
    document.addEventListener("keyup", keyboardUpEvent);
    Game.canvas.addEventListener("mousedown", attack);
    Game.canvas.addEventListener("mousemove", rotateToMouse);
    //#region rotate
    let mousePosition;
    function rotateToMouse(_mouseEvent) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            let ray = Game.viewport.getRayFromClient(new ƒ.Vector2(_mouseEvent.offsetX, _mouseEvent.offsetY));
            mousePosition = ray.intersectPlane(new ƒ.Vector3(0, 0, 0), new ƒ.Vector3(0, 0, 1));
            Game.avatar1.mtxLocal.rotation = new ƒ.Vector3(0, 0, Calculation.calcDegree(Game.avatar1.mtxLocal.translation, mousePosition));
        }
    }
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
    //#region move and ability
    let controller = new Map([
        ["W", false],
        ["A", false],
        ["S", false],
        ["D", false]
    ]);
    function keyboardDownEvent(_e) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            if (_e.code.toUpperCase() != "SPACE") {
                let key = _e.code.toUpperCase().substring(3);
                controller.set(key, true);
            }
            else {
                //Do abilty from player
                ability();
            }
        }
    }
    function keyboardUpEvent(_e) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            let key = _e.code.toUpperCase().substring(3);
            controller.set(key, false);
        }
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
            Game.avatar1.move(Game.ƒ.Vector3.NORMALIZATION(moveVector, 1));
        }
    }
    InputSystem.move = move;
    function ability() {
        Game.avatar1.doAbility();
    }
    //#endregion
    //#region attack
    function attack(e_) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            let mouseButton = e_.button;
            switch (mouseButton) {
                case 0:
                    //left mouse button player.attack
                    let direction = ƒ.Vector3.DIFFERENCE(mousePosition, Game.avatar1.mtxLocal.translation);
                    rotateToMouse(e_);
                    Game.avatar1.attack(direction, null, true);
                    break;
                case 2:
                    //TODO: right mouse button player.heavyAttack or something like that
                    break;
                default:
                    break;
            }
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
        FUNCTION[FUNCTION["SETREADY"] = 1] = "SETREADY";
        FUNCTION[FUNCTION["SPAWN"] = 2] = "SPAWN";
        FUNCTION[FUNCTION["TRANSFORM"] = 3] = "TRANSFORM";
        FUNCTION[FUNCTION["SPAWNBULLET"] = 4] = "SPAWNBULLET";
        FUNCTION[FUNCTION["SPAWNBULLETENEMY"] = 5] = "SPAWNBULLETENEMY";
        FUNCTION[FUNCTION["BULLETTRANSFORM"] = 6] = "BULLETTRANSFORM";
        FUNCTION[FUNCTION["BULLETDIE"] = 7] = "BULLETDIE";
        FUNCTION[FUNCTION["SPAWNENEMY"] = 8] = "SPAWNENEMY";
        FUNCTION[FUNCTION["ENEMYTRANSFORM"] = 9] = "ENEMYTRANSFORM";
        FUNCTION[FUNCTION["ENEMYDIE"] = 10] = "ENEMYDIE";
        FUNCTION[FUNCTION["SPAWNITEM"] = 11] = "SPAWNITEM";
        FUNCTION[FUNCTION["UPDATEATTRIBUTES"] = 12] = "UPDATEATTRIBUTES";
        FUNCTION[FUNCTION["ITEMDIE"] = 13] = "ITEMDIE";
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
                let obj = { id: Networking.client.id, ready: false };
                Networking.clients.push(obj);
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
                    //Add new client to array clients
                    if (message.content != undefined && message.content.text == FUNCTION.CONNECTED.toString()) {
                        if (message.content.value != Networking.client.id && Networking.clients.find(element => element == message.content.value) == undefined) {
                            if (Networking.client.idHost == undefined) {
                                setHost();
                            }
                            Networking.clients.push({ id: message.content.value, ready: false });
                        }
                    }
                    //Set client ready
                    if (message.content != undefined && message.content.text == FUNCTION.SETREADY.toString()) {
                        if (Networking.clients.find(element => element.id == message.content.netId) != null) {
                            Networking.clients.find(element => element.id == message.content.netId).ready = true;
                        }
                    }
                    //Spawn avatar2 as ranged or melee 
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWN.toString()) {
                        if (message.content.type == Player.PLAYERTYPE.MELEE) {
                            Game.avatar2 = new Player.Melee("player2", new Player.Character(message.content.value.name, new Player.Attributes(message.content.value.attributes.healthPoints, message.content.value.attributes.attackPoints, message.content.value.attributes.speed)));
                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            Game.graph.appendChild(Game.avatar2);
                        }
                        else if (message.content.type == Player.PLAYERTYPE.RANGED) {
                            Game.avatar2 = new Player.Ranged("player2", new Player.Character(message.content.value.name, new Player.Attributes(message.content.value.attributes.healthPoints, message.content.value.attributes.attackPoints, message.content.value.attributes.speed)));
                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            Game.graph.appendChild(Game.avatar2);
                        }
                    }
                    //Runtime updates and communication
                    if (Game.connected) {
                        //Sync avatar2 position and rotation
                        if (message.content != undefined && message.content.text == FUNCTION.TRANSFORM.toString()) {
                            let moveVector = new Game.ƒ.Vector3(message.content.value.data[0], message.content.value.data[1], message.content.value.data[2]);
                            let rotateVector = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);
                            Game.avatar2.mtxLocal.translation = moveVector;
                            Game.avatar2.mtxLocal.rotation = rotateVector;
                        }
                        //Spawn bullet from host
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNBULLET.toString()) {
                            Game.avatar2.attack(new Game.ƒ.Vector3(message.content.direction.data[0], message.content.direction.data[1], message.content.direction.data[2]), message.content.netId);
                        }
                        //Spawn bullet from enemy on host
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNBULLETENEMY.toString()) {
                            let enemy = Game.enemies.find(elem => elem.netId == message.content.enemyNetId);
                            console.log(message.content.bulletNetId);
                            if (enemy != null) {
                                if (enemy instanceof Enemy.EnemyShoot && Networking.client.id != Networking.client.idHost) {
                                    enemy.shoot(message.content.bulletNetId);
                                }
                            }
                        }
                        //Sync bullet transform from host to client
                        if (message.content != undefined && message.content.text == FUNCTION.BULLETTRANSFORM.toString()) {
                            if (Game.bullets.find(element => element.netId == message.content.netId) != null) {
                                let newPosition = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                Game.bullets.find(element => element.netId == message.content.netId).hostPositions[message.content.tick] = newPosition;
                            }
                        }
                        //Kill bullet at the client from host
                        if (message.content != undefined && message.content.text == FUNCTION.BULLETDIE.toString()) {
                            if (Networking.client.id != Networking.client.idHost) {
                                let bullet = Game.bullets.find(element => element.netId == message.content.netId);
                                if (bullet != undefined) {
                                    bullet.lifetime = 0;
                                }
                            }
                        }
                        //Spawn enemy at the client 
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNENEMY.toString()) {
                            console.log("enemy: " + message.content.properties.attributes);
                            chooseEnemy(message.content.id, new Player.Attributes(message.content.properties.attributes.healthPoints, message.content.properties.attributes.attackPoints, message.content.properties.attributes.speed), new ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]), message.content.netId);
                        }
                        //Sync enemy transform from host to client
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYTRANSFORM.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.netId);
                            if (enemy != undefined) {
                                enemy.cmpTransform.mtxLocal.translation = new ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                enemy.updateCollider();
                            }
                        }
                        //Kill enemy at the client from host
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYDIE.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.netId);
                            Game.graph.removeChild(enemy);
                            popID(message.content.netId);
                        }
                        //Spawn item from host
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNITEM.toString()) {
                            if (Networking.client.id != Networking.client.idHost) {
                                if (message.content.attributes != null) {
                                    let attributes = new Player.Attributes(message.content.attributes.healthPoints, message.content.attributes.attackPoints, message.content.attributes.speed, message.content.attributes.coolDownReduction);
                                    Game.graph.addChild(new Items.InternalItem(message.content.name, message.content.description, new ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]), attributes, message.content.type, message.content.imgSrc, message.content.lifetime, message.content.netId));
                                }
                                //TODO: external Item
                            }
                        }
                        //Spawn item from host
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEATTRIBUTES.toString()) {
                            let attributes = new Player.Attributes(message.content.attributes.healthPoints, message.content.attributes.attackPoints, message.content.attributes.speed, message.content.attributes.coolDownReduction);
                            Game.avatar2.properties.attributes.addAttribuesByItem(attributes, message.content.type);
                        }
                        //Kill item from host
                        if (message.content != undefined && message.content.text == FUNCTION.ITEMDIE.toString()) {
                            let item = Game.graph.getChildren().find(enem => enem.netId == message.content.netId);
                            Game.graph.removeChild(item);
                            popID(message.content.netId);
                        }
                    }
                }
            }
        }
    }
    function chooseEnemy(_id, _properties, _position, _netId) {
        switch (_id) {
            case Enemy.ENEMYNAME.BAT:
                Game.graph.addChild(new Enemy.EnemyDumb(Enemy.ENEMYNAME.BAT, new Player.Character(Enemy.getNameByID(_id), new Player.Attributes(_properties.healthPoints, _properties.attackPoints, _properties.speed)), _position.toVector2(), _netId));
                break;
            case Enemy.ENEMYNAME.TICK:
                let newEnem = new Enemy.EnemyShoot(_id, new Player.Character(Enemy.getNameByID(_id), new Player.Attributes(_properties.healthPoints, _properties.attackPoints, _properties.speed)), _position.toVector2(), new Weapons.Weapon(10, 1), _netId);
                Game.graph.addChild(newEnem);
        }
    }
    function setClientReady() {
        Networking.clients.find(element => element.id == Networking.client.id).ready = true;
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SETREADY, netId: Networking.client.id } });
    }
    Networking.setClientReady = setClientReady;
    //#region player
    function setHost() {
        if (Networking.client.idHost == undefined) {
            Networking.client.becomeHost();
            Networking.someoneIsHost = true;
            console.log("IM THE HOST IM THE HOST");
        }
        else {
            Networking.someoneIsHost = true;
        }
    }
    Networking.setHost = setHost;
    function spawnPlayer(_type) {
        if (_type == Player.PLAYERTYPE.MELEE) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.PLAYERTYPE.MELEE, value: Game.avatar1.properties, position: Game.avatar1.cmpTransform.mtxLocal.translation } });
        }
        else if (_type == Player.PLAYERTYPE.RANGED) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.PLAYERTYPE.RANGED, value: Game.avatar1.properties, position: Game.avatar1.cmpTransform.mtxLocal.translation } });
        }
        else {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.PLAYERTYPE.RANGED, value: Game.avatar1.properties, position: Game.avatar1.cmpTransform.mtxLocal.translation } });
        }
    }
    Networking.spawnPlayer = spawnPlayer;
    function connected() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: Networking.FUNCTION.CONNECTED, value: Networking.client.id } });
    }
    Networking.connected = connected;
    /**
     * sends transform over network
     * @param __position current position of Object
     * @param _rotation current rotation of Object
     */
    function updateAvatarPosition(_position, _rotation) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.TRANSFORM, value: _position, rotation: _rotation } });
    }
    Networking.updateAvatarPosition = updateAvatarPosition;
    //#endregion
    //#region bullet
    function spawnBullet(_direction, _netId) {
        if (Game.connected) {
            6;
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWNBULLET, direction: _direction, netId: _netId } });
        }
    }
    Networking.spawnBullet = spawnBullet;
    function updateBullet(_position, _netId, _tick) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.BULLETTRANSFORM, position: _position, netId: _netId, tick: _tick } });
        }
    }
    Networking.updateBullet = updateBullet;
    async function spawnBulletAtEnemy(_bulletNetId, _enemyNetId) {
        if (Game.connected) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWNBULLETENEMY, bulletNetId: _bulletNetId, enemyNetId: _enemyNetId } });
        }
    }
    Networking.spawnBulletAtEnemy = spawnBulletAtEnemy;
    function removeBullet(_netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.BULLETDIE, netId: _netId } });
        }
    }
    Networking.removeBullet = removeBullet;
    //#endregion
    //#region  enemy
    function spawnEnemy(_enemy, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWNENEMY, id: _enemy.id, properties: _enemy.properties, position: _enemy.mtxLocal.translation, netId: _netId } });
        }
    }
    Networking.spawnEnemy = spawnEnemy;
    function updateEnemyPosition(_position, _netId) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.ENEMYTRANSFORM, position: _position, netId: _netId } });
    }
    Networking.updateEnemyPosition = updateEnemyPosition;
    function removeEnemy(_netId) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.ENEMYDIE, netId: _netId } });
    }
    Networking.removeEnemy = removeEnemy;
    //#endregion
    //#region Items
    function spawnItem(_name, _description, _position, _imgSrc, _lifetime, _netId, _attributes, _type) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            console.log(_attributes);
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWNITEM, name: _name, description: _description, position: _position, imgSrc: _imgSrc, lifetime: _lifetime, netId: _netId, attributes: _attributes, type: _type } });
        }
    }
    Networking.spawnItem = spawnItem;
    function updateAvatarAttributes(_attributes, _type) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.UPDATEATTRIBUTES, attributes: _attributes, type: _type } });
    }
    Networking.updateAvatarAttributes = updateAvatarAttributes;
    function removeItem(_netId) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.ITEMDIE, netId: _netId } });
    }
    Networking.removeItem = removeItem;
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
        Networking.currentIDs.splice(index, 1);
    }
    Networking.popID = popID;
    window.addEventListener("beforeunload", onUnload, false);
    function onUnload() {
        //TODO: Things we do after the player left the game
    }
})(Networking || (Networking = {}));
var Player;
(function (Player_1) {
    let PLAYERTYPE;
    (function (PLAYERTYPE) {
        PLAYERTYPE[PLAYERTYPE["RANGED"] = 0] = "RANGED";
        PLAYERTYPE[PLAYERTYPE["MELEE"] = 1] = "MELEE";
    })(PLAYERTYPE = Player_1.PLAYERTYPE || (Player_1.PLAYERTYPE = {}));
    class Player extends Game.ƒAid.NodeSprite {
        tag = Tag.TAG.PLAYER;
        items = [];
        properties;
        weapon = new Weapons.Weapon(12, 1);
        collider;
        moveDirection = Game.ƒ.Vector3.ZERO();
        knockbackForce = 6;
        abilityCount = 1;
        currentabilityCount = this.abilityCount;
        abilityCooldownTime = 10;
        currentabilityCooldownTime = this.abilityCooldownTime;
        constructor(_name, _properties) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.translateZ(0.1);
            this.properties = _properties;
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2);
        }
        move(_direction) {
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
            _direction.scale((1 / 60 * this.properties.attributes.speed));
            this.moveDirection.add(_direction);
            this.collids(this.moveDirection);
            let doors = Game.graph.getChildren().find(element => element.tag == Tag.TAG.ROOM).doors;
            doors.forEach((element) => {
                if (this.collider.collidesRect(element.collider)) {
                    element.changeRoom();
                }
            });
            this.moveDirection.subtract(_direction);
        }
        collids(_direction) {
            let canMoveX = true;
            let canMoveY = true;
            let colliders = Game.graph.getChildren().find(element => element.tag == Tag.TAG.ROOM).walls;
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
            let enemyColliders = Game.enemies;
            enemyColliders.forEach((element) => {
                if (this.collider.collides(element.collider)) {
                    let intersection = this.collider.getIntersection(element.collider);
                    let areaBeforeMove = Math.round((intersection) * 1000) / 1000;
                    let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                    let newDirection = new Game.ƒ.Vector2(_direction.x, 0);
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
        attack(_direction, _netId, _sync) {
            if (this.weapon.currentAttackCount > 0) {
                _direction.normalize();
                let bullet = new Bullets.Bullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction, this, _netId);
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
                Game.graph.addChild(bullet);
                if (_sync) {
                    Networking.spawnBullet(_direction, bullet.netId);
                }
                this.weapon.currentAttackCount--;
            }
        }
        doKnockback(_body) {
            _body.getKnockback(this.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }
        getKnockback(_knockbackForce, _position) {
            let direction = Game.ƒ.Vector2.DIFFERENCE(this.cmpTransform.mtxLocal.translation.toVector2(), _position.toVector2()).toVector3(0);
            direction.normalize();
            direction.scale(_knockbackForce * 1 / Game.frameRate);
            this.moveDirection.add(direction);
            helper(direction, this.moveDirection);
            function helper(_direction, _moveDirection) {
                if (_knockbackForce > 0.1) {
                    setTimeout(() => {
                        _moveDirection.subtract(direction);
                        _knockbackForce /= 3;
                        direction.scale(_knockbackForce * 1 / Game.frameRate);
                        _moveDirection.add(direction);
                        helper(_direction, _moveDirection);
                    }, 200);
                }
                else {
                    _moveDirection.subtract(direction);
                }
            }
        }
        doAbility() {
        }
        cooldown() {
            this.weapon.cooldown(this.properties.attributes.coolDownReduction);
            if (this.currentabilityCount <= 0) {
                if (this.currentabilityCooldownTime <= 0) {
                    this.currentabilityCooldownTime = this.abilityCooldownTime;
                    this.currentabilityCount = this.abilityCount;
                }
                else {
                    this.currentabilityCooldownTime--;
                }
            }
        }
    }
    Player_1.Player = Player;
    class Melee extends Player {
        abilityCount = 1;
        currentabilityCount = this.abilityCount;
        abilityCooldownTime = 40;
        currentabilityCooldownTime = this.abilityCooldownTime;
        attack(_direction, _netId, _sync) {
            if (this.weapon.currentAttackCount > 0) {
                _direction.normalize();
                let bullet = new Bullets.MeleeBullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction, this, _netId);
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
                Game.graph.addChild(bullet);
                if (_sync) {
                    Networking.spawnBullet(_direction, bullet.netId);
                }
                this.weapon.currentAttackCount--;
            }
        }
        doAbility() {
            if (this.currentabilityCount > 0) {
                this.properties.attributes.speed *= 4;
                setTimeout(() => {
                    this.properties.attributes.speed /= 2;
                    setTimeout(() => {
                        this.properties.attributes.speed /= 2;
                    }, 100);
                }, 300);
                this.currentabilityCount--;
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
        tag = Tag.TAG.ROOM;
        roomType;
        coordinates; // X Y
        walls = [];
        doors = [];
        finished = false;
        neighbourN;
        neighbourE;
        neighbourS;
        neighbourW;
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
            this.walls.push(new Wall(this.cmpTransform.mtxLocal.translation.toVector2(), this.roomSize, [true, false, false, false]));
            this.walls.push(new Wall(this.cmpTransform.mtxLocal.translation.toVector2(), this.roomSize, [false, true, false, false]));
            this.walls.push(new Wall(this.cmpTransform.mtxLocal.translation.toVector2(), this.roomSize, [false, false, true, false]));
            this.walls.push(new Wall(this.cmpTransform.mtxLocal.translation.toVector2(), this.roomSize, [false, false, false, true]));
        }
        setDoors() {
            if (this.exits[0]) {
                this.doors.push(new Door(this, this.cmpTransform.mtxLocal.translation.toVector2(), [true, false, false, false], this.roomSize));
            }
            if (this.exits[1]) {
                this.doors.push(new Door(this, this.cmpTransform.mtxLocal.translation.toVector2(), [false, true, false, false], this.roomSize));
            }
            if (this.exits[2]) {
                this.doors.push(new Door(this, this.cmpTransform.mtxLocal.translation.toVector2(), [false, false, true, false], this.roomSize));
            }
            if (this.exits[3]) {
                this.doors.push(new Door(this, this.cmpTransform.mtxLocal.translation.toVector2(), [false, false, false, true], this.roomSize));
            }
            for (let i = 0; i < this.doors.length; i++) {
                this.addChild(this.doors[i]);
            }
        }
        getRoomSize() {
            return this.roomSize;
        }
    }
    Generation.Room = Room;
    class Wall extends ƒ.Node {
        tag = Tag.TAG.WALL;
        collider;
        wallThickness = 2;
        constructor(_position, _width, _direction) {
            super("Wall");
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("red", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("red")))));
            this.cmpTransform.mtxLocal.translation = _position.toVector3(0);
            if (_direction[0]) {
                this.cmpTransform.mtxLocal.translation.y += _width / 2 + this.wallThickness / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(_width, this.wallThickness, 0);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.wallThickness, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction[1]) {
                this.cmpTransform.mtxLocal.translation.x += _width / 2 + this.wallThickness / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.wallThickness, _width, 0);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.wallThickness, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction[2]) {
                this.cmpTransform.mtxLocal.translation.y -= _width / 2 + this.wallThickness / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(_width, this.wallThickness, 0);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.wallThickness, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction[3]) {
                this.cmpTransform.mtxLocal.translation.x -= _width / 2 + this.wallThickness / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.wallThickness, _width, 0);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.wallThickness, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
        }
    }
    Generation.Wall = Wall;
    class Door extends ƒ.Node {
        tag = Tag.TAG.DOOR;
        collider;
        doorWidth = 3;
        doorThickness = 1;
        parentRoom;
        direction;
        constructor(_parent, _position, _direction, _roomSize) {
            super("Door");
            this.direction = _direction;
            this.parentRoom = _parent;
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("red", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")))));
            this.cmpTransform.mtxLocal.translation = _position.toVector3(0.01);
            if (_direction[0]) {
                this.cmpTransform.mtxLocal.translation.y += _roomSize / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.doorWidth, this.doorThickness, 0.001);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction[1]) {
                this.cmpTransform.mtxLocal.translation.x += _roomSize / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.doorThickness, this.doorWidth, 0.001);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction[2]) {
                this.cmpTransform.mtxLocal.translation.y -= _roomSize / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.doorWidth, this.doorThickness, 0.001);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction[3]) {
                this.cmpTransform.mtxLocal.translation.x -= _roomSize / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.doorThickness, this.doorWidth, 0.001);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
        }
        changeRoom() {
            if (this.parentRoom.finished) {
                console.log("collision!");
                Generation.switchRoom(this.parentRoom, this.direction);
            }
        }
    }
    Generation.Door = Door;
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
        for (let i = 0; i < rooms.length; i++) {
            rooms[i].setDoors();
        }
        Game.graph.addChild(rooms[0]);
        Game.graph.appendChild(rooms[0].walls[0]);
        Game.graph.appendChild(rooms[0].walls[1]);
        Game.graph.appendChild(rooms[0].walls[2]);
        Game.graph.appendChild(rooms[0].walls[3]);
        for (let i = 0; i < rooms[0].doors.length; i++) {
            Game.graph.addChild(rooms[0].doors[i]);
        }
    }
    Generation.generateRooms = generateRooms;
    function addRoom(_currentRoom, _roomType) {
        let numberOfExits = countBool(_currentRoom.exits);
        let randomNumber = Math.floor(Math.random() * numberOfExits);
        let possibleExitIndex = getExitIndex(_currentRoom.exits);
        let newRoomPosition;
        let newRoom;
        switch (possibleExitIndex[randomNumber]) {
            case 0: // north
                newRoomPosition = [_currentRoom.coordinates[0], _currentRoom.coordinates[1] + 1];
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                rooms.push(newRoom);
                _currentRoom.neighbourN = newRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 1: // east
                newRoomPosition = [_currentRoom.coordinates[0] + 1, _currentRoom.coordinates[1]];
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                rooms.push(newRoom);
                _currentRoom.neighbourE = newRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 2: // south
                newRoomPosition = [_currentRoom.coordinates[0], _currentRoom.coordinates[1] - 1];
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                rooms.push(newRoom);
                _currentRoom.neighbourS = newRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 3: //west
                newRoomPosition = [_currentRoom.coordinates[0] - 1, _currentRoom.coordinates[1]];
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                rooms.push(newRoom);
                _currentRoom.neighbourW = newRoom;
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
    function switchRoom(_currentRoom, _direction) {
        let oldObjects = Game.graph.getChildren().filter(elem => elem.tag != Tag.TAG.PLAYER);
        oldObjects.forEach((elem) => {
            Game.graph.removeChild(elem);
        });
        if (_direction[0]) {
            Game.graph.addChild(_currentRoom.neighbourN);
            Game.graph.appendChild(_currentRoom.neighbourN.walls[0]);
            Game.graph.appendChild(_currentRoom.neighbourN.walls[1]);
            Game.graph.appendChild(_currentRoom.neighbourN.walls[2]);
            Game.graph.appendChild(_currentRoom.neighbourN.walls[3]);
            Game.avatar1.cmpTransform.mtxLocal.translation = _currentRoom.neighbourN.cmpTransform.mtxLocal.translation;
            Game.avatar2.cmpTransform.mtxLocal.translation = _currentRoom.neighbourN.cmpTransform.mtxLocal.translation;
            for (let i = 0; i < _currentRoom.neighbourN.doors.length; i++) {
                Game.graph.addChild(_currentRoom.neighbourN.doors[i]);
            }
        }
        if (_direction[1]) {
            Game.graph.addChild(_currentRoom.neighbourE);
            Game.graph.appendChild(_currentRoom.neighbourE.walls[0]);
            Game.graph.appendChild(_currentRoom.neighbourE.walls[1]);
            Game.graph.appendChild(_currentRoom.neighbourE.walls[2]);
            Game.graph.appendChild(_currentRoom.neighbourE.walls[3]);
            Game.avatar1.cmpTransform.mtxLocal.translation = _currentRoom.neighbourE.cmpTransform.mtxLocal.translation;
            Game.avatar2.cmpTransform.mtxLocal.translation = _currentRoom.neighbourE.cmpTransform.mtxLocal.translation;
            for (let i = 0; i < _currentRoom.neighbourE.doors.length; i++) {
                Game.graph.addChild(_currentRoom.neighbourE.doors[i]);
            }
        }
        if (_direction[2]) {
            Game.graph.addChild(_currentRoom.neighbourS);
            Game.graph.appendChild(_currentRoom.neighbourS.walls[0]);
            Game.graph.appendChild(_currentRoom.neighbourS.walls[1]);
            Game.graph.appendChild(_currentRoom.neighbourS.walls[2]);
            Game.graph.appendChild(_currentRoom.neighbourS.walls[3]);
            Game.avatar1.cmpTransform.mtxLocal.translation = _currentRoom.neighbourS.cmpTransform.mtxLocal.translation;
            Game.avatar2.cmpTransform.mtxLocal.translation = _currentRoom.neighbourS.cmpTransform.mtxLocal.translation;
            for (let i = 0; i < _currentRoom.neighbourS.doors.length; i++) {
                Game.graph.addChild(_currentRoom.neighbourS.doors[i]);
            }
        }
        if (_direction[3]) {
            Game.graph.addChild(_currentRoom.neighbourW);
            Game.graph.appendChild(_currentRoom.neighbourW.walls[0]);
            Game.graph.appendChild(_currentRoom.neighbourW.walls[1]);
            Game.graph.appendChild(_currentRoom.neighbourW.walls[2]);
            Game.graph.appendChild(_currentRoom.neighbourW.walls[3]);
            Game.avatar1.cmpTransform.mtxLocal.translation = _currentRoom.neighbourW.cmpTransform.mtxLocal.translation;
            Game.avatar2.cmpTransform.mtxLocal.translation = _currentRoom.neighbourW.cmpTransform.mtxLocal.translation;
            for (let i = 0; i < _currentRoom.neighbourW.doors.length; i++) {
                Game.graph.addChild(_currentRoom.neighbourW.doors[i]);
            }
        }
    }
    Generation.switchRoom = switchRoom;
})(Generation || (Generation = {}));
var Tag;
(function (Tag) {
    let TAG;
    (function (TAG) {
        TAG[TAG["PLAYER"] = 0] = "PLAYER";
        TAG[TAG["ENEMY"] = 1] = "ENEMY";
        TAG[TAG["BULLET"] = 2] = "BULLET";
        TAG[TAG["ITEM"] = 3] = "ITEM";
        TAG[TAG["ROOM"] = 4] = "ROOM";
        TAG[TAG["WALL"] = 5] = "WALL";
        TAG[TAG["DOOR"] = 6] = "DOOR";
        TAG[TAG["DAMAGEUI"] = 7] = "DAMAGEUI";
    })(TAG = Tag.TAG || (Tag.TAG = {}));
})(Tag || (Tag = {}));
var UI;
(function (UI) {
    //let divUI: HTMLDivElement = <HTMLDivElement>document.getElementById("UI");
    let player1UI = document.getElementById("Player1");
    let player2UI = document.getElementById("Player2");
    function updateUI() {
        //Avatar1 UI
        player1UI.querySelector("#HP").style.width = (Game.avatar1.properties.attributes.healthPoints / Game.avatar1.properties.attributes.maxHealthPoints * 100) + "%";
        //InventoryUI
        Game.avatar1.items.forEach((element) => {
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
        //Avatar2 UI
        if (Game.connected) {
            player2UI.querySelector("#HP").style.width = (Game.avatar2.properties.attributes.healthPoints / Game.avatar2.properties.attributes.maxHealthPoints * 100) + "%";
            //InventoryUI
            Game.avatar2.items.forEach((element) => {
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
        tag = Tag.TAG.DAMAGEUI;
        up = 0.15;
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
        async move() {
            this.cmpTransform.mtxLocal.translate(new ƒ.Vector3(0, this.up, 0));
            this.cmpTransform.mtxLocal.scale(ƒ.Vector3.ONE(1.01));
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
        cooldown(_faktor) {
            let specificCoolDownTime = this.cooldownTime * _faktor;
            if (this.currentAttackCount <= 0) {
                if (this.currentCooldownTime <= 0) {
                    this.currentCooldownTime = specificCoolDownTime;
                    this.currentAttackCount = this.attackCount;
                }
                else {
                    // console.log(this.currentCooldownTime);
                    this.currentCooldownTime--;
                }
            }
        }
    }
    Weapons.Weapon = Weapon;
})(Weapons || (Weapons = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL0NsYXNzZXMvTWFpbi50cyIsIi4uL0NsYXNzZXMvSW50ZXJmYWNlcy50cyIsIi4uL0NsYXNzZXMvRW5lbXkudHMiLCIuLi9DbGFzc2VzL0l0ZW1zLnRzIiwiLi4vQ2xhc3Nlcy9BdHRyaWJ1dGVzLnRzIiwiLi4vQ2xhc3Nlcy9CdWxsZXQudHMiLCIuLi9DbGFzc2VzL0NoYXJhY3Rlci50cyIsIi4uL0NsYXNzZXMvQ29sbGlkZXIudHMiLCIuLi9DbGFzc2VzL0VuZW15U3Bhd25lci50cyIsIi4uL0NsYXNzZXMvR2FtZUNhbGN1bGF0aW9uLnRzIiwiLi4vQ2xhc3Nlcy9JbnB1dFN5c3RlbS50cyIsIi4uL0NsYXNzZXMvTGFuZHNjYXBlLnRzIiwiLi4vQ2xhc3Nlcy9OZXR3b3JraW5nLnRzIiwiLi4vQ2xhc3Nlcy9QbGF5ZXIudHMiLCIuLi9DbGFzc2VzL1Jvb20udHMiLCIuLi9DbGFzc2VzL1Jvb21HZW5lcmF0aW9uLnRzIiwiLi4vQ2xhc3Nlcy9UYWcudHMiLCIuLi9DbGFzc2VzL1VJLnRzIiwiLi4vQ2xhc3Nlcy9XZWFwb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtQkFBbUI7QUFDbkIsd0RBQXdEO0FBQ3hELHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFFdEIsSUFBVSxJQUFJLENBb09iO0FBek9ELG1CQUFtQjtBQUNuQix3REFBd0Q7QUFDeEQsc0RBQXNEO0FBQ3RELHNCQUFzQjtBQUV0QixXQUFVLElBQUk7SUFDVixJQUFZLFVBR1g7SUFIRCxXQUFZLFVBQVU7UUFDbEIsaURBQU8sQ0FBQTtRQUNQLDZDQUFLLENBQUE7SUFDVCxDQUFDLEVBSFcsVUFBVSxHQUFWLGVBQVUsS0FBVixlQUFVLFFBR3JCO0lBRWEsTUFBQyxHQUFHLFNBQVMsQ0FBQztJQUNkLFNBQUksR0FBRyxRQUFRLENBQUM7SUFHOUIsdUJBQXVCO0lBQ1osV0FBTSxHQUF5QyxRQUFRLENBQUMsY0FBYyxD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SCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxSCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxSCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5SCxDQUFDO1FBRU0sUUFBUTtZQUNYLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDZixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7YUFDbkk7WUFDRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2FBQ25JO1lBQ0QsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQzthQUNuSTtZQUNELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDZixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7YUFDbkk7WUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3hDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2hDO1FBQ0wsQ0FBQztRQUVNLFdBQVc7WUFDZCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDekIsQ0FBQztLQUNKO0lBckZZLGVBQUksT0FxRmhCLENBQUE7SUFFRCxNQUFhLElBQUssU0FBUSxDQUFDLENBQUMsSUFBSTtRQUNyQixHQUFHLEdBQVksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDNUIsUUFBUSxDQUFtQjtRQUMzQixhQUFhLEdBQVcsQ0FBQyxDQUFDO1FBRWpDLFlBQVksU0FBeUIsRUFBRSxNQUFjLEVBQUUsVUFBZ0Q7WUFDbkcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRWQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUM7WUFDOUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUN2RCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV6SCxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUdoRSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDZixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7Z0JBQ2hGLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN2RixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUM5TTtZQUNELElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNmLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksTUFBTSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQztnQkFDaEYsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZGLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQzlNO1lBQ0QsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO2dCQUNoRixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDdkYsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDOU07WUFDRCxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDZixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7Z0JBQ2hGLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN2RixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUM5TTtRQUVMLENBQUM7S0FDSjtJQXJDWSxlQUFJLE9BcUNoQixDQUFBO0lBRUQsTUFBYSxJQUFLLFNBQVEsQ0FBQyxDQUFDLElBQUk7UUFDckIsR0FBRyxHQUFZLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQzVCLFFBQVEsQ0FBbUI7UUFDM0IsU0FBUyxHQUFXLENBQUMsQ0FBQztRQUN0QixhQUFhLEdBQVcsQ0FBQyxDQUFDO1FBQzFCLFVBQVUsQ0FBTztRQUV4QixTQUFTLENBQXVDO1FBRWhELFlBQVksT0FBYSxFQUFFLFNBQXlCLEVBQUUsVUFBZ0QsRUFBRSxTQUFpQjtZQUNySCxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFZCxJQUFJLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQztZQUM1QixJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQztZQUUxQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQztZQUM5QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ3ZELElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTNILElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRW5FLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNmLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNuRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUNoTztZQUNELElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNmLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNuRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUNoTztZQUNELElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNmLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNuRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUNoTztZQUNELElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNmLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNuRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUNoTztRQUNMLENBQUM7UUFFTSxVQUFVO1lBQ2IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRTtnQkFDMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFFMUIsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUMxRDtRQUNMLENBQUM7S0FDSjtJQWxEWSxlQUFJLE9Ba0RoQixDQUFBO0FBQ0wsQ0FBQyxFQTNMUyxVQUFVLEtBQVYsVUFBVSxRQTJMbkI7QUMzTEQsSUFBVSxVQUFVLENBbVJuQjtBQW5SRCxXQUFVLFVBQVU7SUFFaEIsSUFBSSxhQUFhLEdBQVcsQ0FBQyxDQUFDO0lBQzlCLElBQUksYUFBYSxHQUF1QixFQUFFLENBQUM7SUFDM0MsSUFBSSxLQUFLLEdBQVcsRUFBRSxDQUFDO0lBRXZCLGVBQWU7SUFDZixJQUFJLHdCQUF3QixHQUFXLEVBQUUsQ0FBQztJQUMxQyxJQUFJLHVCQUF1QixHQUFXLEVBQUUsQ0FBQztJQUV6QyxTQUFnQixhQUFhO1FBQ3pCLElBQUksV0FBVyxHQUFxQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksV0FBQSxJQUFJLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxhQUFhLENBQUMsV0FBVyxDQUFDLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3JHLGFBQWEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFaEMsS0FBSyxJQUFJLENBQUMsR0FBVyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGFBQWEsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM1QyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNoRTtRQUNELE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNELGVBQWUsRUFBRSxDQUFDO1FBQ2xCLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9ELEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDakIsSUFBSSxDQUFDLEtBQUssR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzdDLHFGQUFxRjtRQUN6RixDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ25DLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztTQUN2QjtRQUVELElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUxQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDNUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzFDO0lBQ0wsQ0FBQztJQTlCZSx3QkFBYSxnQkE4QjVCLENBQUE7SUFFRCxTQUFTLE9BQU8sQ0FBQyxZQUFrQixFQUFFLFNBQThCO1FBQy9ELElBQUksYUFBYSxHQUFXLFNBQVMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUQsSUFBSSxZQUFZLEdBQVcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsYUFBYSxDQUFDLENBQUM7UUFDckUsSUFBSSxpQkFBaUIsR0FBYSxZQUFZLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25FLElBQUksZUFBaUMsQ0FBQztRQUN0QyxJQUFJLE9BQWEsQ0FBQztRQUVsQixRQUFRLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxFQUFFO1lBQ3JDLEtBQUssQ0FBQyxFQUFFLFFBQVE7Z0JBQ1osZUFBZSxHQUFHLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNqRixPQUFPLEdBQUcsSUFBSSxXQUFBLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxhQUFhLENBQUMsZUFBZSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQy9GLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3BCLFlBQVksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDO2dCQUNsQyxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNwQyxNQUFNO1lBQ1YsS0FBSyxDQUFDLEVBQUUsT0FBTztnQkFDWCxlQUFlLEdBQUcsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pGLE9BQU8sR0FBRyxJQUFJLFdBQUEsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxlQUFlLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDL0YsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDcEIsWUFBWSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUM7Z0JBQ2xDLGFBQWEsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ3BDLE1BQU07WUFDVixLQUFLLENBQUMsRUFBRSxRQUFRO2dCQUNaLGVBQWUsR0FBRyxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDakYsT0FBTyxHQUFHLElBQUksV0FBQSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsYUFBYSxDQUFDLGVBQWUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMvRixLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNwQixZQUFZLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQztnQkFDbEMsYUFBYSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDcEMsTUFBTTtZQUNWLEtBQUssQ0FBQyxFQUFFLE1BQU07Z0JBQ1YsZUFBZSxHQUFHLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqRixPQUFPLEdBQUcsSUFBSSxXQUFBLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxhQUFhLENBQUMsZUFBZSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQy9GLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3BCLFlBQVksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDO2dCQUNsQyxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUNwQyxNQUFNO1NBRWI7SUFFTCxDQUFDO0lBRUQsU0FBUyxlQUFlO1FBQ3BCLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDakIsSUFBSSxDQUFDLEtBQUssR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzdDLElBQUksVUFBVSxDQUFDLHVCQUF1QixDQUFDLEVBQUU7Z0JBQ3JDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDNUMsT0FBTzthQUNWO1lBQ0QsSUFBSSxVQUFVLENBQUMsd0JBQXdCLENBQUMsRUFBRTtnQkFDdEMsT0FBTyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUM1QyxPQUFPO2FBQ1Y7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRCxTQUFTLFVBQVUsQ0FBQyxZQUFvQjtRQUNwQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDO1FBQzVCLElBQUksQ0FBQyxHQUFHLFlBQVksRUFBRTtZQUNsQixPQUFPLElBQUksQ0FBQztTQUNmO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztJQUdELFNBQVMsU0FBUyxDQUFDLEtBQTJDO1FBQzFELElBQUksT0FBTyxHQUFXLENBQUMsQ0FBQztRQUN4QixLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2pCLElBQUksSUFBSSxFQUFFO2dCQUNOLE9BQU8sRUFBRSxDQUFDO2FBQ2I7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sT0FBTyxDQUFDO0lBQ25CLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxNQUE0QztRQUM5RCxJQUFJLE9BQU8sR0FBYSxFQUFFLENBQUM7UUFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDcEMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ1gsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTthQUNsQjtTQUNKO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFFbkIsQ0FBQztJQUNEOzs7O09BSUc7SUFFSCxTQUFTLGFBQWEsQ0FBQyxTQUEyQjtRQUM5QyxJQUFJLEtBQUssR0FBWSxLQUFLLENBQUM7UUFDM0IsSUFBSSxJQUFJLEdBQVksS0FBSyxDQUFDO1FBQzFCLElBQUksS0FBSyxHQUFZLEtBQUssQ0FBQztRQUMzQixJQUFJLElBQUksR0FBWSxLQUFLLENBQUM7UUFDMUIsSUFBSSxjQUFrQyxDQUFDO1FBQ3ZDLGNBQWMsR0FBRyxlQUFlLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDNUMsSUFBSSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO2dCQUMzQyxLQUFLLEdBQUcsSUFBSSxDQUFDO2FBQ2hCO1lBQ0QsSUFBSSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO2dCQUMzQyxJQUFJLEdBQUcsSUFBSSxDQUFDO2FBQ2Y7WUFDRCxJQUFJLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMxQyxLQUFLLEdBQUcsSUFBSSxDQUFDO2FBQ2hCO1lBQ0QsSUFBSSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDMUMsSUFBSSxHQUFHLElBQUksQ0FBQzthQUNmO1NBQ0o7UUFDRCxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFDLFNBQTJCO1FBQzlDLElBQUksS0FBSyxHQUFZLEtBQUssQ0FBQztRQUMzQixJQUFJLElBQUksR0FBWSxLQUFLLENBQUM7UUFDMUIsSUFBSSxLQUFLLEdBQVksS0FBSyxDQUFDO1FBQzNCLElBQUksSUFBSSxHQUFZLEtBQUssQ0FBQztRQUUxQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMzQyxtREFBbUQ7WUFDbkQsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNyRixLQUFLLEdBQUcsSUFBSSxDQUFDO2FBQ2hCO1lBQ0QsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNyRixJQUFJLEdBQUcsSUFBSSxDQUFDO2FBQ2Y7WUFDRCxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNwRixLQUFLLEdBQUcsSUFBSSxDQUFDO2FBQ2hCO1lBQ0QsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtn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OUIsSUFBSSxJQUFJLENBQUMsbUJBQW1CLElBQUksQ0FBQyxFQUFFO29CQUMvQixJQUFJLENBQUMsbUJBQW1CLEdBQUcsb0JBQW9CLENBQUM7b0JBQ2hELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO2lCQUM5QztxQkFBTTtvQkFDSCx5Q0FBeUM7b0JBRXpDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2lCQUM5QjthQUNKO1FBRUwsQ0FBQztLQUNKO0lBMUJZLGNBQU0sU0EwQmxCLENBQUE7QUFDTCxDQUFDLEVBNUJTLE9BQU8sS0FBUCxPQUFPLFFBNEJoQiIsInNvdXJjZXNDb250ZW50IjpbIi8vI3JlZ2lvbiBcIkltcG9ydHNcIlxyXG4vLy88cmVmZXJlbmNlIHR5cGVzPVwiLi4vRlVER0UvQ29yZS9CdWlsZC9GdWRnZUNvcmUuanNcIi8+XHJcbi8vLzxyZWZlcmVuY2UgdHlwZXM9XCIuLi9GVURHRS9BaWQvQnVpbGQvRnVkZ2VBaWQuanNcIi8+XHJcbi8vI2VuZHJlZ2lvbiBcIkltcG9ydHNcIlxyXG5cclxubmFtZXNwYWNlIEdhbWUge1xyXG4gICAgZXhwb3J0IGVudW0gR0FNRVNUQVRFUyB7XHJcbiAgICAgICAgUExBWUlORyxcclxuICAgICAgICBQQVVTRVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbXBvcnQgxpIgPSBGdWRnZUNvcmU7XHJcbiAgICBleHBvcnQgaW1wb3J0IMaSQWlkID0gRnVkZ2VBaWQ7XHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBcIkRvbUVsZW1lbnRzXCJcclxuICAgIGV4cG9ydCBsZXQgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCA9IDxIVE1MQ2FudmFzRWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNhbnZhc1wiKTtcclxuICAgIC8vIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBpbml0KTtcclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBzdGFydCk7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJhbmdlZFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcGxheWVyQ2hvaWNlKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTWVsZWVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHBsYXllckNob2ljZSk7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJEb21FbGVtZW50c1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiUHVibGljVmFyaWFibGVzXCJcclxuICAgIGV4cG9ydCBsZXQgZ2FtZXN0YXRlOiBHQU1FU1RBVEVTID0gR0FNRVNUQVRFUy5QQVVTRTtcclxuICAgIGV4cG9ydCBsZXQgdmlld3BvcnQ6IMaSLlZpZXdwb3J0ID0gbmV3IMaSLlZpZXdwb3J0KCk7XHJcbiAgICBleHBvcnQgbGV0IGdyYXBoOiDGki5Ob2RlID0gbmV3IMaSLk5vZGUoXCJHcmFwaFwiKTtcclxuICAgIGV4cG9ydCBsZXQgYXZhdGFyMTogUGxheWVyLlBsYXllcjtcclxuICAgIGV4cG9ydCBsZXQgYXZhdGFyMjogUGxheWVyLlBsYXllcjtcclxuICAgIGV4cG9ydCBsZXQgY29ubmVjdGVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IGZyYW1lUmF0ZTogbnVtYmVyID0gNjA7XHJcbiAgICBleHBvcnQgbGV0IGVuZW1pZXM6IEVuZW15LkVuZW15W10gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgYnVsbGV0czogQnVsbGV0cy5CdWxsZXRbXTtcclxuICAgIGV4cG9ydCBsZXQgZW5lbWllc0pTT046IFBsYXllci5DaGFyYWN0ZXJbXTtcclxuICAgIGV4cG9ydCBsZXQgaXRlbXNKU09OOiBQbGF5ZXIuQ2hhcmFjdGVyW107XHJcbiAgICBleHBvcnQgbGV0IGJhdDogRW5lbXkuRW5lbXk7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJQdWJsaWNWYXJpYWJsZXNcIlxyXG5cclxuICAgIC8vI3JlZ2lvbiBcIlByaXZhdGVWYXJpYWJsZXNcIlxyXG4gICAgbGV0IGl0ZW0xOiBJdGVtcy5JdGVtO1xyXG4gICAgbGV0IGNtcENhbWVyYTogxpIuQ29tcG9uZW50Q2FtZXJhID0gbmV3IMaSLkNvbXBvbmVudENhbWVyYSgpO1xyXG4gICAgbGV0IHBsYXllclR5cGU6IFBsYXllci5QTEFZRVJUWVBFO1xyXG4gICAgY29uc3QgZGFtcGVyOiBudW1iZXIgPSAzLjU7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJQcml2YXRlVmFyaWFibGVzXCJcclxuXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBcImVzc2VudGlhbFwiXHJcbiAgICBhc3luYyBmdW5jdGlvbiBpbml0KCkge1xyXG4gICAgICAgIGF3YWl0IGxvYWRFbmVtaWVzSlNPTigpO1xyXG5cclxuICAgICAgICBHZW5lcmF0aW9uLmdlbmVyYXRlUm9vbXMoKTtcclxuXHJcbiAgICAgICAgZ3JhcGguYXBwZW5kQ2hpbGQoYXZhdGFyMSk7XHJcblxyXG4gICAgICAgIMaSQWlkLmFkZFN0YW5kYXJkTGlnaHRDb21wb25lbnRzKGdyYXBoKTtcclxuXHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0ZVooMjUpO1xyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC5yb3RhdGVZKDE4MCk7XHJcblxyXG4gICAgICAgIHZpZXdwb3J0LmluaXRpYWxpemUoXCJWaWV3cG9ydFwiLCBncmFwaCwgY21wQ2FtZXJhLCBjYW52YXMpO1xyXG5cclxuICAgICAgICBkcmF3KCk7XHJcblxyXG4gICAgICAgIGhlbHBlcigpO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBoZWxwZXIoKSB7XHJcbiAgICAgICAgICAgIGlmIChhdmF0YXIyICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgxpIuTG9vcC5zdGFydCjGki5MT09QX01PREUuVElNRV9HQU1FLCBmcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaGVscGVyKCk7XHJcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZSgpOiB2b2lkIHtcclxuXHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIElucHV0U3lzdGVtLm1vdmUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRyYXcoKTtcclxuXHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGNhbWVyYVVwZGF0ZSgpO1xyXG5cclxuICAgICAgICAgICAgYXZhdGFyMS5jb29sZG93bigpO1xyXG5cclxuICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICBhdmF0YXIyLmNvb2xkb3duKCk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhclBvc2l0aW9uKEdhbWUuYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgR2FtZS5hdmF0YXIxLm10eExvY2FsLnJvdGF0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBOZXR3b3JraW5nLnNwYXduRW5lbXkoYmF0LCBiYXQuaWQpO1xyXG5cclxuICAgICAgICAgICAgLy8jcmVnaW9uIGNvdW50IGl0ZW1zXHJcbiAgICAgICAgICAgIGxldCBpdGVtczogSXRlbXMuSXRlbVtdID0gPEl0ZW1zLkl0ZW1bXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8SXRlbXMuSXRlbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5JVEVNKVxyXG4gICAgICAgICAgICBpdGVtcy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5saWZlc3BhbihncmFwaCk7XHJcbiAgICAgICAgICAgICAgICAoPEl0ZW1zLkludGVybmFsSXRlbT5lbGVtZW50KS5jb2xsaXNpb25EZXRlY3Rpb24oKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICAgICAgYnVsbGV0cyA9IDxCdWxsZXRzLkJ1bGxldFtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxCdWxsZXRzLkJ1bGxldD5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5CVUxMRVQpXHJcbiAgICAgICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgYnVsbGV0cy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQubW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQubGlmZXNwYW4oZ3JhcGgpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IGRhbWFnZVVJOiBVSS5EYW1hZ2VVSVtdID0gPFVJLkRhbWFnZVVJW10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPFVJLkRhbWFnZVVJPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLkRBTUFHRVVJKVxyXG4gICAgICAgICAgICBkYW1hZ2VVSS5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5tb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmxpZmVzcGFuKGdyYXBoKTtcclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIGVuZW1pZXMgPSA8RW5lbXkuRW5lbXlbXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuRU5FTVkpXHJcbiAgICAgICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgICAgIGVuZW1pZXMuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lm1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmxpZmVzcGFuKGdyYXBoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEVuZW15LkVuZW15U2hvb3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxFbmVteS5FbmVteVNob290PmVsZW1lbnQpLndlYXBvbi5jb29sZG93bihlbGVtZW50LnByb3BlcnRpZXMuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgICAgICBFbmVteVNwYXduZXIuc3Bhd25FbmVtaWVzKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIFVJLnVwZGF0ZVVJKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHN0YXJ0KCkge1xyXG4gICAgICAgIGxvYWRUZXh0dXJlcygpO1xyXG4gICAgICAgIC8vYWRkIHNwcml0ZSB0byBncmFwaGUgZm9yIHN0YXJ0c2NyZWVuXHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydEdhbWVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5jb25uZXRpbmcoKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJMb2JieXNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgIHdhaXRPbkNvbm5lY3Rpb24oKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cclxuICAgICAgICB9KTtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNyZWRpdHNcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBmdW5jdGlvbiBsb2FkRW5lbWllc0pTT04oKSB7XHJcbiAgICAgICAgY29uc3QgbG9hZCA9IGF3YWl0IChhd2FpdCBmZXRjaChcIi4vUmVzb3VyY2VzL0VuZW1pZXNTdG9yYWdlLmpzb25cIikpLmpzb24oKTtcclxuICAgICAgICBlbmVtaWVzSlNPTiA9ICgoPFBsYXllci5DaGFyYWN0ZXJbXT5sb2FkLmVuZW1pZXMpKTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBsb2FkVGV4dHVyZXMoKSB7XHJcbiAgICAgICAgYXdhaXQgQnVsbGV0cy5idWxsZXRUeHQubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL2Fycm93MDEucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBVSS50eHRaZXJvLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS8wLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRPbmUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzEucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFRvdy5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvMi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0VGhyZWUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzMucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dEZvdXIubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzQucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dEZpdmUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFNpeC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvNi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0U2V2ZW4ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzcucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dEVpZ2h0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS84LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHROaW5lLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS85LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRUZW4ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzEwLnBuZ1wiKTtcclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIHdhaXRPbkNvbm5lY3Rpb24oKSB7XHJcbiAgICAgICAgTmV0d29ya2luZy5jb25uZWN0ZWQoKTtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnRzLmZpbHRlcihlbGVtID0+IGVsZW0ucmVhZHkgPT0gdHJ1ZSkubGVuZ3RoID49IDIgJiYgTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBjb25uZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBhd2FpdCBpbml0KCk7XHJcbiAgICAgICAgICAgIGdhbWVzdGF0ZSA9IEdBTUVTVEFURVMuUExBWUlORztcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3blBsYXllcihwbGF5ZXJUeXBlKTtcclxuXHJcbiAgICAgICAgICAgIC8vI3JlZ2lvbiBpbml0IEl0ZW1zXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIGl0ZW0xID0gbmV3IEl0ZW1zLkludGVybmFsSXRlbShcImNvb2xkb3duIHJlZHVjdGlvblwiLCBcImFkZHMgc3BlZWQgYW5kIHNoaXRcIiwgbmV3IMaSLlZlY3RvcjMoMCwgMiwgMCksIG5ldyBQbGF5ZXIuQXR0cmlidXRlcygwLCAwLCAwLCAxMDApLCBJdGVtcy5JVEVNVFlQRS5QUk9DRU5UVUFMLCBcIi4vUmVzb3VyY2VzL0ltYWdlL0l0ZW1zXCIpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGl0ZW0yID0gbmV3IEl0ZW1zLkludGVybmFsSXRlbShcImNvb2xkb3duIHJlZHVjdGlvblwiLCBcImFkZHMgc3BlZWQgYW5kIHNoaXRcIiwgbmV3IMaSLlZlY3RvcjMoMCwgLTIsIDApLCBuZXcgUGxheWVyLkF0dHJpYnV0ZXMoMCwgMCwgMCwgMTAwKSwgSXRlbXMuSVRFTVRZUEUuUFJPQ0VOVFVBTCwgXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtc1wiKTtcclxuICAgICAgICAgICAgICAgIGdyYXBoLmFwcGVuZENoaWxkKGl0ZW0xKTtcclxuICAgICAgICAgICAgICAgIGdyYXBoLmFwcGVuZENoaWxkKGl0ZW0yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCh3YWl0T25Db25uZWN0aW9uLCAzMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwbGF5ZXJDaG9pY2UoX2U6IEV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCg8SFRNTEJ1dHRvbkVsZW1lbnQ+X2UudGFyZ2V0KS5pZCA9PSBcIlJhbmdlZFwiKSB7XHJcbiAgICAgICAgICAgIGF2YXRhcjEgPSBuZXcgUGxheWVyLlJhbmdlZChcInBsYXllclwiLCBuZXcgUGxheWVyLkNoYXJhY3RlcihcIlRob3IsXCIsIG5ldyBQbGF5ZXIuQXR0cmlidXRlcygxMCwgNSwgNSkpKTtcclxuICAgICAgICAgICAgcGxheWVyVHlwZSA9IFBsYXllci5QTEFZRVJUWVBFLlJBTkdFRDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCg8SFRNTEJ1dHRvbkVsZW1lbnQ+X2UudGFyZ2V0KS5pZCA9PSBcIk1lbGVlXCIpIHtcclxuICAgICAgICAgICAgYXZhdGFyMSA9IG5ldyBQbGF5ZXIuTWVsZWUoXCJwbGF5ZXJcIiwgbmV3IFBsYXllci5DaGFyYWN0ZXIoXCJUaG9yLFwiLCBuZXcgUGxheWVyLkF0dHJpYnV0ZXMoMTAsIDEsIDUpKSk7XHJcbiAgICAgICAgICAgIHBsYXllclR5cGUgPSBQbGF5ZXIuUExBWUVSVFlQRS5NRUxFRTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJMb2JieXNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuXHJcbiAgICAgICAgcmVhZHlTYXRlKCk7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlYWR5U2F0ZSgpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc2V0Q2xpZW50UmVhZHkoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnRzLmZpbHRlcihlbGVtID0+IGVsZW0ucmVhZHkgPT0gdHJ1ZSkubGVuZ3RoIDwgMikge1xyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7IHJlYWR5U2F0ZSgpIH0sIDIwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZHJhdygpOiB2b2lkIHtcclxuICAgICAgICB2aWV3cG9ydC5kcmF3KCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbWVyYVVwZGF0ZSgpIHtcclxuICAgICAgICBsZXQgZGlyZWN0aW9uID0gxpIuVmVjdG9yMi5ESUZGRVJFTkNFKGF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgIGRpcmVjdGlvbi5zY2FsZSgxIC8gZnJhbWVSYXRlICogZGFtcGVyKTtcclxuICAgICAgICBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRlKG5ldyDGki5WZWN0b3IzKC1kaXJlY3Rpb24ueCwgZGlyZWN0aW9uLnksIDApLCB0cnVlKTtcclxuICAgIH1cclxuXHJcbiAgICDGki5Mb29wLmFkZEV2ZW50TGlzdGVuZXIoxpIuRVZFTlQuTE9PUF9GUkFNRSwgdXBkYXRlKTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcImVzc2VudGlhbFwiXHJcblxyXG59XHJcbiIsIm5hbWVzcGFjZSBJbnRlcmZhY2VzIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSVNwYXduYWJsZSB7XHJcbiAgICAgICAgbGlmZXRpbWU/OiBudW1iZXI7XHJcbiAgICAgICAgbGlmZXNwYW4oX2E6IMaSLk5vZGUpOiB2b2lkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUtub2NrYmFja2FibGUge1xyXG4gICAgICAgIGtub2NrYmFja0ZvcmNlOiBudW1iZXI7XHJcbiAgICAgICAgZG9Lbm9ja2JhY2soX2JvZHk6IMaSQWlkLk5vZGVTcHJpdGUpOiB2b2lkO1xyXG4gICAgICAgIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUtpbGxhYmxlIHtcclxuICAgICAgICBvbkRlYXRoKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRGFtYWdlYWJsZSB7XHJcbiAgICAgICAgZ2V0RGFtYWdlKCk6IHZvaWQ7XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXkge1xyXG4gICAgZXhwb3J0IGVudW0gRU5FTVlOQU1FIHtcclxuICAgICAgICBCQVQsXHJcbiAgICAgICAgVElDSyxcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldE5hbWVCeUlEKF9pZDogRU5FTVlOQU1FKSB7XHJcbiAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgY2FzZSBFTkVNWU5BTUUuQkFUOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiYmF0XCI7XHJcbiAgICAgICAgICAgIGNhc2UgRU5FTVlOQU1FLlRJQ0s6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ0aWNrXCI7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGVudW0gQkVIQVZJT1VSIHtcclxuICAgICAgICBJRExFLCBGT0xMT1csIEZMRUVcclxuICAgIH1cclxuICAgIGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteSBleHRlbmRzIEdhbWUuxpJBaWQuTm9kZVNwcml0ZSBpbXBsZW1lbnRzIEludGVyZmFjZXMuSVNwYXduYWJsZSwgSW50ZXJmYWNlcy5JS25vY2tiYWNrYWJsZSB7XHJcbiAgICAgICAgY3VycmVudFN0YXRlOiBCRUhBVklPVVI7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuRU5FTVk7XHJcbiAgICAgICAgcHVibGljIGlkOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIG5ldElkOiBudW1iZXIgPSBOZXR3b3JraW5nLmlkR2VuZXJhdG9yKCk7XHJcbiAgICAgICAgcHVibGljIHByb3BlcnRpZXM6IFBsYXllci5DaGFyYWN0ZXI7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcjtcclxuICAgICAgICB0YXJnZXQ6IMaSLlZlY3RvcjM7XHJcbiAgICAgICAgbGlmZXRpbWU6IG51bWJlcjtcclxuICAgICAgICBjYW5Nb3ZlWDogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgY2FuTW92ZVk6IGJvb2xlYW4gPSB0cnVlO1xyXG5cclxuICAgICAgICBtb3ZlRGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuWkVSTygpO1xyXG5cclxuICAgICAgICBrbm9ja2JhY2tGb3JjZTogbnVtYmVyID0gNjtcclxuXHJcbiAgICAgICAgLy8jcmVnaW9uICBhbmltYXRpb25cclxuICAgICAgICBhbmltYXRpb25zOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbnM7XHJcbiAgICAgICAgcHJpdmF0ZSBjbHJXaGl0ZTogxpIuQ29sb3IgPSDGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKTtcclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFTkVNWU5BTUUsIF9wcm9wZXJ0aWVzOiBQbGF5ZXIuQ2hhcmFjdGVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihnZXROYW1lQnlJRChfaWQpKTtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5wcm9wZXJ0aWVzID0gX3Byb3BlcnRpZXM7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoX3Bvc2l0aW9uLngsIF9wb3NpdGlvbi55LCAwLjEpO1xyXG4gICAgICAgICAgICBpZiAoX25ldElkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuY3VycmVudElEcy5wdXNoKF9uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5ldElkID0gX25ldElkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCAvIDIpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduRW5lbXkodGhpcywgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhcnRTcHJpdGUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIHN0YXJ0U3ByaXRlKCkge1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRTcHJpdGVzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbnNbXCJmbHlcIl0pO1xyXG4gICAgICAgICAgICB0aGlzLnNldEZyYW1lRGlyZWN0aW9uKDEpO1xyXG4gICAgICAgICAgICB0aGlzLmZyYW1lcmF0ZSA9IDEyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgbG9hZFNwcml0ZXMoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgICAgIGxldCBpbWdTcHJpdGVTaGVldDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgICAgICAgICBhd2FpdCBpbWdTcHJpdGVTaGVldC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9zcGlubmkucG5nXCIpO1xyXG5cclxuICAgICAgICAgICAgbGV0IHNwcml0ZVNoZWV0OiDGki5Db2F0VGV4dHVyZWQgPSBuZXcgxpIuQ29hdFRleHR1cmVkKHRoaXMuY2xyV2hpdGUsIGltZ1Nwcml0ZVNoZWV0KTtcclxuICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZVNwcml0ZXMoc3ByaXRlU2hlZXQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2VuZXJhdGVTcHJpdGVzKF9zcHJpdGVzaGVldDogxpIuQ29hdFRleHR1cmVkKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9ucyA9IHt9O1xyXG4gICAgICAgICAgICBsZXQgbmFtZTogc3RyaW5nID0gXCJmbHlcIjtcclxuICAgICAgICAgICAgbGV0IHNwcml0ZTogxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24gPSBuZXcgxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24obmFtZSwgX3Nwcml0ZXNoZWV0KTtcclxuICAgICAgICAgICAgc3ByaXRlLmdlbmVyYXRlQnlHcmlkKMaSLlJlY3RhbmdsZS5HRVQoMCwgMCwgMTgsIDE0KSwgNCwgMjIsIMaSLk9SSUdJTjJELkJPVFRPTUNFTlRFUiwgxpIuVmVjdG9yMi5YKDE4KSk7XHJcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uc1tuYW1lXSA9IHNwcml0ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBtb3ZlKCkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNvbGxpZGVyKCk7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW5lbXlQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZG9Lbm9ja2JhY2soX2JvZHk6IMaSQWlkLk5vZGVTcHJpdGUpOiB2b2lkIHtcclxuICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPl9ib2R5KS5nZXRLbm9ja2JhY2sodGhpcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBfcG9zaXRpb24udG9WZWN0b3IyKCkpLnRvVmVjdG9yMygwKTtcclxuXHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZShfa25vY2tiYWNrRm9yY2UgKiAxIC8gR2FtZS5mcmFtZVJhdGUpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uLmFkZChkaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgaGVscGVyKGRpcmVjdGlvbiwgdGhpcy5tb3ZlRGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGhlbHBlcihfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMsIF9tb3ZlRGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChfa25vY2tiYWNrRm9yY2UgPiAwLjEpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX21vdmVEaXJlY3Rpb24uc3VidHJhY3QoZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9rbm9ja2JhY2tGb3JjZSAvPSAzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKF9rbm9ja2JhY2tGb3JjZSAqIDEgLyBHYW1lLmZyYW1lUmF0ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbW92ZURpcmVjdGlvbi5hZGQoZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlbHBlcihfZGlyZWN0aW9uLCBfbW92ZURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX21vdmVEaXJlY3Rpb24uc3VidHJhY3QoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwZGF0ZUNvbGxpZGVyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZVNpbXBsZSgpIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcblxyXG4gICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG5cclxuICAgICAgICAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKCgxIC8gR2FtZS5mcmFtZVJhdGUgKiB0aGlzLnByb3BlcnRpZXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uLmFkZChkaXJlY3Rpb24pXHJcblxyXG4gICAgICAgICAgICB0aGlzLmdldENhbk1vdmVYWSh0aGlzLm1vdmVEaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAvL1RPRE86IGluIEZ1bmt0aW9uIHBhY2tlbiBkYW1pdCBtYW4gdm9uIGFsbGVtIEVuZW1pZXMgZHJhdWYgenVncmVpZmVuIGthbm5cclxuXHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbi5zdWJ0cmFjdChkaXJlY3Rpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUF3YXkoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG5cclxuICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMudGFyZ2V0KTtcclxuICAgICAgICAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKCgxIC8gR2FtZS5mcmFtZVJhdGUgKiB0aGlzLnByb3BlcnRpZXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uLmFkZChkaXJlY3Rpb24pXHJcblxyXG4gICAgICAgICAgICB0aGlzLmdldENhbk1vdmVYWSh0aGlzLm1vdmVEaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uLnN1YnRyYWN0KGRpcmVjdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgbGlmZXNwYW4oX2dyYXBoOiBHYW1lLsaSLk5vZGUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnJlbW92ZUVuZW15KHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIF9ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0Q2FuTW92ZVhZKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgbGV0IGNhbk1vdmVYID0gdHJ1ZTtcclxuICAgICAgICAgICAgbGV0IGNhbk1vdmVZID0gdHJ1ZTtcclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyczogR2VuZXJhdGlvbi5XYWxsW10gPSAoPEdlbmVyYXRpb24uUm9vbT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbGVtZW50ID0+ICg8R2VuZXJhdGlvbi5Sb29tPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlJPT00pKS53YWxscztcclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzUmVjdChlbGVtZW50LmNvbGxpZGVyKSkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQmVmb3JlTW92ZSA9IE1hdGgucm91bmQoKGludGVyc2VjdGlvbi5oZWlnaHQgKiBpbnRlcnNlY3Rpb24ud2lkdGgpICogMTAwMCkgLyAxMDAwO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgb2xkUG9zaXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKHRoaXMuY29sbGlkZXIucG9zaXRpb24ueCwgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMihfZGlyZWN0aW9uLngsIDApXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBNYXRoLnJvdW5kKChuZXdJbnRlcnNlY3Rpb24uaGVpZ2h0ICogbmV3SW50ZXJzZWN0aW9uLndpZHRoKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5Nb3ZlWCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMigwLCBfZGlyZWN0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50LmNvbGxpZGVyKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gTWF0aC5yb3VuZCgobmV3SW50ZXJzZWN0aW9uLmhlaWdodCAqIG5ld0ludGVyc2VjdGlvbi53aWR0aCkgKiAxMDAwKSAvIDEwMDA7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FuTW92ZVkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgbGV0IGF2YXRhckNvbGxpZGVyczogUGxheWVyLlBsYXllcltdID0gPFBsYXllci5QbGF5ZXJbXT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxFbmVteS5FbmVteT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5QTEFZRVIpO1xyXG4gICAgICAgICAgICBhdmF0YXJDb2xsaWRlcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFCZWZvcmVNb3ZlID0gTWF0aC5yb3VuZCgoaW50ZXJzZWN0aW9uKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG9sZFBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMih0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLngsIHRoaXMuY29sbGlkZXIucG9zaXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoX2RpcmVjdGlvbi54LCAwKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUFmdGVyTW92ZSA9IE1hdGgucm91bmQoKG5ld0ludGVyc2VjdGlvbikgKiAxMDAwKSAvIDEwMDA7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5Nb3ZlWCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMigwLCBfZGlyZWN0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUFmdGVyTW92ZSA9IE1hdGgucm91bmQoKG5ld0ludGVyc2VjdGlvbikgKiAxMDAwKSAvIDEwMDA7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5Nb3ZlWSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIGlmIChjYW5Nb3ZlWCAmJiBjYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNhbk1vdmVYICYmICFjYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9kaXJlY3Rpb24ueCwgMCwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFjYW5Nb3ZlWCAmJiBjYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIF9kaXJlY3Rpb24ueSwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlEdW1iIGV4dGVuZHMgRW5lbXkge1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IG51bWJlciwgX3Byb3BlcnRpZXM6IFBsYXllci5DaGFyYWN0ZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3Byb3BlcnRpZXMsIF9wb3NpdGlvbiwgX25ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmUoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLm1vdmUoKTtcclxuICAgICAgICAgICAgdGhpcy5tb3ZlQmVoYXZpb3VyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIGxldCB0YXJnZXQgPSBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZSA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0YXJnZXQsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGU7XHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZSA8IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YXRlID0gQkVIQVZJT1VSLkZMRUU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoZGlzdGFuY2UgPiA1KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IEJFSEFWSU9VUi5GT0xMT1dcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKSB7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudFN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEJFSEFWSU9VUi5GTEVFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZUF3YXkoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVTaW1wbGUoKVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVTaW1wbGUoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlTaG9vdCBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICB3ZWFwb246IFdlYXBvbnMuV2VhcG9uO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogbnVtYmVyLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3RlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfd2VhcG9uOiBXZWFwb25zLldlYXBvbiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3Byb3BlcnRpZXMsIF9wb3NpdGlvbiwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy53ZWFwb24gPSBfd2VhcG9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZSgpIHtcclxuICAgICAgICAgICAgc3VwZXIubW92ZSgpO1xyXG4gICAgICAgICAgICB0aGlzLnNob290KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2hvb3QoX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGxldCB0YXJnZXQ6IMaSLlZlY3RvcjMgPSBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKVxyXG4gICAgICAgICAgICBsZXQgX2RpcmVjdGlvbiA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0YXJnZXQsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICBpZiAodGhpcy53ZWFwb24uY3VycmVudEF0dGFja0NvdW50ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgICAgIGxldCBidWxsZXQ6IEJ1bGxldHMuQnVsbGV0ID0gbmV3IEJ1bGxldHMuQnVsbGV0KG5ldyDGki5WZWN0b3IyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpLCBfZGlyZWN0aW9uLCB0aGlzLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgYnVsbGV0Lm93bmVyID0gdGhpcy50YWc7XHJcbiAgICAgICAgICAgICAgICBidWxsZXQuZmx5RGlyZWN0aW9uLnNjYWxlKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIGJ1bGxldC5zcGVlZCk7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGJ1bGxldCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImltIHNob29vdGluZyBiYWJ5XCIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25CdWxsZXRBdEVuZW15KGJ1bGxldC5uZXRJZCwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53ZWFwb24uY3VycmVudEF0dGFja0NvdW50LS07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgLy8gZXhwb3J0IGNsYXNzIEVuZW15Q2lyY2xlIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgLy8gICAgIGRpc3RhbmNlOiBudW1iZXIgPSA1O1xyXG5cclxuICAgIC8vICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3RlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyKSB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyKF9uYW1lLCBfcHJvcGVydGllcywgX3Bvc2l0aW9uKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIG1vdmUoKTogdm9pZCB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyLm1vdmUoKTtcclxuICAgIC8vICAgICAgICAgdGhpcy5tb3ZlQ2lyY2xlKCk7XHJcbiAgICAvLyAgICAgfVxyXG5cclxuICAgIC8vICAgICBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpOiB2b2lkIHtcclxuICAgIC8vICAgICAgICAgc3VwZXIubGlmZXNwYW4oX2dyYXBoKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIGFzeW5jIG1vdmVDaXJjbGUoKSB7XHJcbiAgICAvLyAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnRhcmdldCk7XHJcbiAgICAvLyAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjEgPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgIC8vICAgICAgICAgLy8gbGV0IGRpc3RhbmNlUGxheWVyMiA9IHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKEdhbWUucGxheWVyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICBpZiAoZGlzdGFuY2VQbGF5ZXIxID4gdGhpcy5kaXN0YW5jZSkge1xyXG4gICAgLy8gICAgICAgICAgICAgdGhpcy5tb3ZlU2ltcGxlKCk7XHJcbiAgICAvLyAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgZWxzZSB7XHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgZGVncmVlID0gQ2FsY3VsYXRpb24uY2FsY0RlZ3JlZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy50YXJnZXQpXHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgYWRkID0gMDtcclxuXHJcbiAgICAvLyAgICAgICAgICAgICAvLyB3aGlsZSAoZGlzdGFuY2VQbGF5ZXIxIDw9IHRoaXMuZGlzdGFuY2UpIHtcclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgSW5wdXRTeXN0ZW0uY2FsY1Bvc2l0aW9uRnJvbURlZ3JlZShkZWdyZWUgKyBhZGQsIHRoaXMuZGlzdGFuY2UpLnRvVmVjdG9yMygwKSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBkaXJlY3Rpb24uc2NhbGUoKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKGRpcmVjdGlvbiwgdHJ1ZSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgYWRkICs9IDU7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyB9XHJcblxyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgfVxyXG4gICAgLy8gfVxyXG59IiwibmFtZXNwYWNlIEl0ZW1zIHtcclxuICAgIGV4cG9ydCBlbnVtIElURU1UWVBFIHtcclxuICAgICAgICBBREQsXHJcbiAgICAgICAgU1VCU1RSQUNULFxyXG4gICAgICAgIFBST0NFTlRVQUxcclxuICAgIH1cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBJdGVtIGV4dGVuZHMgR2FtZS7GkkFpZC5Ob2RlU3ByaXRlIGltcGxlbWVudHMgSW50ZXJmYWNlcy5JU3Bhd25hYmxlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5JVEVNO1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyID0gTmV0d29ya2luZy5pZEdlbmVyYXRvcigpO1xyXG4gICAgICAgIHB1YmxpYyBkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBpbWdTcmM6IHN0cmluZztcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlO1xyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9kZXNjcmlwdGlvbjogc3RyaW5nLCBfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9pbWdTcmM/OiBzdHJpbmcsIF9saWZldGltZT86IG51bWJlciwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfbmV0SWQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5jdXJyZW50SURzLnB1c2goX25ldElkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV0SWQgPSBfbmV0SWQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuZGVzY3JpcHRpb24gPSBfZGVzY3JpcHRpb247XHJcbiAgICAgICAgICAgIHRoaXMuaW1nU3JjID0gX2ltZ1NyYztcclxuICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IF9saWZldGltZTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9wb3NpdGlvbik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbGlmZXNwYW4oX2dyYXBoOiDGki5Ob2RlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lID49IDAgJiYgdGhpcy5saWZldGltZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lLS07XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBfZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnJlbW92ZUl0ZW0odGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIGNvbGxpc2lvbkRldGVjdGlvbigpIHtcclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyczogYW55W10gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxFbmVteS5FbmVteT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5QTEFZRVIpO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5wcm9wZXJ0aWVzICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuYWRkQXR0cmlidWVzQnlJdGVtKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkucHJvcGVydGllcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBJbnRlcm5hbEl0ZW0gZXh0ZW5kcyBJdGVtIHtcclxuICAgICAgICBwdWJsaWMgYXR0cmlidXRlczogUGxheWVyLkF0dHJpYnV0ZXM7XHJcbiAgICAgICAgcHVibGljIHR5cGU6IElURU1UWVBFO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENyZWF0ZXMgYW4gaXRlbSB0aGF0IGNhbiBjaGFuZ2UgQXR0cmlidXRlcyBvZiB0aGUgcGxheWVyXHJcbiAgICAgICAgICogQHBhcmFtIF9uYW1lIG5hbWUgb2YgdGhlIEl0ZW1cclxuICAgICAgICAgKiBAcGFyYW0gX2Rlc2NyaXB0aW9uIERlc2NpcnB0aW9uIG9mIHRoZSBpdGVtXHJcbiAgICAgICAgICogQHBhcmFtIF9wb3NpdGlvbiBQb3NpdGlvbiB3aGVyZSB0byBzcGF3blxyXG4gICAgICAgICAqIEBwYXJhbSBfbGlmZXRpbWUgb3B0aW9uYWw6IGhvdyBsb25nIGlzIHRoZSBpdGVtIHZpc2libGVcclxuICAgICAgICAgKiBAcGFyYW0gX2F0dHJpYnV0ZXMgZGVmaW5lIHdoaWNoIGF0dHJpYnV0ZXMgd2lsbCBjaGFuZ2UsIGNvbXBhcmUgd2l0aCB7QGxpbmsgUGxheWVyLkF0dHJpYnV0ZXN9XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX2Rlc2NyaXB0aW9uOiBzdHJpbmcsIF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2F0dHJpYnV0ZXM6IFBsYXllci5BdHRyaWJ1dGVzLCBfdHlwZTogSVRFTVRZUEUsIF9pbWdTcmM/OiBzdHJpbmcsIF9saWZldGltZT86IG51bWJlciwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lLCBfZGVzY3JpcHRpb24sIF9wb3NpdGlvbiwgX2ltZ1NyYywgX2xpZmV0aW1lLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSBfYXR0cmlidXRlcztcclxuICAgICAgICAgICAgdGhpcy50eXBlID0gX3R5cGU7XHJcblxyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduSXRlbSh0aGlzLm5hbWUsIHRoaXMuZGVzY3JpcHRpb24sIF9wb3NpdGlvbiwgdGhpcy5pbWdTcmMsIHRoaXMubGlmZXRpbWUsIHRoaXMubmV0SWQsIHRoaXMuYXR0cmlidXRlcywgdGhpcy50eXBlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIGNvbGxpc2lvbkRldGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyczogYW55W10gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxFbmVteS5FbmVteT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5QTEFZRVIpO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5wcm9wZXJ0aWVzICE9IHVuZGVmaW5lZCAmJiAodGhpcy5saWZldGltZSA+IDAgfHwgdGhpcy5saWZldGltZSA9PSB1bmRlZmluZWQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLnByb3BlcnRpZXMuYXR0cmlidXRlcy5hZGRBdHRyaWJ1ZXNCeUl0ZW0odGhpcy5hdHRyaWJ1dGVzLCB0aGlzLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyQXR0cmlidXRlcyh0aGlzLmF0dHJpYnV0ZXMsIHRoaXMudHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coKDxFbmVteS5FbmVteT5lbGVtZW50KS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgUGxheWVyIHtcclxuICAgIGV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVzIHtcclxuXHJcbiAgICAgICAgcHVibGljIGhlYWx0aFBvaW50czogbnVtYmVyO1xyXG4gICAgICAgIG1heEhlYWx0aFBvaW50czogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBzcGVlZDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBhdHRhY2tQb2ludHM6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgY29vbERvd25SZWR1Y3Rpb246IG51bWJlciA9IDE7XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaGVhbHRoUG9pbnRzOiBudW1iZXIsIF9hdHRhY2tQb2ludHM6IG51bWJlciwgX3NwZWVkOiBudW1iZXIsIF9jb29sZG93blJlZHVjdGlvbj86IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLmhlYWx0aFBvaW50cyA9IF9oZWFsdGhQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMubWF4SGVhbHRoUG9pbnRzID0gX2hlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgdGhpcy5hdHRhY2tQb2ludHMgPSBfYXR0YWNrUG9pbnRzO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gX3NwZWVkO1xyXG4gICAgICAgICAgICBpZiAoX2Nvb2xkb3duUmVkdWN0aW9uICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb29sRG93blJlZHVjdGlvbiA9IF9jb29sZG93blJlZHVjdGlvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogYWRkcyBBdHRyaWJ1dGVzIHRvIHRoZSBQbGF5ZXIgQXR0cmlidXRlc1xyXG4gICAgICAgICAqIEBwYXJhbSBfYXR0cmlidXRlcyBpbmNvbWluZyBhdHRyaWJ1dGVzXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGFkZEF0dHJpYnVlc0J5SXRlbShfYXR0cmlidXRlczogUGxheWVyLkF0dHJpYnV0ZXMsIF9pdGVtVHlwZTogSXRlbXMuSVRFTVRZUEUpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3dpdGNoIChfaXRlbVR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgSXRlbXMuSVRFTVRZUEUuQUREOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGVhbHRoUG9pbnRzICs9IF9hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1heEhlYWx0aFBvaW50cyArPSBfYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZCArPSBfYXR0cmlidXRlcy5zcGVlZDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmF0dGFja1BvaW50cyArPSBfYXR0cmlidXRlcy5hdHRhY2tQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7IC8vIGNhbGN1bGF0ZSBhdHRyaWJ1dGVzIGJ5IGFkZGluZyB0aGVtXHJcbiAgICAgICAgICAgICAgICBjYXNlIEl0ZW1zLklURU1UWVBFLlNVQlNUUkFDVDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhlYWx0aFBvaW50cyAtPSBfYXR0cmlidXRlcy5oZWFsdGhQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tYXhIZWFsdGhQb2ludHMgLT0gX2F0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWQgLT0gX2F0dHJpYnV0ZXMuc3BlZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdHRhY2tQb2ludHMgLT0gX2F0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBjYWxjdWxhdGUgYXR0cmliZXMgYnkgc3Vic3RhY3RpbmcgdGhlbVxyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5JVEVNVFlQRS5QUk9DRU5UVUFMOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGVhbHRoUG9pbnRzID0gdGhpcy5oZWFsdGhQb2ludHMgKiAoKDEwMCArIF9hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cykgLyAxMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNrUG9pbnRzID0gdGhpcy5hdHRhY2tQb2ludHMgKiAoKDEwMCArIF9hdHRyaWJ1dGVzLmF0dGFja1BvaW50cykgLyAxMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3BlZWQgPSB0aGlzLnNwZWVkICogKCgxMDAgKyBfYXR0cmlidXRlcy5zcGVlZCkgLyAxMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuY29vbERvd25SZWR1Y3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29vbERvd25SZWR1Y3Rpb24gPSB0aGlzLmNvb2xEb3duUmVkdWN0aW9uICogTWF0aC5mcm91bmQoKDEwMCAvICgxMDAgKyBfYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbikpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmNvb2xEb3duUmVkdWN0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhazsgLy8gY2FsY3VsYXRlIGF0dHJpYnV0ZXMgYnkgZ2l2aW5nIHNwZWZpYyAlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQnVsbGV0cyB7XHJcblxyXG4gICAgZXhwb3J0IGxldCBidWxsZXRUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQnVsbGV0IGV4dGVuZHMgR2FtZS7Gki5Ob2RlIGltcGxlbWVudHMgSW50ZXJmYWNlcy5JU3Bhd25hYmxlIHtcclxuICAgICAgICBvd25lcjogVGFnLlRBRyA9IFRhZy5UQUcuUExBWUVSO1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyID0gTmV0d29ya2luZy5pZEdlbmVyYXRvcigpO1xyXG4gICAgICAgIHB1YmxpYyB0aWNrOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIHB1YmxpYyBwb3NpdGlvbnM6IMaSLlZlY3RvcjNbXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBob3N0UG9zaXRpb25zOiDGki5WZWN0b3IzW10gPSBbXTtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5CVUxMRVQ7XHJcbiAgICAgICAgcHVibGljIGZseURpcmVjdGlvbjogxpIuVmVjdG9yMztcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG5cclxuICAgICAgICBwdWJsaWMgaGl0UG9pbnRzOiBudW1iZXIgPSA1O1xyXG4gICAgICAgIHB1YmxpYyBzcGVlZDogbnVtYmVyID0gMjA7XHJcbiAgICAgICAgbGlmZXRpbWU6IG51bWJlciA9IDEgKiBHYW1lLmZyYW1lUmF0ZTtcclxuXHJcbiAgICAgICAgdGltZTogbnVtYmVyID0gMDtcclxuICAgICAgICBraWxsY291bnQ6IG51bWJlciA9IDE7XHJcblxyXG4gICAgICAgIGF2YXRhcjogR2FtZS7GkkFpZC5Ob2RlU3ByaXRlO1xyXG5cclxuICAgICAgICBhc3luYyBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPj0gMCAmJiB0aGlzLmxpZmV0aW1lICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUtLTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucmVtb3ZlQnVsbGV0KHRoaXMubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmhvc3RQb3NpdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMucG9zaXRpb25zKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfYXZhdGFyOiBHYW1lLsaSQWlkLk5vZGVTcHJpdGUsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihcIm5vcm1hbEJ1bGxldFwiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyID0gX2F2YXRhcjtcclxuXHJcbiAgICAgICAgICAgIGlmIChfbmV0SWQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5jdXJyZW50SURzLnB1c2goX25ldElkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV0SWQgPSBfbmV0SWQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRMaWdodChuZXcgxpIuTGlnaHRQb2ludCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDApO1xyXG4gICAgICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWVzaCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBuZXdQb3NpdGlvbiA9IG5ldyDGki5WZWN0b3IyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKyB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcihuZXdQb3NpdGlvbiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55IC8gMS41KTtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVSb3RhdGlvbihfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSgpO1xyXG4gICAgICAgICAgICB0aGlzLmZseURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWCgpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGFzeW5jIG1vdmUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZSh0aGlzLmZseURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuYnVsbGV0UHJlZGljdGlvbigpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpc2lvbkRldGVjdGlvbigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlUm90YXRpb24oX2RpcmVjdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnJvdGF0ZVooQ2FsY3VsYXRpb24uY2FsY0RlZ3JlZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgxpIuVmVjdG9yMy5TVU0oX2RpcmVjdGlvbiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pKSArIDkwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJ1bGxldFByZWRpY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGltZSArPSBHYW1lLsaSLkxvb3AudGltZUZyYW1lR2FtZTtcclxuXHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRpbWUgPj0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wb3NpdGlvbnMucHVzaChuZXcgxpIuVmVjdG9yMyh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi56KSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1bGxldCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy5uZXRJZCwgdGhpcy50aWNrKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMudGljaysrO1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lIC09IDE7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCAhPSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpY2sgPj0gMSAmJiB0aGlzLmhvc3RQb3NpdGlvbnNbdGhpcy50aWNrIC0gMV0gIT0gdW5kZWZpbmVkICYmIHRoaXMucG9zaXRpb25zW3RoaXMudGljayAtIDFdICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmhvc3RQb3NpdGlvbnNbdGhpcy50aWNrIC0gMV0ueCAhPSB0aGlzLnBvc2l0aW9uc1t0aGlzLnRpY2sgLSAxXS54IHx8IHRoaXMuaG9zdFBvc2l0aW9uc1t0aGlzLnRpY2sgLSAxXS55ICE9IHRoaXMucG9zaXRpb25zW3RoaXMudGljayAtIDFdLnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb3JyZWN0UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIGNvcnJlY3RQb3NpdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaG9zdFBvc2l0aW9uc1t0aGlzLnRpY2tdICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSB0aGlzLmhvc3RQb3NpdGlvbnNbdGhpcy50aWNrXTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4geyB0aGlzLmNvcnJlY3RQb3NpdGlvbiB9LCAxMDApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsb2FkVGV4dHVyZSgpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1R4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3Q29hdDogxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkID0gbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3TXRyOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm10clwiLCDGki5TaGFkZXJGbGF0VGV4dHVyZWQsIG5ld0NvYXQpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG9sZENvbUNvYXQ6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKCk7XHJcblxyXG4gICAgICAgICAgICBvbGRDb21Db2F0ID0gdGhpcy5nZXRDb21wb25lbnQoxpIuQ29tcG9uZW50TWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgbmV3VHh0ID0gYnVsbGV0VHh0O1xyXG4gICAgICAgICAgICBuZXdDb2F0LmNvbG9yID0gxpIuQ29sb3IuQ1NTKFwiV0hJVEVcIik7XHJcbiAgICAgICAgICAgIG5ld0NvYXQudGV4dHVyZSA9IG5ld1R4dDtcclxuICAgICAgICAgICAgb2xkQ29tQ29hdC5tYXRlcmlhbCA9IG5ld010cjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIGNvbGxpc2lvbkRldGVjdGlvbigpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1Bvc2l0aW9uID0gbmV3IMaSLlZlY3RvcjIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCArIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gbmV3UG9zaXRpb247XHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlcnM6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm93bmVyID09IFRhZy5UQUcuUExBWUVSKSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRlcnMgPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxFbmVteS5FbmVteT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5FTkVNWSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQuY29sbGlkZXIpICYmIGVsZW1lbnQucHJvcGVydGllcyAhPSB1bmRlZmluZWQgJiYgdGhpcy5raWxsY291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkucHJvcGVydGllcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxFbmVteS5FbmVteT5lbGVtZW50KS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC09IHRoaXMuaGl0UG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPFBsYXllci5QbGF5ZXI+dGhpcy5hdmF0YXIpLmRvS25vY2tiYWNrKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBVSS5EYW1hZ2VVSSgoPEVuZW15LkVuZW15PmVsZW1lbnQpLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy5oaXRQb2ludHMpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMua2lsbGNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICBpZiAodGhpcy5vd25lciA9PSBUYWcuVEFHLkVORU1ZKSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRlcnMgPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlBMQVlFUik7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQuY29sbGlkZXIpICYmIGVsZW1lbnQucHJvcGVydGllcyAhPSB1bmRlZmluZWQgJiYgdGhpcy5raWxsY291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkucHJvcGVydGllcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC09IHRoaXMuaGl0UG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxFbmVteS5FbmVteT50aGlzLmF2YXRhcikuZG9Lbm9ja2JhY2soZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBVSS5EYW1hZ2VVSSgoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLmhpdFBvaW50cykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmtpbGxjb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29sbGlkZXJzID0gW107XHJcbiAgICAgICAgICAgIGNvbGxpZGVycyA9ICg8R2VuZXJhdGlvbi5Sb29tPkdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maW5kKGVsZW1lbnQgPT4gKDxHZW5lcmF0aW9uLlJvb20+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuUk9PTSkpLndhbGxzO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXNSZWN0KGVsZW1lbnQuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTbG93QnVsbGV0IGV4dGVuZHMgQnVsbGV0IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9hdmF0YXI6IEdhbWUuxpJBaWQuTm9kZVNwcml0ZSwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9wb3NpdGlvbiwgX2RpcmVjdGlvbiwgX2F2YXRhciwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IDY7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0UG9pbnRzID0gMTA7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSA1ICogR2FtZS5mcmFtZVJhdGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBNZWxlZUJ1bGxldCBleHRlbmRzIEJ1bGxldCB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfYXZhdGFyOiBHYW1lLsaSQWlkLk5vZGVTcHJpdGUsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfcG9zaXRpb24sIF9kaXJlY3Rpb24sIF9hdmF0YXIsIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSA2O1xyXG4gICAgICAgICAgICB0aGlzLmhpdFBvaW50cyA9IDEwO1xyXG4gICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gNjtcclxuICAgICAgICAgICAgdGhpcy5raWxsY291bnQgPSA0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgbG9hZFRleHR1cmUoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgSG9taW5nQnVsbGV0IGV4dGVuZHMgQnVsbGV0IHtcclxuICAgICAgICB0YXJnZXQ6IMaSLlZlY3RvcjMgPSBuZXcgxpIuVmVjdG9yMygwLCAwLCAwKTtcclxuICAgICAgICByb3RhdGVTcGVlZDogbnVtYmVyID0gMztcclxuICAgICAgICB0YXJnZXREaXJlY3Rpb246IMaSLlZlY3RvcjM7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX3RhcmdldDogxpIuVmVjdG9yMywgX2F2YXRhcjogR2FtZS7GkkFpZC5Ob2RlU3ByaXRlLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX3Bvc2l0aW9uLCBfZGlyZWN0aW9uLCBfYXZhdGFyLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gMjA7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0UG9pbnRzID0gNTtcclxuICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDEgKiBHYW1lLmZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5raWxsY291bnQgPSAxO1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IF90YXJnZXQ7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0RGlyZWN0aW9uID0gX2RpcmVjdGlvbjtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXN5bmMgbW92ZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVIb21pbmcoKTtcclxuICAgICAgICAgICAgc3VwZXIubW92ZSgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYWxjdWxhdGVIb21pbmcoKSB7XHJcbiAgICAgICAgICAgIGxldCBuZXdEaXJlY3Rpb24gPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICBpZiAobmV3RGlyZWN0aW9uLnggIT0gMCAmJiBuZXdEaXJlY3Rpb24ueSAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IHJvdGF0ZUFtb3VudDI6IG51bWJlciA9IMaSLlZlY3RvcjMuQ1JPU1MobmV3RGlyZWN0aW9uLCB0aGlzLnRhcmdldERpcmVjdGlvbikuejtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5yb3RhdGVaKC1yb3RhdGVBbW91bnQyICogdGhpcy5yb3RhdGVTcGVlZCk7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0RGlyZWN0aW9uID0gQ2FsY3VsYXRpb24uZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRCh0aGlzLnRhcmdldERpcmVjdGlvbiwgLXJvdGF0ZUFtb3VudDIgKiB0aGlzLnJvdGF0ZVNwZWVkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgUGxheWVyIHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQ2hhcmFjdGVyIHtcclxuICAgICAgICBwdWJsaWMgbmFtZTogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBhdHRyaWJ1dGVzOiBBdHRyaWJ1dGVzO1xyXG4gICAgICAgIFxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfYXR0cmlidXRlczogQXR0cmlidXRlcykge1xyXG4gICAgICAgICAgICB0aGlzLm5hbWUgPSBfbmFtZTtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0gX2F0dHJpYnV0ZXM7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIENvbGxpZGVyIHtcclxuICAgIGV4cG9ydCBjbGFzcyBDb2xsaWRlciB7XHJcbiAgICAgICAgcmFkaXVzOiBudW1iZXI7XHJcbiAgICAgICAgcG9zaXRpb246IMaSLlZlY3RvcjI7XHJcbiAgICAgICAgZ2V0IHRvcCgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueSAtIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IGxlZnQoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLnBvc2l0aW9uLnggLSB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCByaWdodCgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueCArIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IGJvdHRvbSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueSArIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX3JhZGl1czogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBfcG9zaXRpb247XHJcbiAgICAgICAgICAgIHRoaXMucmFkaXVzID0gX3JhZGl1cztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbGxpZGVzKF9jb2xsaWRlcjogQ29sbGlkZXIpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlOiDGki5WZWN0b3IyID0gxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMucG9zaXRpb24sIF9jb2xsaWRlci5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnJhZGl1cyArIF9jb2xsaWRlci5yYWRpdXMgPiBkaXN0YW5jZS5tYWduaXR1ZGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbGxpZGVzUmVjdChfY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxlZnQgPiBfY29sbGlkZXIucmlnaHQpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMucmlnaHQgPCBfY29sbGlkZXIubGVmdCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy50b3AgPiBfY29sbGlkZXIuYm90dG9tKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJvdHRvbSA8IF9jb2xsaWRlci50b3ApIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRJbnRlcnNlY3Rpb24oX2NvbGxpZGVyOiBDb2xsaWRlcik6IG51bWJlciB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb2xsaWRlcyhfY29sbGlkZXIpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2U6IMaSLlZlY3RvcjIgPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5wb3NpdGlvbiwgX2NvbGxpZGVyLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbiA9IHRoaXMucmFkaXVzICsgX2NvbGxpZGVyLnJhZGl1cyAtIGRpc3RhbmNlLm1hZ25pdHVkZTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpbnRlcnNlY3Rpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRJbnRlcnNlY3Rpb25SZWN0KF9jb2xsaWRlcjogxpIuUmVjdGFuZ2xlKTogxpIuUmVjdGFuZ2xlIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbGxpZGVzUmVjdChfY29sbGlkZXIpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uOiDGki5SZWN0YW5nbGUgPSBuZXcgxpIuUmVjdGFuZ2xlKCk7XHJcbiAgICAgICAgICAgIGludGVyc2VjdGlvbi54ID0gTWF0aC5tYXgodGhpcy5sZWZ0LCBfY29sbGlkZXIubGVmdCk7XHJcbiAgICAgICAgICAgIGludGVyc2VjdGlvbi55ID0gTWF0aC5tYXgodGhpcy50b3AsIF9jb2xsaWRlci50b3ApO1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24ud2lkdGggPSBNYXRoLm1pbih0aGlzLnJpZ2h0LCBfY29sbGlkZXIucmlnaHQpIC0gaW50ZXJzZWN0aW9uLng7XHJcbiAgICAgICAgICAgIGludGVyc2VjdGlvbi5oZWlnaHQgPSBNYXRoLm1pbih0aGlzLmJvdHRvbSwgX2NvbGxpZGVyLmJvdHRvbSkgLSBpbnRlcnNlY3Rpb24ueTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpbnRlcnNlY3Rpb247XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEVuZW15U3Bhd25lciB7XHJcbiAgICBsZXQgc3Bhd25UaW1lOiBudW1iZXIgPSAxICogR2FtZS5mcmFtZVJhdGU7XHJcbiAgICBsZXQgY3VycmVudFRpbWU6IG51bWJlciA9IHNwYXduVGltZTtcclxuICAgIGxldCBtYXhFbmVtaWVzOiBudW1iZXIgPSAyMDtcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25FbmVtaWVzKCk6IHZvaWQge1xyXG4gICAgICAgIGlmIChHYW1lLmVuZW1pZXMubGVuZ3RoIDwgbWF4RW5lbWllcykge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhHYW1lLmVuZW1pZXMubGVuZ3RoKTtcclxuICAgICAgICAgICAgaWYgKGN1cnJlbnRUaW1lID09IHNwYXduVGltZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVmID0gR2FtZS5lbmVtaWVzSlNPTi5maW5kKGVsZW0gPT4gZWxlbS5uYW1lID09IFwiYmF0XCIpO1xyXG4gICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXcgRW5lbXkuRW5lbXlTaG9vdChFbmVteS5FTkVNWU5BTUUuVElDSywgbmV3IFBsYXllci5DaGFyYWN0ZXIocmVmLm5hbWUsIG5ldyBQbGF5ZXIuQXR0cmlidXRlcyhyZWYuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgcmVmLmF0dHJpYnV0ZXMuc3BlZWQpKSwgbmV3IMaSLlZlY3RvcjIoKE1hdGgucmFuZG9tKCkgKiA3IC0gKE1hdGgucmFuZG9tKCkgKiA3KSkgKiAyLCAoTWF0aC5yYW5kb20oKSAqIDcgLSAoTWF0aC5yYW5kb20oKSAqIDcpICogMikpLCBuZXcgV2VhcG9ucy5XZWFwb24oNjAsIDEpKSk7XHJcbiAgICAgICAgICAgICAgICAvLyBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBFbmVteS5FbmVteUR1bWIoRW5lbXkuRU5FTVlOQU1FLlRJQ0ssIG5ldyBQbGF5ZXIuQ2hhcmFjdGVyKHJlZi5uYW1lLCBuZXcgUGxheWVyLkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkKSksIG5ldyDGki5WZWN0b3IyKChNYXRoLnJhbmRvbSgpICogNyAtIChNYXRoLnJhbmRvbSgpICogNykpICogMiwgKE1hdGgucmFuZG9tKCkgKiA3IC0gKE1hdGgucmFuZG9tKCkgKiA3KSAqIDIpKSkpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjdXJyZW50VGltZS0tO1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgY3VycmVudFRpbWUgPSBzcGF3blRpbWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlTcGF3bmVzIHtcclxuICAgICAgICBzcGF3blBvc2l0aW9uczogxpIuVmVjdG9yMltdID0gW107XHJcbiAgICAgICAgbnVtYmVyT2ZFTmVtaWVzOiBudW1iZXI7XHJcbiAgICAgICAgc3Bhd25PZmZzZXQ6IG51bWJlciA9IDU7XHJcblxyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Jvb21TaXplOiBudW1iZXIsIF9udW1iZXJPZkVuZW1pZXM6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLm51bWJlck9mRU5lbWllcyA9IF9udW1iZXJPZkVuZW1pZXM7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgZ2V0U3Bhd25Qb3NpdGlvbnMoX3Jvb206IEdlbmVyYXRpb24uUm9vbSk6IMaSLlZlY3RvcjJbXSB7XHJcbiAgICAgICAgICAgIHJldHVybiBbbmV3IMaSLlZlY3RvcjIoMCArIHRoaXMuc3Bhd25PZmZzZXQsIDAgKyB0aGlzLnNwYXduT2Zmc2V0KSwgbmV3IMaSLlZlY3RvcjIoX3Jvb20uZ2V0Um9vbVNpemUoKSAtIHRoaXMuc3Bhd25PZmZzZXQsIF9yb29tLmdldFJvb21TaXplKCkgKyB0aGlzLnNwYXduT2Zmc2V0KV1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIENhbGN1bGF0aW9uIHtcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRDbG9zZXJBdmF0YXJQb3NpdGlvbihfc3RhcnRQb2ludDogxpIuVmVjdG9yMyk6IMaSLlZlY3RvcjMge1xyXG4gICAgICAgIGxldCB0YXJnZXQgPSBHYW1lLmF2YXRhcjE7XHJcblxyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2VQbGF5ZXIxID0gX3N0YXJ0UG9pbnQuZ2V0RGlzdGFuY2UoR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjIgPSBfc3RhcnRQb2ludC5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZVBsYXllcjEgPCBkaXN0YW5jZVBsYXllcjIpIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldCA9IEdhbWUuYXZhdGFyMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldCA9IEdhbWUuYXZhdGFyMjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRhcmdldC5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb247XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjYWxjRGVncmVlKF9jZW50ZXI6IMaSLlZlY3RvcjMsIF90YXJnZXQ6IMaSLlZlY3RvcjMpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCB4RGlzdGFuY2U6IG51bWJlciA9IF90YXJnZXQueCAtIF9jZW50ZXIueDtcclxuICAgICAgICBsZXQgeURpc3RhbmNlOiBudW1iZXIgPSBfdGFyZ2V0LnkgLSBfY2VudGVyLnk7XHJcbiAgICAgICAgbGV0IGRlZ3JlZXM6IG51bWJlciA9IE1hdGguYXRhbjIoeURpc3RhbmNlLCB4RGlzdGFuY2UpICogKDE4MCAvIE1hdGguUEkpIC0gOTA7XHJcbiAgICAgICAgcmV0dXJuIGRlZ3JlZXM7XHJcblxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldFJvdGF0ZWRWZWN0b3JCeUFuZ2xlMkQoX3ZlY3RvclRvUm90YXRlOiDGki5WZWN0b3IzLCBfYW5nbGU6IG51bWJlcik6IMaSLlZlY3RvcjMge1xyXG4gICAgICAgIGxldCBhbmdsZVRvUmFkaWFuOiBudW1iZXIgPSBfYW5nbGUgKiAoTWF0aC5QSSAvIDE4MCk7XHJcblxyXG4gICAgICAgIGxldCBuZXdYID0gX3ZlY3RvclRvUm90YXRlLnggKiBNYXRoLmNvcyhhbmdsZVRvUmFkaWFuKSAtIF92ZWN0b3JUb1JvdGF0ZS55ICogTWF0aC5zaW4oYW5nbGVUb1JhZGlhbik7XHJcbiAgICAgICAgbGV0IG5ld1kgPSBfdmVjdG9yVG9Sb3RhdGUueCAqIE1hdGguc2luKGFuZ2xlVG9SYWRpYW4pICsgX3ZlY3RvclRvUm90YXRlLnkgKiBNYXRoLmNvcyhhbmdsZVRvUmFkaWFuKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyDGki5WZWN0b3IzKG5ld1gsIG5ld1ksIF92ZWN0b3JUb1JvdGF0ZS56KTtcclxuICAgIH1cclxuXHJcblxyXG59IiwibmFtZXNwYWNlIElucHV0U3lzdGVtIHtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBrZXlib2FyZERvd25FdmVudCk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwga2V5Ym9hcmRVcEV2ZW50KTtcclxuICAgIEdhbWUuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgYXR0YWNrKTtcclxuICAgIEdhbWUuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgcm90YXRlVG9Nb3VzZSk7XHJcblxyXG4gICAgLy8jcmVnaW9uIHJvdGF0ZVxyXG4gICAgbGV0IG1vdXNlUG9zaXRpb246IMaSLlZlY3RvcjM7XHJcblxyXG4gICAgZnVuY3Rpb24gcm90YXRlVG9Nb3VzZShfbW91c2VFdmVudDogTW91c2VFdmVudCk6IHZvaWQge1xyXG4gICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBsZXQgcmF5OiDGki5SYXkgPSBHYW1lLnZpZXdwb3J0LmdldFJheUZyb21DbGllbnQobmV3IMaSLlZlY3RvcjIoX21vdXNlRXZlbnQub2Zmc2V0WCwgX21vdXNlRXZlbnQub2Zmc2V0WSkpO1xyXG4gICAgICAgICAgICBtb3VzZVBvc2l0aW9uID0gcmF5LmludGVyc2VjdFBsYW5lKG5ldyDGki5WZWN0b3IzKDAsIDAsIDApLCBuZXcgxpIuVmVjdG9yMygwLCAwLCAxKSk7XHJcbiAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5tdHhMb2NhbC5yb3RhdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIDAsIENhbGN1bGF0aW9uLmNhbGNEZWdyZWUoR2FtZS5hdmF0YXIxLm10eExvY2FsLnRyYW5zbGF0aW9uLCBtb3VzZVBvc2l0aW9uKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2FsY1Bvc2l0aW9uRnJvbURlZ3JlZShfZGVncmVlczogbnVtYmVyLCBfZGlzdGFuY2U6IG51bWJlcik6IMaSLlZlY3RvcjIge1xyXG4gICAgICAgIGxldCBkaXN0YW5jZSA9IDU7XHJcbiAgICAgICAgbGV0IG5ld0RlZyA9IChfZGVncmVlcyAqIE1hdGguUEkpIC8gMTgwO1xyXG4gICAgICAgIGxldCB5ID0gTWF0aC5jb3MobmV3RGVnKTtcclxuICAgICAgICBsZXQgeCA9IE1hdGguc2luKG5ld0RlZykgKiAtMTtcclxuICAgICAgICBsZXQgY29vcmQgPSBuZXcgxpIuVmVjdG9yMih4LCB5KTtcclxuICAgICAgICBjb29yZC5zY2FsZShkaXN0YW5jZSk7XHJcbiAgICAgICAgcmV0dXJuIGNvb3JkO1xyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIG1vdmUgYW5kIGFiaWxpdHlcclxuICAgIGxldCBjb250cm9sbGVyID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KFtcclxuICAgICAgICBbXCJXXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJBXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJTXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJEXCIsIGZhbHNlXVxyXG4gICAgXSk7XHJcblxyXG4gICAgZnVuY3Rpb24ga2V5Ym9hcmREb3duRXZlbnQoX2U6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgaWYgKF9lLmNvZGUudG9VcHBlckNhc2UoKSAhPSBcIlNQQUNFXCIpIHtcclxuICAgICAgICAgICAgICAgIGxldCBrZXk6IHN0cmluZyA9IF9lLmNvZGUudG9VcHBlckNhc2UoKS5zdWJzdHJpbmcoMyk7XHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyLnNldChrZXksIHRydWUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy9EbyBhYmlsdHkgZnJvbSBwbGF5ZXJcclxuICAgICAgICAgICAgICAgIGFiaWxpdHkoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBrZXlib2FyZFVwRXZlbnQoX2U6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgbGV0IGtleTogc3RyaW5nID0gX2UuY29kZS50b1VwcGVyQ2FzZSgpLnN1YnN0cmluZygzKTtcclxuICAgICAgICAgICAgY29udHJvbGxlci5zZXQoa2V5LCBmYWxzZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBtb3ZlKCkge1xyXG4gICAgICAgIGxldCBtb3ZlVmVjdG9yOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgIGxldCBoYXNDaGFuZ2VkOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIldcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci55ICs9IDE7XHJcbiAgICAgICAgICAgIGhhc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJBXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueCAtPSAxO1xyXG4gICAgICAgICAgICBoYXNDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiU1wiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnkgLT0gMTtcclxuICAgICAgICAgICAgaGFzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIkRcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci54ICs9IDE7XHJcbiAgICAgICAgICAgIGhhc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGhhc0NoYW5nZWQgJiYgbW92ZVZlY3Rvci5tYWduaXR1ZGUgIT0gMCkge1xyXG4gICAgICAgICAgICBHYW1lLmF2YXRhcjEubW92ZShHYW1lLsaSLlZlY3RvcjMuTk9STUFMSVpBVElPTihtb3ZlVmVjdG9yLCAxKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFiaWxpdHkoKSB7XHJcbiAgICAgICAgR2FtZS5hdmF0YXIxLmRvQWJpbGl0eSgpO1xyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIGF0dGFja1xyXG4gICAgZnVuY3Rpb24gYXR0YWNrKGVfOiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGxldCBtb3VzZUJ1dHRvbiA9IGVfLmJ1dHRvbjtcclxuICAgICAgICAgICAgc3dpdGNoIChtb3VzZUJ1dHRvbikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vbGVmdCBtb3VzZSBidXR0b24gcGxheWVyLmF0dGFja1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRShtb3VzZVBvc2l0aW9uLCBHYW1lLmF2YXRhcjEubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZVRvTW91c2UoZV8pO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5hdHRhY2soZGlyZWN0aW9uLCBudWxsLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IHJpZ2h0IG1vdXNlIGJ1dHRvbiBwbGF5ZXIuaGVhdnlBdHRhY2sgb3Igc29tZXRoaW5nIGxpa2UgdGhhdFxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcbn0iLCJuYW1lc3BhY2UgTGV2ZWwge1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBMYW5kc2NhcGUgZXh0ZW5kcyDGki5Ob2Rle1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUpO1xyXG5cclxuICAgICAgICAgICAgLy8gdGhpcy5nZXRDaGlsZHJlbigpWzBdLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudFRyYW5zZm9ybSkubXR4TG9jYWwudHJhbnNsYXRlWigtMilcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufSIsIi8vLzxyZWZlcmVuY2UgcGF0aD1cIi4uL0ZVREdFL05ldC9CdWlsZC9DbGllbnQvRnVkZ2VDbGllbnQuZC50c1wiLz5cclxuXHJcbm5hbWVzcGFjZSBOZXR3b3JraW5nIHtcclxuICAgIGV4cG9ydCBlbnVtIEZVTkNUSU9OIHtcclxuICAgICAgICBDT05ORUNURUQsXHJcbiAgICAgICAgU0VUUkVBRFksXHJcbiAgICAgICAgU1BBV04sXHJcbiAgICAgICAgVFJBTlNGT1JNLFxyXG4gICAgICAgIFNQQVdOQlVMTEVULFxyXG4gICAgICAgIFNQQVdOQlVMTEVURU5FTVksXHJcbiAgICAgICAgQlVMTEVUVFJBTlNGT1JNLFxyXG4gICAgICAgIEJVTExFVERJRSxcclxuICAgICAgICBTUEFXTkVORU1ZLFxyXG4gICAgICAgIEVORU1ZVFJBTlNGT1JNLFxyXG4gICAgICAgIEVORU1ZRElFLFxyXG4gICAgICAgIFNQQVdOSVRFTSxcclxuICAgICAgICBVUERBVEVBVFRSSUJVVEVTLFxyXG4gICAgICAgIElURU1ESUVcclxuICAgIH1cclxuXHJcbiAgICBpbXBvcnQgxpJDbGllbnQgPSBGdWRnZU5ldC5GdWRnZUNsaWVudDtcclxuXHJcbiAgICBleHBvcnQgbGV0IGNsaWVudDogxpJDbGllbnQ7XHJcbiAgICBleHBvcnQgbGV0IGNsaWVudHM6IEFycmF5PHsgaWQ6IHN0cmluZywgcmVhZHk6IGJvb2xlYW4gfT4gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgcG9zVXBkYXRlOiDGki5WZWN0b3IzO1xyXG4gICAgZXhwb3J0IGxldCBzb21lb25lSXNIb3N0OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IGVuZW15OiBFbmVteS5FbmVteTtcclxuICAgIGV4cG9ydCBsZXQgY3VycmVudElEczogbnVtYmVyW10gPSBbXTtcclxuXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHsgc3Bhd25QbGF5ZXIoKSB9LCB0cnVlKTtcclxuICAgIGxldCBJUENvbm5lY3Rpb24gPSA8SFRNTElucHV0RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIklQQ29ubmVjdGlvblwiKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ29ubmVjdGluZ1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY29ubmV0aW5nLCB0cnVlKTtcclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNvbm5ldGluZygpIHtcclxuICAgICAgICBjbGllbnQgPSBuZXcgxpJDbGllbnQoKTtcclxuICAgICAgICBjbGllbnQuYWRkRXZlbnRMaXN0ZW5lcihGdWRnZU5ldC5FVkVOVC5NRVNTQUdFX1JFQ0VJVkVELCByZWNlaXZlTWVzc2FnZSk7XHJcbiAgICAgICAgY2xpZW50LmNvbm5lY3RUb1NlcnZlcihJUENvbm5lY3Rpb24udmFsdWUpO1xyXG5cclxuICAgICAgICBhZGRDbGllbnRJRCgpXHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGFkZENsaWVudElEKCkge1xyXG4gICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG9iajogeyBpZDogc3RyaW5nLCByZWFkeTogYm9vbGVhbiB9ID0geyBpZDogY2xpZW50LmlkLCByZWFkeTogZmFsc2UgfTtcclxuICAgICAgICAgICAgICAgIGNsaWVudHMucHVzaChvYmopO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChhZGRDbGllbnRJRCwgMzAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gcmVjZWl2ZU1lc3NhZ2UoX2V2ZW50OiBDdXN0b21FdmVudCB8IE1lc3NhZ2VFdmVudCB8IEV2ZW50KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgaWYgKF9ldmVudCBpbnN0YW5jZW9mIE1lc3NhZ2VFdmVudCkge1xyXG4gICAgICAgICAgICBsZXQgbWVzc2FnZTogRnVkZ2VOZXQuTWVzc2FnZSA9IEpTT04ucGFyc2UoX2V2ZW50LmRhdGEpO1xyXG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pZFNvdXJjZSAhPSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbW1hbmQgIT0gRnVkZ2VOZXQuQ09NTUFORC5TRVJWRVJfSEVBUlRCRUFUICYmIG1lc3NhZ2UuY29tbWFuZCAhPSBGdWRnZU5ldC5DT01NQU5ELkNMSUVOVF9IRUFSVEJFQVQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL0FkZCBuZXcgY2xpZW50IHRvIGFycmF5IGNsaWVudHNcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5DT05ORUNURUQudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50LnZhbHVlICE9IGNsaWVudC5pZCAmJiBjbGllbnRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50ID09IG1lc3NhZ2UuY29udGVudC52YWx1ZSkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRIb3N0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGllbnRzLnB1c2goeyBpZDogbWVzc2FnZS5jb250ZW50LnZhbHVlLCByZWFkeTogZmFsc2UgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vU2V0IGNsaWVudCByZWFkeVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNFVFJFQURZLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQuaWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGllbnRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50LmlkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkucmVhZHkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGF2YXRhcjIgYXMgcmFuZ2VkIG9yIG1lbGVlIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdOLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudC50eXBlID09IFBsYXllci5QTEFZRVJUWVBFLk1FTEVFKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIgPSBuZXcgUGxheWVyLk1lbGVlKFwicGxheWVyMlwiLCBuZXcgUGxheWVyLkNoYXJhY3RlcihtZXNzYWdlLmNvbnRlbnQudmFsdWUubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUGxheWVyLkF0dHJpYnV0ZXMobWVzc2FnZS5jb250ZW50LnZhbHVlLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIG1lc3NhZ2UuY29udGVudC52YWx1ZS5hdHRyaWJ1dGVzLnNwZWVkKSkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKEdhbWUuYXZhdGFyMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5jb250ZW50LnR5cGUgPT0gUGxheWVyLlBMQVlFUlRZUEUuUkFOR0VEKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIgPSBuZXcgUGxheWVyLlJhbmdlZChcInBsYXllcjJcIiwgbmV3IFBsYXllci5DaGFyYWN0ZXIobWVzc2FnZS5jb250ZW50LnZhbHVlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBsYXllci5BdHRyaWJ1dGVzKG1lc3NhZ2UuY29udGVudC52YWx1ZS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgbWVzc2FnZS5jb250ZW50LnZhbHVlLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUuYXR0cmlidXRlcy5zcGVlZCkpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hcHBlbmRDaGlsZChHYW1lLmF2YXRhcjIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1J1bnRpbWUgdXBkYXRlcyBhbmQgY29tbXVuaWNhdGlvblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TeW5jIGF2YXRhcjIgcG9zaXRpb24gYW5kIHJvdGF0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbW92ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhWzJdKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJvdGF0ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzJdKVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG1vdmVWZWN0b3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIubXR4TG9jYWwucm90YXRpb24gPSByb3RhdGVWZWN0b3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gYnVsbGV0IGZyb20gaG9zdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUEFXTkJVTExFVC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIuYXR0YWNrKG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuZGlyZWN0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24uZGF0YVsyXSksIG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gYnVsbGV0IGZyb20gZW5lbXkgb24gaG9zdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUEFXTkJVTExFVEVORU1ZLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmVteTogRW5lbXkuRW5lbXkgPSBHYW1lLmVuZW1pZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50LmVuZW15TmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWVzc2FnZS5jb250ZW50LmJ1bGxldE5ldElkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVuZW15ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW5lbXkgaW5zdGFuY2VvZiBFbmVteS5FbmVteVNob290ICYmIGNsaWVudC5pZCAhPSBjbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8RW5lbXkuRW5lbXlTaG9vdD5lbmVteSkuc2hvb3QobWVzc2FnZS5jb250ZW50LmJ1bGxldE5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1N5bmMgYnVsbGV0IHRyYW5zZm9ybSBmcm9tIGhvc3QgdG8gY2xpZW50XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkJVTExFVFRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5idWxsZXRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdQb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYnVsbGV0cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpLmhvc3RQb3NpdGlvbnNbbWVzc2FnZS5jb250ZW50LnRpY2tdID0gbmV3UG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vS2lsbCBidWxsZXQgYXQgdGhlIGNsaWVudCBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQlVMTEVURElFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWxsZXQgPSBHYW1lLmJ1bGxldHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYnVsbGV0ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQubGlmZXRpbWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TcGF3biBlbmVteSBhdCB0aGUgY2xpZW50IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUEFXTkVORU1ZLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZW5lbXk6IFwiICsgbWVzc2FnZS5jb250ZW50LnByb3BlcnRpZXMuYXR0cmlidXRlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaG9vc2VFbmVteSg8RW5lbXkuRU5FTVlOQU1FPm1lc3NhZ2UuY29udGVudC5pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUGxheWVyLkF0dHJpYnV0ZXMobWVzc2FnZS5jb250ZW50LnByb3BlcnRpZXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmNvbnRlbnQucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bnVtYmVyPm1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3luYyBlbmVteSB0cmFuc2Zvcm0gZnJvbSBob3N0IHRvIGNsaWVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5FTkVNWVRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5lbXkgPSBHYW1lLmVuZW1pZXMuZmluZChlbmVtID0+IGVuZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmVteSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS51cGRhdGVDb2xsaWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0tpbGwgZW5lbXkgYXQgdGhlIGNsaWVudCBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5FTVlESUUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuZW15ID0gR2FtZS5lbmVtaWVzLmZpbmQoZW5lbSA9PiBlbmVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKGVuZW15KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcElEKG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gaXRlbSBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05JVEVNLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhdHRyaWJ1dGVzID0gbmV3IFBsYXllci5BdHRyaWJ1dGVzKG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5zcGVlZCwgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0obWVzc2FnZS5jb250ZW50Lm5hbWUsIG1lc3NhZ2UuY29udGVudC5kZXNjcmlwdGlvbiwgbmV3IMaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSksIGF0dHJpYnV0ZXMsIG1lc3NhZ2UuY29udGVudC50eXBlLCBtZXNzYWdlLmNvbnRlbnQuaW1nU3JjLCBtZXNzYWdlLmNvbnRlbnQubGlmZXRpbWUsIG1lc3NhZ2UuY29udGVudC5uZXRJZCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBleHRlcm5hbCBJdGVtXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gaXRlbSBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVVBEQVRFQVRUUklCVVRFUy50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXR0cmlidXRlcyA9IG5ldyBQbGF5ZXIuQXR0cmlidXRlcyhtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuc3BlZWQsIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuYWRkQXR0cmlidWVzQnlJdGVtKGF0dHJpYnV0ZXMsIG1lc3NhZ2UuY29udGVudC50eXBlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9LaWxsIGl0ZW0gZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLklURU1ESUUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbmVtID0+ICg8SXRlbXMuSXRlbT5lbmVtKS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcElEKG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2hvb3NlRW5lbXkoX2lkOiBFbmVteS5FTkVNWU5BTUUsIF9wcm9wZXJ0aWVzOiBQbGF5ZXIuQXR0cmlidXRlcywgX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlOQU1FLkJBVDpcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IEVuZW15LkVuZW15RHVtYihFbmVteS5FTkVNWU5BTUUuQkFULCBuZXcgUGxheWVyLkNoYXJhY3RlcihFbmVteS5nZXROYW1lQnlJRChfaWQpLCBuZXcgUGxheWVyLkF0dHJpYnV0ZXMoX3Byb3BlcnRpZXMuaGVhbHRoUG9pbnRzLCBfcHJvcGVydGllcy5hdHRhY2tQb2ludHMsIF9wcm9wZXJ0aWVzLnNwZWVkKSksIF9wb3NpdGlvbi50b1ZlY3RvcjIoKSwgX25ldElkKSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWU5BTUUuVElDSzpcclxuICAgICAgICAgICAgICAgIGxldCBuZXdFbmVtOiBFbmVteS5FbmVteVNob290ID0gbmV3IEVuZW15LkVuZW15U2hvb3QoX2lkLCBuZXcgUGxheWVyLkNoYXJhY3RlcihFbmVteS5nZXROYW1lQnlJRChfaWQpLCBuZXcgUGxheWVyLkF0dHJpYnV0ZXMoX3Byb3BlcnRpZXMuaGVhbHRoUG9pbnRzLCBfcHJvcGVydGllcy5hdHRhY2tQb2ludHMsIF9wcm9wZXJ0aWVzLnNwZWVkKSksIF9wb3NpdGlvbi50b1ZlY3RvcjIoKSwgbmV3IFdlYXBvbnMuV2VhcG9uKDEwLCAxKSwgX25ldElkKTtcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3RW5lbSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZXRDbGllbnRSZWFkeSgpIHtcclxuICAgICAgICBjbGllbnRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50LmlkID09IGNsaWVudC5pZCkucmVhZHkgPSB0cnVlO1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFVFJFQURZLCBuZXRJZDogY2xpZW50LmlkIH0gfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8jcmVnaW9uIHBsYXllclxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNldEhvc3QoKSB7XHJcbiAgICAgICAgaWYgKGNsaWVudC5pZEhvc3QgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5iZWNvbWVIb3N0KCk7XHJcbiAgICAgICAgICAgIHNvbWVvbmVJc0hvc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIklNIFRIRSBIT1NUIElNIFRIRSBIT1NUXCIpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNvbWVvbmVJc0hvc3QgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3blBsYXllcihfdHlwZT86IFBsYXllci5QTEFZRVJUWVBFKSB7XHJcbiAgICAgICAgaWYgKF90eXBlID09IFBsYXllci5QTEFZRVJUWVBFLk1FTEVFKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOLCB0eXBlOiBQbGF5ZXIuUExBWUVSVFlQRS5NRUxFRSwgdmFsdWU6IEdhbWUuYXZhdGFyMS5wcm9wZXJ0aWVzLCBwb3NpdGlvbjogR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiB9IH0pXHJcbiAgICAgICAgfSBlbHNlIGlmIChfdHlwZSA9PSBQbGF5ZXIuUExBWUVSVFlQRS5SQU5HRUQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV04sIHR5cGU6IFBsYXllci5QTEFZRVJUWVBFLlJBTkdFRCwgdmFsdWU6IEdhbWUuYXZhdGFyMS5wcm9wZXJ0aWVzLCBwb3NpdGlvbjogR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiB9IH0pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV04sIHR5cGU6IFBsYXllci5QTEFZRVJUWVBFLlJBTkdFRCwgdmFsdWU6IEdhbWUuYXZhdGFyMS5wcm9wZXJ0aWVzLCBwb3NpdGlvbjogR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjb25uZWN0ZWQoKSB7XHJcbiAgICAgICAgTmV0d29ya2luZy5jbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBOZXR3b3JraW5nLkZVTkNUSU9OLkNPTk5FQ1RFRCwgdmFsdWU6IE5ldHdvcmtpbmcuY2xpZW50LmlkIH0gfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzZW5kcyB0cmFuc2Zvcm0gb3ZlciBuZXR3b3JrXHJcbiAgICAgKiBAcGFyYW0gX19wb3NpdGlvbiBjdXJyZW50IHBvc2l0aW9uIG9mIE9iamVjdFxyXG4gICAgICogQHBhcmFtIF9yb3RhdGlvbiBjdXJyZW50IHJvdGF0aW9uIG9mIE9iamVjdFxyXG4gICAgICovXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQXZhdGFyUG9zaXRpb24oX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfcm90YXRpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5UUkFOU0ZPUk0sIHZhbHVlOiBfcG9zaXRpb24sIHJvdGF0aW9uOiBfcm90YXRpb24gfSB9KVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIGJ1bGxldFxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduQnVsbGV0KF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIDZcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05CVUxMRVQsIGRpcmVjdGlvbjogX2RpcmVjdGlvbiwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVCdWxsZXQoX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ6IG51bWJlciwgX3RpY2s/OiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQlVMTEVUVFJBTlNGT1JNLCBwb3NpdGlvbjogX3Bvc2l0aW9uLCBuZXRJZDogX25ldElkLCB0aWNrOiBfdGljayB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBzcGF3bkJ1bGxldEF0RW5lbXkoX2J1bGxldE5ldElkOiBudW1iZXIsIF9lbmVteU5ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05CVUxMRVRFTkVNWSwgYnVsbGV0TmV0SWQ6IF9idWxsZXROZXRJZCwgZW5lbXlOZXRJZDogX2VuZW15TmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUJ1bGxldChfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5CVUxMRVRESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiAgZW5lbXlcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkVuZW15KF9lbmVteTogRW5lbXkuRW5lbXksIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdORU5FTVksIGlkOiBfZW5lbXkuaWQsIHByb3BlcnRpZXM6IF9lbmVteS5wcm9wZXJ0aWVzLCBwb3NpdGlvbjogX2VuZW15Lm10eExvY2FsLnRyYW5zbGF0aW9uLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUVuZW15UG9zaXRpb24oX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkVORU1ZVFJBTlNGT1JNLCBwb3NpdGlvbjogX3Bvc2l0aW9uLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZW1vdmVFbmVteShfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkVORU1ZRElFLCBuZXRJZDogX25ldElkIH0gfSlcclxuXHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvLyNyZWdpb24gSXRlbXNcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkl0ZW0oX25hbWU6IHN0cmluZywgX2Rlc2NyaXB0aW9uOiBzdHJpbmcsIF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2ltZ1NyYzogc3RyaW5nLCBfbGlmZXRpbWU6IG51bWJlciwgX25ldElkOiBudW1iZXIsIF9hdHRyaWJ1dGVzPzogUGxheWVyLkF0dHJpYnV0ZXMsIF90eXBlPzogSXRlbXMuSVRFTVRZUEUpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coX2F0dHJpYnV0ZXMpO1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTklURU0sIG5hbWU6IF9uYW1lLCBkZXNjcmlwdGlvbjogX2Rlc2NyaXB0aW9uLCBwb3NpdGlvbjogX3Bvc2l0aW9uLCBpbWdTcmM6IF9pbWdTcmMsIGxpZmV0aW1lOiBfbGlmZXRpbWUsIG5ldElkOiBfbmV0SWQsIGF0dHJpYnV0ZXM6IF9hdHRyaWJ1dGVzLCB0eXBlOiBfdHlwZSB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQXZhdGFyQXR0cmlidXRlcyhfYXR0cmlidXRlczogUGxheWVyLkF0dHJpYnV0ZXMsIF90eXBlOiBJdGVtcy5JVEVNVFlQRSkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURUFUVFJJQlVURVMsIGF0dHJpYnV0ZXM6IF9hdHRyaWJ1dGVzLCB0eXBlOiBfdHlwZSB9IH0pO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVtb3ZlSXRlbShfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLklURU1ESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGlkR2VuZXJhdG9yKCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMCk7XHJcbiAgICAgICAgaWYgKGN1cnJlbnRJRHMuZmluZChjdXJJRCA9PiBjdXJJRCA9PSBpZCkpIHtcclxuICAgICAgICAgICAgaWRHZW5lcmF0b3IoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRJRHMucHVzaChpZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHBvcElEKF9pZDogbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IGluZGV4OiBudW1iZXI7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjdXJyZW50SURzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50SURzW2ldID09IF9pZCkge1xyXG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgY3VycmVudElEcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgfVxyXG5cclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiYmVmb3JldW5sb2FkXCIsIG9uVW5sb2FkLCBmYWxzZSk7XHJcblxyXG4gICAgZnVuY3Rpb24gb25VbmxvYWQoKSB7XHJcbiAgICAgICAgLy9UT0RPOiBUaGluZ3Mgd2UgZG8gYWZ0ZXIgdGhlIHBsYXllciBsZWZ0IHRoZSBnYW1lXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgUGxheWVyIHtcclxuICAgIGV4cG9ydCBlbnVtIFBMQVlFUlRZUEUge1xyXG4gICAgICAgIFJBTkdFRCxcclxuICAgICAgICBNRUxFRVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQbGF5ZXIgZXh0ZW5kcyBHYW1lLsaSQWlkLk5vZGVTcHJpdGUgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklLbm9ja2JhY2thYmxlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5QTEFZRVI7XHJcbiAgICAgICAgcHVibGljIGl0ZW1zOiBBcnJheTxJdGVtcy5JdGVtPiA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBwcm9wZXJ0aWVzOiBDaGFyYWN0ZXI7XHJcbiAgICAgICAgcHVibGljIHdlYXBvbjogV2VhcG9ucy5XZWFwb24gPSBuZXcgV2VhcG9ucy5XZWFwb24oMTIsIDEpO1xyXG5cclxuICAgICAgICBjb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7XHJcbiAgICAgICAgbW92ZURpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuXHJcbiAgICAgICAga25vY2tiYWNrRm9yY2U6IG51bWJlciA9IDY7XHJcblxyXG4gICAgICAgIHJlYWRvbmx5IGFiaWxpdHlDb3VudDogbnVtYmVyID0gMTtcclxuICAgICAgICBjdXJyZW50YWJpbGl0eUNvdW50OiBudW1iZXIgPSB0aGlzLmFiaWxpdHlDb3VudDtcclxuICAgICAgICByZWFkb25seSBhYmlsaXR5Q29vbGRvd25UaW1lOiBudW1iZXIgPSAxMDtcclxuICAgICAgICBjdXJyZW50YWJpbGl0eUNvb2xkb3duVGltZTogbnVtYmVyID0gdGhpcy5hYmlsaXR5Q29vbGRvd25UaW1lO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogQ2hhcmFjdGVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlWigwLjEpO1xyXG4gICAgICAgICAgICB0aGlzLnByb3BlcnRpZXMgPSBfcHJvcGVydGllcztcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcblxyXG4gICAgICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKCgxIC8gNjAgKiB0aGlzLnByb3BlcnRpZXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uLmFkZChfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkcyh0aGlzLm1vdmVEaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgbGV0IGRvb3JzOiBHZW5lcmF0aW9uLkRvb3JbXSA9ICg8R2VuZXJhdGlvbi5Sb29tPkdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maW5kKGVsZW1lbnQgPT4gKDxHZW5lcmF0aW9uLlJvb20+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuUk9PTSkpLmRvb3JzO1xyXG4gICAgICAgICAgICBkb29ycy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlc1JlY3QoZWxlbWVudC5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICAoPEdlbmVyYXRpb24uRG9vcj5lbGVtZW50KS5jaGFuZ2VSb29tKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uLnN1YnRyYWN0KF9kaXJlY3Rpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29sbGlkcyhfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IGNhbk1vdmVYOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICAgICAgbGV0IGNhbk1vdmVZOiBib29sZWFuID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlcnM6IEdlbmVyYXRpb24uV2FsbFtdID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbWVudCA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5ST09NKSkud2FsbHM7XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlc1JlY3QoZWxlbWVudC5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQmVmb3JlTW92ZSA9IE1hdGgucm91bmQoKGludGVyc2VjdGlvbi5oZWlnaHQgKiBpbnRlcnNlY3Rpb24ud2lkdGgpICogMTAwMCkgLyAxMDAwO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgb2xkUG9zaXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKHRoaXMuY29sbGlkZXIucG9zaXRpb24ueCwgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMihfZGlyZWN0aW9uLngsIDApXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBNYXRoLnJvdW5kKChuZXdJbnRlcnNlY3Rpb24uaGVpZ2h0ICogbmV3SW50ZXJzZWN0aW9uLndpZHRoKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKDAsIF9kaXJlY3Rpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBNYXRoLnJvdW5kKChuZXdJbnRlcnNlY3Rpb24uaGVpZ2h0ICogbmV3SW50ZXJzZWN0aW9uLndpZHRoKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbk1vdmVZID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgbGV0IGVuZW15Q29sbGlkZXJzOiBFbmVteS5FbmVteVtdID0gR2FtZS5lbmVtaWVzO1xyXG4gICAgICAgICAgICBlbmVteUNvbGxpZGVycy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50LmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUJlZm9yZU1vdmUgPSBNYXRoLnJvdW5kKChpbnRlcnNlY3Rpb24pICogMTAwMCkgLyAxMDAwO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgb2xkUG9zaXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKHRoaXMuY29sbGlkZXIucG9zaXRpb24ueCwgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMihfZGlyZWN0aW9uLngsIDApXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcikgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gTWF0aC5yb3VuZCgobmV3SW50ZXJzZWN0aW9uKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKDAsIF9kaXJlY3Rpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcikgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gTWF0aC5yb3VuZCgobmV3SW50ZXJzZWN0aW9uKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbk1vdmVZID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgaWYgKGNhbk1vdmVYICYmIGNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbiwgZmFsc2UpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNhbk1vdmVYICYmICFjYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9kaXJlY3Rpb24ueCwgMCwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24sIGZhbHNlKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICghY2FuTW92ZVggJiYgY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMygwLCBfZGlyZWN0aW9uLnksIF9kaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBhdHRhY2soX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyLCBfc3luYz86IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMud2VhcG9uLmN1cnJlbnRBdHRhY2tDb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgYnVsbGV0OiBCdWxsZXRzLkJ1bGxldCA9IG5ldyBCdWxsZXRzLkJ1bGxldChuZXcgxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KSwgX2RpcmVjdGlvbiwgdGhpcywgX25ldElkKTtcclxuICAgICAgICAgICAgICAgIGJ1bGxldC5mbHlEaXJlY3Rpb24uc2NhbGUoMSAvIEdhbWUuZnJhbWVSYXRlICogYnVsbGV0LnNwZWVkKTtcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoYnVsbGV0KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduQnVsbGV0KF9kaXJlY3Rpb24sIGJ1bGxldC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy53ZWFwb24uY3VycmVudEF0dGFja0NvdW50LS07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkb0tub2NrYmFjayhfYm9keTogxpJBaWQuTm9kZVNwcml0ZSk6IHZvaWQge1xyXG4gICAgICAgICAgICAoPEVuZW15LkVuZW15Pl9ib2R5KS5nZXRLbm9ja2JhY2sodGhpcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIF9wb3NpdGlvbi50b1ZlY3RvcjIoKSkudG9WZWN0b3IzKDApO1xyXG5cclxuICAgICAgICAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKF9rbm9ja2JhY2tGb3JjZSAqIDEgLyBHYW1lLmZyYW1lUmF0ZSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24uYWRkKGRpcmVjdGlvbik7XHJcblxyXG5cclxuICAgICAgICAgICAgaGVscGVyKGRpcmVjdGlvbiwgdGhpcy5tb3ZlRGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGhlbHBlcihfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMsIF9tb3ZlRGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChfa25vY2tiYWNrRm9yY2UgPiAwLjEpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX21vdmVEaXJlY3Rpb24uc3VidHJhY3QoZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9rbm9ja2JhY2tGb3JjZSAvPSAzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKF9rbm9ja2JhY2tGb3JjZSAqIDEgLyBHYW1lLmZyYW1lUmF0ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbW92ZURpcmVjdGlvbi5hZGQoZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlbHBlcihfZGlyZWN0aW9uLCBfbW92ZURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX21vdmVEaXJlY3Rpb24uc3VidHJhY3QoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY29vbGRvd24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMud2VhcG9uLmNvb2xkb3duKHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudGFiaWxpdHlDb29sZG93blRpbWUgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb29sZG93blRpbWUgPSB0aGlzLmFiaWxpdHlDb29sZG93blRpbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50ID0gdGhpcy5hYmlsaXR5Q291bnQ7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb29sZG93blRpbWUtLTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIE1lbGVlIGV4dGVuZHMgUGxheWVyIHtcclxuXHJcbiAgICAgICAgcmVhZG9ubHkgYWJpbGl0eUNvdW50OiBudW1iZXIgPSAxO1xyXG4gICAgICAgIGN1cnJlbnRhYmlsaXR5Q291bnQ6IG51bWJlciA9IHRoaXMuYWJpbGl0eUNvdW50O1xyXG4gICAgICAgIHJlYWRvbmx5IGFiaWxpdHlDb29sZG93blRpbWU6IG51bWJlciA9IDQwO1xyXG4gICAgICAgIGN1cnJlbnRhYmlsaXR5Q29vbGRvd25UaW1lOiBudW1iZXIgPSB0aGlzLmFiaWxpdHlDb29sZG93blRpbWU7XHJcblxyXG4gICAgICAgIHB1YmxpYyBhdHRhY2soX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyLCBfc3luYz86IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMud2VhcG9uLmN1cnJlbnRBdHRhY2tDb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgYnVsbGV0OiBCdWxsZXRzLkJ1bGxldCA9IG5ldyBCdWxsZXRzLk1lbGVlQnVsbGV0KG5ldyDGki5WZWN0b3IyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpLCBfZGlyZWN0aW9uLCB0aGlzLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgYnVsbGV0LmZseURpcmVjdGlvbi5zY2FsZSgxIC8gR2FtZS5mcmFtZVJhdGUgKiBidWxsZXQuc3BlZWQpO1xyXG4gICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChidWxsZXQpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChfc3luYykge1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25CdWxsZXQoX2RpcmVjdGlvbiwgYnVsbGV0Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLndlYXBvbi5jdXJyZW50QXR0YWNrQ291bnQtLTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkICo9IDQ7XHJcblxyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuc3BlZWQgLz0gMjtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuc3BlZWQgLz0gMjtcclxuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgICAgICAgICAgfSwgMzAwKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudC0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBSYW5nZWQgZXh0ZW5kcyBQbGF5ZXIge1xyXG5cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBHZW5lcmF0aW9uIHtcclxuICAgIGV4cG9ydCBlbnVtIFJPT01UWVBFIHtcclxuICAgICAgICBTVEFSVCxcclxuICAgICAgICBOT1JNQUwsXHJcbiAgICAgICAgTUVSQ0hBTlQsXHJcbiAgICAgICAgVFJFQVNVUkUsXHJcbiAgICAgICAgQ0hBTExFTkdFLFxyXG4gICAgICAgIEJPU1NcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgUm9vbSBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLlJPT007XHJcbiAgICAgICAgcHVibGljIHJvb21UeXBlOiBST09NVFlQRVxyXG4gICAgICAgIHB1YmxpYyBjb29yZGluYXRlczogW251bWJlciwgbnVtYmVyXTsgLy8gWCBZXHJcbiAgICAgICAgcHVibGljIHdhbGxzOiBXYWxsW10gPSBbXTtcclxuICAgICAgICBwdWJsaWMgZG9vcnM6IERvb3JbXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBmaW5pc2hlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIG5laWdoYm91ck46IFJvb207XHJcbiAgICAgICAgbmVpZ2hib3VyRTogUm9vbTtcclxuICAgICAgICBuZWlnaGJvdXJTOiBSb29tO1xyXG4gICAgICAgIG5laWdoYm91clc6IFJvb207XHJcbiAgICAgICAgcm9vbVNpemU6IG51bWJlciA9IDMwO1xyXG4gICAgICAgIGV4aXRzOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0gLy8gTiBFIFMgV1xyXG4gICAgICAgIG1lc2g6IMaSLk1lc2hRdWFkID0gbmV3IMaSLk1lc2hRdWFkO1xyXG4gICAgICAgIGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaCh0aGlzLm1lc2gpO1xyXG4gICAgICAgIHN0YXJ0Um9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJzdGFydFJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwieWVsbG93XCIpKSk7XHJcbiAgICAgICAgbm9ybWFsUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJub3JtYWxSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgbWVyY2hhbnRSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm1lcmNoYW50Um9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJncmVlblwiKSkpO1xyXG4gICAgICAgIHRyZWFzdXJlUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJ0cmVhc3VyZVJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwieWVsbG93XCIpKSk7XHJcbiAgICAgICAgY2hhbGxlbmdlUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJjaGFsbGVuZ2VSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImJsdWVcIikpKTtcclxuICAgICAgICBib3NzUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJib3NzUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJibGFja1wiKSkpO1xyXG5cclxuICAgICAgICBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWw7XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfY29vcmRpYW50ZXM6IFtudW1iZXIsIG51bWJlcl0sIF9leGl0czogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dLCBfcm9vbVR5cGU6IFJPT01UWVBFKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5jb29yZGluYXRlcyA9IF9jb29yZGlhbnRlcztcclxuICAgICAgICAgICAgdGhpcy5leGl0cyA9IF9leGl0cztcclxuICAgICAgICAgICAgdGhpcy5yb29tVHlwZSA9IF9yb29tVHlwZTtcclxuICAgICAgICAgICAgc3dpdGNoIChfcm9vbVR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgUk9PTVRZUEUuU1RBUlQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLnN0YXJ0Um9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMubm9ybWFsUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLk1FUkNIQU5UOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wTWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwodGhpcy5tZXJjaGFudFJvb21NYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBST09NVFlQRS5UUkVBU1VSRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMudHJlYXN1cmVSb29tTWF0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgUk9PTVRZUEUuQ0hBTExFTkdFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wTWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwodGhpcy5jaGFsbGVuZ2VSb29tTWF0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgUk9PTVRZUEUuQk9TUzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMuYm9zc1Jvb21NYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudCh0aGlzLmNtcE1lc2gpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudCh0aGlzLmNtcE1hdGVyaWFsKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjModGhpcy5yb29tU2l6ZSwgdGhpcy5yb29tU2l6ZSwgMCkpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKHRoaXMuY29vcmRpbmF0ZXNbMF0gKiB0aGlzLnJvb21TaXplLCB0aGlzLmNvb3JkaW5hdGVzWzFdICogdGhpcy5yb29tU2l6ZSwgLTAuMDIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy53YWxscy5wdXNoKG5ldyBXYWxsKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLnJvb21TaXplLCBbdHJ1ZSwgZmFsc2UsIGZhbHNlLCBmYWxzZV0pKTtcclxuICAgICAgICAgICAgdGhpcy53YWxscy5wdXNoKG5ldyBXYWxsKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLnJvb21TaXplLCBbZmFsc2UsIHRydWUsIGZhbHNlLCBmYWxzZV0pKTtcclxuICAgICAgICAgICAgdGhpcy53YWxscy5wdXNoKG5ldyBXYWxsKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLnJvb21TaXplLCBbZmFsc2UsIGZhbHNlLCB0cnVlLCBmYWxzZV0pKTtcclxuICAgICAgICAgICAgdGhpcy53YWxscy5wdXNoKG5ldyBXYWxsKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLnJvb21TaXplLCBbZmFsc2UsIGZhbHNlLCBmYWxzZSwgdHJ1ZV0pKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXREb29ycygpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHNbMF0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9vcnMucHVzaChuZXcgRG9vcih0aGlzLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgW3RydWUsIGZhbHNlLCBmYWxzZSwgZmFsc2VdLCB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHNbMV0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9vcnMucHVzaChuZXcgRG9vcih0aGlzLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgW2ZhbHNlLCB0cnVlLCBmYWxzZSwgZmFsc2VdLCB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHNbMl0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9vcnMucHVzaChuZXcgRG9vcih0aGlzLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgW2ZhbHNlLCBmYWxzZSwgdHJ1ZSwgZmFsc2VdLCB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHNbM10pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9vcnMucHVzaChuZXcgRG9vcih0aGlzLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgW2ZhbHNlLCBmYWxzZSwgZmFsc2UsIHRydWVdLCB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5kb29ycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLmRvb3JzW2ldKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldFJvb21TaXplKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJvb21TaXplO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgV2FsbCBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLldBTEw7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBHYW1lLsaSLlJlY3RhbmdsZTtcclxuICAgICAgICBwdWJsaWMgd2FsbFRoaWNrbmVzczogbnVtYmVyID0gMjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjIsIF93aWR0aDogbnVtYmVyLCBfZGlyZWN0aW9uOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJXYWxsXCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IMaSLk1lc2hRdWFkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChuZXcgxpIuTWF0ZXJpYWwoXCJyZWRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwicmVkXCIpKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gX3Bvc2l0aW9uLnRvVmVjdG9yMygwKTtcclxuXHJcblxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvblswXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSArPSBfd2lkdGggLyAyICsgdGhpcy53YWxsVGhpY2tuZXNzIC8gMjtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKF93aWR0aCwgdGhpcy53YWxsVGhpY2tuZXNzLCAwKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54LCB0aGlzLndhbGxUaGlja25lc3MsIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvblsxXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCArPSBfd2lkdGggLyAyICsgdGhpcy53YWxsVGhpY2tuZXNzIC8gMjtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKHRoaXMud2FsbFRoaWNrbmVzcywgX3dpZHRoLCAwKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy53YWxsVGhpY2tuZXNzLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvblsyXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSAtPSBfd2lkdGggLyAyICsgdGhpcy53YWxsVGhpY2tuZXNzIC8gMjtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKF93aWR0aCwgdGhpcy53YWxsVGhpY2tuZXNzLCAwKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54LCB0aGlzLndhbGxUaGlja25lc3MsIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvblszXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCAtPSBfd2lkdGggLyAyICsgdGhpcy53YWxsVGhpY2tuZXNzIC8gMjtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKHRoaXMud2FsbFRoaWNrbmVzcywgX3dpZHRoLCAwKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy53YWxsVGhpY2tuZXNzLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERvb3IgZXh0ZW5kcyDGki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5ET09SO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogR2FtZS7Gki5SZWN0YW5nbGU7XHJcbiAgICAgICAgcHVibGljIGRvb3JXaWR0aDogbnVtYmVyID0gMztcclxuICAgICAgICBwdWJsaWMgZG9vclRoaWNrbmVzczogbnVtYmVyID0gMTtcclxuICAgICAgICBwdWJsaWMgcGFyZW50Um9vbTogUm9vbTtcclxuXHJcbiAgICAgICAgZGlyZWN0aW9uOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl07XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wYXJlbnQ6IFJvb20sIF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyLCBfZGlyZWN0aW9uOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0sIF9yb29tU2l6ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiRG9vclwiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZGlyZWN0aW9uID0gX2RpcmVjdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5wYXJlbnRSb29tID0gX3BhcmVudDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyDGki5NZXNoUXVhZCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobmV3IMaSLk1hdGVyaWFsKFwicmVkXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImdyZWVuXCIpKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gX3Bvc2l0aW9uLnRvVmVjdG9yMygwLjAxKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzBdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55ICs9IF9yb29tU2l6ZSAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyh0aGlzLmRvb3JXaWR0aCwgdGhpcy5kb29yVGhpY2tuZXNzLCAwLjAwMSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb25bMV0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKz0gX3Jvb21TaXplIC8gMjtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKHRoaXMuZG9vclRoaWNrbmVzcywgdGhpcy5kb29yV2lkdGgsIDAuMDAxKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvblsyXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSAtPSBfcm9vbVNpemUgLyAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy5kb29yV2lkdGgsIHRoaXMuZG9vclRoaWNrbmVzcywgMC4wMDEpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzNdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54IC09IF9yb29tU2l6ZSAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyh0aGlzLmRvb3JUaGlja25lc3MsIHRoaXMuZG9vcldpZHRoLCAwLjAwMSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjaGFuZ2VSb29tKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wYXJlbnRSb29tLmZpbmlzaGVkKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNvbGxpc2lvbiFcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgR2VuZXJhdGlvbi5zd2l0Y2hSb29tKHRoaXMucGFyZW50Um9vbSwgdGhpcy5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG5cclxuICAgIGxldCBudW1iZXJPZlJvb21zOiBudW1iZXIgPSAzO1xyXG4gICAgbGV0IHVzZWRQb3NpdGlvbnM6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtdO1xyXG4gICAgbGV0IHJvb21zOiBSb29tW10gPSBbXTtcclxuXHJcbiAgICAvL3NwYXduIGNoYW5jZXNcclxuICAgIGxldCBjaGFsbGVuZ2VSb29tU3Bhd25DaGFuY2U6IG51bWJlciA9IDIwO1xyXG4gICAgbGV0IHRyZWFzdXJlUm9vbVNwYXduQ2hhbmNlOiBudW1iZXIgPSAxMDtcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVSb29tcygpOiB2b2lkIHtcclxuICAgICAgICBsZXQgc3RhcnRDb29yZHM6IFtudW1iZXIsIG51bWJlcl0gPSBbMCwgMF07XHJcblxyXG4gICAgICAgIHJvb21zLnB1c2gobmV3IFJvb20oXCJyb29tU3RhcnRcIiwgc3RhcnRDb29yZHMsIGNhbGNQYXRoRXhpdHMoc3RhcnRDb29yZHMpLCBHZW5lcmF0aW9uLlJPT01UWVBFLlNUQVJUKSlcclxuICAgICAgICB1c2VkUG9zaXRpb25zLnB1c2goc3RhcnRDb29yZHMpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgbnVtYmVyT2ZSb29tczsgaSsrKSB7XHJcbiAgICAgICAgICAgIGFkZFJvb20ocm9vbXNbcm9vbXMubGVuZ3RoIC0gMV0sIEdlbmVyYXRpb24uUk9PTVRZUEUuTk9STUFMKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYWRkUm9vbShyb29tc1tyb29tcy5sZW5ndGggLSAxXSwgR2VuZXJhdGlvbi5ST09NVFlQRS5CT1NTKTtcclxuICAgICAgICBhZGRTcGVjaWFsUm9vbXMoKTtcclxuICAgICAgICBhZGRSb29tKHJvb21zW3Jvb21zLmxlbmd0aCAtIDNdLCBHZW5lcmF0aW9uLlJPT01UWVBFLk1FUkNIQU5UKTtcclxuICAgICAgICByb29tcy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICByb29tLmV4aXRzID0gY2FsY1Jvb21Eb29ycyhyb29tLmNvb3JkaW5hdGVzKTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cocm9vbS5jb29yZGluYXRlcyArIFwiIFwiICsgcm9vbS5leGl0cyArIFwiIFwiICsgcm9vbS5yb29tVHlwZS50b1N0cmluZygpKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJvb21zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHJvb21zW2ldLnNldERvb3JzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKHJvb21zWzBdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzBdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzFdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzJdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzNdKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb29tc1swXS5kb29ycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKHJvb21zWzBdLmRvb3JzW2ldKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkUm9vbShfY3VycmVudFJvb206IFJvb20sIF9yb29tVHlwZTogR2VuZXJhdGlvbi5ST09NVFlQRSk6IHZvaWQge1xyXG4gICAgICAgIGxldCBudW1iZXJPZkV4aXRzOiBudW1iZXIgPSBjb3VudEJvb2woX2N1cnJlbnRSb29tLmV4aXRzKTtcclxuICAgICAgICBsZXQgcmFuZG9tTnVtYmVyOiBudW1iZXIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBudW1iZXJPZkV4aXRzKTtcclxuICAgICAgICBsZXQgcG9zc2libGVFeGl0SW5kZXg6IG51bWJlcltdID0gZ2V0RXhpdEluZGV4KF9jdXJyZW50Um9vbS5leGl0cyk7XHJcbiAgICAgICAgbGV0IG5ld1Jvb21Qb3NpdGlvbjogW251bWJlciwgbnVtYmVyXTtcclxuICAgICAgICBsZXQgbmV3Um9vbTogUm9vbTtcclxuXHJcbiAgICAgICAgc3dpdGNoIChwb3NzaWJsZUV4aXRJbmRleFtyYW5kb21OdW1iZXJdKSB7XHJcbiAgICAgICAgICAgIGNhc2UgMDogLy8gbm9ydGhcclxuICAgICAgICAgICAgICAgIG5ld1Jvb21Qb3NpdGlvbiA9IFtfY3VycmVudFJvb20uY29vcmRpbmF0ZXNbMF0sIF9jdXJyZW50Um9vbS5jb29yZGluYXRlc1sxXSArIDFdO1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBSb29tKFwicm9vbU5vcm1hbFwiLCAobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpO1xyXG4gICAgICAgICAgICAgICAgcm9vbXMucHVzaChuZXdSb29tKTtcclxuICAgICAgICAgICAgICAgIF9jdXJyZW50Um9vbS5uZWlnaGJvdXJOID0gbmV3Um9vbTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTogLy8gZWFzdFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSArIDEsIF9jdXJyZW50Um9vbS5jb29yZGluYXRlc1sxXV07XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IFJvb20oXCJyb29tTm9ybWFsXCIsIChuZXdSb29tUG9zaXRpb24pLCBjYWxjUGF0aEV4aXRzKG5ld1Jvb21Qb3NpdGlvbiksIF9yb29tVHlwZSk7XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ld1Jvb20pO1xyXG4gICAgICAgICAgICAgICAgX2N1cnJlbnRSb29tLm5laWdoYm91ckUgPSBuZXdSb29tO1xyXG4gICAgICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5wdXNoKG5ld1Jvb21Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOiAvLyBzb3V0aFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSwgX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzFdIC0gMV07XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IFJvb20oXCJyb29tTm9ybWFsXCIsIChuZXdSb29tUG9zaXRpb24pLCBjYWxjUGF0aEV4aXRzKG5ld1Jvb21Qb3NpdGlvbiksIF9yb29tVHlwZSk7XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ld1Jvb20pO1xyXG4gICAgICAgICAgICAgICAgX2N1cnJlbnRSb29tLm5laWdoYm91clMgPSBuZXdSb29tO1xyXG4gICAgICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5wdXNoKG5ld1Jvb21Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAzOiAvL3dlc3RcclxuICAgICAgICAgICAgICAgIG5ld1Jvb21Qb3NpdGlvbiA9IFtfY3VycmVudFJvb20uY29vcmRpbmF0ZXNbMF0gLSAxLCBfY3VycmVudFJvb20uY29vcmRpbmF0ZXNbMV1dO1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBSb29tKFwicm9vbU5vcm1hbFwiLCAobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpO1xyXG4gICAgICAgICAgICAgICAgcm9vbXMucHVzaChuZXdSb29tKTtcclxuICAgICAgICAgICAgICAgIF9jdXJyZW50Um9vbS5uZWlnaGJvdXJXID0gbmV3Um9vbTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkU3BlY2lhbFJvb21zKCk6IHZvaWQge1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIHJvb20uZXhpdHMgPSBjYWxjUGF0aEV4aXRzKHJvb20uY29vcmRpbmF0ZXMpO1xyXG4gICAgICAgICAgICBpZiAoaXNTcGF3bmluZyh0cmVhc3VyZVJvb21TcGF3bkNoYW5jZSkpIHtcclxuICAgICAgICAgICAgICAgIGFkZFJvb20ocm9vbSwgR2VuZXJhdGlvbi5ST09NVFlQRS5UUkVBU1VSRSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGlzU3Bhd25pbmcoY2hhbGxlbmdlUm9vbVNwYXduQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICAgICAgYWRkUm9vbShyb29tLCBHZW5lcmF0aW9uLlJPT01UWVBFLkNIQUxMRU5HRSlcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGlzU3Bhd25pbmcoX3NwYXduQ2hhbmNlOiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgICAgICBsZXQgeCA9IE1hdGgucmFuZG9tKCkgKiAxMDA7XHJcbiAgICAgICAgaWYgKHggPCBfc3Bhd25DaGFuY2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gY291bnRCb29sKF9ib29sOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBjb3VudGVyOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIF9ib29sLmZvckVhY2goYm9vbCA9PiB7XHJcbiAgICAgICAgICAgIGlmIChib29sKSB7XHJcbiAgICAgICAgICAgICAgICBjb3VudGVyKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY291bnRlcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRFeGl0SW5kZXgoX2V4aXRzOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pOiBudW1iZXJbXSB7XHJcbiAgICAgICAgbGV0IG51bWJlcnM6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfZXhpdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKF9leGl0c1tpXSkge1xyXG4gICAgICAgICAgICAgICAgbnVtYmVycy5wdXNoKGkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bWJlcnM7XHJcblxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBjYWxjdWxhdGVzIHBvc3NpYmxlIGV4aXRzIGZvciBuZXcgcm9vbXNcclxuICAgICAqIEBwYXJhbSBfcG9zaXRpb24gcG9zaXRpb24gb2Ygcm9vbVxyXG4gICAgICogQHJldHVybnMgYm9vbGVhbiBmb3IgZWFjaCBkaXJlY3Rpb24gbm9ydGgsIGVhc3QsIHNvdXRoLCB3ZXN0XHJcbiAgICAgKi9cclxuXHJcbiAgICBmdW5jdGlvbiBjYWxjUGF0aEV4aXRzKF9wb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSk6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSB7XHJcbiAgICAgICAgbGV0IG5vcnRoOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGVhc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgc291dGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgd2VzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCByb29tTmVpZ2hib3VyczogW251bWJlciwgbnVtYmVyXVtdO1xyXG4gICAgICAgIHJvb21OZWlnaGJvdXJzID0gc2xpY2VOZWlnaGJvdXJzKGdldE5laWdoYm91cnMoX3Bvc2l0aW9uKSk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb29tTmVpZ2hib3Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAocm9vbU5laWdoYm91cnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHNvdXRoID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocm9vbU5laWdoYm91cnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHdlc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyb29tTmVpZ2hib3Vyc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICBub3J0aCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJvb21OZWlnaGJvdXJzW2ldWzBdIC0gX3Bvc2l0aW9uWzBdID09IDEpIHtcclxuICAgICAgICAgICAgICAgIGVhc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbm9ydGgsIGVhc3QsIHNvdXRoLCB3ZXN0XTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYWxjUm9vbURvb3JzKF9wb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSk6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSB7XHJcbiAgICAgICAgbGV0IG5vcnRoOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGVhc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgc291dGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgd2VzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHVzZWRQb3NpdGlvbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2codXNlZFBvc2l0aW9uc1tpXVswXSAtIF9wb3NpdGlvblsxXSk7XHJcbiAgICAgICAgICAgIGlmICh1c2VkUG9zaXRpb25zW2ldWzFdIC0gX3Bvc2l0aW9uWzFdID09IC0xICYmIHVzZWRQb3NpdGlvbnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgc291dGggPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh1c2VkUG9zaXRpb25zW2ldWzBdIC0gX3Bvc2l0aW9uWzBdID09IC0xICYmIHVzZWRQb3NpdGlvbnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgd2VzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHVzZWRQb3NpdGlvbnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gMSAmJiB1c2VkUG9zaXRpb25zW2ldWzBdIC0gX3Bvc2l0aW9uWzBdID09IDApIHtcclxuICAgICAgICAgICAgICAgIG5vcnRoID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodXNlZFBvc2l0aW9uc1tpXVswXSAtIF9wb3NpdGlvblswXSA9PSAxICYmIHVzZWRQb3NpdGlvbnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgZWFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFtub3J0aCwgZWFzdCwgc291dGgsIHdlc3RdO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBnZXROZWlnaGJvdXJzKF9wb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSk6IFtudW1iZXIsIG51bWJlcl1bXSB7XHJcbiAgICAgICAgbGV0IG5laWdoYm91cnM6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtdXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKFtfcG9zaXRpb25bMF0sIF9wb3NpdGlvblsxXSAtIDFdKTsgLy8gZG93blxyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChbX3Bvc2l0aW9uWzBdIC0gMSwgX3Bvc2l0aW9uWzFdXSk7IC8vIGxlZnRcclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2goW19wb3NpdGlvblswXSwgX3Bvc2l0aW9uWzFdICsgMV0pOyAvLyB1cFxyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChbX3Bvc2l0aW9uWzBdICsgMSwgX3Bvc2l0aW9uWzFdXSk7IC8vIHJpZ2h0XHJcbiAgICAgICAgcmV0dXJuIG5laWdoYm91cnM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2xpY2VOZWlnaGJvdXJzKF9uZWlnaGJvdXJzOiBbbnVtYmVyLCBudW1iZXJdW10pOiBbbnVtYmVyLCBudW1iZXJdW10ge1xyXG4gICAgICAgIGxldCBuZWlnaGJvdXJzID0gX25laWdoYm91cnM7XHJcbiAgICAgICAgbGV0IHRvUmVtb3ZlSW5kZXg6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuZWlnaGJvdXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGljaCBwb3NpdGlvbiBhbHJlYWR5IHVzZWRcclxuICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5laWdoYm91cnNbaV1bMF0gPT0gcm9vbVswXSAmJiBuZWlnaGJvdXJzW2ldWzFdID09IHJvb21bMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICB0b1JlbW92ZUluZGV4LnB1c2goaSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBjb3B5OiBbbnVtYmVyLCBudW1iZXJdW10gPSBbXTtcclxuICAgICAgICB0b1JlbW92ZUluZGV4LmZvckVhY2goaW5kZXggPT4ge1xyXG4gICAgICAgICAgICBkZWxldGUgbmVpZ2hib3Vyc1tpbmRleF07XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgbmVpZ2hib3Vycy5mb3JFYWNoKG4gPT4ge1xyXG4gICAgICAgICAgICBjb3B5LnB1c2gobik7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIGNvcHk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHN3aXRjaFJvb20oX2N1cnJlbnRSb29tOiBSb29tLCBfZGlyZWN0aW9uOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pIHtcclxuICAgICAgICBsZXQgb2xkT2JqZWN0czogR2FtZS7Gki5Ob2RlW10gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW0gPT4gKDxhbnk+ZWxlbSkudGFnICE9IFRhZy5UQUcuUExBWUVSKTtcclxuXHJcbiAgICAgICAgb2xkT2JqZWN0cy5mb3JFYWNoKChlbGVtKSA9PiB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQoZWxlbSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmIChfZGlyZWN0aW9uWzBdKSB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoX2N1cnJlbnRSb29tLm5laWdoYm91ck4pO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJOLndhbGxzWzBdKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hcHBlbmRDaGlsZChfY3VycmVudFJvb20ubmVpZ2hib3VyTi53YWxsc1sxXSk7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQoX2N1cnJlbnRSb29tLm5laWdoYm91ck4ud2FsbHNbMl0pO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJOLndhbGxzWzNdKTtcclxuXHJcbiAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfY3VycmVudFJvb20ubmVpZ2hib3VyTi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb247XHJcbiAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfY3VycmVudFJvb20ubmVpZ2hib3VyTi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb247XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF9jdXJyZW50Um9vbS5uZWlnaGJvdXJOLmRvb3JzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJOLmRvb3JzW2ldKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoX2RpcmVjdGlvblsxXSkge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJFKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hcHBlbmRDaGlsZChfY3VycmVudFJvb20ubmVpZ2hib3VyRS53YWxsc1swXSk7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQoX2N1cnJlbnRSb29tLm5laWdoYm91ckUud2FsbHNbMV0pO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJFLndhbGxzWzJdKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hcHBlbmRDaGlsZChfY3VycmVudFJvb20ubmVpZ2hib3VyRS53YWxsc1szXSk7XHJcblxyXG4gICAgICAgICAgICBHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gX2N1cnJlbnRSb29tLm5laWdoYm91ckUuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uO1xyXG4gICAgICAgICAgICBHYW1lLmF2YXRhcjIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gX2N1cnJlbnRSb29tLm5laWdoYm91ckUuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfY3VycmVudFJvb20ubmVpZ2hib3VyRS5kb29ycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfY3VycmVudFJvb20ubmVpZ2hib3VyRS5kb29yc1tpXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKF9kaXJlY3Rpb25bMl0pIHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfY3VycmVudFJvb20ubmVpZ2hib3VyUyk7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQoX2N1cnJlbnRSb29tLm5laWdoYm91clMud2FsbHNbMF0pO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJTLndhbGxzWzFdKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hcHBlbmRDaGlsZChfY3VycmVudFJvb20ubmVpZ2hib3VyUy53YWxsc1syXSk7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQoX2N1cnJlbnRSb29tLm5laWdoYm91clMud2FsbHNbM10pO1xyXG5cclxuICAgICAgICAgICAgR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IF9jdXJyZW50Um9vbS5uZWlnaGJvdXJTLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbjtcclxuICAgICAgICAgICAgR2FtZS5hdmF0YXIyLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IF9jdXJyZW50Um9vbS5uZWlnaGJvdXJTLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbjtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX2N1cnJlbnRSb29tLm5laWdoYm91clMuZG9vcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoX2N1cnJlbnRSb29tLm5laWdoYm91clMuZG9vcnNbaV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChfZGlyZWN0aW9uWzNdKSB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoX2N1cnJlbnRSb29tLm5laWdoYm91clcpO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJXLndhbGxzWzBdKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hcHBlbmRDaGlsZChfY3VycmVudFJvb20ubmVpZ2hib3VyVy53YWxsc1sxXSk7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQoX2N1cnJlbnRSb29tLm5laWdoYm91clcud2FsbHNbMl0pO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJXLndhbGxzWzNdKTtcclxuXHJcbiAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfY3VycmVudFJvb20ubmVpZ2hib3VyVy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb247XHJcbiAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfY3VycmVudFJvb20ubmVpZ2hib3VyVy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb247XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF9jdXJyZW50Um9vbS5uZWlnaGJvdXJXLmRvb3JzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJXLmRvb3JzW2ldKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBUYWcge1xyXG4gICAgZXhwb3J0IGVudW0gVEFHe1xyXG4gICAgICAgIFBMQVlFUixcclxuICAgICAgICBFTkVNWSxcclxuICAgICAgICBCVUxMRVQsXHJcbiAgICAgICAgSVRFTSxcclxuICAgICAgICBST09NLFxyXG4gICAgICAgIFdBTEwsXHJcbiAgICAgICAgRE9PUixcclxuICAgICAgICBEQU1BR0VVSVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFVJIHtcclxuICAgIC8vbGV0IGRpdlVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlVJXCIpO1xyXG4gICAgbGV0IHBsYXllcjFVSTogSFRNTERpdkVsZW1lbnQgPSA8SFRNTERpdkVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJQbGF5ZXIxXCIpO1xyXG4gICAgbGV0IHBsYXllcjJVSTogSFRNTERpdkVsZW1lbnQgPSA8SFRNTERpdkVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJQbGF5ZXIyXCIpO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVVSSgpIHtcclxuICAgICAgICAvL0F2YXRhcjEgVUlcclxuICAgICAgICAoPEhUTUxEaXZFbGVtZW50PnBsYXllcjFVSS5xdWVyeVNlbGVjdG9yKFwiI0hQXCIpKS5zdHlsZS53aWR0aCA9IChHYW1lLmF2YXRhcjEucHJvcGVydGllcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyAvIEdhbWUuYXZhdGFyMS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzICogMTAwKSArIFwiJVwiO1xyXG5cclxuICAgICAgICAvL0ludmVudG9yeVVJXHJcbiAgICAgICAgR2FtZS5hdmF0YXIxLml0ZW1zLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgbGV0IGV4c2lzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgLy9zZWFyY2ggRE9NSW1nIGZvciBJdGVtXHJcbiAgICAgICAgICAgIHBsYXllcjFVSS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5xdWVyeVNlbGVjdG9yQWxsKFwiaW1nXCIpLmZvckVhY2goKGltZ0VsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChpbWdFbGVtZW50LnNyYyA9PSBlbGVtZW50LmltZ1NyYykge1xyXG4gICAgICAgICAgICAgICAgICAgIGV4c2lzdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgLy9ub25lIGV4c2lzdGluZyBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgaWYgKCFleHNpc3QpIHtcclxuICAgICAgICAgICAgICAgIGxldCBuZXdJdGVtOiBIVE1MSW1hZ2VFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcclxuICAgICAgICAgICAgICAgIG5ld0l0ZW0uc3JjID0gZWxlbWVudC5pbWdTcmM7XHJcbiAgICAgICAgICAgICAgICBwbGF5ZXIxVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikuYXBwZW5kQ2hpbGQobmV3SXRlbSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy9BdmF0YXIyIFVJXHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICg8SFRNTERpdkVsZW1lbnQ+cGxheWVyMlVJLnF1ZXJ5U2VsZWN0b3IoXCIjSFBcIikpLnN0eWxlLndpZHRoID0gKEdhbWUuYXZhdGFyMi5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC8gR2FtZS5hdmF0YXIyLnByb3BlcnRpZXMuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgKiAxMDApICsgXCIlXCI7XHJcblxyXG4gICAgICAgICAgICAvL0ludmVudG9yeVVJXHJcbiAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5pdGVtcy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZXhzaXN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgLy9zZWFyY2ggRE9NSW1nIGZvciBJdGVtXHJcbiAgICAgICAgICAgICAgICBwbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikucXVlcnlTZWxlY3RvckFsbChcImltZ1wiKS5mb3JFYWNoKChpbWdFbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGltZ0VsZW1lbnQuc3JjID09IGVsZW1lbnQuaW1nU3JjKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4c2lzdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy9ub25lIGV4c2lzdGluZyBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgICAgIGlmICghZXhzaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEhUTUxJbWFnZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc3JjID0gZWxlbWVudC5pbWdTcmM7XHJcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyMlVJLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLmFwcGVuZENoaWxkKG5ld0l0ZW0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRaZXJvOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE9uZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRUb3c6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VGhyZWU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0Rm91cjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRGaXZlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNpeDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTZXZlbjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRFaWdodDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHROaW5lOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFRlbjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBEYW1hZ2VVSSBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLkRBTUFHRVVJO1xyXG4gICAgICAgIHVwOiBudW1iZXIgPSAwLjE1O1xyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXIgPSAwLjUgKiBHYW1lLmZyYW1lUmF0ZTtcclxuXHJcbiAgICAgICAgYXN5bmMgbGlmZXNwYW4oX2dyYXBoOiDGki5Ob2RlKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lID49IDAgJiYgdGhpcy5saWZldGltZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lLS07XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBfZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2RhbWFnZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiZGFtYWdlVUlcIik7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKDAuMzMsIDAuMzMsIDAuMzMpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDAuMjUpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG1lc2g6IMaSLk1lc2hRdWFkID0gbmV3IMaSLk1lc2hRdWFkKCk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNZXNoOiDGki5Db21wb25lbnRNZXNoID0gbmV3IMaSLkNvbXBvbmVudE1lc2gobWVzaCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1lc2gpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG10clNvbGlkV2hpdGU6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiU29saWRXaGl0ZVwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgICAgICBsZXQgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG10clNvbGlkV2hpdGUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChjbXBNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKF9kYW1hZ2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgbW92ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKG5ldyDGki5WZWN0b3IzKDAsIHRoaXMudXAsIDApKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGUoxpIuVmVjdG9yMy5PTkUoMS4wMSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsb2FkVGV4dHVyZShfdGV4dHVyZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGxldCBuZXdUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgICAgICAgICAgbGV0IG5ld0NvYXQ6IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCA9IG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoKTtcclxuICAgICAgICAgICAgbGV0IG5ld010cjogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtdHJcIiwgxpIuU2hhZGVyRmxhdFRleHR1cmVkLCBuZXdDb2F0KTtcclxuICAgICAgICAgICAgbGV0IG9sZENvbUNvYXQ6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKCk7XHJcblxyXG4gICAgICAgICAgICBvbGRDb21Db2F0ID0gdGhpcy5nZXRDb21wb25lbnQoxpIuQ29tcG9uZW50TWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChfdGV4dHVyZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFplcm87XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0T25lO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFRvdztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRUaHJlZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNDpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRGb3VyO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEZpdmU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDY6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0U2V2ZW47XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDc6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0RWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDg6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0RWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDk6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0TmluZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMTA6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0VGVuO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbmV3Q29hdC5jb2xvciA9IMaSLkNvbG9yLkNTUyhcIldISVRFXCIpO1xyXG4gICAgICAgICAgICBuZXdDb2F0LnRleHR1cmUgPSBuZXdUeHQ7XHJcbiAgICAgICAgICAgIG9sZENvbUNvYXQubWF0ZXJpYWwgPSBuZXdNdHI7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgV2VhcG9ucyB7XHJcbiAgICBleHBvcnQgY2xhc3MgV2VhcG9uIHtcclxuICAgICAgICBjb29sZG93blRpbWU6IG51bWJlciA9IDEwO1xyXG4gICAgICAgIHB1YmxpYyBjdXJyZW50Q29vbGRvd25UaW1lOiBudW1iZXIgPSB0aGlzLmNvb2xkb3duVGltZTtcclxuICAgICAgICBhdHRhY2tDb3VudDogbnVtYmVyID0gMTtcclxuICAgICAgICBwdWJsaWMgY3VycmVudEF0dGFja0NvdW50OiBudW1iZXIgPSB0aGlzLmF0dGFja0NvdW50O1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vbGRvd25UaW1lOiBudW1iZXIsIF9hdHRhY2tDb3VudDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29vbGRvd25UaW1lID0gX2Nvb2xkb3duVGltZTtcclxuICAgICAgICAgICAgdGhpcy5hdHRhY2tDb3VudCA9IF9hdHRhY2tDb3VudDtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgY29vbGRvd24oX2Zha3RvcjogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGxldCBzcGVjaWZpY0Nvb2xEb3duVGltZSA9IHRoaXMuY29vbGRvd25UaW1lICogX2Zha3RvcjtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEF0dGFja0NvdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRDb29sZG93blRpbWUgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudENvb2xkb3duVGltZSA9IHNwZWNpZmljQ29vbERvd25UaW1lO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dGFja0NvdW50ID0gdGhpcy5hdHRhY2tDb3VudDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2codGhpcy5jdXJyZW50Q29vbGRvd25UaW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29vbGRvd25UaW1lLS07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59Il19