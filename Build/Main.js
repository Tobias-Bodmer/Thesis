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
        await loadJSON();
        if (Networking.client.id == Networking.client.idHost) {
            Generation.generateRooms();
        }
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
                    element.enemyUpdate();
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
            waitOnConnection();
            waitForHost();
            waitForLobby();
            function waitForLobby() {
                if (Networking.clients.length >= 2 && Networking.client.idHost != undefined && (Networking.client.peers[Networking.clients.find(elem => elem.id != Networking.client.id).id].dataChannel != undefined &&
                    (Networking.client.peers[Networking.clients.find(elem => elem.id != Networking.client.id).id].dataChannel.readyState == "open"))) {
                    document.getElementById("Lobbyscreen").style.visibility = "visible";
                    Game.connected = true;
                }
                else {
                    setTimeout(() => {
                        waitForLobby();
                    }, 200);
                }
            }
            function waitForHost() {
                if (Networking.clients.length >= 2 && Networking.client.idHost == undefined) {
                    Networking.setHost();
                }
                else {
                    setTimeout(() => {
                        waitForHost();
                    }, 200);
                }
            }
        });
        document.getElementById("Option").addEventListener("click", () => {
        });
        document.getElementById("Credits").addEventListener("click", () => {
        });
    }
    async function loadJSON() {
        const loadEnemy = await (await fetch("./Resources/EnemiesStorage.json")).json();
        Game.enemiesJSON = loadEnemy.enemies;
        const loadItem = await (await fetch("./Resources/ItemStorage.json")).json();
        Game.itemsJSON = loadItem.items;
    }
    async function loadTextures() {
        await Bullets.bulletTxt.load("./Resources/Image/arrow01.png");
        //UI
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
        //ENEMY
        await AnimationGeneration.txtBatIdle.load("./Resources/Image/Enemies/bat/batIdle.png");
        await AnimationGeneration.txtRedTickIdle.load("./Resources/Image/Enemies/tick/redTickIdle.png");
        await AnimationGeneration.txtRedTickWalk.load("./Resources/Image/Enemies/tick/redTickWalk.png");
        AnimationGeneration.createAllAnimations();
    }
    async function waitOnConnection() {
        Networking.setClient();
        if (Networking.clients.filter(elem => elem.ready == true).length >= 2 && Networking.client.idHost != undefined) {
            if (Networking.client.id == Networking.client.idHost) {
                document.getElementById("IMHOST").style.visibility = "visible";
            }
            await init();
            Game.gamestate = GAMESTATES.PLAYING;
            await Networking.spawnPlayer(playerType);
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
            Game.avatar1 = new Player.Ranged("player", new Player.Character("Thor,", new Player.Attributes(10, 5, 5, 1)));
            playerType = Player.PLAYERTYPE.RANGED;
        }
        if (_e.target.id == "Melee") {
            Game.avatar1 = new Player.Melee("player", new Player.Character("Thor,", new Player.Attributes(10, 1, 5, 1)));
            playerType = Player.PLAYERTYPE.MELEE;
        }
        document.getElementById("Lobbyscreen").style.visibility = "hidden";
        readySate();
        function readySate() {
            if (Networking.clients.length >= 2 && Networking.client.idHost != undefined) {
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
    Enemy_1.txtTick = new ƒ.TextureImage();
    let ENEMYNAME;
    (function (ENEMYNAME) {
        ENEMYNAME[ENEMYNAME["BAT"] = 0] = "BAT";
        ENEMYNAME[ENEMYNAME["REDTICK"] = 1] = "REDTICK";
        ENEMYNAME[ENEMYNAME["SMALLTICK"] = 2] = "SMALLTICK";
        ENEMYNAME[ENEMYNAME["SKELETON"] = 3] = "SKELETON";
    })(ENEMYNAME = Enemy_1.ENEMYNAME || (Enemy_1.ENEMYNAME = {}));
    function getNameByID(_id) {
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
    Enemy_1.getNameByID = getNameByID;
    let BEHAVIOUR;
    (function (BEHAVIOUR) {
        BEHAVIOUR[BEHAVIOUR["IDLE"] = 0] = "IDLE";
        BEHAVIOUR[BEHAVIOUR["FOLLOW"] = 1] = "FOLLOW";
        BEHAVIOUR[BEHAVIOUR["FLEE"] = 2] = "FLEE";
    })(BEHAVIOUR || (BEHAVIOUR = {}));
    let ANIMATIONSTATES;
    (function (ANIMATIONSTATES) {
        ANIMATIONSTATES[ANIMATIONSTATES["IDLE"] = 0] = "IDLE";
        ANIMATIONSTATES[ANIMATIONSTATES["WALK"] = 1] = "WALK";
    })(ANIMATIONSTATES = Enemy_1.ANIMATIONSTATES || (Enemy_1.ANIMATIONSTATES = {}));
    class Enemy extends Game.ƒAid.NodeSprite {
        currentState = BEHAVIOUR.IDLE;
        currentAnimation;
        tag = Tag.TAG.ENEMY;
        id;
        netId = Networking.idGenerator();
        properties;
        collider;
        sizeDivideFactor = 2;
        target;
        lifetime;
        canMoveX = true;
        canMoveY = true;
        moveDirection = Game.ƒ.Vector3.ZERO();
        //#region  animation
        animations;
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
            this.mtxLocal.scale(new ƒ.Vector3(this.properties.attributes.scale, this.properties.attributes.scale, 0));
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / this.sizeDivideFactor);
            this.animations = AnimationGeneration.getAnimationById(this.id).animations;
            this.setAnimation(this.animations["idle"]);
            Networking.spawnEnemy(this, this.netId);
        }
        enemyUpdate() {
            this.updateCollider();
            this.mtxLocal.translate(this.moveDirection);
            Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId, this.currentAnimation);
        }
        doKnockback(_body) {
            _body.getKnockback(this.properties.attributes.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }
        getKnockback(_knockbackForce, _position) {
            //TODO: apply scaling correct for knockback
            let direction = Game.ƒ.Vector2.DIFFERENCE(this.cmpTransform.mtxLocal.translation.toVector2(), _position.toVector2()).toVector3(0);
            let knockBackScaling = Game.frameRate * this.properties.attributes.scale;
            direction.normalize();
            direction.scale(_knockbackForce * 1 / knockBackScaling);
            this.moveDirection.add(direction);
            reduceKnockback(direction, this.moveDirection);
            function reduceKnockback(_direction, _moveDirection) {
                // _knockbackForce = _knockbackForce / knockBackScaling;
                if (_knockbackForce > 0.1) {
                    setTimeout(() => {
                        _moveDirection.subtract(direction);
                        _knockbackForce /= 3;
                        direction.scale(_knockbackForce * (1 / knockBackScaling));
                        _moveDirection.add(direction);
                        reduceKnockback(_direction, _moveDirection);
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
        enemyUpdate() {
            super.enemyUpdate();
            this.moveBehaviour();
        }
        behaviour() {
            let target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
            let distance = ƒ.Vector3.DIFFERENCE(target, this.cmpTransform.mtxLocal.translation).magnitude;
            if (distance > 3) {
                this.currentState = BEHAVIOUR.FOLLOW;
            }
            else {
                this.currentState = BEHAVIOUR.IDLE;
            }
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentState) {
                case BEHAVIOUR.IDLE:
                    if (this.currentAnimation != ANIMATIONSTATES.IDLE) {
                        this.setAnimation(this.animations["idle"]);
                        this.setFrameDirection(1);
                        this.framerate = AnimationGeneration.getAnimationById(this.id).walkFrameRate;
                        this.currentAnimation = ANIMATIONSTATES.IDLE;
                        Networking.updateEnemyState(this.currentAnimation, this.netId);
                    }
                    this.setFrameDirection(1);
                    this.framerate = AnimationGeneration.getAnimationById(this.id).walkFrameRate;
                    break;
                case BEHAVIOUR.FOLLOW:
                    if (this.currentAnimation != ANIMATIONSTATES.WALK) {
                        this.setAnimation(this.animations["walk"]);
                        this.setFrameDirection(1);
                        this.framerate = AnimationGeneration.getAnimationById(this.id).walkFrameRate;
                        this.currentAnimation = ANIMATIONSTATES.WALK;
                        Networking.updateEnemyState(this.currentAnimation, this.netId);
                    }
                    this.moveSimple();
                    break;
                // default:
                //     // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                //     // break;
            }
        }
    }
    Enemy_1.EnemyDumb = EnemyDumb;
    class EnemyShoot extends Enemy {
        weapon;
        viewRadius = 3;
        constructor(_id, _properties, _position, _weapon, _netId) {
            super(_id, _properties, _position, _netId);
            this.weapon = _weapon;
        }
        enemyUpdate() {
            super.enemyUpdate();
            this.shoot();
        }
        shoot(_netId) {
            let target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation);
            let _direction = ƒ.Vector3.DIFFERENCE(target, this.mtxLocal.translation);
            if (this.weapon.currentAttackCount > 0 && _direction.magnitude < this.viewRadius) {
                _direction.normalize();
                let bullet = new Bullets.HomingBullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction, Calculation.getCloserAvatarPosition(this.mtxLocal.translation), this, _netId);
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
var AnimationGeneration;
(function (AnimationGeneration) {
    AnimationGeneration.txtRedTickIdle = new ƒ.TextureImage();
    AnimationGeneration.txtRedTickWalk = new ƒ.TextureImage();
    AnimationGeneration.txtBatIdle = new ƒ.TextureImage();
    AnimationGeneration.ƒAid = FudgeAid;
    class MyAnimationClass {
        id;
        spriteSheetIdle;
        spriteSheetWalk;
        idleNumberOfFrames;
        walkNumberOfFrames;
        idleFrameRate;
        walkFrameRate;
        clrWhite = ƒ.Color.CSS("white");
        animations = {};
        constructor(_id, _txtIdle, _idleNumberOfFrames, _idleFrameRate, _txtWalk, _walkNumberOfFrames, _walkFrameRate) {
            this.id = _id;
            this.spriteSheetIdle = new ƒ.CoatTextured(this.clrWhite, _txtIdle);
            this.idleFrameRate = _idleFrameRate;
            this.idleNumberOfFrames = _idleNumberOfFrames;
            if (_txtWalk != undefined) {
                this.spriteSheetWalk = new ƒ.CoatTextured(this.clrWhite, _txtWalk);
                this.walkFrameRate = _walkFrameRate;
                this.walkNumberOfFrames = _walkNumberOfFrames;
            }
            else {
                this.spriteSheetWalk = new ƒ.CoatTextured(this.clrWhite, _txtIdle);
                this.walkFrameRate = _idleFrameRate;
                this.walkNumberOfFrames = _idleNumberOfFrames;
            }
        }
    }
    AnimationGeneration.sheetArray = [];
    //#region animation
    let batAnimation = new MyAnimationClass(Enemy.ENEMYNAME.BAT, AnimationGeneration.txtBatIdle, 4, 12);
    let redTickAnimation = new MyAnimationClass(Enemy.ENEMYNAME.REDTICK, AnimationGeneration.txtRedTickIdle, 6, 12, AnimationGeneration.txtRedTickWalk, 4, 12);
    //#endregion
    function getAnimationById(_id) {
        switch (_id) {
            case Enemy.ENEMYNAME.BAT:
                return batAnimation;
            case Enemy.ENEMYNAME.REDTICK:
                return redTickAnimation;
            default:
                return null;
        }
    }
    AnimationGeneration.getAnimationById = getAnimationById;
    function createAllAnimations() {
        AnimationGeneration.sheetArray.push(batAnimation, redTickAnimation);
        AnimationGeneration.sheetArray.forEach(obj => {
            let idleWidth = obj.spriteSheetIdle.texture.texImageSource.width / obj.idleNumberOfFrames;
            let idleHeigth = obj.spriteSheetIdle.texture.texImageSource.height;
            let walkWidth = obj.spriteSheetWalk.texture.texImageSource.width / obj.walkNumberOfFrames;
            let walkHeigth = obj.spriteSheetWalk.texture.texImageSource.height;
            generateAnimationFromGrid(obj.spriteSheetIdle, obj.animations, "idle", idleWidth, idleHeigth, obj.idleNumberOfFrames, obj.idleFrameRate, 22);
            generateAnimationFromGrid(obj.spriteSheetWalk, obj.animations, "walk", walkWidth, walkHeigth, obj.walkNumberOfFrames, obj.walkFrameRate, 22);
            console.log(obj.spriteSheetIdle);
            console.log(obj.spriteSheetWalk);
        });
    }
    AnimationGeneration.createAllAnimations = createAllAnimations;
    function generateAnimationFromGrid(_spritesheet, _animationsheet, _animationName, _width, _height, _numberOfFrames, _frameRate, _resolution) {
        let name = _animationName;
        let createdAnimation = new AnimationGeneration.ƒAid.SpriteSheetAnimation(name, _spritesheet);
        createdAnimation.generateByGrid(ƒ.Rectangle.GET(0, 0, _width, _height), _numberOfFrames, 32, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(_width));
        _animationsheet[name] = createdAnimation;
        console.log(name + ": " + _animationsheet[name]);
    }
})(AnimationGeneration || (AnimationGeneration = {}));
var Player;
(function (Player) {
    class Attributes {
        healthPoints;
        maxHealthPoints;
        knockbackForce = 6;
        speed;
        attackPoints;
        coolDownReduction = 1;
        scale;
        constructor(_healthPoints, _attackPoints, _speed, _scale, _cooldownReduction) {
            this.scale = _scale;
            this.healthPoints = _healthPoints * this.scale;
            this.maxHealthPoints = this.healthPoints;
            this.attackPoints = _attackPoints * this.scale;
            this.speed = _speed / this.scale;
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
                        if (element.properties.attributes.healthPoints > 0 && element.hitable) {
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
    let maxEnemies = 40;
    function spawnEnemies() {
        if (Game.enemies.length < maxEnemies) {
            // console.log(Game.enemies.length);
            if (currentTime == spawnTime) {
                const ref = Game.enemiesJSON.find(elem => elem.name == "tick");
                // Game.graph.addChild(new Enemy.EnemyShoot(Enemy.ENEMYNAME.BAT, new Player.Character(ref.name, new Player.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed)), new ƒ.Vector2((Math.random() * 7 - (Math.random() * 7)) * 2, (Math.random() * 7 - (Math.random() * 7) * 2)), new Weapons.Weapon(60, 1)));
                Game.graph.addChild(new Enemy.EnemyDumb(Enemy.ENEMYNAME.REDTICK, new Player.Character(ref.name, new Player.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, Math.random() * 3 + 0.5)), new ƒ.Vector2((Math.random() * 7 - (Math.random() * 7)) * 2, (Math.random() * 7 - (Math.random() * 7) * 2))));
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
        FUNCTION[FUNCTION["HOST"] = 1] = "HOST";
        FUNCTION[FUNCTION["SETREADY"] = 2] = "SETREADY";
        FUNCTION[FUNCTION["SPAWN"] = 3] = "SPAWN";
        FUNCTION[FUNCTION["TRANSFORM"] = 4] = "TRANSFORM";
        FUNCTION[FUNCTION["SPAWNBULLET"] = 5] = "SPAWNBULLET";
        FUNCTION[FUNCTION["SPAWNBULLETENEMY"] = 6] = "SPAWNBULLETENEMY";
        FUNCTION[FUNCTION["BULLETTRANSFORM"] = 7] = "BULLETTRANSFORM";
        FUNCTION[FUNCTION["BULLETDIE"] = 8] = "BULLETDIE";
        FUNCTION[FUNCTION["SPAWNENEMY"] = 9] = "SPAWNENEMY";
        FUNCTION[FUNCTION["ENEMYTRANSFORM"] = 10] = "ENEMYTRANSFORM";
        FUNCTION[FUNCTION["ENEMYSTATE"] = 11] = "ENEMYSTATE";
        FUNCTION[FUNCTION["ENEMYDIE"] = 12] = "ENEMYDIE";
        FUNCTION[FUNCTION["SPAWNITEM"] = 13] = "SPAWNITEM";
        FUNCTION[FUNCTION["UPDATEATTRIBUTES"] = 14] = "UPDATEATTRIBUTES";
        FUNCTION[FUNCTION["ITEMDIE"] = 15] = "ITEMDIE";
        FUNCTION[FUNCTION["SENDROOM"] = 16] = "SENDROOM";
        FUNCTION[FUNCTION["SWITCHROOMREQUEST"] = 17] = "SWITCHROOMREQUEST";
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
                            Game.avatar2 = new Player.Melee("player2", new Player.Character(message.content.value.name, new Player.Attributes(message.content.value.attributes.healthPoints, message.content.value.attributes.attackPoints, message.content.value.attributes.speed, message.content.value.attributes.speed)));
                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            Game.graph.appendChild(Game.avatar2);
                        }
                        else if (message.content.type == Player.PLAYERTYPE.RANGED) {
                            Game.avatar2 = new Player.Ranged("player2", new Player.Character(message.content.value.name, new Player.Attributes(message.content.value.attributes.healthPoints, message.content.value.attributes.attackPoints, message.content.value.attributes.speed, message.content.value.attributes.scale)));
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
                            chooseEnemy(message.content.id, new Player.Attributes(message.content.properties.attributes.healthPoints, message.content.properties.attributes.attackPoints, message.content.properties.attributes.speed, message.content.properties.attributes.scale), new ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]), message.content.netId);
                        }
                        //Sync enemy transform from host to client
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYTRANSFORM.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.netId);
                            if (enemy != undefined) {
                                enemy.cmpTransform.mtxLocal.translation = new ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                enemy.updateCollider();
                            }
                        }
                        //Sync animation state
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYSTATE.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.netId);
                            if (enemy != undefined) {
                                switch (message.content.state) {
                                    case Enemy.ANIMATIONSTATES.IDLE:
                                        enemy.setAnimation(enemy.animations["idle"]);
                                        enemy.currentAnimation = Enemy.ANIMATIONSTATES.IDLE;
                                        break;
                                    case Enemy.ANIMATIONSTATES.WALK:
                                        enemy.setAnimation(enemy.animations["walk"]);
                                        enemy.currentAnimation = Enemy.ANIMATIONSTATES.WALK;
                                        break;
                                }
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
                        // send is hostMessage
                        if (message.content != undefined && message.content.text == FUNCTION.HOST.toString()) {
                            Networking.someoneIsHost = true;
                        }
                        //send room 
                        if (message.content != undefined && message.content.text == FUNCTION.SENDROOM.toString()) {
                            let oldObjects = Game.graph.getChildren().filter(elem => elem.tag != Tag.TAG.PLAYER);
                            oldObjects.forEach((elem) => {
                                Game.graph.removeChild(elem);
                            });
                            let room = new Generation.Room(message.content.name, message.content.coordiantes, message.content.exits, message.content.roomType);
                            room.setDoors();
                            Game.graph.addChild(room);
                            Game.graph.appendChild(room.walls[0]);
                            Game.graph.appendChild(room.walls[1]);
                            Game.graph.appendChild(room.walls[2]);
                            Game.graph.appendChild(room.walls[3]);
                            for (let i = 0; i < room.doors.length; i++) {
                                Game.graph.addChild(room.doors[i]);
                            }
                            Game.avatar1.cmpTransform.mtxLocal.translation = room.cmpTransform.mtxLocal.translation;
                        }
                        //send request to switch rooms
                        if (message.content != undefined && message.content.text == FUNCTION.SWITCHROOMREQUEST.toString()) {
                            let currentroom = Generation.rooms.find(elem => elem.coordinates[0] == message.content.coordiantes[0] &&
                                elem.coordinates[1] == message.content.coordiantes[1]);
                            Generation.switchRoom(currentroom, message.content.direction);
                        }
                    }
                }
            }
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
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.HOST, id: Networking.client.id } });
            if (!Networking.someoneIsHost) {
                Networking.client.becomeHost();
                Networking.someoneIsHost = true;
            }
        }
        else {
            Networking.someoneIsHost = true;
        }
    }
    Networking.setHost = setHost;
    async function spawnPlayer(_type) {
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
    function setClient() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: Networking.FUNCTION.CONNECTED, value: Networking.client.id } });
    }
    Networking.setClient = setClient;
    function updateAvatarPosition(_position, _rotation) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.TRANSFORM, value: _position, rotation: _rotation } });
    }
    Networking.updateAvatarPosition = updateAvatarPosition;
    //#endregion
    //#region bullet
    function spawnBullet(_direction, _netId) {
        if (Game.connected) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWNBULLET, direction: _direction, netId: _netId } });
        }
    }
    Networking.spawnBullet = spawnBullet;
    function updateBullet(_position, _netId, _tick) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.BULLETTRANSFORM, position: _position, netId: _netId, tick: _tick } });
        }
    }
    Networking.updateBullet = updateBullet;
    async function spawnBulletAtEnemy(_bulletNetId, _enemyNetId) {
        if (Game.connected) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNBULLETENEMY, bulletNetId: _bulletNetId, enemyNetId: _enemyNetId } });
        }
    }
    Networking.spawnBulletAtEnemy = spawnBulletAtEnemy;
    function removeBullet(_netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.BULLETDIE, netId: _netId } });
        }
    }
    Networking.removeBullet = removeBullet;
    //#endregion
    //#region enemy
    function chooseEnemy(_id, _properties, _position, _netId) {
        switch (_id) {
            case Enemy.ENEMYNAME.BAT:
                Game.graph.addChild(new Enemy.EnemyDumb(Enemy.ENEMYNAME.BAT, new Player.Character(Enemy.getNameByID(_id), new Player.Attributes(_properties.healthPoints, _properties.attackPoints, _properties.speed, _properties.scale)), _position.toVector2(), _netId));
                break;
            case Enemy.ENEMYNAME.REDTICK:
                let newEnem = new Enemy.EnemyDumb(Enemy.ENEMYNAME.REDTICK, new Player.Character(Enemy.getNameByID(_id), new Player.Attributes(_properties.healthPoints, _properties.attackPoints, _properties.speed, _properties.scale)), _position.toVector2(), _netId);
                Game.graph.addChild(newEnem);
                break;
        }
    }
    function spawnEnemy(_enemy, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNENEMY, id: _enemy.id, properties: _enemy.properties, position: _enemy.mtxLocal.translation, netId: _netId } });
        }
    }
    Networking.spawnEnemy = spawnEnemy;
    function updateEnemyPosition(_position, _netId, _state) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENEMYTRANSFORM, position: _position, netId: _netId, animation: _state } });
    }
    Networking.updateEnemyPosition = updateEnemyPosition;
    function updateEnemyState(_state, _netId) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENEMYSTATE, state: _state, netId: _netId } });
    }
    Networking.updateEnemyState = updateEnemyState;
    function removeEnemy(_netId) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENEMYDIE, netId: _netId } });
    }
    Networking.removeEnemy = removeEnemy;
    //#endregion
    //#region items
    async function spawnItem(_name, _description, _position, _imgSrc, _lifetime, _netId, _attributes, _type) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            await Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNITEM, name: _name, description: _description, position: _position, imgSrc: _imgSrc, lifetime: _lifetime, netId: _netId, attributes: _attributes, type: _type } });
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
    //#region room
    function sendRoom(_name, _coordiantes, _exits, _roomType) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SENDROOM, name: _name, coordiantes: _coordiantes, exits: _exits, roomType: _roomType } });
        }
    }
    Networking.sendRoom = sendRoom;
    function switchRoomRequest(_coordiantes, _direction) {
        if (Game.connected && Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.client.idHost, content: { text: FUNCTION.SWITCHROOMREQUEST, coordiantes: _coordiantes, direction: _direction } });
        }
    }
    Networking.switchRoomRequest = switchRoomRequest;
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
        hitable = true;
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
            this.collide(this.moveDirection);
            let doors = Game.graph.getChildren().find(element => element.tag == Tag.TAG.ROOM).doors;
            doors.forEach((element) => {
                if (this.collider.collidesRect(element.collider)) {
                    element.changeRoom();
                }
            });
            this.moveDirection.subtract(_direction);
        }
        collide(_direction) {
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
        //Block
        doAbility() {
            if (this.currentabilityCount > 0) {
                this.hitable = false;
                setTimeout(() => {
                    this.hitable = true;
                }, 600);
                this.currentabilityCount--;
            }
        }
    }
    Player_1.Melee = Melee;
    class Ranged extends Player {
        //Dash
        doAbility() {
            if (this.currentabilityCount > 0) {
                this.hitable = false;
                this.properties.attributes.speed *= 2;
                setTimeout(() => {
                    this.properties.attributes.speed /= 2;
                    setTimeout(() => {
                        this.properties.attributes.speed /= 1;
                        this.hitable = true;
                    }, 100);
                }, 300);
                this.currentabilityCount--;
            }
        }
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
        finished = true;
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
                if (Networking.client.id == Networking.client.idHost) {
                    Generation.switchRoom(this.parentRoom, this.direction);
                }
                else {
                    Networking.switchRoomRequest(this.parentRoom.coordinates, this.direction);
                }
            }
        }
    }
    Generation.Door = Door;
})(Generation || (Generation = {}));
var Generation;
(function (Generation) {
    let numberOfRooms = 3;
    let usedPositions = [];
    Generation.rooms = [];
    //spawn chances
    let challengeRoomSpawnChance = 20;
    let treasureRoomSpawnChance = 10;
    function generateRooms() {
        let startCoords = [0, 0];
        Generation.rooms.push(new Generation.Room("roomStart", startCoords, calcPathExits(startCoords), Generation.ROOMTYPE.START));
        usedPositions.push(startCoords);
        for (let i = 0; i < numberOfRooms; i++) {
            addRoom(Generation.rooms[Generation.rooms.length - 1], Generation.ROOMTYPE.NORMAL);
        }
        addRoom(Generation.rooms[Generation.rooms.length - 1], Generation.ROOMTYPE.BOSS);
        addSpecialRooms();
        addRoom(Generation.rooms[Generation.rooms.length - 3], Generation.ROOMTYPE.MERCHANT);
        Generation.rooms.forEach(room => {
            room.exits = calcRoomDoors(room.coordinates);
            // console.log(room.coordinates + " " + room.exits + " " + room.roomType.toString());
        });
        for (let i = 0; i < Generation.rooms.length; i++) {
            Generation.rooms[i].setDoors();
        }
        Game.graph.addChild(Generation.rooms[0]);
        Game.graph.appendChild(Generation.rooms[0].walls[0]);
        Game.graph.appendChild(Generation.rooms[0].walls[1]);
        Game.graph.appendChild(Generation.rooms[0].walls[2]);
        Game.graph.appendChild(Generation.rooms[0].walls[3]);
        for (let i = 0; i < Generation.rooms[0].doors.length; i++) {
            Game.graph.addChild(Generation.rooms[0].doors[i]);
        }
        sendRoom(Generation.rooms[0]);
    }
    Generation.generateRooms = generateRooms;
    function sendRoom(_room) {
        Networking.sendRoom(_room.name, _room.coordinates, _room.exits, _room.roomType);
    }
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
                Generation.rooms.push(newRoom);
                _currentRoom.neighbourN = newRoom;
                newRoom.neighbourS = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 1: // east
                newRoomPosition = [_currentRoom.coordinates[0] + 1, _currentRoom.coordinates[1]];
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                Generation.rooms.push(newRoom);
                _currentRoom.neighbourE = newRoom;
                newRoom.neighbourW = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 2: // south
                newRoomPosition = [_currentRoom.coordinates[0], _currentRoom.coordinates[1] - 1];
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                Generation.rooms.push(newRoom);
                _currentRoom.neighbourS = newRoom;
                newRoom.neighbourN = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 3: //west
                newRoomPosition = [_currentRoom.coordinates[0] - 1, _currentRoom.coordinates[1]];
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                Generation.rooms.push(newRoom);
                _currentRoom.neighbourW = newRoom;
                newRoom.neighbourE = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
        }
    }
    function addSpecialRooms() {
        Generation.rooms.forEach(room => {
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
            addRoomToGraph(_currentRoom.neighbourN);
        }
        if (_direction[1]) {
            addRoomToGraph(_currentRoom.neighbourE);
        }
        if (_direction[2]) {
            addRoomToGraph(_currentRoom.neighbourS);
        }
        if (_direction[3]) {
            addRoomToGraph(_currentRoom.neighbourW);
        }
        function addRoomToGraph(_room) {
            sendRoom(_room);
            Game.graph.addChild(_room);
            Game.graph.appendChild(_room.walls[0]);
            Game.graph.appendChild(_room.walls[1]);
            Game.graph.appendChild(_room.walls[2]);
            Game.graph.appendChild(_room.walls[3]);
            Game.avatar1.cmpTransform.mtxLocal.translation = _room.cmpTransform.mtxLocal.translation;
            for (let i = 0; i < _room.doors.length; i++) {
                Game.graph.addChild(_room.doors[i]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL0NsYXNzZXMvTWFpbi50cyIsIi4uL0NsYXNzZXMvSW50ZXJmYWNlcy50cyIsIi4uL0NsYXNzZXMvRW5lbXkudHMiLCIuLi9DbGFzc2VzL0l0ZW1zLnRzIiwiLi4vQ2xhc3Nlcy9BbmltYXRpb25HZW5lcmF0aW9uLnRzIiwiLi4vQ2xhc3Nlcy9BdHRyaWJ1dGVzLnRzIiwiLi4vQ2xhc3Nlcy9CdWxsZXQudHMiLCIuLi9DbGFzc2VzL0NoYXJhY3Rlci50cyIsIi4uL0NsYXNzZXMvQ29sbGlkZXIudHMiLCIuLi9DbGFzc2VzL0VuZW15U3Bhd25lci50cyIsIi4uL0NsYXNzZXMvR2FtZUNhbGN1bGF0aW9uLnRzIiwiLi4vQ2xhc3Nlcy9JbnB1dFN5c3RlbS50cyIsIi4uL0NsYXNzZXMvTGFuZHNjYXBlLnRzIiwiLi4vQ2xhc3Nlcy9OZXR3b3JraW5nLnRzIiwiLi4vQ2xhc3Nlcy9QbGF5ZXIudHMiLCIuLi9DbGFzc2VzL1Jvb20udHMiLCIuLi9DbGFzc2VzL1Jvb21HZW5lcmF0aW9uLnRzIiwiLi4vQ2xhc3Nlcy9UYWcudHMiLCIuLi9DbGFzc2VzL1VJLnRzIiwiLi4vQ2xhc3Nlcy9XZWFwb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtQkFBbUI7QUFDbkIsd0RBQXdEO0FBQ3hELHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFFdEIsSUFBVSxJQUFJLENBK1FiO0FBcFJELG1CQUFtQjtBQUNuQix3REFBd0Q7QUFDeEQsc0RBQXNEO0FBQ3RELHNCQUFzQjtBQUV0QixXQUFVLElBQUk7SUFDVixJQUFZLFVBR1g7SUFIRCxXQUFZLFVBQVU7UUFDbEIsaURBQU8sQ0FBQTtRQUNQLDZDQUFLLENBQUE7SUFDVCxDQUFDLEVBSFcsVUFBVSxHQUFWLGVBQVUsS0FBVixlQUFVLFFBR3JCO0lBRWEsTUFBQyxHQUFHLFNBQVMsQ0FBQztJQUNkLFNBQUksR0FBRyxRQUFRLENBQUM7SUFHOUIsdUJB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RUFBRSxDQUFDLENBQUM7WUFDOUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDcEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqRixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV4SSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxSCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxSCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxSCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5SCxDQUFDO1FBRU0sUUFBUTtZQUNYLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDZixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7YUFDbkk7WUFDRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2FBQ25JO1lBQ0QsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxD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QUFQLE9BQU8sUUE0QmhCIiwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIFwiSW1wb3J0c1wiXHJcbi8vLzxyZWZlcmVuY2UgdHlwZXM9XCIuLi9GVURHRS9Db3JlL0J1aWxkL0Z1ZGdlQ29yZS5qc1wiLz5cclxuLy8vPHJlZmVyZW5jZSB0eXBlcz1cIi4uL0ZVREdFL0FpZC9CdWlsZC9GdWRnZUFpZC5qc1wiLz5cclxuLy8jZW5kcmVnaW9uIFwiSW1wb3J0c1wiXHJcblxyXG5uYW1lc3BhY2UgR2FtZSB7XHJcbiAgICBleHBvcnQgZW51bSBHQU1FU1RBVEVTIHtcclxuICAgICAgICBQTEFZSU5HLFxyXG4gICAgICAgIFBBVVNFXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGltcG9ydCDGkiA9IEZ1ZGdlQ29yZTtcclxuICAgIGV4cG9ydCBpbXBvcnQgxpJBaWQgPSBGdWRnZUFpZDtcclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiRG9tRWxlbWVudHNcIlxyXG4gICAgZXhwb3J0IGxldCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50ID0gPEhUTUxDYW52YXNFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ2FudmFzXCIpO1xyXG4gICAgLy8gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGluaXQpO1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIHN0YXJ0KTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiUmFuZ2VkXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBwbGF5ZXJDaG9pY2UpO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJNZWxlZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcGxheWVyQ2hvaWNlKTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcIkRvbUVsZW1lbnRzXCJcclxuXHJcbiAgICAvLyNyZWdpb24gXCJQdWJsaWNWYXJpYWJsZXNcIlxyXG4gICAgZXhwb3J0IGxldCBnYW1lc3RhdGU6IEdBTUVTVEFURVMgPSBHQU1FU1RBVEVTLlBBVVNFO1xyXG4gICAgZXhwb3J0IGxldCB2aWV3cG9ydDogxpIuVmlld3BvcnQgPSBuZXcgxpIuVmlld3BvcnQoKTtcclxuICAgIGV4cG9ydCBsZXQgZ3JhcGg6IMaSLk5vZGUgPSBuZXcgxpIuTm9kZShcIkdyYXBoXCIpO1xyXG4gICAgZXhwb3J0IGxldCBhdmF0YXIxOiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgZXhwb3J0IGxldCBhdmF0YXIyOiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgZXhwb3J0IGxldCBjb25uZWN0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIGV4cG9ydCBsZXQgZnJhbWVSYXRlOiBudW1iZXIgPSA2MDtcclxuICAgIGV4cG9ydCBsZXQgZW5lbWllczogRW5lbXkuRW5lbXlbXSA9IFtdO1xyXG4gICAgZXhwb3J0IGxldCBidWxsZXRzOiBCdWxsZXRzLkJ1bGxldFtdO1xyXG4gICAgZXhwb3J0IGxldCBlbmVtaWVzSlNPTjogUGxheWVyLkNoYXJhY3RlcltdO1xyXG4gICAgZXhwb3J0IGxldCBpdGVtc0pTT046IEl0ZW1zLkl0ZW1bXTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcIlB1YmxpY1ZhcmlhYmxlc1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiUHJpdmF0ZVZhcmlhYmxlc1wiXHJcbiAgICBsZXQgaXRlbTE6IEl0ZW1zLkl0ZW07XHJcbiAgICBsZXQgY21wQ2FtZXJhOiDGki5Db21wb25lbnRDYW1lcmEgPSBuZXcgxpIuQ29tcG9uZW50Q2FtZXJhKCk7XHJcbiAgICBsZXQgcGxheWVyVHlwZTogUGxheWVyLlBMQVlFUlRZUEU7XHJcbiAgICBjb25zdCBkYW1wZXI6IG51bWJlciA9IDMuNTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcIlByaXZhdGVWYXJpYWJsZXNcIlxyXG5cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiZXNzZW50aWFsXCJcclxuICAgIGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICAgICAgYXdhaXQgbG9hZEpTT04oKTtcclxuXHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICBHZW5lcmF0aW9uLmdlbmVyYXRlUm9vbXMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdyYXBoLmFwcGVuZENoaWxkKGF2YXRhcjEpO1xyXG5cclxuICAgICAgICDGkkFpZC5hZGRTdGFuZGFyZExpZ2h0Q29tcG9uZW50cyhncmFwaCk7XHJcblxyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGVaKDI1KTtcclxuICAgICAgICBjbXBDYW1lcmEubXR4UGl2b3Qucm90YXRlWSgxODApO1xyXG5cclxuICAgICAgICB2aWV3cG9ydC5pbml0aWFsaXplKFwiVmlld3BvcnRcIiwgZ3JhcGgsIGNtcENhbWVyYSwgY2FudmFzKTtcclxuXHJcbiAgICAgICAgZHJhdygpO1xyXG5cclxuICAgICAgICBoZWxwZXIoKTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gaGVscGVyKCkge1xyXG4gICAgICAgICAgICBpZiAoYXZhdGFyMiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIMaSLkxvb3Auc3RhcnQoxpIuTE9PUF9NT0RFLlRJTUVfR0FNRSwgZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGhlbHBlcigpO1xyXG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGUoKTogdm9pZCB7XHJcblxyXG4gICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBJbnB1dFN5c3RlbS5tb3ZlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkcmF3KCk7XHJcblxyXG4gICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBjYW1lcmFVcGRhdGUoKTtcclxuXHJcbiAgICAgICAgICAgIGF2YXRhcjEuY29vbGRvd24oKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgYXZhdGFyMi5jb29sZG93bigpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJQb3NpdGlvbihHYW1lLmF2YXRhcjEubXR4TG9jYWwudHJhbnNsYXRpb24sIEdhbWUuYXZhdGFyMS5tdHhMb2NhbC5yb3RhdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gTmV0d29ya2luZy5zcGF3bkVuZW15KGJhdCwgYmF0LmlkKTtcclxuXHJcbiAgICAgICAgICAgIC8vI3JlZ2lvbiBjb3VudCBpdGVtc1xyXG4gICAgICAgICAgICBsZXQgaXRlbXM6IEl0ZW1zLkl0ZW1bXSA9IDxJdGVtcy5JdGVtW10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEl0ZW1zLkl0ZW0+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuSVRFTSlcclxuICAgICAgICAgICAgaXRlbXMuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQubGlmZXNwYW4oZ3JhcGgpO1xyXG4gICAgICAgICAgICAgICAgKDxJdGVtcy5JbnRlcm5hbEl0ZW0+ZWxlbWVudCkuY29sbGlzaW9uRGV0ZWN0aW9uKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgICAgIGJ1bGxldHMgPSA8QnVsbGV0cy5CdWxsZXRbXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8QnVsbGV0cy5CdWxsZXQ+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuQlVMTEVUKVxyXG4gICAgICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgIGJ1bGxldHMuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lm1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmxpZmVzcGFuKGdyYXBoKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBkYW1hZ2VVSTogVUkuRGFtYWdlVUlbXSA9IDxVSS5EYW1hZ2VVSVtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxVSS5EYW1hZ2VVST5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5EQU1BR0VVSSlcclxuICAgICAgICAgICAgZGFtYWdlVUkuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQubW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5saWZlc3BhbihncmFwaCk7XHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICBlbmVtaWVzID0gPEVuZW15LkVuZW15W10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVuZW15LkVuZW15PmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLkVORU1ZKVxyXG4gICAgICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICBlbmVtaWVzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5lbmVteVVwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQubGlmZXNwYW4oZ3JhcGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgRW5lbXkuRW5lbXlTaG9vdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPEVuZW15LkVuZW15U2hvb3Q+ZWxlbWVudCkud2VhcG9uLmNvb2xkb3duKGVsZW1lbnQucHJvcGVydGllcy5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgICAgIEVuZW15U3Bhd25lci5zcGF3bkVuZW1pZXMoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgVUkudXBkYXRlVUkoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc3RhcnQoKSB7XHJcbiAgICAgICAgbG9hZFRleHR1cmVzKCk7XHJcbiAgICAgICAgLy9hZGQgc3ByaXRlIHRvIGdyYXBoZSBmb3Igc3RhcnRzY3JlZW5cclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0R2FtZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLmNvbm5ldGluZygpO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG5cclxuICAgICAgICAgICAgd2FpdE9uQ29ubmVjdGlvbigpO1xyXG5cclxuICAgICAgICAgICAgd2FpdEZvckhvc3QoKTtcclxuXHJcbiAgICAgICAgICAgIHdhaXRGb3JMb2JieSgpO1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gd2FpdEZvckxvYmJ5KCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50cy5sZW5ndGggPj0gMiAmJiBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgIT0gdW5kZWZpbmVkICYmIChOZXR3b3JraW5nLmNsaWVudC5wZWVyc1tOZXR3b3JraW5nLmNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gTmV0d29ya2luZy5jbGllbnQuaWQpLmlkXS5kYXRhQ2hhbm5lbCAhPSB1bmRlZmluZWQgJiZcclxuICAgICAgICAgICAgICAgICAgICAoTmV0d29ya2luZy5jbGllbnQucGVlcnNbTmV0d29ya2luZy5jbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkKS5pZF0uZGF0YUNoYW5uZWwucmVhZHlTdGF0ZSA9PSBcIm9wZW5cIikpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJMb2JieXNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRGb3JMb2JieSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDIwMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHdhaXRGb3JIb3N0KCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50cy5sZW5ndGggPj0gMiAmJiBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5zZXRIb3N0KCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3YWl0Rm9ySG9zdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDIwMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cclxuICAgICAgICB9KTtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNyZWRpdHNcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gbG9hZEpTT04oKSB7XHJcbiAgICAgICAgY29uc3QgbG9hZEVuZW15ID0gYXdhaXQgKGF3YWl0IGZldGNoKFwiLi9SZXNvdXJjZXMvRW5lbWllc1N0b3JhZ2UuanNvblwiKSkuanNvbigpO1xyXG4gICAgICAgIGVuZW1pZXNKU09OID0gKDxQbGF5ZXIuQ2hhcmFjdGVyW10+bG9hZEVuZW15LmVuZW1pZXMpO1xyXG5cclxuICAgICAgICBjb25zdCBsb2FkSXRlbSA9IGF3YWl0IChhd2FpdCBmZXRjaChcIi4vUmVzb3VyY2VzL0l0ZW1TdG9yYWdlLmpzb25cIikpLmpzb24oKTtcclxuICAgICAgICBpdGVtc0pTT04gPSAoPEl0ZW1zLkl0ZW1bXT5sb2FkSXRlbS5pdGVtcyk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIGxvYWRUZXh0dXJlcygpIHtcclxuICAgICAgICBhd2FpdCBCdWxsZXRzLmJ1bGxldFR4dC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvYXJyb3cwMS5wbmdcIik7XHJcblxyXG4gICAgICAgIC8vVUlcclxuICAgICAgICBhd2FpdCBVSS50eHRaZXJvLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS8wLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRPbmUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzEucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFRvdy5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvMi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0VGhyZWUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzMucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dEZvdXIubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzQucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dEZpdmUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFNpeC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvNi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0U2V2ZW4ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzcucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dEVpZ2h0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS84LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHROaW5lLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS85LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRUZW4ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzEwLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgLy9FTkVNWVxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0QmF0SWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9iYXQvYmF0SWRsZS5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0UmVkVGlja0lkbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvdGljay9yZWRUaWNrSWRsZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRSZWRUaWNrV2Fsay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy90aWNrL3JlZFRpY2tXYWxrLnBuZ1wiKVxyXG5cclxuICAgICAgICBBbmltYXRpb25HZW5lcmF0aW9uLmNyZWF0ZUFsbEFuaW1hdGlvbnMoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gd2FpdE9uQ29ubmVjdGlvbigpIHtcclxuICAgICAgICBOZXR3b3JraW5nLnNldENsaWVudCgpO1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMuZmlsdGVyKGVsZW0gPT4gZWxlbS5yZWFkeSA9PSB0cnVlKS5sZW5ndGggPj0gMiAmJiBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSU1IT1NUXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgYXdhaXQgaW5pdCgpO1xyXG4gICAgICAgICAgICBnYW1lc3RhdGUgPSBHQU1FU1RBVEVTLlBMQVlJTkc7XHJcbiAgICAgICAgICAgIGF3YWl0IE5ldHdvcmtpbmcuc3Bhd25QbGF5ZXIocGxheWVyVHlwZSk7XHJcblxyXG5cclxuICAgICAgICAgICAgLy8jcmVnaW9uIGluaXQgSXRlbXNcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgaXRlbTEgPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKFwiY29vbGRvd24gcmVkdWN0aW9uXCIsIFwiYWRkcyBzcGVlZCBhbmQgc2hpdFwiLCBuZXcgxpIuVmVjdG9yMygwLCAyLCAwKSwgbmV3IFBsYXllci5BdHRyaWJ1dGVzKDAsIDAsIDAsIDEwMCksIEl0ZW1zLklURU1UWVBFLlBST0NFTlRVQUwsIFwiLi9SZXNvdXJjZXMvSW1hZ2UvSXRlbXNcIik7XHJcbiAgICAgICAgICAgICAgICBsZXQgaXRlbTIgPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKFwiY29vbGRvd24gcmVkdWN0aW9uXCIsIFwiYWRkcyBzcGVlZCBhbmQgc2hpdFwiLCBuZXcgxpIuVmVjdG9yMygwLCAtMiwgMCksIG5ldyBQbGF5ZXIuQXR0cmlidXRlcygwLCAwLCAwLCAxMDApLCBJdGVtcy5JVEVNVFlQRS5QUk9DRU5UVUFMLCBcIi4vUmVzb3VyY2VzL0ltYWdlL0l0ZW1zXCIpO1xyXG4gICAgICAgICAgICAgICAgZ3JhcGguYXBwZW5kQ2hpbGQoaXRlbTEpO1xyXG4gICAgICAgICAgICAgICAgZ3JhcGguYXBwZW5kQ2hpbGQoaXRlbTIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQod2FpdE9uQ29ubmVjdGlvbiwgMzAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGxheWVyQ2hvaWNlKF9lOiBFdmVudCkge1xyXG4gICAgICAgIGlmICgoPEhUTUxCdXR0b25FbGVtZW50Pl9lLnRhcmdldCkuaWQgPT0gXCJSYW5nZWRcIikge1xyXG4gICAgICAgICAgICBhdmF0YXIxID0gbmV3IFBsYXllci5SYW5nZWQoXCJwbGF5ZXJcIiwgbmV3IFBsYXllci5DaGFyYWN0ZXIoXCJUaG9yLFwiLCBuZXcgUGxheWVyLkF0dHJpYnV0ZXMoMTAsIDUsIDUsIDEpKSk7XHJcbiAgICAgICAgICAgIHBsYXllclR5cGUgPSBQbGF5ZXIuUExBWUVSVFlQRS5SQU5HRUQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICgoPEhUTUxCdXR0b25FbGVtZW50Pl9lLnRhcmdldCkuaWQgPT0gXCJNZWxlZVwiKSB7XHJcbiAgICAgICAgICAgIGF2YXRhcjEgPSBuZXcgUGxheWVyLk1lbGVlKFwicGxheWVyXCIsIG5ldyBQbGF5ZXIuQ2hhcmFjdGVyKFwiVGhvcixcIiwgbmV3IFBsYXllci5BdHRyaWJ1dGVzKDEwLCAxLCA1LCAxKSkpO1xyXG4gICAgICAgICAgICBwbGF5ZXJUeXBlID0gUGxheWVyLlBMQVlFUlRZUEUuTUVMRUU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTG9iYnlzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcblxyXG4gICAgICAgIHJlYWR5U2F0ZSgpO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkeVNhdGUoKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMubGVuZ3RoID49IDIgJiYgTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zZXRDbGllbnRSZWFkeSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMuZmlsdGVyKGVsZW0gPT4gZWxlbS5yZWFkeSA9PSB0cnVlKS5sZW5ndGggPCAyKSB7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsgcmVhZHlTYXRlKCkgfSwgMjAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmF3KCk6IHZvaWQge1xyXG4gICAgICAgIHZpZXdwb3J0LmRyYXcoKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2FtZXJhVXBkYXRlKCkge1xyXG4gICAgICAgIGxldCBkaXJlY3Rpb24gPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UoYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgZGlyZWN0aW9uLnNjYWxlKDEgLyBmcmFtZVJhdGUgKiBkYW1wZXIpO1xyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGUobmV3IMaSLlZlY3RvcjMoLWRpcmVjdGlvbi54LCBkaXJlY3Rpb24ueSwgMCksIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIMaSLkxvb3AuYWRkRXZlbnRMaXN0ZW5lcijGki5FVkVOVC5MT09QX0ZSQU1FLCB1cGRhdGUpO1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiZXNzZW50aWFsXCJcclxuXHJcbn1cclxuIiwibmFtZXNwYWNlIEludGVyZmFjZXMge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJU3Bhd25hYmxlIHtcclxuICAgICAgICBsaWZldGltZT86IG51bWJlcjtcclxuICAgICAgICBsaWZlc3BhbihfYTogxpIuTm9kZSk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJS25vY2tiYWNrYWJsZSB7XHJcbiAgICAgICAgZG9Lbm9ja2JhY2soX2JvZHk6IMaSQWlkLk5vZGVTcHJpdGUpOiB2b2lkO1xyXG4gICAgICAgIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUtpbGxhYmxlIHtcclxuICAgICAgICBvbkRlYXRoKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRGFtYWdlYWJsZSB7XHJcbiAgICAgICAgZ2V0RGFtYWdlKCk6IHZvaWQ7XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXkge1xyXG4gICAgZXhwb3J0IGxldCB0eHRUaWNrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGVudW0gRU5FTVlOQU1FIHtcclxuICAgICAgICBCQVQsXHJcbiAgICAgICAgUkVEVElDSyxcclxuICAgICAgICBTTUFMTFRJQ0ssXHJcbiAgICAgICAgU0tFTEVUT05cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXROYW1lQnlJRChfaWQ6IEVORU1ZTkFNRSkge1xyXG4gICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgIGNhc2UgRU5FTVlOQU1FLkJBVDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcImJhdFwiO1xyXG4gICAgICAgICAgICBjYXNlIEVORU1ZTkFNRS5SRURUSUNLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwicmVkVGlja1wiO1xyXG4gICAgICAgICAgICBjYXNlIEVORU1ZTkFNRS5TTUFMTFRJQ0s6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJzbWFsbFRpY2tcIjtcclxuICAgICAgICAgICAgY2FzZSBFTkVNWU5BTUUuU0tFTEVUT046XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJza2VsZXRvblwiO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGVudW0gQkVIQVZJT1VSIHtcclxuICAgICAgICBJRExFLCBGT0xMT1csIEZMRUVcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBBTklNQVRJT05TVEFURVMge1xyXG4gICAgICAgIElETEUsIFdBTEtcclxuICAgIH1cclxuICAgIGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteSBleHRlbmRzIEdhbWUuxpJBaWQuTm9kZVNwcml0ZSBpbXBsZW1lbnRzIEludGVyZmFjZXMuSVNwYXduYWJsZSwgSW50ZXJmYWNlcy5JS25vY2tiYWNrYWJsZSB7XHJcbiAgICAgICAgY3VycmVudFN0YXRlOiBCRUhBVklPVVIgPSBCRUhBVklPVVIuSURMRTtcclxuICAgICAgICBjdXJyZW50QW5pbWF0aW9uOiBBTklNQVRJT05TVEFURVM7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuRU5FTVk7XHJcbiAgICAgICAgcHVibGljIGlkOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIG5ldElkOiBudW1iZXIgPSBOZXR3b3JraW5nLmlkR2VuZXJhdG9yKCk7XHJcbiAgICAgICAgcHVibGljIHByb3BlcnRpZXM6IFBsYXllci5DaGFyYWN0ZXI7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcjtcclxuICAgICAgICBzaXplRGl2aWRlRmFjdG9yOiBudW1iZXIgPSAyO1xyXG4gICAgICAgIHRhcmdldDogxpIuVmVjdG9yMztcclxuICAgICAgICBsaWZldGltZTogbnVtYmVyO1xyXG4gICAgICAgIGNhbk1vdmVYOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICBjYW5Nb3ZlWTogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgbW92ZURpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuXHJcbiAgICAgICAgLy8jcmVnaW9uICBhbmltYXRpb25cclxuICAgICAgICBhbmltYXRpb25zOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbnM7XHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRU5FTVlOQU1FLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3RlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoZ2V0TmFtZUJ5SUQoX2lkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMucHJvcGVydGllcyA9IF9wcm9wZXJ0aWVzO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgMC4xKTtcclxuICAgICAgICAgICAgaWYgKF9uZXRJZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucG9wSUQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLmN1cnJlbnRJRHMucHVzaChfbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLnByb3BlcnRpZXMuYXR0cmlidXRlcy5zY2FsZSwgMCkpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyB0aGlzLnNpemVEaXZpZGVGYWN0b3IpO1xyXG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvbnMgPSBBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCkuYW5pbWF0aW9ucztcclxuICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uc1tcImlkbGVcIl0pO1xyXG5cclxuICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkVuZW15KHRoaXMsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGVuZW15VXBkYXRlKCkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNvbGxpZGVyKCk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRlKHRoaXMubW92ZURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW5lbXlQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy5uZXRJZCwgdGhpcy5jdXJyZW50QW5pbWF0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkb0tub2NrYmFjayhfYm9keTogxpJBaWQuTm9kZVNwcml0ZSk6IHZvaWQge1xyXG4gICAgICAgICAgICAoPFBsYXllci5QbGF5ZXI+X2JvZHkpLmdldEtub2NrYmFjayh0aGlzLnByb3BlcnRpZXMuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy9UT0RPOiBhcHBseSBzY2FsaW5nIGNvcnJlY3QgZm9yIGtub2NrYmFja1xyXG4gICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgX3Bvc2l0aW9uLnRvVmVjdG9yMigpKS50b1ZlY3RvcjMoMCk7XHJcbiAgICAgICAgICAgIGxldCBrbm9ja0JhY2tTY2FsaW5nOiBudW1iZXIgPSBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNjYWxlO1xyXG5cclxuICAgICAgICAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKF9rbm9ja2JhY2tGb3JjZSAqIDEgLyBrbm9ja0JhY2tTY2FsaW5nKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbi5hZGQoZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHJlZHVjZUtub2NrYmFjayhkaXJlY3Rpb24sIHRoaXMubW92ZURpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiByZWR1Y2VLbm9ja2JhY2soX2RpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzLCBfbW92ZURpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBfa25vY2tiYWNrRm9yY2UgPSBfa25vY2tiYWNrRm9yY2UgLyBrbm9ja0JhY2tTY2FsaW5nO1xyXG4gICAgICAgICAgICAgICAgaWYgKF9rbm9ja2JhY2tGb3JjZSA+IDAuMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbW92ZURpcmVjdGlvbi5zdWJ0cmFjdChkaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX2tub2NrYmFja0ZvcmNlIC89IDM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb24uc2NhbGUoX2tub2NrYmFja0ZvcmNlICogKDEgLyBrbm9ja0JhY2tTY2FsaW5nKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbW92ZURpcmVjdGlvbi5hZGQoZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZHVjZUtub2NrYmFjayhfZGlyZWN0aW9uLCBfbW92ZURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX21vdmVEaXJlY3Rpb24uc3VidHJhY3QoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwZGF0ZUNvbGxpZGVyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZVNpbXBsZSgpIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcblxyXG4gICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG5cclxuICAgICAgICAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKCgxIC8gR2FtZS5mcmFtZVJhdGUgKiB0aGlzLnByb3BlcnRpZXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uLmFkZChkaXJlY3Rpb24pXHJcblxyXG4gICAgICAgICAgICB0aGlzLmdldENhbk1vdmVYWSh0aGlzLm1vdmVEaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uLnN1YnRyYWN0KGRpcmVjdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQXdheSgpIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcblxyXG4gICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy50YXJnZXQpO1xyXG4gICAgICAgICAgICBkaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICBkaXJlY3Rpb24uc2NhbGUoKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24uYWRkKGRpcmVjdGlvbilcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q2FuTW92ZVhZKHRoaXMubW92ZURpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24uc3VidHJhY3QoZGlyZWN0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBsaWZlc3BhbihfZ3JhcGg6IEdhbWUuxpIuTm9kZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucmVtb3ZlRW5lbXkodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgX2dyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRDYW5Nb3ZlWFkoX2RpcmVjdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBsZXQgY2FuTW92ZVggPSB0cnVlO1xyXG4gICAgICAgICAgICBsZXQgY2FuTW92ZVkgPSB0cnVlO1xyXG4gICAgICAgICAgICBsZXQgY29sbGlkZXJzOiBHZW5lcmF0aW9uLldhbGxbXSA9ICg8R2VuZXJhdGlvbi5Sb29tPkdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maW5kKGVsZW1lbnQgPT4gKDxHZW5lcmF0aW9uLlJvb20+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuUk9PTSkpLndhbGxzO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXNSZWN0KGVsZW1lbnQuY29sbGlkZXIpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFCZWZvcmVNb3ZlID0gTWF0aC5yb3VuZCgoaW50ZXJzZWN0aW9uLmhlaWdodCAqIGludGVyc2VjdGlvbi53aWR0aCkgKiAxMDAwKSAvIDEwMDA7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBvbGRQb3NpdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIodGhpcy5jb2xsaWRlci5wb3NpdGlvbi54LCB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKF9kaXJlY3Rpb24ueCwgMClcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnRyYW5zZm9ybSjGki5NYXRyaXgzeDMuVFJBTlNMQVRJT04obmV3RGlyZWN0aW9uKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudC5jb2xsaWRlcikgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUFmdGVyTW92ZSA9IE1hdGgucm91bmQoKG5ld0ludGVyc2VjdGlvbi5oZWlnaHQgKiBuZXdJbnRlcnNlY3Rpb24ud2lkdGgpICogMTAwMCkgLyAxMDAwO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKDAsIF9kaXJlY3Rpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBNYXRoLnJvdW5kKChuZXdJbnRlcnNlY3Rpb24uaGVpZ2h0ICogbmV3SW50ZXJzZWN0aW9uLndpZHRoKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5Nb3ZlWSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgYXZhdGFyQ29sbGlkZXJzOiBQbGF5ZXIuUGxheWVyW10gPSA8UGxheWVyLlBsYXllcltdPkdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVuZW15LkVuZW15PmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlBMQVlFUik7XHJcbiAgICAgICAgICAgIGF2YXRhckNvbGxpZGVycy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50LmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUJlZm9yZU1vdmUgPSBNYXRoLnJvdW5kKChpbnRlcnNlY3Rpb24pICogMTAwMCkgLyAxMDAwO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgb2xkUG9zaXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKHRoaXMuY29sbGlkZXIucG9zaXRpb24ueCwgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMihfZGlyZWN0aW9uLngsIDApXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcikgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gTWF0aC5yb3VuZCgobmV3SW50ZXJzZWN0aW9uKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKDAsIF9kaXJlY3Rpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcikgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gTWF0aC5yb3VuZCgobmV3SW50ZXJzZWN0aW9uKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbk1vdmVZID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgaWYgKGNhbk1vdmVYICYmIGNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2FuTW92ZVggJiYgIWNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoX2RpcmVjdGlvbi54LCAwLCBfZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIWNhbk1vdmVYICYmIGNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoMCwgX2RpcmVjdGlvbi55LCBfZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteUR1bWIgZXh0ZW5kcyBFbmVteSB7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRU5FTVlOQU1FLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3RlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfcHJvcGVydGllcywgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZW5lbXlVcGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmVuZW15VXBkYXRlKCk7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZUJlaGF2aW91cigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICBsZXQgdGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGFyZ2V0LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG4gICAgICAgICAgICBpZiAoZGlzdGFuY2UgPiAzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IEJFSEFWSU9VUi5GT0xMT1dcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YXRlID0gQkVIQVZJT1VSLklETEU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCkge1xyXG5cclxuICAgICAgICAgICAgdGhpcy5iZWhhdmlvdXIoKTtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRTdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QW5pbWF0aW9uICE9IEFOSU1BVElPTlNUQVRFUy5JRExFKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbnNbXCJpZGxlXCJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRGcmFtZURpcmVjdGlvbigxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mcmFtZXJhdGUgPSBBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCkud2Fsa0ZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QW5pbWF0aW9uID0gQU5JTUFUSU9OU1RBVEVTLklETEU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW5lbXlTdGF0ZSh0aGlzLmN1cnJlbnRBbmltYXRpb24sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEZyYW1lRGlyZWN0aW9uKDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnJhbWVyYXRlID0gQW5pbWF0aW9uR2VuZXJhdGlvbi5nZXRBbmltYXRpb25CeUlkKHRoaXMuaWQpLndhbGtGcmFtZVJhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEJFSEFWSU9VUi5GT0xMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEFuaW1hdGlvbiAhPSBBTklNQVRJT05TVEFURVMuV0FMSykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25zW1wid2Fsa1wiXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0RnJhbWVEaXJlY3Rpb24oMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZnJhbWVyYXRlID0gQW5pbWF0aW9uR2VuZXJhdGlvbi5nZXRBbmltYXRpb25CeUlkKHRoaXMuaWQpLndhbGtGcmFtZVJhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvbiA9IEFOSU1BVElPTlNUQVRFUy5XQUxLO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVuZW15U3RhdGUodGhpcy5jdXJyZW50QW5pbWF0aW9uLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlU2ltcGxlKClcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIC8vIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgLy8gdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uc1tcImlkbGVcIl0pO1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteVNob290IGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIHdlYXBvbjogV2VhcG9ucy5XZWFwb247XHJcbiAgICAgICAgdmlld1JhZGl1czogbnVtYmVyID0gMztcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IG51bWJlciwgX3Byb3BlcnRpZXM6IFBsYXllci5DaGFyYWN0ZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX3dlYXBvbjogV2VhcG9ucy5XZWFwb24sIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9wcm9wZXJ0aWVzLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMud2VhcG9uID0gX3dlYXBvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGVuZW15VXBkYXRlKCkge1xyXG4gICAgICAgICAgICBzdXBlci5lbmVteVVwZGF0ZSgpO1xyXG4gICAgICAgICAgICB0aGlzLnNob290KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2hvb3QoX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGxldCB0YXJnZXQ6IMaSLlZlY3RvcjMgPSBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKVxyXG4gICAgICAgICAgICBsZXQgX2RpcmVjdGlvbiA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0YXJnZXQsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICBpZiAodGhpcy53ZWFwb24uY3VycmVudEF0dGFja0NvdW50ID4gMCAmJiBfZGlyZWN0aW9uLm1hZ25pdHVkZSA8IHRoaXMudmlld1JhZGl1cykge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgICAgIGxldCBidWxsZXQ6IEJ1bGxldHMuQnVsbGV0ID0gbmV3IEJ1bGxldHMuSG9taW5nQnVsbGV0KG5ldyDGki5WZWN0b3IyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpLCBfZGlyZWN0aW9uLCBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKSwgdGhpcywgX25ldElkKTtcclxuICAgICAgICAgICAgICAgIGJ1bGxldC5vd25lciA9IHRoaXMudGFnO1xyXG4gICAgICAgICAgICAgICAgYnVsbGV0LmZseURpcmVjdGlvbi5zY2FsZSgxIC8gR2FtZS5mcmFtZVJhdGUgKiBidWxsZXQuc3BlZWQpO1xyXG4gICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChidWxsZXQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25CdWxsZXRBdEVuZW15KGJ1bGxldC5uZXRJZCwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53ZWFwb24uY3VycmVudEF0dGFja0NvdW50LS07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgLy8gZXhwb3J0IGNsYXNzIEVuZW15Q2lyY2xlIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgLy8gICAgIGRpc3RhbmNlOiBudW1iZXIgPSA1O1xyXG5cclxuICAgIC8vICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3RlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyKSB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyKF9uYW1lLCBfcHJvcGVydGllcywgX3Bvc2l0aW9uKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIG1vdmUoKTogdm9pZCB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyLm1vdmUoKTtcclxuICAgIC8vICAgICAgICAgdGhpcy5tb3ZlQ2lyY2xlKCk7XHJcbiAgICAvLyAgICAgfVxyXG5cclxuICAgIC8vICAgICBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpOiB2b2lkIHtcclxuICAgIC8vICAgICAgICAgc3VwZXIubGlmZXNwYW4oX2dyYXBoKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIGFzeW5jIG1vdmVDaXJjbGUoKSB7XHJcbiAgICAvLyAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnRhcmdldCk7XHJcbiAgICAvLyAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjEgPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgIC8vICAgICAgICAgLy8gbGV0IGRpc3RhbmNlUGxheWVyMiA9IHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKEdhbWUucGxheWVyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICBpZiAoZGlzdGFuY2VQbGF5ZXIxID4gdGhpcy5kaXN0YW5jZSkge1xyXG4gICAgLy8gICAgICAgICAgICAgdGhpcy5tb3ZlU2ltcGxlKCk7XHJcbiAgICAvLyAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgZWxzZSB7XHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgZGVncmVlID0gQ2FsY3VsYXRpb24uY2FsY0RlZ3JlZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy50YXJnZXQpXHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgYWRkID0gMDtcclxuXHJcbiAgICAvLyAgICAgICAgICAgICAvLyB3aGlsZSAoZGlzdGFuY2VQbGF5ZXIxIDw9IHRoaXMuZGlzdGFuY2UpIHtcclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgSW5wdXRTeXN0ZW0uY2FsY1Bvc2l0aW9uRnJvbURlZ3JlZShkZWdyZWUgKyBhZGQsIHRoaXMuZGlzdGFuY2UpLnRvVmVjdG9yMygwKSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBkaXJlY3Rpb24uc2NhbGUoKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKGRpcmVjdGlvbiwgdHJ1ZSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgYWRkICs9IDU7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyB9XHJcblxyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgfVxyXG4gICAgLy8gfVxyXG59IiwibmFtZXNwYWNlIEl0ZW1zIHtcclxuICAgIGV4cG9ydCBlbnVtIElURU1UWVBFIHtcclxuICAgICAgICBBREQsXHJcbiAgICAgICAgU1VCU1RSQUNULFxyXG4gICAgICAgIFBST0NFTlRVQUxcclxuICAgIH1cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBJdGVtIGV4dGVuZHMgR2FtZS7GkkFpZC5Ob2RlU3ByaXRlIGltcGxlbWVudHMgSW50ZXJmYWNlcy5JU3Bhd25hYmxlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5JVEVNO1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyID0gTmV0d29ya2luZy5pZEdlbmVyYXRvcigpO1xyXG4gICAgICAgIHB1YmxpYyBkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBpbWdTcmM6IHN0cmluZztcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlO1xyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9kZXNjcmlwdGlvbjogc3RyaW5nLCBfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9pbWdTcmM/OiBzdHJpbmcsIF9saWZldGltZT86IG51bWJlciwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfbmV0SWQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5jdXJyZW50SURzLnB1c2goX25ldElkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV0SWQgPSBfbmV0SWQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuZGVzY3JpcHRpb24gPSBfZGVzY3JpcHRpb247XHJcbiAgICAgICAgICAgIHRoaXMuaW1nU3JjID0gX2ltZ1NyYztcclxuICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IF9saWZldGltZTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9wb3NpdGlvbik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbGlmZXNwYW4oX2dyYXBoOiDGki5Ob2RlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lID49IDAgJiYgdGhpcy5saWZldGltZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lLS07XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBfZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnJlbW92ZUl0ZW0odGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIGNvbGxpc2lvbkRldGVjdGlvbigpIHtcclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyczogYW55W10gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxFbmVteS5FbmVteT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5QTEFZRVIpO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5wcm9wZXJ0aWVzICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuYWRkQXR0cmlidWVzQnlJdGVtKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkucHJvcGVydGllcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBJbnRlcm5hbEl0ZW0gZXh0ZW5kcyBJdGVtIHtcclxuICAgICAgICBwdWJsaWMgYXR0cmlidXRlczogUGxheWVyLkF0dHJpYnV0ZXM7XHJcbiAgICAgICAgcHVibGljIHR5cGU6IElURU1UWVBFO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENyZWF0ZXMgYW4gaXRlbSB0aGF0IGNhbiBjaGFuZ2UgQXR0cmlidXRlcyBvZiB0aGUgcGxheWVyXHJcbiAgICAgICAgICogQHBhcmFtIF9uYW1lIG5hbWUgb2YgdGhlIEl0ZW1cclxuICAgICAgICAgKiBAcGFyYW0gX2Rlc2NyaXB0aW9uIERlc2NpcnB0aW9uIG9mIHRoZSBpdGVtXHJcbiAgICAgICAgICogQHBhcmFtIF9wb3NpdGlvbiBQb3NpdGlvbiB3aGVyZSB0byBzcGF3blxyXG4gICAgICAgICAqIEBwYXJhbSBfbGlmZXRpbWUgb3B0aW9uYWw6IGhvdyBsb25nIGlzIHRoZSBpdGVtIHZpc2libGVcclxuICAgICAgICAgKiBAcGFyYW0gX2F0dHJpYnV0ZXMgZGVmaW5lIHdoaWNoIGF0dHJpYnV0ZXMgd2lsbCBjaGFuZ2UsIGNvbXBhcmUgd2l0aCB7QGxpbmsgUGxheWVyLkF0dHJpYnV0ZXN9XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX2Rlc2NyaXB0aW9uOiBzdHJpbmcsIF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2F0dHJpYnV0ZXM6IFBsYXllci5BdHRyaWJ1dGVzLCBfdHlwZTogSVRFTVRZUEUsIF9pbWdTcmM/OiBzdHJpbmcsIF9saWZldGltZT86IG51bWJlciwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lLCBfZGVzY3JpcHRpb24sIF9wb3NpdGlvbiwgX2ltZ1NyYywgX2xpZmV0aW1lLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSBfYXR0cmlidXRlcztcclxuICAgICAgICAgICAgdGhpcy50eXBlID0gX3R5cGU7XHJcblxyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduSXRlbSh0aGlzLm5hbWUsIHRoaXMuZGVzY3JpcHRpb24sIF9wb3NpdGlvbiwgdGhpcy5pbWdTcmMsIHRoaXMubGlmZXRpbWUsIHRoaXMubmV0SWQsIHRoaXMuYXR0cmlidXRlcywgdGhpcy50eXBlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIGNvbGxpc2lvbkRldGVjdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyczogYW55W10gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxFbmVteS5FbmVteT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5QTEFZRVIpO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5wcm9wZXJ0aWVzICE9IHVuZGVmaW5lZCAmJiAodGhpcy5saWZldGltZSA+IDAgfHwgdGhpcy5saWZldGltZSA9PSB1bmRlZmluZWQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLnByb3BlcnRpZXMuYXR0cmlidXRlcy5hZGRBdHRyaWJ1ZXNCeUl0ZW0odGhpcy5hdHRyaWJ1dGVzLCB0aGlzLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyQXR0cmlidXRlcyh0aGlzLmF0dHJpYnV0ZXMsIHRoaXMudHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coKDxFbmVteS5FbmVteT5lbGVtZW50KS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQW5pbWF0aW9uR2VuZXJhdGlvbiB7XHJcbiAgICBleHBvcnQgbGV0IHR4dFJlZFRpY2tJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFJlZFRpY2tXYWxrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRCYXRJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG4gICAgY2xhc3MgTXlBbmltYXRpb25DbGFzcyB7XHJcbiAgICAgICAgcHVibGljIGlkOiBFbmVteS5FTkVNWU5BTUU7XHJcbiAgICAgICAgcHVibGljIHNwcml0ZVNoZWV0SWRsZTogxpIuQ29hdFRleHR1cmVkO1xyXG4gICAgICAgIHB1YmxpYyBzcHJpdGVTaGVldFdhbGs6IMaSLkNvYXRUZXh0dXJlZDtcclxuICAgICAgICBpZGxlTnVtYmVyT2ZGcmFtZXM6IG51bWJlcjtcclxuICAgICAgICB3YWxrTnVtYmVyT2ZGcmFtZXM6IG51bWJlcjtcclxuICAgICAgICBpZGxlRnJhbWVSYXRlOiBudW1iZXI7XHJcbiAgICAgICAgd2Fsa0ZyYW1lUmF0ZTogbnVtYmVyO1xyXG5cclxuICAgICAgICBjbHJXaGl0ZTogxpIuQ29sb3IgPSDGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKTtcclxuICAgICAgICBhbmltYXRpb25zOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbnMgPSB7fTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbmVteS5FTkVNWU5BTUUsXHJcbiAgICAgICAgICAgIF90eHRJZGxlOiDGki5UZXh0dXJlSW1hZ2UsXHJcbiAgICAgICAgICAgIF9pZGxlTnVtYmVyT2ZGcmFtZXM6IG51bWJlcixcclxuICAgICAgICAgICAgX2lkbGVGcmFtZVJhdGU6IG51bWJlcixcclxuICAgICAgICAgICAgX3R4dFdhbGs/OiDGki5UZXh0dXJlSW1hZ2UsXHJcbiAgICAgICAgICAgIF93YWxrTnVtYmVyT2ZGcmFtZXM/OiBudW1iZXIsXHJcbiAgICAgICAgICAgIF93YWxrRnJhbWVSYXRlPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlU2hlZXRJZGxlID0gbmV3IMaSLkNvYXRUZXh0dXJlZCh0aGlzLmNscldoaXRlLCBfdHh0SWRsZSk7XHJcbiAgICAgICAgICAgIHRoaXMuaWRsZUZyYW1lUmF0ZSA9IF9pZGxlRnJhbWVSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLmlkbGVOdW1iZXJPZkZyYW1lcyA9IF9pZGxlTnVtYmVyT2ZGcmFtZXM7XHJcbiAgICAgICAgICAgIGlmIChfdHh0V2FsayAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3ByaXRlU2hlZXRXYWxrID0gbmV3IMaSLkNvYXRUZXh0dXJlZCh0aGlzLmNscldoaXRlLCBfdHh0V2Fsayk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndhbGtGcmFtZVJhdGUgPSBfd2Fsa0ZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMud2Fsa051bWJlck9mRnJhbWVzID0gX3dhbGtOdW1iZXJPZkZyYW1lcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3ByaXRlU2hlZXRXYWxrID0gbmV3IMaSLkNvYXRUZXh0dXJlZCh0aGlzLmNscldoaXRlLCBfdHh0SWRsZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndhbGtGcmFtZVJhdGUgPSBfaWRsZUZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMud2Fsa051bWJlck9mRnJhbWVzID0gX2lkbGVOdW1iZXJPZkZyYW1lcztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCBzaGVldEFycmF5OiBNeUFuaW1hdGlvbkNsYXNzW10gPSBbXTtcclxuICAgIC8vI3JlZ2lvbiBhbmltYXRpb25cclxuXHJcbiAgICBsZXQgYmF0QW5pbWF0aW9uOiBNeUFuaW1hdGlvbkNsYXNzID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW5lbXkuRU5FTVlOQU1FLkJBVCwgdHh0QmF0SWRsZSwgNCwgMTIpO1xyXG4gICAgbGV0IHJlZFRpY2tBbmltYXRpb246IE15QW5pbWF0aW9uQ2xhc3MgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbmVteS5FTkVNWU5BTUUuUkVEVElDSywgdHh0UmVkVGlja0lkbGUsIDYsIDEyLCB0eHRSZWRUaWNrV2FsaywgNCwgMTIpO1xyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRBbmltYXRpb25CeUlkKF9pZDogRW5lbXkuRU5FTVlOQU1FKTogTXlBbmltYXRpb25DbGFzcyB7XHJcbiAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWU5BTUUuQkFUOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJhdEFuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWU5BTUUuUkVEVElDSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiByZWRUaWNrQW5pbWF0aW9uO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlQWxsQW5pbWF0aW9ucygpIHtcclxuICAgICAgICBzaGVldEFycmF5LnB1c2goYmF0QW5pbWF0aW9uLCByZWRUaWNrQW5pbWF0aW9uKTtcclxuXHJcbiAgICAgICAgc2hlZXRBcnJheS5mb3JFYWNoKG9iaiA9PiB7XHJcbiAgICAgICAgICAgIGxldCBpZGxlV2lkdGg6IG51bWJlciA9IG9iai5zcHJpdGVTaGVldElkbGUudGV4dHVyZS50ZXhJbWFnZVNvdXJjZS53aWR0aCAvIG9iai5pZGxlTnVtYmVyT2ZGcmFtZXM7XHJcbiAgICAgICAgICAgIGxldCBpZGxlSGVpZ3RoOiBudW1iZXIgPSBvYmouc3ByaXRlU2hlZXRJZGxlLnRleHR1cmUudGV4SW1hZ2VTb3VyY2UuaGVpZ2h0O1xyXG4gICAgICAgICAgICBsZXQgd2Fsa1dpZHRoOiBudW1iZXIgPSBvYmouc3ByaXRlU2hlZXRXYWxrLnRleHR1cmUudGV4SW1hZ2VTb3VyY2Uud2lkdGggLyBvYmoud2Fsa051bWJlck9mRnJhbWVzO1xyXG4gICAgICAgICAgICBsZXQgd2Fsa0hlaWd0aDogbnVtYmVyID0gb2JqLnNwcml0ZVNoZWV0V2Fsay50ZXh0dXJlLnRleEltYWdlU291cmNlLmhlaWdodDtcclxuICAgICAgICAgICAgZ2VuZXJhdGVBbmltYXRpb25Gcm9tR3JpZChvYmouc3ByaXRlU2hlZXRJZGxlLCBvYmouYW5pbWF0aW9ucywgXCJpZGxlXCIsIGlkbGVXaWR0aCwgaWRsZUhlaWd0aCwgb2JqLmlkbGVOdW1iZXJPZkZyYW1lcywgb2JqLmlkbGVGcmFtZVJhdGUsIDIyKTtcclxuICAgICAgICAgICAgZ2VuZXJhdGVBbmltYXRpb25Gcm9tR3JpZChvYmouc3ByaXRlU2hlZXRXYWxrLCBvYmouYW5pbWF0aW9ucywgXCJ3YWxrXCIsIHdhbGtXaWR0aCwgd2Fsa0hlaWd0aCwgb2JqLndhbGtOdW1iZXJPZkZyYW1lcywgb2JqLndhbGtGcmFtZVJhdGUsIDIyKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cob2JqLnNwcml0ZVNoZWV0SWRsZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG9iai5zcHJpdGVTaGVldFdhbGspO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVBbmltYXRpb25Gcm9tR3JpZChfc3ByaXRlc2hlZXQ6IMaSLkNvYXRUZXh0dXJlZCwgX2FuaW1hdGlvbnNoZWV0OiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbnMsIF9hbmltYXRpb25OYW1lOiBzdHJpbmcsIF93aWR0aDogbnVtYmVyLCBfaGVpZ2h0OiBudW1iZXIsIF9udW1iZXJPZkZyYW1lczogbnVtYmVyLCBfZnJhbWVSYXRlOiBudW1iZXIsIF9yZXNvbHV0aW9uOiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgbmFtZSA9IF9hbmltYXRpb25OYW1lO1xyXG4gICAgICAgIGxldCBjcmVhdGVkQW5pbWF0aW9uOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbiA9IG5ldyDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbihuYW1lLCBfc3ByaXRlc2hlZXQpO1xyXG4gICAgICAgIGNyZWF0ZWRBbmltYXRpb24uZ2VuZXJhdGVCeUdyaWQoxpIuUmVjdGFuZ2xlLkdFVCgwLCAwLCBfd2lkdGgsIF9oZWlnaHQpLCBfbnVtYmVyT2ZGcmFtZXMsIDMyLCDGki5PUklHSU4yRC5DRU5URVIsIMaSLlZlY3RvcjIuWChfd2lkdGgpKTtcclxuICAgICAgICBfYW5pbWF0aW9uc2hlZXRbbmFtZV0gPSBjcmVhdGVkQW5pbWF0aW9uO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKG5hbWUgKyBcIjogXCIgKyBfYW5pbWF0aW9uc2hlZXRbbmFtZV0pO1xyXG4gICAgfVxyXG59XHJcblxyXG4iLCJuYW1lc3BhY2UgUGxheWVyIHtcclxuICAgIGV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVzIHtcclxuXHJcbiAgICAgICAgcHVibGljIGhlYWx0aFBvaW50czogbnVtYmVyO1xyXG4gICAgICAgIG1heEhlYWx0aFBvaW50czogbnVtYmVyO1xyXG4gICAgICAgIGtub2NrYmFja0ZvcmNlOiBudW1iZXIgPSA2O1xyXG4gICAgICAgIHB1YmxpYyBzcGVlZDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBhdHRhY2tQb2ludHM6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgY29vbERvd25SZWR1Y3Rpb246IG51bWJlciA9IDE7XHJcbiAgICAgICAgcHVibGljIHNjYWxlOiBudW1iZXI7XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaGVhbHRoUG9pbnRzOiBudW1iZXIsIF9hdHRhY2tQb2ludHM6IG51bWJlciwgX3NwZWVkOiBudW1iZXIsIF9zY2FsZTogbnVtYmVyLCBfY29vbGRvd25SZWR1Y3Rpb24/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5zY2FsZSA9IF9zY2FsZTtcclxuICAgICAgICAgICAgdGhpcy5oZWFsdGhQb2ludHMgPSBfaGVhbHRoUG9pbnRzICogdGhpcy5zY2FsZTtcclxuICAgICAgICAgICAgdGhpcy5tYXhIZWFsdGhQb2ludHMgPSB0aGlzLmhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgdGhpcy5hdHRhY2tQb2ludHMgPSBfYXR0YWNrUG9pbnRzICogdGhpcy5zY2FsZTtcclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IF9zcGVlZCAvIHRoaXMuc2NhbGU7XHJcbiAgICAgICAgICAgIGlmIChfY29vbGRvd25SZWR1Y3Rpb24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvb2xEb3duUmVkdWN0aW9uID0gX2Nvb2xkb3duUmVkdWN0aW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBhZGRzIEF0dHJpYnV0ZXMgdG8gdGhlIFBsYXllciBBdHRyaWJ1dGVzXHJcbiAgICAgICAgICogQHBhcmFtIF9hdHRyaWJ1dGVzIGluY29taW5nIGF0dHJpYnV0ZXNcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgYWRkQXR0cmlidWVzQnlJdGVtKF9hdHRyaWJ1dGVzOiBQbGF5ZXIuQXR0cmlidXRlcywgX2l0ZW1UeXBlOiBJdGVtcy5JVEVNVFlQRSk6IHZvaWQge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKF9pdGVtVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5JVEVNVFlQRS5BREQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oZWFsdGhQb2ludHMgKz0gX2F0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWF4SGVhbHRoUG9pbnRzICs9IF9hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNwZWVkICs9IF9hdHRyaWJ1dGVzLnNwZWVkO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNrUG9pbnRzICs9IF9hdHRyaWJ1dGVzLmF0dGFja1BvaW50cztcclxuICAgICAgICAgICAgICAgICAgICBicmVhazsgLy8gY2FsY3VsYXRlIGF0dHJpYnV0ZXMgYnkgYWRkaW5nIHRoZW1cclxuICAgICAgICAgICAgICAgIGNhc2UgSXRlbXMuSVRFTVRZUEUuU1VCU1RSQUNUOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGVhbHRoUG9pbnRzIC09IF9hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1heEhlYWx0aFBvaW50cyAtPSBfYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZCAtPSBfYXR0cmlidXRlcy5zcGVlZDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmF0dGFja1BvaW50cyAtPSBfYXR0cmlidXRlcy5hdHRhY2tQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7IC8vIGNhbGN1bGF0ZSBhdHRyaWJlcyBieSBzdWJzdGFjdGluZyB0aGVtXHJcbiAgICAgICAgICAgICAgICBjYXNlIEl0ZW1zLklURU1UWVBFLlBST0NFTlRVQUw6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oZWFsdGhQb2ludHMgPSB0aGlzLmhlYWx0aFBvaW50cyAqICgoMTAwICsgX2F0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzKSAvIDEwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdHRhY2tQb2ludHMgPSB0aGlzLmF0dGFja1BvaW50cyAqICgoMTAwICsgX2F0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzKSAvIDEwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGVlZCA9IHRoaXMuc3BlZWQgKiAoKDEwMCArIF9hdHRyaWJ1dGVzLnNwZWVkKSAvIDEwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5jb29sRG93blJlZHVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb29sRG93blJlZHVjdGlvbiA9IHRoaXMuY29vbERvd25SZWR1Y3Rpb24gKiBNYXRoLmZyb3VuZCgoMTAwIC8gKDEwMCArIF9hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uKSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuY29vbERvd25SZWR1Y3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrOyAvLyBjYWxjdWxhdGUgYXR0cmlidXRlcyBieSBnaXZpbmcgc3BlZmljICVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBCdWxsZXRzIHtcclxuXHJcbiAgICBleHBvcnQgbGV0IGJ1bGxldFR4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCdWxsZXQgZXh0ZW5kcyBHYW1lLsaSLk5vZGUgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklTcGF3bmFibGUge1xyXG4gICAgICAgIG93bmVyOiBUYWcuVEFHID0gVGFnLlRBRy5QTEFZRVI7XHJcbiAgICAgICAgcHVibGljIG5ldElkOiBudW1iZXIgPSBOZXR3b3JraW5nLmlkR2VuZXJhdG9yKCk7XHJcbiAgICAgICAgcHVibGljIHRpY2s6IG51bWJlciA9IDA7XHJcbiAgICAgICAgcHVibGljIHBvc2l0aW9uczogxpIuVmVjdG9yM1tdID0gW107XHJcbiAgICAgICAgcHVibGljIGhvc3RQb3NpdGlvbnM6IMaSLlZlY3RvcjNbXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLkJVTExFVDtcclxuICAgICAgICBwdWJsaWMgZmx5RGlyZWN0aW9uOiDGki5WZWN0b3IzO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7XHJcblxyXG4gICAgICAgIHB1YmxpYyBoaXRQb2ludHM6IG51bWJlciA9IDU7XHJcbiAgICAgICAgcHVibGljIHNwZWVkOiBudW1iZXIgPSAyMDtcclxuICAgICAgICBsaWZldGltZTogbnVtYmVyID0gMSAqIEdhbWUuZnJhbWVSYXRlO1xyXG5cclxuICAgICAgICB0aW1lOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIGtpbGxjb3VudDogbnVtYmVyID0gMTtcclxuXHJcbiAgICAgICAgYXZhdGFyOiBHYW1lLsaSQWlkLk5vZGVTcHJpdGU7XHJcblxyXG4gICAgICAgIGFzeW5jIGxpZmVzcGFuKF9ncmFwaDogxpIuTm9kZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA+PSAwICYmIHRoaXMubGlmZXRpbWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saWZldGltZS0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2dyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucG9wSUQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5yZW1vdmVCdWxsZXQodGhpcy5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuaG9zdFBvc2l0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2codGhpcy5wb3NpdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9hdmF0YXI6IEdhbWUuxpJBaWQuTm9kZVNwcml0ZSwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwibm9ybWFsQnVsbGV0XCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hdmF0YXIgPSBfYXZhdGFyO1xyXG5cclxuICAgICAgICAgICAgaWYgKF9uZXRJZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucG9wSUQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLmN1cnJlbnRJRHMucHVzaChfbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudExpZ2h0KG5ldyDGki5MaWdodFBvaW50KMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgMCk7XHJcbiAgICAgICAgICAgIGxldCBtZXNoOiDGki5NZXNoUXVhZCA9IG5ldyDGki5NZXNoUXVhZCgpO1xyXG4gICAgICAgICAgICBsZXQgY21wTWVzaDogxpIuQ29tcG9uZW50TWVzaCA9IG5ldyDGki5Db21wb25lbnRNZXNoKG1lc2gpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChjbXBNZXNoKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBtdHJTb2xpZFdoaXRlOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIlNvbGlkV2hpdGVcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIikpKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1hdGVyaWFsOiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChtdHJTb2xpZFdoaXRlKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG5ld1Bvc2l0aW9uID0gbmV3IMaSLlZlY3RvcjIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCArIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKG5ld1Bvc2l0aW9uLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnkgLyAxLjUpO1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVJvdGF0aW9uKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZmx5RGlyZWN0aW9uID0gxpIuVmVjdG9yMy5YKCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgYXN5bmMgbW92ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKHRoaXMuZmx5RGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5idWxsZXRQcmVkaWN0aW9uKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlzaW9uRGV0ZWN0aW9uKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGRhdGVSb3RhdGlvbihfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwucm90YXRlWihDYWxjdWxhdGlvbi5jYWxjRGVncmVlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCDGki5WZWN0b3IzLlNVTShfZGlyZWN0aW9uLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikpICsgOTApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYnVsbGV0UHJlZGljdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy50aW1lICs9IEdhbWUuxpIuTG9vcC50aW1lRnJhbWVHYW1lO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMudGltZSA+PSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBvc2l0aW9ucy5wdXNoKG5ldyDGki5WZWN0b3IzKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnopKTtcclxuICAgICAgICAgICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQnVsbGV0KHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLm5ldElkLCB0aGlzLnRpY2spO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy50aWNrKys7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWUgLT0gMTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGljayA+PSAxICYmIHRoaXMuaG9zdFBvc2l0aW9uc1t0aGlzLnRpY2sgLSAxXSAhPSB1bmRlZmluZWQgJiYgdGhpcy5wb3NpdGlvbnNbdGhpcy50aWNrIC0gMV0gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaG9zdFBvc2l0aW9uc1t0aGlzLnRpY2sgLSAxXS54ICE9IHRoaXMucG9zaXRpb25zW3RoaXMudGljayAtIDFdLnggfHwgdGhpcy5ob3N0UG9zaXRpb25zW3RoaXMudGljayAtIDFdLnkgIT0gdGhpcy5wb3NpdGlvbnNbdGhpcy50aWNrIC0gMV0ueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvcnJlY3RQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgY29ycmVjdFBvc2l0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5ob3N0UG9zaXRpb25zW3RoaXMudGlja10gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHRoaXMuaG9zdFBvc2l0aW9uc1t0aGlzLnRpY2tdO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7IHRoaXMuY29ycmVjdFBvc2l0aW9uIH0sIDEwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxvYWRUZXh0dXJlKCkge1xyXG4gICAgICAgICAgICBsZXQgbmV3VHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICAgICAgICAgIGxldCBuZXdDb2F0OiDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQgPSBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKCk7XHJcbiAgICAgICAgICAgIGxldCBuZXdNdHI6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibXRyXCIsIMaSLlNoYWRlckZsYXRUZXh0dXJlZCwgbmV3Q29hdCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgb2xkQ29tQ29hdDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuXHJcbiAgICAgICAgICAgIG9sZENvbUNvYXQgPSB0aGlzLmdldENvbXBvbmVudCjGki5Db21wb25lbnRNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICBuZXdUeHQgPSBidWxsZXRUeHQ7XHJcbiAgICAgICAgICAgIG5ld0NvYXQuY29sb3IgPSDGki5Db2xvci5DU1MoXCJXSElURVwiKTtcclxuICAgICAgICAgICAgbmV3Q29hdC50ZXh0dXJlID0gbmV3VHh0O1xyXG4gICAgICAgICAgICBvbGRDb21Db2F0Lm1hdGVyaWFsID0gbmV3TXRyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgY29sbGlzaW9uRGV0ZWN0aW9uKCkge1xyXG4gICAgICAgICAgICBsZXQgbmV3UG9zaXRpb24gPSBuZXcgxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBuZXdQb3NpdGlvbjtcclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyczogYW55W10gPSBbXTtcclxuICAgICAgICAgICAgaWYgKHRoaXMub3duZXIgPT0gVGFnLlRBRy5QTEFZRVIpIHtcclxuICAgICAgICAgICAgICAgIGNvbGxpZGVycyA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVuZW15LkVuZW15PmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLkVORU1ZKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5wcm9wZXJ0aWVzICE9IHVuZGVmaW5lZCAmJiB0aGlzLmtpbGxjb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoKDxFbmVteS5FbmVteT5lbGVtZW50KS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPEVuZW15LkVuZW15PmVsZW1lbnQpLnByb3BlcnRpZXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLT0gdGhpcy5oaXRQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj50aGlzLmF2YXRhcikuZG9Lbm9ja2JhY2soZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IFVJLkRhbWFnZVVJKCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLmhpdFBvaW50cykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5raWxsY291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm93bmVyID09IFRhZy5UQUcuRU5FTVkpIHtcclxuICAgICAgICAgICAgICAgIGNvbGxpZGVycyA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuUExBWUVSKTtcclxuICAgICAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5wcm9wZXJ0aWVzICE9IHVuZGVmaW5lZCAmJiB0aGlzLmtpbGxjb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzID4gMCAmJiAoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkuaGl0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLnByb3BlcnRpZXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLT0gdGhpcy5oaXRQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPEVuZW15LkVuZW15PnRoaXMuYXZhdGFyKS5kb0tub2NrYmFjayhlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IFVJLkRhbWFnZVVJKCg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMuaGl0UG9pbnRzKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMua2lsbGNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb2xsaWRlcnMgPSBbXTtcclxuICAgICAgICAgICAgY29sbGlkZXJzID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbWVudCA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5ST09NKSkud2FsbHM7XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlc1JlY3QoZWxlbWVudC5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFNsb3dCdWxsZXQgZXh0ZW5kcyBCdWxsZXQge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX2F2YXRhcjogR2FtZS7GkkFpZC5Ob2RlU3ByaXRlLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX3Bvc2l0aW9uLCBfZGlyZWN0aW9uLCBfYXZhdGFyLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gNjtcclxuICAgICAgICAgICAgdGhpcy5oaXRQb2ludHMgPSAxMDtcclxuICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDUgKiBHYW1lLmZyYW1lUmF0ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIE1lbGVlQnVsbGV0IGV4dGVuZHMgQnVsbGV0IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9hdmF0YXI6IEdhbWUuxpJBaWQuTm9kZVNwcml0ZSwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9wb3NpdGlvbiwgX2RpcmVjdGlvbiwgX2F2YXRhciwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IDY7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0UG9pbnRzID0gMTA7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSA2O1xyXG4gICAgICAgICAgICB0aGlzLmtpbGxjb3VudCA9IDQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBsb2FkVGV4dHVyZSgpIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBIb21pbmdCdWxsZXQgZXh0ZW5kcyBCdWxsZXQge1xyXG4gICAgICAgIHRhcmdldDogxpIuVmVjdG9yMyA9IG5ldyDGki5WZWN0b3IzKDAsIDAsIDApO1xyXG4gICAgICAgIHJvdGF0ZVNwZWVkOiBudW1iZXIgPSAzO1xyXG4gICAgICAgIHRhcmdldERpcmVjdGlvbjogxpIuVmVjdG9yMztcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfdGFyZ2V0OiDGki5WZWN0b3IzLCBfYXZhdGFyOiBHYW1lLsaSQWlkLk5vZGVTcHJpdGUsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfcG9zaXRpb24sIF9kaXJlY3Rpb24sIF9hdmF0YXIsIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSAyMDtcclxuICAgICAgICAgICAgdGhpcy5oaXRQb2ludHMgPSA1O1xyXG4gICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMSAqIEdhbWUuZnJhbWVSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLmtpbGxjb3VudCA9IDE7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gX3RhcmdldDtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXREaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhc3luYyBtb3ZlKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZUhvbWluZygpO1xyXG4gICAgICAgICAgICBzdXBlci5tb3ZlKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhbGN1bGF0ZUhvbWluZygpIHtcclxuICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldCwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGlmIChuZXdEaXJlY3Rpb24ueCAhPSAwICYmIG5ld0RpcmVjdGlvbi55ICE9IDApIHtcclxuICAgICAgICAgICAgICAgIG5ld0RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgcm90YXRlQW1vdW50MjogbnVtYmVyID0gxpIuVmVjdG9yMy5DUk9TUyhuZXdEaXJlY3Rpb24sIHRoaXMudGFyZ2V0RGlyZWN0aW9uKS56O1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnJvdGF0ZVooLXJvdGF0ZUFtb3VudDIgKiB0aGlzLnJvdGF0ZVNwZWVkKTtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXREaXJlY3Rpb24gPSBDYWxjdWxhdGlvbi5nZXRSb3RhdGVkVmVjdG9yQnlBbmdsZTJEKHRoaXMudGFyZ2V0RGlyZWN0aW9uLCAtcm90YXRlQW1vdW50MiAqIHRoaXMucm90YXRlU3BlZWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBQbGF5ZXIge1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBDaGFyYWN0ZXIge1xyXG4gICAgICAgIHB1YmxpYyBuYW1lOiBzdHJpbmc7XHJcbiAgICAgICAgcHVibGljIGF0dHJpYnV0ZXM6IEF0dHJpYnV0ZXM7XHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9hdHRyaWJ1dGVzOiBBdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IF9uYW1lO1xyXG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSBfYXR0cmlidXRlcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQ29sbGlkZXIge1xyXG4gICAgZXhwb3J0IGNsYXNzIENvbGxpZGVyIHtcclxuICAgICAgICByYWRpdXM6IG51bWJlcjtcclxuICAgICAgICBwb3NpdGlvbjogxpIuVmVjdG9yMjtcclxuICAgICAgICBnZXQgdG9wKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi55IC0gdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgbGVmdCgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueCAtIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IHJpZ2h0KCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi54ICsgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgYm90dG9tKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi55ICsgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfcmFkaXVzOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IF9wb3NpdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5yYWRpdXMgPSBfcmFkaXVzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29sbGlkZXMoX2NvbGxpZGVyOiBDb2xsaWRlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2U6IMaSLlZlY3RvcjIgPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5wb3NpdGlvbiwgX2NvbGxpZGVyLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMucmFkaXVzICsgX2NvbGxpZGVyLnJhZGl1cyA+IGRpc3RhbmNlLm1hZ25pdHVkZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29sbGlkZXNSZWN0KF9jb2xsaWRlcjogR2FtZS7Gki5SZWN0YW5nbGUpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGVmdCA+IF9jb2xsaWRlci5yaWdodCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5yaWdodCA8IF9jb2xsaWRlci5sZWZ0KSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRvcCA+IF9jb2xsaWRlci5ib3R0b20pIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYm90dG9tIDwgX2NvbGxpZGVyLnRvcCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEludGVyc2VjdGlvbihfY29sbGlkZXI6IENvbGxpZGVyKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbGxpZGVzKF9jb2xsaWRlcikpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZTogxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvc2l0aW9uLCBfY29sbGlkZXIucG9zaXRpb24pO1xyXG4gICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5yYWRpdXMgKyBfY29sbGlkZXIucmFkaXVzIC0gZGlzdGFuY2UubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGludGVyc2VjdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEludGVyc2VjdGlvblJlY3QoX2NvbGxpZGVyOiDGki5SZWN0YW5nbGUpOiDGki5SZWN0YW5nbGUge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29sbGlkZXNSZWN0KF9jb2xsaWRlcikpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb246IMaSLlJlY3RhbmdsZSA9IG5ldyDGki5SZWN0YW5nbGUoKTtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLnggPSBNYXRoLm1heCh0aGlzLmxlZnQsIF9jb2xsaWRlci5sZWZ0KTtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLnkgPSBNYXRoLm1heCh0aGlzLnRvcCwgX2NvbGxpZGVyLnRvcCk7XHJcbiAgICAgICAgICAgIGludGVyc2VjdGlvbi53aWR0aCA9IE1hdGgubWluKHRoaXMucmlnaHQsIF9jb2xsaWRlci5yaWdodCkgLSBpbnRlcnNlY3Rpb24ueDtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLmhlaWdodCA9IE1hdGgubWluKHRoaXMuYm90dG9tLCBfY29sbGlkZXIuYm90dG9tKSAtIGludGVyc2VjdGlvbi55O1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGludGVyc2VjdGlvbjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXlTcGF3bmVyIHtcclxuICAgIGxldCBzcGF3blRpbWU6IG51bWJlciA9IDEgKiBHYW1lLmZyYW1lUmF0ZTtcclxuICAgIGxldCBjdXJyZW50VGltZTogbnVtYmVyID0gc3Bhd25UaW1lO1xyXG4gICAgbGV0IG1heEVuZW1pZXM6IG51bWJlciA9IDQwO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkVuZW1pZXMoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKEdhbWUuZW5lbWllcy5sZW5ndGggPCBtYXhFbmVtaWVzKSB7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKEdhbWUuZW5lbWllcy5sZW5ndGgpO1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPT0gc3Bhd25UaW1lKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWYgPSBHYW1lLmVuZW1pZXNKU09OLmZpbmQoZWxlbSA9PiBlbGVtLm5hbWUgPT0gXCJ0aWNrXCIpO1xyXG4gICAgICAgICAgICAgICAgLy8gR2FtZS5ncmFwaC5hZGRDaGlsZChuZXcgRW5lbXkuRW5lbXlTaG9vdChFbmVteS5FTkVNWU5BTUUuQkFULCBuZXcgUGxheWVyLkNoYXJhY3RlcihyZWYubmFtZSwgbmV3IFBsYXllci5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCkpLCBuZXcgxpIuVmVjdG9yMigoTWF0aC5yYW5kb20oKSAqIDcgLSAoTWF0aC5yYW5kb20oKSAqIDcpKSAqIDIsIChNYXRoLnJhbmRvbSgpICogNyAtIChNYXRoLnJhbmRvbSgpICogNykgKiAyKSksIG5ldyBXZWFwb25zLldlYXBvbig2MCwgMSkpKTtcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IEVuZW15LkVuZW15RHVtYihFbmVteS5FTkVNWU5BTUUuUkVEVElDSywgbmV3IFBsYXllci5DaGFyYWN0ZXIocmVmLm5hbWUsIG5ldyBQbGF5ZXIuQXR0cmlidXRlcyhyZWYuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgcmVmLmF0dHJpYnV0ZXMuc3BlZWQsIE1hdGgucmFuZG9tKCkgKiAzICsgMC41KSksIG5ldyDGki5WZWN0b3IyKChNYXRoLnJhbmRvbSgpICogNyAtIChNYXRoLnJhbmRvbSgpICogNykpICogMiwgKE1hdGgucmFuZG9tKCkgKiA3IC0gKE1hdGgucmFuZG9tKCkgKiA3KSAqIDIpKSkpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjdXJyZW50VGltZS0tO1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgY3VycmVudFRpbWUgPSBzcGF3blRpbWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlTcGF3bmVzIHtcclxuICAgICAgICBzcGF3blBvc2l0aW9uczogxpIuVmVjdG9yMltdID0gW107XHJcbiAgICAgICAgbnVtYmVyT2ZFTmVtaWVzOiBudW1iZXI7XHJcbiAgICAgICAgc3Bhd25PZmZzZXQ6IG51bWJlciA9IDU7XHJcblxyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Jvb21TaXplOiBudW1iZXIsIF9udW1iZXJPZkVuZW1pZXM6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLm51bWJlck9mRU5lbWllcyA9IF9udW1iZXJPZkVuZW1pZXM7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgZ2V0U3Bhd25Qb3NpdGlvbnMoX3Jvb206IEdlbmVyYXRpb24uUm9vbSk6IMaSLlZlY3RvcjJbXSB7XHJcbiAgICAgICAgICAgIHJldHVybiBbbmV3IMaSLlZlY3RvcjIoMCArIHRoaXMuc3Bhd25PZmZzZXQsIDAgKyB0aGlzLnNwYXduT2Zmc2V0KSwgbmV3IMaSLlZlY3RvcjIoX3Jvb20uZ2V0Um9vbVNpemUoKSAtIHRoaXMuc3Bhd25PZmZzZXQsIF9yb29tLmdldFJvb21TaXplKCkgKyB0aGlzLnNwYXduT2Zmc2V0KV1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIENhbGN1bGF0aW9uIHtcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRDbG9zZXJBdmF0YXJQb3NpdGlvbihfc3RhcnRQb2ludDogxpIuVmVjdG9yMyk6IMaSLlZlY3RvcjMge1xyXG4gICAgICAgIGxldCB0YXJnZXQgPSBHYW1lLmF2YXRhcjE7XHJcblxyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2VQbGF5ZXIxID0gX3N0YXJ0UG9pbnQuZ2V0RGlzdGFuY2UoR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjIgPSBfc3RhcnRQb2ludC5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZVBsYXllcjEgPCBkaXN0YW5jZVBsYXllcjIpIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldCA9IEdhbWUuYXZhdGFyMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldCA9IEdhbWUuYXZhdGFyMjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRhcmdldC5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb247XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjYWxjRGVncmVlKF9jZW50ZXI6IMaSLlZlY3RvcjMsIF90YXJnZXQ6IMaSLlZlY3RvcjMpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCB4RGlzdGFuY2U6IG51bWJlciA9IF90YXJnZXQueCAtIF9jZW50ZXIueDtcclxuICAgICAgICBsZXQgeURpc3RhbmNlOiBudW1iZXIgPSBfdGFyZ2V0LnkgLSBfY2VudGVyLnk7XHJcbiAgICAgICAgbGV0IGRlZ3JlZXM6IG51bWJlciA9IE1hdGguYXRhbjIoeURpc3RhbmNlLCB4RGlzdGFuY2UpICogKDE4MCAvIE1hdGguUEkpIC0gOTA7XHJcbiAgICAgICAgcmV0dXJuIGRlZ3JlZXM7XHJcblxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldFJvdGF0ZWRWZWN0b3JCeUFuZ2xlMkQoX3ZlY3RvclRvUm90YXRlOiDGki5WZWN0b3IzLCBfYW5nbGU6IG51bWJlcik6IMaSLlZlY3RvcjMge1xyXG4gICAgICAgIGxldCBhbmdsZVRvUmFkaWFuOiBudW1iZXIgPSBfYW5nbGUgKiAoTWF0aC5QSSAvIDE4MCk7XHJcblxyXG4gICAgICAgIGxldCBuZXdYID0gX3ZlY3RvclRvUm90YXRlLnggKiBNYXRoLmNvcyhhbmdsZVRvUmFkaWFuKSAtIF92ZWN0b3JUb1JvdGF0ZS55ICogTWF0aC5zaW4oYW5nbGVUb1JhZGlhbik7XHJcbiAgICAgICAgbGV0IG5ld1kgPSBfdmVjdG9yVG9Sb3RhdGUueCAqIE1hdGguc2luKGFuZ2xlVG9SYWRpYW4pICsgX3ZlY3RvclRvUm90YXRlLnkgKiBNYXRoLmNvcyhhbmdsZVRvUmFkaWFuKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyDGki5WZWN0b3IzKG5ld1gsIG5ld1ksIF92ZWN0b3JUb1JvdGF0ZS56KTtcclxuICAgIH1cclxuXHJcblxyXG59IiwibmFtZXNwYWNlIElucHV0U3lzdGVtIHtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBrZXlib2FyZERvd25FdmVudCk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwga2V5Ym9hcmRVcEV2ZW50KTtcclxuICAgIEdhbWUuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgYXR0YWNrKTtcclxuICAgIEdhbWUuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgcm90YXRlVG9Nb3VzZSk7XHJcblxyXG4gICAgLy8jcmVnaW9uIHJvdGF0ZVxyXG4gICAgbGV0IG1vdXNlUG9zaXRpb246IMaSLlZlY3RvcjM7XHJcblxyXG4gICAgZnVuY3Rpb24gcm90YXRlVG9Nb3VzZShfbW91c2VFdmVudDogTW91c2VFdmVudCk6IHZvaWQge1xyXG4gICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBsZXQgcmF5OiDGki5SYXkgPSBHYW1lLnZpZXdwb3J0LmdldFJheUZyb21DbGllbnQobmV3IMaSLlZlY3RvcjIoX21vdXNlRXZlbnQub2Zmc2V0WCwgX21vdXNlRXZlbnQub2Zmc2V0WSkpO1xyXG4gICAgICAgICAgICBtb3VzZVBvc2l0aW9uID0gcmF5LmludGVyc2VjdFBsYW5lKG5ldyDGki5WZWN0b3IzKDAsIDAsIDApLCBuZXcgxpIuVmVjdG9yMygwLCAwLCAxKSk7XHJcbiAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5tdHhMb2NhbC5yb3RhdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIDAsIENhbGN1bGF0aW9uLmNhbGNEZWdyZWUoR2FtZS5hdmF0YXIxLm10eExvY2FsLnRyYW5zbGF0aW9uLCBtb3VzZVBvc2l0aW9uKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2FsY1Bvc2l0aW9uRnJvbURlZ3JlZShfZGVncmVlczogbnVtYmVyLCBfZGlzdGFuY2U6IG51bWJlcik6IMaSLlZlY3RvcjIge1xyXG4gICAgICAgIGxldCBkaXN0YW5jZSA9IDU7XHJcbiAgICAgICAgbGV0IG5ld0RlZyA9IChfZGVncmVlcyAqIE1hdGguUEkpIC8gMTgwO1xyXG4gICAgICAgIGxldCB5ID0gTWF0aC5jb3MobmV3RGVnKTtcclxuICAgICAgICBsZXQgeCA9IE1hdGguc2luKG5ld0RlZykgKiAtMTtcclxuICAgICAgICBsZXQgY29vcmQgPSBuZXcgxpIuVmVjdG9yMih4LCB5KTtcclxuICAgICAgICBjb29yZC5zY2FsZShkaXN0YW5jZSk7XHJcbiAgICAgICAgcmV0dXJuIGNvb3JkO1xyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIG1vdmUgYW5kIGFiaWxpdHlcclxuICAgIGxldCBjb250cm9sbGVyID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KFtcclxuICAgICAgICBbXCJXXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJBXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJTXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJEXCIsIGZhbHNlXVxyXG4gICAgXSk7XHJcblxyXG4gICAgZnVuY3Rpb24ga2V5Ym9hcmREb3duRXZlbnQoX2U6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgaWYgKF9lLmNvZGUudG9VcHBlckNhc2UoKSAhPSBcIlNQQUNFXCIpIHtcclxuICAgICAgICAgICAgICAgIGxldCBrZXk6IHN0cmluZyA9IF9lLmNvZGUudG9VcHBlckNhc2UoKS5zdWJzdHJpbmcoMyk7XHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyLnNldChrZXksIHRydWUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy9EbyBhYmlsdHkgZnJvbSBwbGF5ZXJcclxuICAgICAgICAgICAgICAgIGFiaWxpdHkoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBrZXlib2FyZFVwRXZlbnQoX2U6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgbGV0IGtleTogc3RyaW5nID0gX2UuY29kZS50b1VwcGVyQ2FzZSgpLnN1YnN0cmluZygzKTtcclxuICAgICAgICAgICAgY29udHJvbGxlci5zZXQoa2V5LCBmYWxzZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBtb3ZlKCkge1xyXG4gICAgICAgIGxldCBtb3ZlVmVjdG9yOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgIGxldCBoYXNDaGFuZ2VkOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIldcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci55ICs9IDE7XHJcbiAgICAgICAgICAgIGhhc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJBXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueCAtPSAxO1xyXG4gICAgICAgICAgICBoYXNDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiU1wiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnkgLT0gMTtcclxuICAgICAgICAgICAgaGFzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIkRcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci54ICs9IDE7XHJcbiAgICAgICAgICAgIGhhc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGhhc0NoYW5nZWQgJiYgbW92ZVZlY3Rvci5tYWduaXR1ZGUgIT0gMCkge1xyXG4gICAgICAgICAgICBHYW1lLmF2YXRhcjEubW92ZShHYW1lLsaSLlZlY3RvcjMuTk9STUFMSVpBVElPTihtb3ZlVmVjdG9yLCAxKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFiaWxpdHkoKSB7XHJcbiAgICAgICAgR2FtZS5hdmF0YXIxLmRvQWJpbGl0eSgpO1xyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIGF0dGFja1xyXG4gICAgZnVuY3Rpb24gYXR0YWNrKGVfOiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGxldCBtb3VzZUJ1dHRvbiA9IGVfLmJ1dHRvbjtcclxuICAgICAgICAgICAgc3dpdGNoIChtb3VzZUJ1dHRvbikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vbGVmdCBtb3VzZSBidXR0b24gcGxheWVyLmF0dGFja1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRShtb3VzZVBvc2l0aW9uLCBHYW1lLmF2YXRhcjEubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZVRvTW91c2UoZV8pO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5hdHRhY2soZGlyZWN0aW9uLCBudWxsLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IHJpZ2h0IG1vdXNlIGJ1dHRvbiBwbGF5ZXIuaGVhdnlBdHRhY2sgb3Igc29tZXRoaW5nIGxpa2UgdGhhdFxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcbn0iLCJuYW1lc3BhY2UgTGV2ZWwge1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBMYW5kc2NhcGUgZXh0ZW5kcyDGki5Ob2Rle1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUpO1xyXG5cclxuICAgICAgICAgICAgLy8gdGhpcy5nZXRDaGlsZHJlbigpWzBdLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudFRyYW5zZm9ybSkubXR4TG9jYWwudHJhbnNsYXRlWigtMilcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufSIsIi8vLzxyZWZlcmVuY2UgcGF0aD1cIi4uL0ZVREdFL05ldC9CdWlsZC9DbGllbnQvRnVkZ2VDbGllbnQuZC50c1wiLz5cclxuXHJcbm5hbWVzcGFjZSBOZXR3b3JraW5nIHtcclxuICAgIGV4cG9ydCBlbnVtIEZVTkNUSU9OIHtcclxuICAgICAgICBDT05ORUNURUQsXHJcbiAgICAgICAgSE9TVCxcclxuICAgICAgICBTRVRSRUFEWSxcclxuICAgICAgICBTUEFXTixcclxuICAgICAgICBUUkFOU0ZPUk0sXHJcbiAgICAgICAgU1BBV05CVUxMRVQsXHJcbiAgICAgICAgU1BBV05CVUxMRVRFTkVNWSxcclxuICAgICAgICBCVUxMRVRUUkFOU0ZPUk0sXHJcbiAgICAgICAgQlVMTEVURElFLFxyXG4gICAgICAgIFNQQVdORU5FTVksXHJcbiAgICAgICAgRU5FTVlUUkFOU0ZPUk0sXHJcbiAgICAgICAgRU5FTVlTVEFURSxcclxuICAgICAgICBFTkVNWURJRSxcclxuICAgICAgICBTUEFXTklURU0sXHJcbiAgICAgICAgVVBEQVRFQVRUUklCVVRFUyxcclxuICAgICAgICBJVEVNRElFLFxyXG4gICAgICAgIFNFTkRST09NLFxyXG4gICAgICAgIFNXSVRDSFJPT01SRVFVRVNUXHJcbiAgICB9XHJcblxyXG4gICAgaW1wb3J0IMaSQ2xpZW50ID0gRnVkZ2VOZXQuRnVkZ2VDbGllbnQ7XHJcblxyXG4gICAgZXhwb3J0IGxldCBjbGllbnQ6IMaSQ2xpZW50O1xyXG4gICAgZXhwb3J0IGxldCBjbGllbnRzOiBBcnJheTx7IGlkOiBzdHJpbmcsIHJlYWR5OiBib29sZWFuIH0+ID0gW107XHJcbiAgICBleHBvcnQgbGV0IHBvc1VwZGF0ZTogxpIuVmVjdG9yMztcclxuICAgIGV4cG9ydCBsZXQgc29tZW9uZUlzSG9zdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgZXhwb3J0IGxldCBlbmVteTogRW5lbXkuRW5lbXk7XHJcbiAgICBleHBvcnQgbGV0IGN1cnJlbnRJRHM6IG51bWJlcltdID0gW107XHJcblxyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJIb3N0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7IHNwYXduUGxheWVyKCkgfSwgdHJ1ZSk7XHJcbiAgICBsZXQgSVBDb25uZWN0aW9uID0gPEhUTUxJbnB1dEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJJUENvbm5lY3Rpb25cIik7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNvbm5lY3RpbmdcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNvbm5ldGluZywgdHJ1ZSk7XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjb25uZXRpbmcoKSB7XHJcbiAgICAgICAgY2xpZW50ID0gbmV3IMaSQ2xpZW50KCk7XHJcbiAgICAgICAgY2xpZW50LmFkZEV2ZW50TGlzdGVuZXIoRnVkZ2VOZXQuRVZFTlQuTUVTU0FHRV9SRUNFSVZFRCwgcmVjZWl2ZU1lc3NhZ2UpO1xyXG4gICAgICAgIGNsaWVudC5jb25uZWN0VG9TZXJ2ZXIoSVBDb25uZWN0aW9uLnZhbHVlKTtcclxuXHJcbiAgICAgICAgYWRkQ2xpZW50SUQoKVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBhZGRDbGllbnRJRCgpIHtcclxuICAgICAgICAgICAgaWYgKGNsaWVudC5pZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBvYmo6IHsgaWQ6IHN0cmluZywgcmVhZHk6IGJvb2xlYW4gfSA9IHsgaWQ6IGNsaWVudC5pZCwgcmVhZHk6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICBjbGllbnRzLnB1c2gob2JqKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoYWRkQ2xpZW50SUQsIDMwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiByZWNlaXZlTWVzc2FnZShfZXZlbnQ6IEN1c3RvbUV2ZW50IHwgTWVzc2FnZUV2ZW50IHwgRXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBpZiAoX2V2ZW50IGluc3RhbmNlb2YgTWVzc2FnZUV2ZW50KSB7XHJcbiAgICAgICAgICAgIGxldCBtZXNzYWdlOiBGdWRnZU5ldC5NZXNzYWdlID0gSlNPTi5wYXJzZShfZXZlbnQuZGF0YSk7XHJcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlkU291cmNlICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29tbWFuZCAhPSBGdWRnZU5ldC5DT01NQU5ELlNFUlZFUl9IRUFSVEJFQVQgJiYgbWVzc2FnZS5jb21tYW5kICE9IEZ1ZGdlTmV0LkNPTU1BTkQuQ0xJRU5UX0hFQVJUQkVBVCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vQWRkIG5ldyBjbGllbnQgdG8gYXJyYXkgY2xpZW50c1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkNPTk5FQ1RFRC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQudmFsdWUgIT0gY2xpZW50LmlkICYmIGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQgPT0gbWVzc2FnZS5jb250ZW50LnZhbHVlKSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudHMucHVzaCh7IGlkOiBtZXNzYWdlLmNvbnRlbnQudmFsdWUsIHJlYWR5OiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9TZXQgY2xpZW50IHJlYWR5XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU0VUUkVBRFkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5pZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQuaWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5yZWFkeSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gYXZhdGFyMiBhcyByYW5nZWQgb3IgbWVsZWUgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV04udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50LnR5cGUgPT0gUGxheWVyLlBMQVlFUlRZUEUuTUVMRUUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMiA9IG5ldyBQbGF5ZXIuTWVsZWUoXCJwbGF5ZXIyXCIsIG5ldyBQbGF5ZXIuQ2hhcmFjdGVyKG1lc3NhZ2UuY29udGVudC52YWx1ZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQbGF5ZXIuQXR0cmlidXRlcyhtZXNzYWdlLmNvbnRlbnQudmFsdWUuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIG1lc3NhZ2UuY29udGVudC52YWx1ZS5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgbWVzc2FnZS5jb250ZW50LnZhbHVlLmF0dHJpYnV0ZXMuc3BlZWQsIG1lc3NhZ2UuY29udGVudC52YWx1ZS5hdHRyaWJ1dGVzLnNwZWVkKSkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKEdhbWUuYXZhdGFyMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5jb250ZW50LnR5cGUgPT0gUGxheWVyLlBMQVlFUlRZUEUuUkFOR0VEKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIgPSBuZXcgUGxheWVyLlJhbmdlZChcInBsYXllcjJcIiwgbmV3IFBsYXllci5DaGFyYWN0ZXIobWVzc2FnZS5jb250ZW50LnZhbHVlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFBsYXllci5BdHRyaWJ1dGVzKG1lc3NhZ2UuY29udGVudC52YWx1ZS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgbWVzc2FnZS5jb250ZW50LnZhbHVlLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUuYXR0cmlidXRlcy5zcGVlZCwgbWVzc2FnZS5jb250ZW50LnZhbHVlLmF0dHJpYnV0ZXMuc2NhbGUpKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQoR2FtZS5hdmF0YXIyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9SdW50aW1lIHVwZGF0ZXMgYW5kIGNvbW11bmljYXRpb25cclxuICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3luYyBhdmF0YXIyIHBvc2l0aW9uIGFuZCByb3RhdGlvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5UUkFOU0ZPUk0udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1vdmVWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YVsyXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb3RhdGVWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVsyXSlcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIubXR4TG9jYWwudHJhbnNsYXRpb24gPSBtb3ZlVmVjdG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnJvdGF0aW9uID0gcm90YXRlVmVjdG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGJ1bGxldCBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05CVUxMRVQudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLmF0dGFjayhuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQuZGlyZWN0aW9uLmRhdGFbMl0pLCBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGJ1bGxldCBmcm9tIGVuZW15IG9uIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05CVUxMRVRFTkVNWS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5lbXk6IEVuZW15LkVuZW15ID0gR2FtZS5lbmVtaWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5lbmVteU5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmVteSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVuZW15IGluc3RhbmNlb2YgRW5lbXkuRW5lbXlTaG9vdCAmJiBjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPEVuZW15LkVuZW15U2hvb3Q+ZW5lbXkpLnNob290KG1lc3NhZ2UuY29udGVudC5idWxsZXROZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TeW5jIGJ1bGxldCB0cmFuc2Zvcm0gZnJvbSBob3N0IHRvIGNsaWVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5CVUxMRVRUUkFOU0ZPUk0udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEdhbWUuYnVsbGV0cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3UG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmJ1bGxldHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5ob3N0UG9zaXRpb25zW21lc3NhZ2UuY29udGVudC50aWNrXSA9IG5ld1Bvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0tpbGwgYnVsbGV0IGF0IHRoZSBjbGllbnQgZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkJVTExFVERJRS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnVsbGV0ID0gR2FtZS5idWxsZXRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJ1bGxldCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0LmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gZW5lbXkgYXQgdGhlIGNsaWVudCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05FTkVNWS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaG9vc2VFbmVteSg8RW5lbXkuRU5FTVlOQU1FPm1lc3NhZ2UuY29udGVudC5pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgUGxheWVyLkF0dHJpYnV0ZXMobWVzc2FnZS5jb250ZW50LnByb3BlcnRpZXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmNvbnRlbnQucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkLCBtZXNzYWdlLmNvbnRlbnQucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNjYWxlKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bnVtYmVyPm1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3luYyBlbmVteSB0cmFuc2Zvcm0gZnJvbSBob3N0IHRvIGNsaWVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5FTkVNWVRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5lbXkgPSBHYW1lLmVuZW1pZXMuZmluZChlbmVtID0+IGVuZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmVteSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS51cGRhdGVDb2xsaWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3luYyBhbmltYXRpb24gc3RhdGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5FTVlTVEFURS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5lbXkgPSBHYW1lLmVuZW1pZXMuZmluZChlbmVtID0+IGVuZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmVteSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UuY29udGVudC5zdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVuZW15LkFOSU1BVElPTlNUQVRFUy5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj5lbmVteS5hbmltYXRpb25zW1wiaWRsZVwiXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS5jdXJyZW50QW5pbWF0aW9uID0gRW5lbXkuQU5JTUFUSU9OU1RBVEVTLklETEU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbmVteS5BTklNQVRJT05TVEFURVMuV0FMSzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZW15LnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+ZW5lbXkuYW5pbWF0aW9uc1tcIndhbGtcIl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuY3VycmVudEFuaW1hdGlvbiA9IEVuZW15LkFOSU1BVElPTlNUQVRFUy5XQUxLO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0tpbGwgZW5lbXkgYXQgdGhlIGNsaWVudCBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5FTVlESUUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuZW15ID0gR2FtZS5lbmVtaWVzLmZpbmQoZW5lbSA9PiBlbmVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKGVuZW15KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcElEKG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gaXRlbSBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05JVEVNLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhdHRyaWJ1dGVzID0gbmV3IFBsYXllci5BdHRyaWJ1dGVzKG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5zcGVlZCwgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0obWVzc2FnZS5jb250ZW50Lm5hbWUsIG1lc3NhZ2UuY29udGVudC5kZXNjcmlwdGlvbiwgbmV3IMaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSksIGF0dHJpYnV0ZXMsIG1lc3NhZ2UuY29udGVudC50eXBlLCBtZXNzYWdlLmNvbnRlbnQuaW1nU3JjLCBtZXNzYWdlLmNvbnRlbnQubGlmZXRpbWUsIG1lc3NhZ2UuY29udGVudC5uZXRJZCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBleHRlcm5hbCBJdGVtXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gaXRlbSBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVVBEQVRFQVRUUklCVVRFUy50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXR0cmlidXRlcyA9IG5ldyBQbGF5ZXIuQXR0cmlidXRlcyhtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuc3BlZWQsIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuYWRkQXR0cmlidWVzQnlJdGVtKGF0dHJpYnV0ZXMsIG1lc3NhZ2UuY29udGVudC50eXBlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9LaWxsIGl0ZW0gZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLklURU1ESUUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbmVtID0+ICg8SXRlbXMuSXRlbT5lbmVtKS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcElEKG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2VuZCBpcyBob3N0TWVzc2FnZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5IT1NULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvbWVvbmVJc0hvc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vc2VuZCByb29tIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TRU5EUk9PTS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgb2xkT2JqZWN0czogR2FtZS7Gki5Ob2RlW10gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW0gPT4gKDxhbnk+ZWxlbSkudGFnICE9IFRhZy5UQUcuUExBWUVSKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRPYmplY3RzLmZvckVhY2goKGVsZW0pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKGVsZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb29tOiBHZW5lcmF0aW9uLlJvb20gPSBuZXcgR2VuZXJhdGlvbi5Sb29tKG1lc3NhZ2UuY29udGVudC5uYW1lLCBtZXNzYWdlLmNvbnRlbnQuY29vcmRpYW50ZXMsIG1lc3NhZ2UuY29udGVudC5leGl0cywgbWVzc2FnZS5jb250ZW50LnJvb21UeXBlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb29tLnNldERvb3JzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChyb29tKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQocm9vbS53YWxsc1swXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb20ud2FsbHNbMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hcHBlbmRDaGlsZChyb29tLndhbGxzWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQocm9vbS53YWxsc1szXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb29tLmRvb3JzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChyb29tLmRvb3JzW2ldKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gcm9vbS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9zZW5kIHJlcXVlc3QgdG8gc3dpdGNoIHJvb21zXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNXSVRDSFJPT01SRVFVRVNULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50cm9vbSA9IEdlbmVyYXRpb24ucm9vbXMuZmluZChlbGVtID0+IGVsZW0uY29vcmRpbmF0ZXNbMF0gPT0gKDxbbnVtYmVyLCBudW1iZXJdPm1lc3NhZ2UuY29udGVudC5jb29yZGlhbnRlcylbMF0gJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmNvb3JkaW5hdGVzWzFdID09ICg8W251bWJlciwgbnVtYmVyXT5tZXNzYWdlLmNvbnRlbnQuY29vcmRpYW50ZXMpWzFdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLnN3aXRjaFJvb20oY3VycmVudHJvb20sIG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2V0Q2xpZW50UmVhZHkoKSB7XHJcbiAgICAgICAgY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5pZCA9PSBjbGllbnQuaWQpLnJlYWR5ID0gdHJ1ZTtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TRVRSRUFEWSwgbmV0SWQ6IGNsaWVudC5pZCB9IH0pO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gcGxheWVyXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2V0SG9zdCgpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uSE9TVCwgaWQ6IGNsaWVudC5pZCB9IH0pO1xyXG4gICAgICAgICAgICBpZiAoIXNvbWVvbmVJc0hvc3QpIHtcclxuICAgICAgICAgICAgICAgIGNsaWVudC5iZWNvbWVIb3N0KCk7XHJcbiAgICAgICAgICAgICAgICBzb21lb25lSXNIb3N0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNvbWVvbmVJc0hvc3QgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBzcGF3blBsYXllcihfdHlwZT86IFBsYXllci5QTEFZRVJUWVBFKSB7XHJcbiAgICAgICAgaWYgKF90eXBlID09IFBsYXllci5QTEFZRVJUWVBFLk1FTEVFKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOLCB0eXBlOiBQbGF5ZXIuUExBWUVSVFlQRS5NRUxFRSwgdmFsdWU6IEdhbWUuYXZhdGFyMS5wcm9wZXJ0aWVzLCBwb3NpdGlvbjogR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiB9IH0pXHJcbiAgICAgICAgfSBlbHNlIGlmIChfdHlwZSA9PSBQbGF5ZXIuUExBWUVSVFlQRS5SQU5HRUQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV04sIHR5cGU6IFBsYXllci5QTEFZRVJUWVBFLlJBTkdFRCwgdmFsdWU6IEdhbWUuYXZhdGFyMS5wcm9wZXJ0aWVzLCBwb3NpdGlvbjogR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiB9IH0pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV04sIHR5cGU6IFBsYXllci5QTEFZRVJUWVBFLlJBTkdFRCwgdmFsdWU6IEdhbWUuYXZhdGFyMS5wcm9wZXJ0aWVzLCBwb3NpdGlvbjogR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNldENsaWVudCgpIHtcclxuICAgICAgICBOZXR3b3JraW5nLmNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IE5ldHdvcmtpbmcuRlVOQ1RJT04uQ09OTkVDVEVELCB2YWx1ZTogTmV0d29ya2luZy5jbGllbnQuaWQgfSB9KTtcclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVBdmF0YXJQb3NpdGlvbihfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9yb3RhdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlRSQU5TRk9STSwgdmFsdWU6IF9wb3NpdGlvbiwgcm90YXRpb246IF9yb3RhdGlvbiB9IH0pXHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gYnVsbGV0XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25CdWxsZXQoX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05CVUxMRVQsIGRpcmVjdGlvbjogX2RpcmVjdGlvbiwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUJ1bGxldChfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9uZXRJZDogbnVtYmVyLCBfdGljaz86IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5CVUxMRVRUUkFOU0ZPUk0sIHBvc2l0aW9uOiBfcG9zaXRpb24sIG5ldElkOiBfbmV0SWQsIHRpY2s6IF90aWNrIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgYXN5bmMgZnVuY3Rpb24gc3Bhd25CdWxsZXRBdEVuZW15KF9idWxsZXROZXRJZDogbnVtYmVyLCBfZW5lbXlOZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOQlVMTEVURU5FTVksIGJ1bGxldE5ldElkOiBfYnVsbGV0TmV0SWQsIGVuZW15TmV0SWQ6IF9lbmVteU5ldElkIH0gfSlcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUJ1bGxldChfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5CVUxMRVRESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIGVuZW15XHJcbiAgICBmdW5jdGlvbiBjaG9vc2VFbmVteShfaWQ6IEVuZW15LkVORU1ZTkFNRSwgX3Byb3BlcnRpZXM6IFBsYXllci5BdHRyaWJ1dGVzLCBfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWU5BTUUuQkFUOlxyXG4gICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXcgRW5lbXkuRW5lbXlEdW1iKEVuZW15LkVORU1ZTkFNRS5CQVQsIG5ldyBQbGF5ZXIuQ2hhcmFjdGVyKEVuZW15LmdldE5hbWVCeUlEKF9pZCksIG5ldyBQbGF5ZXIuQXR0cmlidXRlcyhfcHJvcGVydGllcy5oZWFsdGhQb2ludHMsIF9wcm9wZXJ0aWVzLmF0dGFja1BvaW50cywgX3Byb3BlcnRpZXMuc3BlZWQsIF9wcm9wZXJ0aWVzLnNjYWxlKSksIF9wb3NpdGlvbi50b1ZlY3RvcjIoKSwgX25ldElkKSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWU5BTUUuUkVEVElDSzpcclxuICAgICAgICAgICAgICAgIGxldCBuZXdFbmVtOiBFbmVteS5FbmVteUR1bWIgPSBuZXcgRW5lbXkuRW5lbXlEdW1iKEVuZW15LkVORU1ZTkFNRS5SRURUSUNLLCBuZXcgUGxheWVyLkNoYXJhY3RlcihFbmVteS5nZXROYW1lQnlJRChfaWQpLCBuZXcgUGxheWVyLkF0dHJpYnV0ZXMoX3Byb3BlcnRpZXMuaGVhbHRoUG9pbnRzLCBfcHJvcGVydGllcy5hdHRhY2tQb2ludHMsIF9wcm9wZXJ0aWVzLnNwZWVkLCBfcHJvcGVydGllcy5zY2FsZSkpLCBfcG9zaXRpb24udG9WZWN0b3IyKCksIF9uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ld0VuZW0pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduRW5lbXkoX2VuZW15OiBFbmVteS5FbmVteSwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05FTkVNWSwgaWQ6IF9lbmVteS5pZCwgcHJvcGVydGllczogX2VuZW15LnByb3BlcnRpZXMsIHBvc2l0aW9uOiBfZW5lbXkubXR4TG9jYWwudHJhbnNsYXRpb24sIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVFbmVteVBvc2l0aW9uKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX25ldElkOiBudW1iZXIsIF9zdGF0ZTogRW5lbXkuQU5JTUFUSU9OU1RBVEVTKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5FTVlUUkFOU0ZPUk0sIHBvc2l0aW9uOiBfcG9zaXRpb24sIG5ldElkOiBfbmV0SWQsIGFuaW1hdGlvbjogX3N0YXRlIH0gfSlcclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVFbmVteVN0YXRlKF9zdGF0ZTogRW5lbXkuQU5JTUFUSU9OU1RBVEVTLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkVORU1ZU1RBVEUsIHN0YXRlOiBfc3RhdGUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUVuZW15KF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5FTVlESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gaXRlbXNcclxuICAgIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBzcGF3bkl0ZW0oX25hbWU6IHN0cmluZywgX2Rlc2NyaXB0aW9uOiBzdHJpbmcsIF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2ltZ1NyYzogc3RyaW5nLCBfbGlmZXRpbWU6IG51bWJlciwgX25ldElkOiBudW1iZXIsIF9hdHRyaWJ1dGVzPzogUGxheWVyLkF0dHJpYnV0ZXMsIF90eXBlPzogSXRlbXMuSVRFTVRZUEUpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgYXdhaXQgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05JVEVNLCBuYW1lOiBfbmFtZSwgZGVzY3JpcHRpb246IF9kZXNjcmlwdGlvbiwgcG9zaXRpb246IF9wb3NpdGlvbiwgaW1nU3JjOiBfaW1nU3JjLCBsaWZldGltZTogX2xpZmV0aW1lLCBuZXRJZDogX25ldElkLCBhdHRyaWJ1dGVzOiBfYXR0cmlidXRlcywgdHlwZTogX3R5cGUgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQXZhdGFyQXR0cmlidXRlcyhfYXR0cmlidXRlczogUGxheWVyLkF0dHJpYnV0ZXMsIF90eXBlOiBJdGVtcy5JVEVNVFlQRSkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURUFUVFJJQlVURVMsIGF0dHJpYnV0ZXM6IF9hdHRyaWJ1dGVzLCB0eXBlOiBfdHlwZSB9IH0pO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUl0ZW0oX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5JVEVNRElFLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIHJvb21cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZW5kUm9vbShfbmFtZTogc3RyaW5nLCBfY29vcmRpYW50ZXM6IFtudW1iZXIsIG51bWJlcl0sIF9leGl0czogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dLCBfcm9vbVR5cGU6IEdlbmVyYXRpb24uUk9PTVRZUEUpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU0VORFJPT00sIG5hbWU6IF9uYW1lLCBjb29yZGlhbnRlczogX2Nvb3JkaWFudGVzLCBleGl0czogX2V4aXRzLCByb29tVHlwZTogX3Jvb21UeXBlIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3dpdGNoUm9vbVJlcXVlc3QoX2Nvb3JkaWFudGVzOiBbbnVtYmVyLCBudW1iZXJdLCBfZGlyZWN0aW9uOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCAhPSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudC5pZEhvc3QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1dJVENIUk9PTVJFUVVFU1QsIGNvb3JkaWFudGVzOiBfY29vcmRpYW50ZXMsIGRpcmVjdGlvbjogX2RpcmVjdGlvbiB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGlkR2VuZXJhdG9yKCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMCk7XHJcbiAgICAgICAgaWYgKGN1cnJlbnRJRHMuZmluZChjdXJJRCA9PiBjdXJJRCA9PSBpZCkpIHtcclxuICAgICAgICAgICAgaWRHZW5lcmF0b3IoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRJRHMucHVzaChpZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHBvcElEKF9pZDogbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IGluZGV4OiBudW1iZXI7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjdXJyZW50SURzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50SURzW2ldID09IF9pZCkge1xyXG4gICAgICAgICAgICAgICAgaW5kZXggPSBpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgY3VycmVudElEcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgfVxyXG5cclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiYmVmb3JldW5sb2FkXCIsIG9uVW5sb2FkLCBmYWxzZSk7XHJcblxyXG4gICAgZnVuY3Rpb24gb25VbmxvYWQoKSB7XHJcbiAgICAgICAgLy9UT0RPOiBUaGluZ3Mgd2UgZG8gYWZ0ZXIgdGhlIHBsYXllciBsZWZ0IHRoZSBnYW1lXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgUGxheWVyIHtcclxuICAgIGV4cG9ydCBlbnVtIFBMQVlFUlRZUEUge1xyXG4gICAgICAgIFJBTkdFRCxcclxuICAgICAgICBNRUxFRVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQbGF5ZXIgZXh0ZW5kcyBHYW1lLsaSQWlkLk5vZGVTcHJpdGUgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklLbm9ja2JhY2thYmxlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5QTEFZRVI7XHJcbiAgICAgICAgcHVibGljIGl0ZW1zOiBBcnJheTxJdGVtcy5JdGVtPiA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBwcm9wZXJ0aWVzOiBDaGFyYWN0ZXI7XHJcbiAgICAgICAgcHVibGljIHdlYXBvbjogV2VhcG9ucy5XZWFwb24gPSBuZXcgV2VhcG9ucy5XZWFwb24oMTIsIDEpO1xyXG4gICAgICAgIGhpdGFibGU6IGJvb2xlYW4gPSB0cnVlO1xyXG5cclxuICAgICAgICBjb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7XHJcbiAgICAgICAgbW92ZURpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuXHJcbiAgICAgICAga25vY2tiYWNrRm9yY2U6IG51bWJlciA9IDY7XHJcblxyXG4gICAgICAgIHJlYWRvbmx5IGFiaWxpdHlDb3VudDogbnVtYmVyID0gMTtcclxuICAgICAgICBjdXJyZW50YWJpbGl0eUNvdW50OiBudW1iZXIgPSB0aGlzLmFiaWxpdHlDb3VudDtcclxuICAgICAgICByZWFkb25seSBhYmlsaXR5Q29vbGRvd25UaW1lOiBudW1iZXIgPSAxMDtcclxuICAgICAgICBjdXJyZW50YWJpbGl0eUNvb2xkb3duVGltZTogbnVtYmVyID0gdGhpcy5hYmlsaXR5Q29vbGRvd25UaW1lO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogQ2hhcmFjdGVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlWigwLjEpO1xyXG4gICAgICAgICAgICB0aGlzLnByb3BlcnRpZXMgPSBfcHJvcGVydGllcztcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcblxyXG4gICAgICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKCgxIC8gNjAgKiB0aGlzLnByb3BlcnRpZXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uLmFkZChfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZSh0aGlzLm1vdmVEaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgbGV0IGRvb3JzOiBHZW5lcmF0aW9uLkRvb3JbXSA9ICg8R2VuZXJhdGlvbi5Sb29tPkdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maW5kKGVsZW1lbnQgPT4gKDxHZW5lcmF0aW9uLlJvb20+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuUk9PTSkpLmRvb3JzO1xyXG4gICAgICAgICAgICBkb29ycy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlc1JlY3QoZWxlbWVudC5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICAoPEdlbmVyYXRpb24uRG9vcj5lbGVtZW50KS5jaGFuZ2VSb29tKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uLnN1YnRyYWN0KF9kaXJlY3Rpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29sbGlkZShfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IGNhbk1vdmVYOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICAgICAgbGV0IGNhbk1vdmVZOiBib29sZWFuID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlcnM6IEdlbmVyYXRpb24uV2FsbFtdID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbWVudCA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5ST09NKSkud2FsbHM7XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlc1JlY3QoZWxlbWVudC5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQmVmb3JlTW92ZSA9IE1hdGgucm91bmQoKGludGVyc2VjdGlvbi5oZWlnaHQgKiBpbnRlcnNlY3Rpb24ud2lkdGgpICogMTAwMCkgLyAxMDAwO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgb2xkUG9zaXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKHRoaXMuY29sbGlkZXIucG9zaXRpb24ueCwgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMihfZGlyZWN0aW9uLngsIDApXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBNYXRoLnJvdW5kKChuZXdJbnRlcnNlY3Rpb24uaGVpZ2h0ICogbmV3SW50ZXJzZWN0aW9uLndpZHRoKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKDAsIF9kaXJlY3Rpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBNYXRoLnJvdW5kKChuZXdJbnRlcnNlY3Rpb24uaGVpZ2h0ICogbmV3SW50ZXJzZWN0aW9uLndpZHRoKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbk1vdmVZID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgbGV0IGVuZW15Q29sbGlkZXJzOiBFbmVteS5FbmVteVtdID0gR2FtZS5lbmVtaWVzO1xyXG4gICAgICAgICAgICBlbmVteUNvbGxpZGVycy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50LmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUJlZm9yZU1vdmUgPSBNYXRoLnJvdW5kKChpbnRlcnNlY3Rpb24pICogMTAwMCkgLyAxMDAwO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgb2xkUG9zaXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKHRoaXMuY29sbGlkZXIucG9zaXRpb24ueCwgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMihfZGlyZWN0aW9uLngsIDApXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcikgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gTWF0aC5yb3VuZCgobmV3SW50ZXJzZWN0aW9uKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKDAsIF9kaXJlY3Rpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcikgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gTWF0aC5yb3VuZCgobmV3SW50ZXJzZWN0aW9uKSAqIDEwMDApIC8gMTAwMDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbk1vdmVZID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgaWYgKGNhbk1vdmVYICYmIGNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbiwgZmFsc2UpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNhbk1vdmVYICYmICFjYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9kaXJlY3Rpb24ueCwgMCwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24sIGZhbHNlKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICghY2FuTW92ZVggJiYgY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMygwLCBfZGlyZWN0aW9uLnksIF9kaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBhdHRhY2soX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyLCBfc3luYz86IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMud2VhcG9uLmN1cnJlbnRBdHRhY2tDb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgYnVsbGV0OiBCdWxsZXRzLkJ1bGxldCA9IG5ldyBCdWxsZXRzLkJ1bGxldChuZXcgxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KSwgX2RpcmVjdGlvbiwgdGhpcywgX25ldElkKTtcclxuICAgICAgICAgICAgICAgIGJ1bGxldC5mbHlEaXJlY3Rpb24uc2NhbGUoMSAvIEdhbWUuZnJhbWVSYXRlICogYnVsbGV0LnNwZWVkKTtcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoYnVsbGV0KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduQnVsbGV0KF9kaXJlY3Rpb24sIGJ1bGxldC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy53ZWFwb24uY3VycmVudEF0dGFja0NvdW50LS07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkb0tub2NrYmFjayhfYm9keTogxpJBaWQuTm9kZVNwcml0ZSk6IHZvaWQge1xyXG4gICAgICAgICAgICAoPEVuZW15LkVuZW15Pl9ib2R5KS5nZXRLbm9ja2JhY2sodGhpcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIF9wb3NpdGlvbi50b1ZlY3RvcjIoKSkudG9WZWN0b3IzKDApO1xyXG5cclxuICAgICAgICAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKF9rbm9ja2JhY2tGb3JjZSAqIDEgLyBHYW1lLmZyYW1lUmF0ZSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24uYWRkKGRpcmVjdGlvbik7XHJcblxyXG5cclxuICAgICAgICAgICAgaGVscGVyKGRpcmVjdGlvbiwgdGhpcy5tb3ZlRGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGhlbHBlcihfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMsIF9tb3ZlRGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChfa25vY2tiYWNrRm9yY2UgPiAwLjEpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX21vdmVEaXJlY3Rpb24uc3VidHJhY3QoZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9rbm9ja2JhY2tGb3JjZSAvPSAzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKF9rbm9ja2JhY2tGb3JjZSAqIDEgLyBHYW1lLmZyYW1lUmF0ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBfbW92ZURpcmVjdGlvbi5hZGQoZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlbHBlcihfZGlyZWN0aW9uLCBfbW92ZURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX21vdmVEaXJlY3Rpb24uc3VidHJhY3QoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY29vbGRvd24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMud2VhcG9uLmNvb2xkb3duKHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudGFiaWxpdHlDb29sZG93blRpbWUgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb29sZG93blRpbWUgPSB0aGlzLmFiaWxpdHlDb29sZG93blRpbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50ID0gdGhpcy5hYmlsaXR5Q291bnQ7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb29sZG93blRpbWUtLTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIE1lbGVlIGV4dGVuZHMgUGxheWVyIHtcclxuXHJcbiAgICAgICAgcmVhZG9ubHkgYWJpbGl0eUNvdW50OiBudW1iZXIgPSAxO1xyXG4gICAgICAgIGN1cnJlbnRhYmlsaXR5Q291bnQ6IG51bWJlciA9IHRoaXMuYWJpbGl0eUNvdW50O1xyXG4gICAgICAgIHJlYWRvbmx5IGFiaWxpdHlDb29sZG93blRpbWU6IG51bWJlciA9IDQwO1xyXG4gICAgICAgIGN1cnJlbnRhYmlsaXR5Q29vbGRvd25UaW1lOiBudW1iZXIgPSB0aGlzLmFiaWxpdHlDb29sZG93blRpbWU7XHJcblxyXG4gICAgICAgIHB1YmxpYyBhdHRhY2soX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyLCBfc3luYz86IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMud2VhcG9uLmN1cnJlbnRBdHRhY2tDb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgYnVsbGV0OiBCdWxsZXRzLkJ1bGxldCA9IG5ldyBCdWxsZXRzLk1lbGVlQnVsbGV0KG5ldyDGki5WZWN0b3IyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpLCBfZGlyZWN0aW9uLCB0aGlzLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgYnVsbGV0LmZseURpcmVjdGlvbi5zY2FsZSgxIC8gR2FtZS5mcmFtZVJhdGUgKiBidWxsZXQuc3BlZWQpO1xyXG4gICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChidWxsZXQpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChfc3luYykge1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25CdWxsZXQoX2RpcmVjdGlvbiwgYnVsbGV0Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLndlYXBvbi5jdXJyZW50QXR0YWNrQ291bnQtLTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9CbG9ja1xyXG4gICAgICAgIHB1YmxpYyBkb0FiaWxpdHkoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpdGFibGUgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhpdGFibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSwgNjAwKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQtLTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgUmFuZ2VkIGV4dGVuZHMgUGxheWVyIHtcclxuXHJcblxyXG4gICAgICAgIC8vRGFzaFxyXG4gICAgICAgIHB1YmxpYyBkb0FiaWxpdHkoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpdGFibGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkICo9IDI7XHJcblxyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuc3BlZWQgLz0gMjtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuc3BlZWQgLz0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oaXRhYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgICAgICAgICAgfSwgMzAwKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudC0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG4gICAgZXhwb3J0IGVudW0gUk9PTVRZUEUge1xyXG4gICAgICAgIFNUQVJULFxyXG4gICAgICAgIE5PUk1BTCxcclxuICAgICAgICBNRVJDSEFOVCxcclxuICAgICAgICBUUkVBU1VSRSxcclxuICAgICAgICBDSEFMTEVOR0UsXHJcbiAgICAgICAgQk9TU1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBSb29tIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuUk9PTTtcclxuICAgICAgICBwdWJsaWMgcm9vbVR5cGU6IFJPT01UWVBFXHJcbiAgICAgICAgcHVibGljIGNvb3JkaW5hdGVzOiBbbnVtYmVyLCBudW1iZXJdOyAvLyBYIFlcclxuICAgICAgICBwdWJsaWMgd2FsbHM6IFdhbGxbXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBkb29yczogRG9vcltdID0gW107XHJcbiAgICAgICAgcHVibGljIGZpbmlzaGVkOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICBuZWlnaGJvdXJOOiBSb29tO1xyXG4gICAgICAgIG5laWdoYm91ckU6IFJvb207XHJcbiAgICAgICAgbmVpZ2hib3VyUzogUm9vbTtcclxuICAgICAgICBuZWlnaGJvdXJXOiBSb29tO1xyXG4gICAgICAgIHJvb21TaXplOiBudW1iZXIgPSAzMDtcclxuICAgICAgICBleGl0czogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dIC8vIE4gRSBTIFdcclxuICAgICAgICBtZXNoOiDGki5NZXNoUXVhZCA9IG5ldyDGki5NZXNoUXVhZDtcclxuICAgICAgICBjbXBNZXNoOiDGki5Db21wb25lbnRNZXNoID0gbmV3IMaSLkNvbXBvbmVudE1lc2godGhpcy5tZXNoKTtcclxuICAgICAgICBzdGFydFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwic3RhcnRSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInllbGxvd1wiKSkpO1xyXG4gICAgICAgIG5vcm1hbFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibm9ybWFsUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgIG1lcmNoYW50Um9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtZXJjaGFudFJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiZ3JlZW5cIikpKTtcclxuICAgICAgICB0cmVhc3VyZVJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwidHJlYXN1cmVSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInllbGxvd1wiKSkpO1xyXG4gICAgICAgIGNoYWxsZW5nZVJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiY2hhbGxlbmdlUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJibHVlXCIpKSk7XHJcbiAgICAgICAgYm9zc1Jvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiYm9zc1Jvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiYmxhY2tcIikpKTtcclxuXHJcbiAgICAgICAgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX2Nvb3JkaWFudGVzOiBbbnVtYmVyLCBudW1iZXJdLCBfZXhpdHM6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSwgX3Jvb21UeXBlOiBST09NVFlQRSkge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29vcmRpbmF0ZXMgPSBfY29vcmRpYW50ZXM7XHJcbiAgICAgICAgICAgIHRoaXMuZXhpdHMgPSBfZXhpdHM7XHJcbiAgICAgICAgICAgIHRoaXMucm9vbVR5cGUgPSBfcm9vbVR5cGU7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX3Jvb21UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLlNUQVJUOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wTWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwodGhpcy5zdGFydFJvb21NYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBST09NVFlQRS5OT1JNQUw6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLm5vcm1hbFJvb21NYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBST09NVFlQRS5NRVJDSEFOVDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMubWVyY2hhbnRSb29tTWF0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgUk9PTVRZUEUuVFJFQVNVUkU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLnRyZWFzdXJlUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLkNIQUxMRU5HRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMuY2hhbGxlbmdlUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLkJPU1M6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLmJvc3NSb29tTWF0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQodGhpcy5jbXBNZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQodGhpcy5jbXBNYXRlcmlhbCk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKHRoaXMucm9vbVNpemUsIHRoaXMucm9vbVNpemUsIDApKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyh0aGlzLmNvb3JkaW5hdGVzWzBdICogdGhpcy5yb29tU2l6ZSwgdGhpcy5jb29yZGluYXRlc1sxXSAqIHRoaXMucm9vbVNpemUsIC0wLjAyKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaChuZXcgV2FsbCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5yb29tU2l6ZSwgW3RydWUsIGZhbHNlLCBmYWxzZSwgZmFsc2VdKSk7XHJcbiAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaChuZXcgV2FsbCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5yb29tU2l6ZSwgW2ZhbHNlLCB0cnVlLCBmYWxzZSwgZmFsc2VdKSk7XHJcbiAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaChuZXcgV2FsbCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5yb29tU2l6ZSwgW2ZhbHNlLCBmYWxzZSwgdHJ1ZSwgZmFsc2VdKSk7XHJcbiAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaChuZXcgV2FsbCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5yb29tU2l6ZSwgW2ZhbHNlLCBmYWxzZSwgZmFsc2UsIHRydWVdKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0RG9vcnMoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4aXRzWzBdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvb3JzLnB1c2gobmV3IERvb3IodGhpcywgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIFt0cnVlLCBmYWxzZSwgZmFsc2UsIGZhbHNlXSwgdGhpcy5yb29tU2l6ZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4aXRzWzFdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvb3JzLnB1c2gobmV3IERvb3IodGhpcywgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIFtmYWxzZSwgdHJ1ZSwgZmFsc2UsIGZhbHNlXSwgdGhpcy5yb29tU2l6ZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4aXRzWzJdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvb3JzLnB1c2gobmV3IERvb3IodGhpcywgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIFtmYWxzZSwgZmFsc2UsIHRydWUsIGZhbHNlXSwgdGhpcy5yb29tU2l6ZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4aXRzWzNdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvb3JzLnB1c2gobmV3IERvb3IodGhpcywgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIFtmYWxzZSwgZmFsc2UsIGZhbHNlLCB0cnVlXSwgdGhpcy5yb29tU2l6ZSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZG9vcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5kb29yc1tpXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRSb29tU2l6ZSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yb29tU2l6ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFdhbGwgZXh0ZW5kcyDGki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5XQUxMO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogR2FtZS7Gki5SZWN0YW5nbGU7XHJcbiAgICAgICAgcHVibGljIHdhbGxUaGlja25lc3M6IG51bWJlciA9IDI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyLCBfd2lkdGg6IG51bWJlciwgX2RpcmVjdGlvbjogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiV2FsbFwiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyDGki5NZXNoUXVhZCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobmV3IMaSLk1hdGVyaWFsKFwicmVkXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInJlZFwiKSkpKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IF9wb3NpdGlvbi50b1ZlY3RvcjMoMCk7XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb25bMF0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKz0gX3dpZHRoIC8gMiArIHRoaXMud2FsbFRoaWNrbmVzcyAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhfd2lkdGgsIHRoaXMud2FsbFRoaWNrbmVzcywgMCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy53YWxsVGhpY2tuZXNzLCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb25bMV0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKz0gX3dpZHRoIC8gMiArIHRoaXMud2FsbFRoaWNrbmVzcyAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyh0aGlzLndhbGxUaGlja25lc3MsIF93aWR0aCwgMCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMud2FsbFRoaWNrbmVzcywgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb25bMl0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgLT0gX3dpZHRoIC8gMiArIHRoaXMud2FsbFRoaWNrbmVzcyAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhfd2lkdGgsIHRoaXMud2FsbFRoaWNrbmVzcywgMCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy53YWxsVGhpY2tuZXNzLCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb25bM10pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnggLT0gX3dpZHRoIC8gMiArIHRoaXMud2FsbFRoaWNrbmVzcyAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyh0aGlzLndhbGxUaGlja25lc3MsIF93aWR0aCwgMCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMud2FsbFRoaWNrbmVzcywgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBEb29yIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuRE9PUjtcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlO1xyXG4gICAgICAgIHB1YmxpYyBkb29yV2lkdGg6IG51bWJlciA9IDM7XHJcbiAgICAgICAgcHVibGljIGRvb3JUaGlja25lc3M6IG51bWJlciA9IDE7XHJcbiAgICAgICAgcHVibGljIHBhcmVudFJvb206IFJvb207XHJcblxyXG4gICAgICAgIGRpcmVjdGlvbjogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfcGFyZW50OiBSb29tLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMiwgX2RpcmVjdGlvbjogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dLCBfcm9vbVNpemU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihcIkRvb3JcIik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmRpcmVjdGlvbiA9IF9kaXJlY3Rpb247XHJcbiAgICAgICAgICAgIHRoaXMucGFyZW50Um9vbSA9IF9wYXJlbnQ7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWVzaChuZXcgxpIuTWVzaFF1YWQpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG5ldyDGki5NYXRlcmlhbChcInJlZFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJncmVlblwiKSkpKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IF9wb3NpdGlvbi50b1ZlY3RvcjMoMC4wMSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvblswXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSArPSBfcm9vbVNpemUgLyAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy5kb29yV2lkdGgsIHRoaXMuZG9vclRoaWNrbmVzcywgMC4wMDEpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzFdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICs9IF9yb29tU2l6ZSAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyh0aGlzLmRvb3JUaGlja25lc3MsIHRoaXMuZG9vcldpZHRoLCAwLjAwMSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb25bMl0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgLT0gX3Jvb21TaXplIC8gMjtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKHRoaXMuZG9vcldpZHRoLCB0aGlzLmRvb3JUaGlja25lc3MsIDAuMDAxKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvblszXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCAtPSBfcm9vbVNpemUgLyAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy5kb29yVGhpY2tuZXNzLCB0aGlzLmRvb3JXaWR0aCwgMC4wMDEpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2hhbmdlUm9vbSgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMucGFyZW50Um9vbS5maW5pc2hlZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIEdlbmVyYXRpb24uc3dpdGNoUm9vbSh0aGlzLnBhcmVudFJvb20sIHRoaXMuZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5zd2l0Y2hSb29tUmVxdWVzdCh0aGlzLnBhcmVudFJvb20uY29vcmRpbmF0ZXMsIHRoaXMuZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBHZW5lcmF0aW9uIHtcclxuXHJcbiAgICBsZXQgbnVtYmVyT2ZSb29tczogbnVtYmVyID0gMztcclxuICAgIGxldCB1c2VkUG9zaXRpb25zOiBbbnVtYmVyLCBudW1iZXJdW10gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgcm9vbXM6IFJvb21bXSA9IFtdO1xyXG5cclxuICAgIC8vc3Bhd24gY2hhbmNlc1xyXG4gICAgbGV0IGNoYWxsZW5nZVJvb21TcGF3bkNoYW5jZTogbnVtYmVyID0gMjA7XHJcbiAgICBsZXQgdHJlYXN1cmVSb29tU3Bhd25DaGFuY2U6IG51bWJlciA9IDEwO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVJvb21zKCk6IHZvaWQge1xyXG4gICAgICAgIGxldCBzdGFydENvb3JkczogW251bWJlciwgbnVtYmVyXSA9IFswLCAwXTtcclxuXHJcbiAgICAgICAgcm9vbXMucHVzaChuZXcgUm9vbShcInJvb21TdGFydFwiLCBzdGFydENvb3JkcywgY2FsY1BhdGhFeGl0cyhzdGFydENvb3JkcyksIEdlbmVyYXRpb24uUk9PTVRZUEUuU1RBUlQpKVxyXG4gICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChzdGFydENvb3Jkcyk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCBudW1iZXJPZlJvb21zOyBpKyspIHtcclxuICAgICAgICAgICAgYWRkUm9vbShyb29tc1tyb29tcy5sZW5ndGggLSAxXSwgR2VuZXJhdGlvbi5ST09NVFlQRS5OT1JNQUwpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhZGRSb29tKHJvb21zW3Jvb21zLmxlbmd0aCAtIDFdLCBHZW5lcmF0aW9uLlJPT01UWVBFLkJPU1MpO1xyXG4gICAgICAgIGFkZFNwZWNpYWxSb29tcygpO1xyXG4gICAgICAgIGFkZFJvb20ocm9vbXNbcm9vbXMubGVuZ3RoIC0gM10sIEdlbmVyYXRpb24uUk9PTVRZUEUuTUVSQ0hBTlQpO1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIHJvb20uZXhpdHMgPSBjYWxjUm9vbURvb3JzKHJvb20uY29vcmRpbmF0ZXMpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhyb29tLmNvb3JkaW5hdGVzICsgXCIgXCIgKyByb29tLmV4aXRzICsgXCIgXCIgKyByb29tLnJvb21UeXBlLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcm9vbXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgcm9vbXNbaV0uc2V0RG9vcnMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQocm9vbXNbMF0pO1xyXG4gICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQocm9vbXNbMF0ud2FsbHNbMF0pO1xyXG4gICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQocm9vbXNbMF0ud2FsbHNbMV0pO1xyXG4gICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQocm9vbXNbMF0ud2FsbHNbMl0pO1xyXG4gICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQocm9vbXNbMF0ud2FsbHNbM10pO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJvb21zWzBdLmRvb3JzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQocm9vbXNbMF0uZG9vcnNbaV0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2VuZFJvb20ocm9vbXNbMF0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNlbmRSb29tKF9yb29tOiBSb29tKSB7XHJcbiAgICAgICAgTmV0d29ya2luZy5zZW5kUm9vbShfcm9vbS5uYW1lLCBfcm9vbS5jb29yZGluYXRlcywgX3Jvb20uZXhpdHMsIF9yb29tLnJvb21UeXBlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGRSb29tKF9jdXJyZW50Um9vbTogUm9vbSwgX3Jvb21UeXBlOiBHZW5lcmF0aW9uLlJPT01UWVBFKTogdm9pZCB7XHJcbiAgICAgICAgbGV0IG51bWJlck9mRXhpdHM6IG51bWJlciA9IGNvdW50Qm9vbChfY3VycmVudFJvb20uZXhpdHMpO1xyXG4gICAgICAgIGxldCByYW5kb21OdW1iZXI6IG51bWJlciA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG51bWJlck9mRXhpdHMpO1xyXG4gICAgICAgIGxldCBwb3NzaWJsZUV4aXRJbmRleDogbnVtYmVyW10gPSBnZXRFeGl0SW5kZXgoX2N1cnJlbnRSb29tLmV4aXRzKTtcclxuICAgICAgICBsZXQgbmV3Um9vbVBvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdO1xyXG4gICAgICAgIGxldCBuZXdSb29tOiBSb29tO1xyXG5cclxuICAgICAgICBzd2l0Y2ggKHBvc3NpYmxlRXhpdEluZGV4W3JhbmRvbU51bWJlcl0pIHtcclxuICAgICAgICAgICAgY2FzZSAwOiAvLyBub3J0aFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSwgX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzFdICsgMV07XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IFJvb20oXCJyb29tTm9ybWFsXCIsIChuZXdSb29tUG9zaXRpb24pLCBjYWxjUGF0aEV4aXRzKG5ld1Jvb21Qb3NpdGlvbiksIF9yb29tVHlwZSk7XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ld1Jvb20pO1xyXG4gICAgICAgICAgICAgICAgX2N1cnJlbnRSb29tLm5laWdoYm91ck4gPSBuZXdSb29tO1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbS5uZWlnaGJvdXJTID0gX2N1cnJlbnRSb29tO1xyXG4gICAgICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5wdXNoKG5ld1Jvb21Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOiAvLyBlYXN0XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tUG9zaXRpb24gPSBbX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzBdICsgMSwgX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzFdXTtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgUm9vbShcInJvb21Ob3JtYWxcIiwgKG5ld1Jvb21Qb3NpdGlvbiksIGNhbGNQYXRoRXhpdHMobmV3Um9vbVBvc2l0aW9uKSwgX3Jvb21UeXBlKTtcclxuICAgICAgICAgICAgICAgIHJvb21zLnB1c2gobmV3Um9vbSk7XHJcbiAgICAgICAgICAgICAgICBfY3VycmVudFJvb20ubmVpZ2hib3VyRSA9IG5ld1Jvb207XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tLm5laWdoYm91clcgPSBfY3VycmVudFJvb207XHJcbiAgICAgICAgICAgICAgICB1c2VkUG9zaXRpb25zLnB1c2gobmV3Um9vbVBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6IC8vIHNvdXRoXHJcbiAgICAgICAgICAgICAgICBuZXdSb29tUG9zaXRpb24gPSBbX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzBdLCBfY3VycmVudFJvb20uY29vcmRpbmF0ZXNbMV0gLSAxXTtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgUm9vbShcInJvb21Ob3JtYWxcIiwgKG5ld1Jvb21Qb3NpdGlvbiksIGNhbGNQYXRoRXhpdHMobmV3Um9vbVBvc2l0aW9uKSwgX3Jvb21UeXBlKTtcclxuICAgICAgICAgICAgICAgIHJvb21zLnB1c2gobmV3Um9vbSk7XHJcbiAgICAgICAgICAgICAgICBfY3VycmVudFJvb20ubmVpZ2hib3VyUyA9IG5ld1Jvb207XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tLm5laWdoYm91ck4gPSBfY3VycmVudFJvb207XHJcbiAgICAgICAgICAgICAgICB1c2VkUG9zaXRpb25zLnB1c2gobmV3Um9vbVBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDM6IC8vd2VzdFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSAtIDEsIF9jdXJyZW50Um9vbS5jb29yZGluYXRlc1sxXV07XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IFJvb20oXCJyb29tTm9ybWFsXCIsIChuZXdSb29tUG9zaXRpb24pLCBjYWxjUGF0aEV4aXRzKG5ld1Jvb21Qb3NpdGlvbiksIF9yb29tVHlwZSk7XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ld1Jvb20pO1xyXG4gICAgICAgICAgICAgICAgX2N1cnJlbnRSb29tLm5laWdoYm91clcgPSBuZXdSb29tO1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbS5uZWlnaGJvdXJFID0gX2N1cnJlbnRSb29tO1xyXG4gICAgICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5wdXNoKG5ld1Jvb21Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGRTcGVjaWFsUm9vbXMoKTogdm9pZCB7XHJcbiAgICAgICAgcm9vbXMuZm9yRWFjaChyb29tID0+IHtcclxuICAgICAgICAgICAgcm9vbS5leGl0cyA9IGNhbGNQYXRoRXhpdHMocm9vbS5jb29yZGluYXRlcyk7XHJcbiAgICAgICAgICAgIGlmIChpc1NwYXduaW5nKHRyZWFzdXJlUm9vbVNwYXduQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICAgICAgYWRkUm9vbShyb29tLCBHZW5lcmF0aW9uLlJPT01UWVBFLlRSRUFTVVJFKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoaXNTcGF3bmluZyhjaGFsbGVuZ2VSb29tU3Bhd25DaGFuY2UpKSB7XHJcbiAgICAgICAgICAgICAgICBhZGRSb29tKHJvb20sIEdlbmVyYXRpb24uUk9PTVRZUEUuQ0hBTExFTkdFKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaXNTcGF3bmluZyhfc3Bhd25DaGFuY2U6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCB4ID0gTWF0aC5yYW5kb20oKSAqIDEwMDtcclxuICAgICAgICBpZiAoeCA8IF9zcGF3bkNoYW5jZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBjb3VudEJvb2woX2Jvb2w6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IGNvdW50ZXI6IG51bWJlciA9IDA7XHJcbiAgICAgICAgX2Jvb2wuZm9yRWFjaChib29sID0+IHtcclxuICAgICAgICAgICAgaWYgKGJvb2wpIHtcclxuICAgICAgICAgICAgICAgIGNvdW50ZXIrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBjb3VudGVyO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdldEV4aXRJbmRleChfZXhpdHM6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSk6IG51bWJlcltdIHtcclxuICAgICAgICBsZXQgbnVtYmVyczogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF9leGl0cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoX2V4aXRzW2ldKSB7XHJcbiAgICAgICAgICAgICAgICBudW1iZXJzLnB1c2goaSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVtYmVycztcclxuXHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIGNhbGN1bGF0ZXMgcG9zc2libGUgZXhpdHMgZm9yIG5ldyByb29tc1xyXG4gICAgICogQHBhcmFtIF9wb3NpdGlvbiBwb3NpdGlvbiBvZiByb29tXHJcbiAgICAgKiBAcmV0dXJucyBib29sZWFuIGZvciBlYWNoIGRpcmVjdGlvbiBub3J0aCwgZWFzdCwgc291dGgsIHdlc3RcclxuICAgICAqL1xyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGNQYXRoRXhpdHMoX3Bvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdKTogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dIHtcclxuICAgICAgICBsZXQgbm9ydGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgZWFzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBzb3V0aDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCB3ZXN0OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IHJvb21OZWlnaGJvdXJzOiBbbnVtYmVyLCBudW1iZXJdW107XHJcbiAgICAgICAgcm9vbU5laWdoYm91cnMgPSBzbGljZU5laWdoYm91cnMoZ2V0TmVpZ2hib3VycyhfcG9zaXRpb24pKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJvb21OZWlnaGJvdXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChyb29tTmVpZ2hib3Vyc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgc291dGggPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyb29tTmVpZ2hib3Vyc1tpXVswXSAtIF9wb3NpdGlvblswXSA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgd2VzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJvb21OZWlnaGJvdXJzW2ldWzFdIC0gX3Bvc2l0aW9uWzFdID09IDEpIHtcclxuICAgICAgICAgICAgICAgIG5vcnRoID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocm9vbU5laWdoYm91cnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gMSkge1xyXG4gICAgICAgICAgICAgICAgZWFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFtub3J0aCwgZWFzdCwgc291dGgsIHdlc3RdO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGNSb29tRG9vcnMoX3Bvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdKTogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dIHtcclxuICAgICAgICBsZXQgbm9ydGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgZWFzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBzb3V0aDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCB3ZXN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdXNlZFBvc2l0aW9ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh1c2VkUG9zaXRpb25zW2ldWzBdIC0gX3Bvc2l0aW9uWzFdKTtcclxuICAgICAgICAgICAgaWYgKHVzZWRQb3NpdGlvbnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gLTEgJiYgdXNlZFBvc2l0aW9uc1tpXVswXSAtIF9wb3NpdGlvblswXSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBzb3V0aCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHVzZWRQb3NpdGlvbnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gLTEgJiYgdXNlZFBvc2l0aW9uc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB3ZXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodXNlZFBvc2l0aW9uc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAxICYmIHVzZWRQb3NpdGlvbnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgbm9ydGggPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh1c2VkUG9zaXRpb25zW2ldWzBdIC0gX3Bvc2l0aW9uWzBdID09IDEgJiYgdXNlZFBvc2l0aW9uc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBlYXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW25vcnRoLCBlYXN0LCBzb3V0aCwgd2VzdF07XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGdldE5laWdoYm91cnMoX3Bvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdKTogW251bWJlciwgbnVtYmVyXVtdIHtcclxuICAgICAgICBsZXQgbmVpZ2hib3VyczogW251bWJlciwgbnVtYmVyXVtdID0gW11cclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2goW19wb3NpdGlvblswXSwgX3Bvc2l0aW9uWzFdIC0gMV0pOyAvLyBkb3duXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKFtfcG9zaXRpb25bMF0gLSAxLCBfcG9zaXRpb25bMV1dKTsgLy8gbGVmdFxyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChbX3Bvc2l0aW9uWzBdLCBfcG9zaXRpb25bMV0gKyAxXSk7IC8vIHVwXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKFtfcG9zaXRpb25bMF0gKyAxLCBfcG9zaXRpb25bMV1dKTsgLy8gcmlnaHRcclxuICAgICAgICByZXR1cm4gbmVpZ2hib3VycztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzbGljZU5laWdoYm91cnMoX25laWdoYm91cnM6IFtudW1iZXIsIG51bWJlcl1bXSk6IFtudW1iZXIsIG51bWJlcl1bXSB7XHJcbiAgICAgICAgbGV0IG5laWdoYm91cnMgPSBfbmVpZ2hib3VycztcclxuICAgICAgICBsZXQgdG9SZW1vdmVJbmRleDogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5laWdoYm91cnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgLy8gY2hlY2sgaWNoIHBvc2l0aW9uIGFscmVhZHkgdXNlZFxyXG4gICAgICAgICAgICB1c2VkUG9zaXRpb25zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3Vyc1tpXVswXSA9PSByb29tWzBdICYmIG5laWdoYm91cnNbaV1bMV0gPT0gcm9vbVsxXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvUmVtb3ZlSW5kZXgucHVzaChpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGNvcHk6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtdO1xyXG4gICAgICAgIHRvUmVtb3ZlSW5kZXguZm9yRWFjaChpbmRleCA9PiB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBuZWlnaGJvdXJzW2luZGV4XTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBuZWlnaGJvdXJzLmZvckVhY2gobiA9PiB7XHJcbiAgICAgICAgICAgIGNvcHkucHVzaChuKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY29weTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3dpdGNoUm9vbShfY3VycmVudFJvb206IFJvb20sIF9kaXJlY3Rpb246IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSkge1xyXG4gICAgICAgIGxldCBvbGRPYmplY3RzOiBHYW1lLsaSLk5vZGVbXSA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbSA9PiAoPGFueT5lbGVtKS50YWcgIT0gVGFnLlRBRy5QTEFZRVIpO1xyXG5cclxuICAgICAgICBvbGRPYmplY3RzLmZvckVhY2goKGVsZW0pID0+IHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZChlbGVtKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaWYgKF9kaXJlY3Rpb25bMF0pIHtcclxuICAgICAgICAgICAgYWRkUm9vbVRvR3JhcGgoX2N1cnJlbnRSb29tLm5laWdoYm91ck4pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoX2RpcmVjdGlvblsxXSkge1xyXG4gICAgICAgICAgICBhZGRSb29tVG9HcmFwaChfY3VycmVudFJvb20ubmVpZ2hib3VyRSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChfZGlyZWN0aW9uWzJdKSB7XHJcbiAgICAgICAgICAgIGFkZFJvb21Ub0dyYXBoKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJTKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChfZGlyZWN0aW9uWzNdKSB7XHJcbiAgICAgICAgICAgIGFkZFJvb21Ub0dyYXBoKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJXKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGFkZFJvb21Ub0dyYXBoKF9yb29tOiBSb29tKSB7XHJcbiAgICAgICAgICAgIHNlbmRSb29tKF9yb29tKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfcm9vbSk7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQoX3Jvb20ud2FsbHNbMF0pO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKF9yb29tLndhbGxzWzFdKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hcHBlbmRDaGlsZChfcm9vbS53YWxsc1syXSk7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQoX3Jvb20ud2FsbHNbM10pO1xyXG5cclxuICAgICAgICAgICAgR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IF9yb29tLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbjtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX3Jvb20uZG9vcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoX3Jvb20uZG9vcnNbaV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFRhZyB7XHJcbiAgICBleHBvcnQgZW51bSBUQUd7XHJcbiAgICAgICAgUExBWUVSLFxyXG4gICAgICAgIEVORU1ZLFxyXG4gICAgICAgIEJVTExFVCxcclxuICAgICAgICBJVEVNLFxyXG4gICAgICAgIFJPT00sXHJcbiAgICAgICAgV0FMTCxcclxuICAgICAgICBET09SLFxyXG4gICAgICAgIERBTUFHRVVJXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgVUkge1xyXG4gICAgLy9sZXQgZGl2VUk6IEhUTUxEaXZFbGVtZW50ID0gPEhUTUxEaXZFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiVUlcIik7XHJcbiAgICBsZXQgcGxheWVyMVVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjFcIik7XHJcbiAgICBsZXQgcGxheWVyMlVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjJcIik7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVVJKCkge1xyXG4gICAgICAgIC8vQXZhdGFyMSBVSVxyXG4gICAgICAgICg8SFRNTERpdkVsZW1lbnQ+cGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSFBcIikpLnN0eWxlLndpZHRoID0gKEdhbWUuYXZhdGFyMS5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC8gR2FtZS5hdmF0YXIxLnByb3BlcnRpZXMuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgKiAxMDApICsgXCIlXCI7XHJcblxyXG4gICAgICAgIC8vSW52ZW50b3J5VUlcclxuICAgICAgICBHYW1lLmF2YXRhcjEuaXRlbXMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgZXhzaXN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgcGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbWdcIikuZm9yRWFjaCgoaW1nRWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGltZ0VsZW1lbnQuc3JjID09IGVsZW1lbnQuaW1nU3JjKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvL25vbmUgZXhzaXN0aW5nIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICBpZiAoIWV4c2lzdCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEhUTUxJbWFnZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgbmV3SXRlbS5zcmMgPSBlbGVtZW50LmltZ1NyYztcclxuICAgICAgICAgICAgICAgIHBsYXllcjFVSS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5hcHBlbmRDaGlsZChuZXdJdGVtKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvL0F2YXRhcjIgVUlcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgKDxIVE1MRGl2RWxlbWVudD5wbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNIUFwiKSkuc3R5bGUud2lkdGggPSAoR2FtZS5hdmF0YXIyLnByb3BlcnRpZXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLyBHYW1lLmF2YXRhcjIucHJvcGVydGllcy5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAqIDEwMCkgKyBcIiVcIjtcclxuXHJcbiAgICAgICAgICAgIC8vSW52ZW50b3J5VUlcclxuICAgICAgICAgICAgR2FtZS5hdmF0YXIyLml0ZW1zLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBleHNpc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgICAgIHBsYXllcjJVSS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5xdWVyeVNlbGVjdG9yQWxsKFwiaW1nXCIpLmZvckVhY2goKGltZ0VsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW1nRWxlbWVudC5zcmMgPT0gZWxlbWVudC5pbWdTcmMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL25vbmUgZXhzaXN0aW5nIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICAgICAgaWYgKCFleHNpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbTogSFRNTEltYWdlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zcmMgPSBlbGVtZW50LmltZ1NyYztcclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikuYXBwZW5kQ2hpbGQobmV3SXRlbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dFplcm86IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0T25lOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFRvdzogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRUaHJlZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRGb3VyOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dEZpdmU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U2l4OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNldmVuOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dEVpZ2h0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE5pbmU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VGVuOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERhbWFnZVVJIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuREFNQUdFVUk7XHJcbiAgICAgICAgdXA6IG51bWJlciA9IDAuMTU7XHJcbiAgICAgICAgbGlmZXRpbWU6IG51bWJlciA9IDAuNSAqIEdhbWUuZnJhbWVSYXRlO1xyXG5cclxuICAgICAgICBhc3luYyBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPj0gMCAmJiB0aGlzLmxpZmV0aW1lICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUtLTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfZGFtYWdlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJkYW1hZ2VVSVwiKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjMoMC4zMywgMC4zMywgMC4zMykpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgMC4yNSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWVzaCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUoX2RhbWFnZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBtb3ZlKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUobmV3IMaSLlZlY3RvcjMoMCwgdGhpcy51cCwgMCkpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsZSjGki5WZWN0b3IzLk9ORSgxLjAxKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxvYWRUZXh0dXJlKF90ZXh0dXJlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1R4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3Q29hdDogxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkID0gbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3TXRyOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm10clwiLCDGki5TaGFkZXJGbGF0VGV4dHVyZWQsIG5ld0NvYXQpO1xyXG4gICAgICAgICAgICBsZXQgb2xkQ29tQ29hdDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuXHJcbiAgICAgICAgICAgIG9sZENvbUNvYXQgPSB0aGlzLmdldENvbXBvbmVudCjGki5Db21wb25lbnRNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKF90ZXh0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0WmVybztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRPbmU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0VG93O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFRocmVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEZvdXI7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDU6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0Rml2ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNjpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRTZXZlbjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNzpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRFaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgODpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRFaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgOTpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHROaW5lO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxMDpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRUZW47XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBuZXdDb2F0LmNvbG9yID0gxpIuQ29sb3IuQ1NTKFwiV0hJVEVcIik7XHJcbiAgICAgICAgICAgIG5ld0NvYXQudGV4dHVyZSA9IG5ld1R4dDtcclxuICAgICAgICAgICAgb2xkQ29tQ29hdC5tYXRlcmlhbCA9IG5ld010cjtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBXZWFwb25zIHtcclxuICAgIGV4cG9ydCBjbGFzcyBXZWFwb24ge1xyXG4gICAgICAgIGNvb2xkb3duVGltZTogbnVtYmVyID0gMTA7XHJcbiAgICAgICAgcHVibGljIGN1cnJlbnRDb29sZG93blRpbWU6IG51bWJlciA9IHRoaXMuY29vbGRvd25UaW1lO1xyXG4gICAgICAgIGF0dGFja0NvdW50OiBudW1iZXIgPSAxO1xyXG4gICAgICAgIHB1YmxpYyBjdXJyZW50QXR0YWNrQ291bnQ6IG51bWJlciA9IHRoaXMuYXR0YWNrQ291bnQ7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29sZG93blRpbWU6IG51bWJlciwgX2F0dGFja0NvdW50OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5jb29sZG93blRpbWUgPSBfY29vbGRvd25UaW1lO1xyXG4gICAgICAgICAgICB0aGlzLmF0dGFja0NvdW50ID0gX2F0dGFja0NvdW50O1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBjb29sZG93bihfZmFrdG9yOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgbGV0IHNwZWNpZmljQ29vbERvd25UaW1lID0gdGhpcy5jb29sZG93blRpbWUgKiBfZmFrdG9yO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QXR0YWNrQ291bnQgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudENvb2xkb3duVGltZSA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29vbGRvd25UaW1lID0gc3BlY2lmaWNDb29sRG93blRpbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0YWNrQ291bnQgPSB0aGlzLmF0dGFja0NvdW50O1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmN1cnJlbnRDb29sZG93blRpbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDb29sZG93blRpbWUtLTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iXX0=