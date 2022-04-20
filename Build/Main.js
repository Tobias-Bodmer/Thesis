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
    Game.items = [];
    //#endregion "PublicVariables"
    //#region "PrivateVariables"
    let item1;
    let cmpCamera = new Game.ƒ.ComponentCamera();
    let playerType;
    const damper = 3.5;
    //#endregion "PrivateVariables"
    //#region "essential"
    async function init() {
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
            if (Game.connected) {
                Game.avatar1.cooldown();
                Game.avatar2.cooldown();
                Networking.updateAvatarPosition(Game.avatar1.mtxLocal.translation, Game.avatar1.mtxLocal.rotation);
            }
            //#region count items
            Game.items = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ITEM);
            if (Game.connected && Networking.client.idHost == Networking.client.id) {
                Game.items.forEach(element => {
                    // element.despawn();
                    // (<Items.InternalItem>element).collisionDetection();
                });
            }
            //#endregion
            Game.bullets = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.BULLET);
            if (Game.connected) {
                Game.bullets.forEach(element => {
                    element.update();
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
                    element.update();
                    if (element instanceof Enemy.EnemyShoot) {
                        element.weapon.cooldown(element.attributes.coolDownReduction);
                    }
                });
                Game.currentRoom = Game.graph.getChildren().find(elem => elem.tag == Tag.TAG.ROOM);
                if (Game.currentRoom.enemyCount <= 0) {
                    Game.currentRoom.finished = true;
                }
            }
            UI.updateUI();
        }
    }
    function start() {
        loadTextures();
        loadJSON();
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
        Game.internalItemJSON = loadItem.internalItems;
        const loadBullets = await (await fetch("./Resources/BulletStorage.json")).json();
        Game.bulletsJSON = loadBullets.standardBullets;
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
        await AnimationGeneration.txtSmallTickIdle.load("./Resources/Image/Enemies/smallTick/smallTickIdle.png");
        await AnimationGeneration.txtSmallTickWalk.load("./Resources/Image/Enemies/smallTick/smallTickWalk.png");
        AnimationGeneration.createAllAnimations();
        //Items
        await Items.txtIceBucket.load("./Resources/Image/Items/iceBucket.png");
        await Items.txtHealthUp.load("./Resources/Image/Items/healthUp.png");
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
            EnemySpawner.spawnEnemies();
            //#region init Items
            if (Networking.client.id == Networking.client.idHost) {
                item1 = new Items.InternalItem(Items.ITEMID.SCALEUP, new Game.ƒ.Vector2(0, 2), null);
                let item2 = new Items.InternalItem(Items.ITEMID.SCALEUP, new Game.ƒ.Vector2(0, -2), null);
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
            Game.avatar1 = new Player.Ranged(Entity.ID.PLAYER1, new Entity.Attributes(10, 5, 5, 1, 2, 5));
            playerType = Player.PLAYERTYPE.RANGED;
        }
        if (_e.target.id == "Melee") {
            Game.avatar1 = new Player.Melee(Entity.ID.PLAYER1, new Entity.Attributes(10, 1, 5, 1, 2, 10));
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
var Entity;
(function (Entity_1) {
    class Entity extends Game.ƒAid.NodeSprite {
        currentAnimation;
        tag;
        id;
        attributes;
        collider;
        canMoveX = true;
        canMoveY = true;
        moveDirection = Game.ƒ.Vector3.ZERO();
        animations = {};
        performKnockback = false;
        idleScale;
        buffs = [];
        constructor(_id, _attributes) {
            super(getNameById(_id));
            this.id = _id;
            this.attributes = _attributes;
            if (AnimationGeneration.getAnimationById(this.id) != null) {
                let ani = AnimationGeneration.getAnimationById(this.id);
                this.animations = ani.animations;
                this.idleScale = ani.idleScale;
            }
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.scale(new ƒ.Vector3(this.attributes.scale, this.attributes.scale, this.attributes.scale));
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2);
        }
        update() {
            this.updateCollider();
            this.updateBuffs();
        }
        updateCollider() {
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
        }
        updateBuffs() {
            if (this.buffs.length == 0) {
                return;
            }
            for (let i = 0; i < this.buffs.length; i++) {
                if (this.buffs[i] instanceof Buff.DamageBuff) {
                    if (!this.buffs[i].doBuffStuff(this)) {
                        this.buffs.slice(i);
                    }
                }
            }
        }
        collide(_direction) {
            this.canMoveX = true;
            this.canMoveY = true;
            let colliders = Game.graph.getChildren().find(element => element.tag == Tag.TAG.ROOM).walls;
            colliders.forEach((element) => {
                if (this.collider.collidesRect(element.collider)) {
                    let intersection = this.collider.getIntersectionRect(element.collider);
                    let areaBeforeMove = intersection.height * intersection.width;
                    if (areaBeforeMove < this.mtxLocal.scaling.x * this.mtxLocal.scaling.y) {
                        let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                        let newDirection = new Game.ƒ.Vector2(_direction.x, 0);
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                        if (this.collider.getIntersectionRect(element.collider) != null) {
                            let newIntersection = this.collider.getIntersectionRect(element.collider);
                            let areaAfterMove = newIntersection.height * newIntersection.width;
                            if (areaBeforeMove < areaAfterMove) {
                                this.canMoveX = false;
                            }
                        }
                        this.collider.position = oldPosition;
                        newDirection = new Game.ƒ.Vector2(0, _direction.y);
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                        if (this.collider.getIntersectionRect(element.collider) != null) {
                            let newIntersection = this.collider.getIntersectionRect(element.collider);
                            let areaAfterMove = newIntersection.height * newIntersection.width;
                            if (areaBeforeMove < areaAfterMove) {
                                this.canMoveY = false;
                            }
                        }
                        this.collider.position = oldPosition;
                    }
                    else {
                        this.canMoveX = false;
                        this.canMoveY = false;
                    }
                }
            });
        }
        getDamage(_value) {
            let hitValue = this.getDamageReduction(_value);
            if (_value != null && this.attributes.hitable) {
                this.attributes.healthPoints -= hitValue;
                Game.graph.addChild(new UI.DamageUI(this.mtxLocal.translation, Math.round(hitValue)));
            }
        }
        getDamageReduction(_value) {
            return _value * (1 - (this.attributes.armor / 100));
        }
        //#region knockback
        doKnockback(_body) {
        }
        getKnockback(_knockbackForce, _position) {
            if (!this.performKnockback) {
                this.performKnockback = true;
                let direction = Game.ƒ.Vector2.DIFFERENCE(this.cmpTransform.mtxLocal.translation.toVector2(), _position.toVector2()).toVector3(0);
                let knockBackScaling = Game.frameRate * this.attributes.scale;
                direction.normalize();
                direction.scale(_knockbackForce * 1 / knockBackScaling);
                this.moveDirection.add(direction);
                reduceKnockback(this, direction, this.moveDirection);
                function reduceKnockback(_elem, _direction, _moveDirection) {
                    // _knockbackForce = _knockbackForce / knockBackScaling;
                    if (_knockbackForce > 0.01) {
                        setTimeout(() => {
                            _moveDirection.subtract(direction);
                            _knockbackForce /= 3;
                            direction.scale(_knockbackForce * (1 / knockBackScaling));
                            _moveDirection.add(direction);
                            reduceKnockback(_elem, _direction, _moveDirection);
                        }, 200);
                    }
                    else {
                        _moveDirection.subtract(direction);
                        _elem.performKnockback = false;
                    }
                }
            }
        }
    }
    Entity_1.Entity = Entity;
    let ANIMATIONSTATES;
    (function (ANIMATIONSTATES) {
        ANIMATIONSTATES[ANIMATIONSTATES["IDLE"] = 0] = "IDLE";
        ANIMATIONSTATES[ANIMATIONSTATES["WALK"] = 1] = "WALK";
        ANIMATIONSTATES[ANIMATIONSTATES["SUMMON"] = 2] = "SUMMON";
    })(ANIMATIONSTATES = Entity_1.ANIMATIONSTATES || (Entity_1.ANIMATIONSTATES = {}));
    let ID;
    (function (ID) {
        ID[ID["PLAYER1"] = 0] = "PLAYER1";
        ID[ID["PLAYER2"] = 1] = "PLAYER2";
        ID[ID["BAT"] = 2] = "BAT";
        ID[ID["REDTICK"] = 3] = "REDTICK";
        ID[ID["SMALLTICK"] = 4] = "SMALLTICK";
        ID[ID["SKELETON"] = 5] = "SKELETON";
    })(ID = Entity_1.ID || (Entity_1.ID = {}));
    function getNameById(_id) {
        switch (_id) {
            case ID.PLAYER1:
                return "player1";
            case ID.PLAYER2:
                return "player2";
            case ID.BAT:
                return "bat";
            case ID.REDTICK:
                return "redTick";
            case ID.SMALLTICK:
                return "smallTick";
            case ID.SKELETON:
                return "skeleton";
        }
    }
    Entity_1.getNameById = getNameById;
})(Entity || (Entity = {}));
var Enemy;
(function (Enemy_1) {
    Enemy_1.txtTick = new ƒ.TextureImage();
    let BEHAVIOUR;
    (function (BEHAVIOUR) {
        BEHAVIOUR[BEHAVIOUR["IDLE"] = 0] = "IDLE";
        BEHAVIOUR[BEHAVIOUR["FOLLOW"] = 1] = "FOLLOW";
        BEHAVIOUR[BEHAVIOUR["FLEE"] = 2] = "FLEE";
        BEHAVIOUR[BEHAVIOUR["MOVE"] = 3] = "MOVE";
        BEHAVIOUR[BEHAVIOUR["SUMMON"] = 4] = "SUMMON";
        BEHAVIOUR[BEHAVIOUR["DASH"] = 5] = "DASH";
    })(BEHAVIOUR = Enemy_1.BEHAVIOUR || (Enemy_1.BEHAVIOUR = {}));
    class Enemy extends Entity.Entity {
        currentState;
        netId;
        target;
        lifetime;
        moveDirection = Game.ƒ.Vector3.ZERO();
        constructor(_id, _attributes, _position, _netId) {
            super(_id, _attributes);
            this.attributes = _attributes;
            this.currentState = BEHAVIOUR.IDLE;
            this.currentAnimation = Entity.ANIMATIONSTATES.IDLE;
            this.tag = Tag.TAG.ENEMY;
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.1);
            if (_netId != undefined) {
                if (this.netId != undefined) {
                    Networking.popID(this.netId);
                }
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            else {
                this.netId = Networking.idGenerator();
            }
            this.setAnimation(this.animations["idle"]);
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), (this.mtxLocal.scaling.x * this.idleScale) / 2);
            Networking.spawnEnemy(this, this.netId);
        }
        update() {
            super.update();
            this.moveBehaviour();
            this.move(this.moveDirection);
            Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId, this.currentAnimation);
        }
        doKnockback(_body) {
            // (<Player.Player>_body).getKnockback(this.attributes.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }
        getKnockback(_knockbackForce, _position) {
            super.getKnockback(_knockbackForce, _position);
        }
        move(_direction) {
            this.moveDirection.add(_direction);
            this.collide(this.moveDirection);
            this.moveDirection.subtract(_direction);
        }
        moveBehaviour() {
        }
        moveSimple(_target) {
            this.target = _target;
            let direction = Game.ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation);
            direction.normalize();
            direction.scale((1 / Game.frameRate * this.attributes.speed));
            return direction.toVector2();
        }
        moveAway(_target) {
            let moveSimple = this.moveSimple(_target);
            moveSimple.x *= -1;
            moveSimple.y *= -1;
            return moveSimple;
        }
        getDamage(_value) {
            super.getDamage(_value);
            if (Networking.client.idHost == Networking.client.id) {
                if (this.attributes.healthPoints <= 0) {
                    Networking.removeEnemy(this.netId);
                    Networking.popID(this.netId);
                    this.die();
                }
            }
        }
        die() {
            Game.graph.removeChild(this);
        }
        collide(_direction) {
            super.collide(_direction);
            let avatarColliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.PLAYER);
            avatarColliders.forEach((element) => {
                if (this.collider.collides(element.collider)) {
                    let intersection = this.collider.getIntersection(element.collider);
                    let areaBeforeMove = intersection;
                    if (areaBeforeMove < this.collider.radius + element.collider.radius) {
                        let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                        let newDirection = new Game.ƒ.Vector2(_direction.x, 0);
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                        if (this.collider.getIntersection(element.collider) != null) {
                            let newIntersection = this.collider.getIntersection(element.collider);
                            let areaAfterMove = newIntersection;
                            if (areaBeforeMove < areaAfterMove) {
                                this.canMoveX = false;
                            }
                        }
                        this.collider.position = oldPosition;
                        newDirection = new Game.ƒ.Vector2(0, _direction.y);
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                        if (this.collider.getIntersection(element.collider) != null) {
                            let newIntersection = this.collider.getIntersection(element.collider);
                            let areaAfterMove = newIntersection;
                            if (areaBeforeMove < areaAfterMove) {
                                this.canMoveY = false;
                            }
                        }
                        this.collider.position = oldPosition;
                    }
                    if (Networking.client.id == Networking.client.idHost) {
                        if (element == Game.avatar1) {
                            element.getKnockback(this.attributes.knockbackForce, this.mtxLocal.translation);
                        }
                        if (element == Game.avatar2) {
                            Networking.knockbackPush(this.attributes.knockbackForce, this.mtxLocal.translation);
                        }
                    }
                }
            });
            if (this.canMoveX && this.canMoveY) {
                this.cmpTransform.mtxLocal.translate(_direction);
            }
            else if (this.canMoveX && !this.canMoveY) {
                _direction = new ƒ.Vector3(_direction.x, 0, _direction.z);
                this.cmpTransform.mtxLocal.translate(_direction);
            }
            else if (!this.canMoveX && this.canMoveY) {
                _direction = new ƒ.Vector3(0, _direction.y, _direction.z);
                this.cmpTransform.mtxLocal.translate(_direction);
            }
        }
        switchAnimation(_name) {
            switch (_name) {
                case "idle":
                    if (this.currentAnimation != Entity.ANIMATIONSTATES.IDLE) {
                        this.setAnimation(this.animations[_name]);
                        this.setFrameDirection(1);
                        this.framerate = AnimationGeneration.getAnimationById(this.id).idleFrameRate;
                        this.currentAnimation = Entity.ANIMATIONSTATES.IDLE;
                        Networking.updateEnemyState(this.currentAnimation, this.netId);
                    }
                    break;
                case "walk":
                    if (this.currentAnimation != Entity.ANIMATIONSTATES.WALK) {
                        this.setAnimation(this.animations[_name]);
                        this.setFrameDirection(1);
                        this.framerate = AnimationGeneration.getAnimationById(this.id).walkFrameRate;
                        this.currentAnimation = Entity.ANIMATIONSTATES.WALK;
                        Networking.updateEnemyState(this.currentAnimation, this.netId);
                    }
                    break;
                case "summon":
                    if (this.currentAnimation != Entity.ANIMATIONSTATES.SUMMON) {
                        this.setAnimation(this.animations[_name]);
                        this.setFrameDirection(1);
                        this.framerate = AnimationGeneration.getAnimationById(this.id).walkFrameRate;
                        this.currentAnimation = Entity.ANIMATIONSTATES.SUMMON;
                        Networking.updateEnemyState(this.currentAnimation, this.netId);
                    }
            }
        }
    }
    Enemy_1.Enemy = Enemy;
    class EnemyDumb extends Enemy {
        constructor(_id, _attributes, _position, _netId) {
            super(_id, _attributes, _position, _netId);
        }
        update() {
            super.update();
        }
        behaviour() {
            let target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
            let distance = ƒ.Vector3.DIFFERENCE(target, this.cmpTransform.mtxLocal.translation).magnitude;
            //TODO: set to 3 after testing
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
                    this.switchAnimation("idle");
                    break;
                case BEHAVIOUR.FOLLOW:
                    this.switchAnimation("walk");
                    this.moveDirection = this.moveSimple(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
                    break;
                // default:
                //     // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                //     // break;
            }
        }
    }
    Enemy_1.EnemyDumb = EnemyDumb;
    // export class EnemyDash extends Enemy {
    //     isAttacking = false;
    //     perfomrAbility = false;
    //     lastMoveDireciton: Game.ƒ.Vector3;
    //     dashCount: number = 1;
    //     avatars: Player.Player[] = [];
    //     randomPlayer = Math.round(Math.random());
    //     constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
    //         super(_id, _attributes, _position, _netId);
    //     }
    //     public update(): void {
    //         super.update();
    //     }
    //     behaviour() {
    //         this.avatars = [Game.avatar1, Game.avatar2]
    //         this.target = (<Player.Player>this.avatars[this.randomPlayer]).mtxLocal.translation.toVector2();
    //         let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
    //         if (distance > 5) {
    //             this.currentState = BEHAVIOUR.FOLLOW;
    //             this.isAttacking = false;
    //         }
    //         else if (distance < 3 && !this.isAttacking) {
    //             this.doDash();
    //         }
    //         else {
    //             // this.currentState = BEHAVIOUR.IDLE;
    //         }
    //     }
    //     doDash() {
    //         if (!this.isAttacking) {
    //             this.isAttacking = true;
    //             this.attributes.hitable = false;
    //             this.attributes.speed *= 2;
    //             setTimeout(() => {
    //                 this.attributes.speed /= 2;
    //                 this.attributes.hitable = true;
    //             }, 300);
    //         }
    //     }
    //     moveBehaviour(): void {
    //         this.behaviour();
    //         switch (this.currentState) {
    //             case BEHAVIOUR.FOLLOW:
    //                 this.switchAnimation("walk");
    //                 if (this.isAttacking) {
    //                     this.moveDirection = this.moveSimple(this.lastMoveDireciton.toVector2()).toVector3();
    //                 }
    //                 else {
    //                     this.moveDirection = this.moveSimple(this.target).toVector3();
    //                     this.lastMoveDireciton = this.moveDirection;
    //                 }
    //                 break;
    //             case BEHAVIOUR.IDLE:
    //                 this.switchAnimation("idle");
    //                 break;
    //         }
    //     }
    // }
    class EnemyPatrol extends Enemy {
        patrolPoints = [new ƒ.Vector2(0, 4), new ƒ.Vector2(5, 0)];
        waitTime = 1000;
        currenPointIndex = 0;
        update() {
            super.update();
        }
        moveBehaviour() {
            this.patrol();
        }
        patrol() {
            if (this.mtxLocal.translation.getDistance(ƒ.Vector3.SUM(this.patrolPoints[this.currenPointIndex].toVector3(), Game.currentRoom.mtxLocal.translation)) > 0.3) {
                this.moveDirection = this.moveSimple((ƒ.Vector2.SUM(this.patrolPoints[this.currenPointIndex], Game.currentRoom.mtxLocal.translation.toVector2()))).toVector3();
            }
            else {
                setTimeout(() => {
                    if (this.currenPointIndex + 1 < this.patrolPoints.length) {
                        this.currenPointIndex++;
                    }
                    else {
                        this.currenPointIndex = 0;
                    }
                }, this.waitTime);
            }
        }
    }
    Enemy_1.EnemyPatrol = EnemyPatrol;
    class EnemyShoot extends Enemy {
        weapon;
        viewRadius = 3;
        constructor(_id, _attributes, _position, _weapon, _netId) {
            super(_id, _attributes, _position, _netId);
            this.weapon = _weapon;
        }
        update() {
            super.update();
            this.shoot();
        }
        shoot(_netId) {
            let target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation);
            let _direction = ƒ.Vector3.DIFFERENCE(target, this.mtxLocal.translation);
            // if (this.weapon.currentAttackCount > 0 && _direction.magnitude < this.viewRadius) {
            //     _direction.normalize();
            //     // let bullet: Bullets.Bullet = new Bullets.HomingBullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction, Calculation.getCloserAvatarPosition(this.mtxLocal.translation), _netId);
            //     bullet.owner = this.tag;
            //     bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
            //     Game.graph.addChild(bullet);
            //     if (Networking.client.id == Networking.client.idHost) {
            //         Networking.spawnBulletAtEnemy(bullet.netId, this.netId);
            //         this.weapon.currentAttackCount--;
            //     }
            // }
            this.weapon.shoot(this.tag, this.mtxLocal.translation.toVector2(), _direction, _netId);
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
    let ITEMID;
    (function (ITEMID) {
        ITEMID[ITEMID["COOLDOWN"] = 0] = "COOLDOWN";
        ITEMID[ITEMID["DMGUP"] = 1] = "DMGUP";
        ITEMID[ITEMID["SPEEDUP"] = 2] = "SPEEDUP";
        ITEMID[ITEMID["PROJECTILESUP"] = 3] = "PROJECTILESUP";
        ITEMID[ITEMID["HEALTHUP"] = 4] = "HEALTHUP";
        ITEMID[ITEMID["SCALEUP"] = 5] = "SCALEUP";
        ITEMID[ITEMID["SCALEDOWN"] = 6] = "SCALEDOWN";
        ITEMID[ITEMID["ARMORUP"] = 7] = "ARMORUP";
        ITEMID[ITEMID["HOMECOMING"] = 8] = "HOMECOMING";
    })(ITEMID = Items.ITEMID || (Items.ITEMID = {}));
    Items.txtIceBucket = new ƒ.TextureImage();
    Items.txtDmgUp = new ƒ.TextureImage();
    Items.txtHealthUp = new ƒ.TextureImage();
    class Item extends Game.ƒ.Node {
        tag = Tag.TAG.ITEM;
        id;
        netId = Networking.idGenerator();
        description;
        imgSrc;
        collider;
        transform = new ƒ.ComponentTransform();
        position;
        constructor(_id, _position, _netId) {
            super(getInternalItemById(_id).name);
            this.id = _id;
            const item = getInternalItemById(this.id);
            this.position = _position;
            this.transform.mtxLocal.translation = _position.toVector3();
            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            this.description = item.description;
            this.imgSrc = item.imgSrc;
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad()));
            let material = new ƒ.Material("white", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            this.addComponent(new ƒ.ComponentMaterial(material));
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = _position.toVector3();
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2);
        }
        async loadTexture(_texture) {
            let newTxt = new ƒ.TextureImage();
            newTxt = _texture;
            let newCoat = new ƒ.CoatRemissiveTextured();
            newCoat.texture = newTxt;
            let newMtr = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);
            this.getComponent(Game.ƒ.ComponentMaterial).material = newMtr;
        }
        setPosition(_position) {
            this.mtxLocal.translation = _position.toVector3();
        }
        despawn() {
            Networking.popID(this.netId);
            Networking.removeItem(this.netId);
            Game.graph.removeChild(this);
        }
        doYourThing(_avatar) {
        }
    }
    Items.Item = Item;
    class InternalItem extends Item {
        value;
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.value = getInternalItemById(_id).value;
            this.setTextureById(_id);
            Networking.spawnInternalItem(this, this.id, _position, this.netId);
        }
        doYourThing(_avatar) {
            this.setAttributesById(this.id, _avatar);
            this.despawn();
        }
        setAttributesById(_id, _avatar) {
            switch (_id) {
                case ITEMID.COOLDOWN:
                    _avatar.attributes.coolDownReduction = Calculation.subPercentageAmountToValue(_avatar.attributes.coolDownReduction, this.value);
                    console.log(this.description + ": " + _avatar.attributes.coolDownReduction);
                    Networking.updateAvatarAttributes(_avatar.attributes);
                    break;
                case ITEMID.DMGUP:
                    _avatar.attributes.attackPoints += this.value;
                    console.log(this.description + ": " + _avatar.attributes.attackPoints);
                    Networking.updateAvatarAttributes(_avatar.attributes);
                    break;
                case ITEMID.SPEEDUP:
                    _avatar.attributes.speed = Calculation.subPercentageAmountToValue(_avatar.attributes.speed, this.value);
                    console.log(this.description + ": " + _avatar.attributes.speed);
                    Networking.updateAvatarAttributes(_avatar.attributes);
                    break;
                case ITEMID.PROJECTILESUP:
                    _avatar.weapon.projectileAmount += this.value;
                    console.log(this.description + ": " + _avatar.weapon.projectileAmount);
                    Networking.updateAvatarWeapon(_avatar.weapon);
                    break;
                case ITEMID.HEALTHUP:
                    _avatar.attributes.healthPoints = Calculation.addPercentageAmountToValue(_avatar.attributes.maxHealthPoints, this.value);
                    console.log(this.description + ": " + _avatar.attributes.maxHealthPoints);
                    Networking.updateAvatarAttributes(_avatar.attributes);
                    break;
                case ITEMID.SCALEUP:
                    _avatar.attributes.scale = Calculation.addPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    _avatar.attributes.updateScaleDependencies();
                    _avatar.mtxLocal.scale(new ƒ.Vector3(_avatar.attributes.scale, _avatar.attributes.scale, _avatar.attributes.scale));
                    console.log(this.description + ": " + _avatar.attributes.scale);
                    Networking.updateAvatarAttributes(_avatar.attributes);
                    //TODO: set new collider and sync over network
                    break;
                case ITEMID.SCALEDOWN:
                    _avatar.attributes.scale = Calculation.subPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    _avatar.mtxLocal.scale(new ƒ.Vector3(_avatar.attributes.scale, _avatar.attributes.scale, _avatar.attributes.scale));
                    _avatar.attributes.updateScaleDependencies();
                    console.log(this.description + ": " + _avatar.attributes.scale);
                    Networking.updateAvatarAttributes(_avatar.attributes);
                    //TODO: set new collider and sync over network
                    break;
                case ITEMID.ARMORUP:
                    _avatar.attributes.armor += this.value;
                    console.log(this.description + ": " + _avatar.attributes.armor);
                    Networking.updateAvatarAttributes(_avatar.attributes);
                    break;
                case ITEMID.HOMECOMING:
                    //TODO: talk with tobi
                    break;
            }
        }
        setTextureById(_id) {
            switch (_id) {
                case ITEMID.COOLDOWN:
                    this.loadTexture(Items.txtIceBucket);
                    break;
                case ITEMID.DMGUP:
                    this.loadTexture(Items.txtIceBucket); //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.SPEEDUP:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.PROJECTILESUP:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.HEALTHUP:
                    this.loadTexture(Items.txtHealthUp);
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.SCALEUP:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.SCALEDOWN:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.ARMORUP:
                    //TODO: add correct texture and change in JSON
                    break;
            }
        }
    }
    Items.InternalItem = InternalItem;
    function getInternalItemById(_id) {
        return Game.internalItemJSON.find(item => item.id == _id);
    }
})(Items || (Items = {}));
var AnimationGeneration;
(function (AnimationGeneration) {
    AnimationGeneration.txtRedTickIdle = new ƒ.TextureImage();
    AnimationGeneration.txtRedTickWalk = new ƒ.TextureImage();
    AnimationGeneration.txtSmallTickIdle = new ƒ.TextureImage();
    AnimationGeneration.txtSmallTickWalk = new ƒ.TextureImage();
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
        idleScale;
        walkScale;
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
    let batAnimation = new MyAnimationClass(Entity.ID.BAT, AnimationGeneration.txtBatIdle, 4, 12);
    let redTickAnimation = new MyAnimationClass(Entity.ID.REDTICK, AnimationGeneration.txtRedTickIdle, 6, 12, AnimationGeneration.txtRedTickWalk, 4, 12);
    let smallTickAnimation = new MyAnimationClass(Entity.ID.SMALLTICK, AnimationGeneration.txtRedTickIdle, 6, 12, AnimationGeneration.txtRedTickWalk, 4, 12);
    batAnimation.animations[""];
    //#endregion
    function getAnimationById(_id) {
        switch (_id) {
            case Entity.ID.BAT:
                return batAnimation;
            case Entity.ID.REDTICK:
                return redTickAnimation;
            case Entity.ID.SMALLTICK:
                return smallTickAnimation;
            default:
                return null;
        }
    }
    AnimationGeneration.getAnimationById = getAnimationById;
    function createAllAnimations() {
        AnimationGeneration.sheetArray.push(batAnimation, redTickAnimation, smallTickAnimation);
        AnimationGeneration.sheetArray.forEach(obj => {
            let idleWidth = obj.spriteSheetIdle.texture.texImageSource.width / obj.idleNumberOfFrames;
            let idleHeigth = obj.spriteSheetIdle.texture.texImageSource.height;
            let walkWidth = obj.spriteSheetWalk.texture.texImageSource.width / obj.walkNumberOfFrames;
            let walkHeigth = obj.spriteSheetWalk.texture.texImageSource.height;
            generateAnimationFromGrid(obj.spriteSheetIdle, obj.animations, "idle", idleWidth, idleHeigth, obj.idleNumberOfFrames, obj.idleFrameRate, 22);
            generateAnimationFromGrid(obj.spriteSheetWalk, obj.animations, "walk", walkWidth, walkHeigth, obj.walkNumberOfFrames, obj.walkFrameRate, 22);
            obj.idleScale = getPixelRatio(idleHeigth, idleWidth);
            obj.walkScale = getPixelRatio(walkHeigth, walkWidth);
        });
    }
    AnimationGeneration.createAllAnimations = createAllAnimations;
    function getPixelRatio(_width, _height) {
        let max = Math.max(_width, _height);
        let min = Math.min(_width, _height);
        let scale = 1 / max * min;
        return scale;
    }
    function generateAnimationFromGrid(_spritesheet, _animationsheet, _animationName, _width, _height, _numberOfFrames, _frameRate, _resolution) {
        let name = _animationName;
        let createdAnimation = new AnimationGeneration.ƒAid.SpriteSheetAnimation(name, _spritesheet);
        createdAnimation.generateByGrid(ƒ.Rectangle.GET(0, 0, _width, _height), _numberOfFrames, 32, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(_width));
        _animationsheet[name] = createdAnimation;
        console.log(name + ": " + _animationsheet[name]);
    }
    AnimationGeneration.generateAnimationFromGrid = generateAnimationFromGrid;
})(AnimationGeneration || (AnimationGeneration = {}));
var Entity;
(function (Entity) {
    class Attributes {
        healthPoints;
        maxHealthPoints;
        knockbackForce;
        hitable = true;
        armor;
        speed;
        attackPoints;
        coolDownReduction = 1;
        scale;
        constructor(_healthPoints, _attackPoints, _speed, _scale, _knockbackForce, _armor, _cooldownReduction) {
            this.scale = _scale;
            this.armor = _armor;
            this.healthPoints = Math.fround(_healthPoints * (100 + (10 * this.scale)) / 100);
            this.maxHealthPoints = this.healthPoints;
            this.attackPoints = Math.fround(_attackPoints * this.scale);
            this.speed = Math.fround(_speed / this.scale);
            this.knockbackForce = _knockbackForce;
            this.knockbackForce = this.knockbackForce * (100 + (10 * this.scale)) / 100;
            if (_cooldownReduction != undefined) {
                this.coolDownReduction = _cooldownReduction;
            }
        }
        updateScaleDependencies() {
            this.healthPoints = Math.fround(this.healthPoints * (100 + (10 * this.scale)) / 100);
            this.attackPoints = Math.fround(this.attackPoints * this.scale);
            this.speed = Math.fround(this.speed / this.scale);
            this.knockbackForce = this.knockbackForce * (100 + (10 * this.scale)) / 100;
        }
    }
    Entity.Attributes = Attributes;
})(Entity || (Entity = {}));
var Enemy;
(function (Enemy) {
    class SummonorBoss extends Enemy.EnemyDumb {
        constructor(_id, _attributes, _position, _netId) {
            super(_id, _attributes, _position, _netId);
        }
        update() {
            super.update();
        }
        behaviour() {
            let target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
            let distance = ƒ.Vector3.DIFFERENCE(target, this.cmpTransform.mtxLocal.translation).magnitude;
            //TODO: set to 3 after testing
            if (distance < 5) {
                this.currentState = Enemy.BEHAVIOUR.FLEE;
            }
            else {
                let nextState = Math.round(Math.random());
                switch (nextState) {
                    case 0:
                        this.currentState = Enemy.BEHAVIOUR.SUMMON;
                        break;
                    case 1:
                        this.currentState = Enemy.BEHAVIOUR.IDLE;
                        break;
                    default:
                        break;
                }
            }
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentState) {
                case Enemy.BEHAVIOUR.IDLE:
                    this.switchAnimation("idle");
                    break;
                case Enemy.BEHAVIOUR.FLEE:
                    this.switchAnimation("walk");
                    this.moveDirection = this.moveAway(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
                    break;
                case Enemy.BEHAVIOUR.SUMMON:
                    this.switchAnimation("summon");
                    this.summon();
                    break;
                // default:
                //     // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                //     // break;
            }
        }
        summon() {
            EnemySpawner.spawnByID(Entity.ID.SMALLTICK, this.mtxLocal.translation.toVector2(), new Entity.Attributes(5, 5, 3, Math.random() * 2 + 1, 0, 0));
        }
    }
    Enemy.SummonorBoss = SummonorBoss;
})(Enemy || (Enemy = {}));
var Buff;
(function (Buff_1) {
    let BUFFID;
    (function (BUFFID) {
        BUFFID[BUFFID["BLEEDING"] = 0] = "BLEEDING";
    })(BUFFID = Buff_1.BUFFID || (Buff_1.BUFFID = {}));
    class Buff {
        duration;
        tickRate;
        id;
        constructor(_id, _duration, _tickRate) {
            this.id = _id;
            this.duration = _duration;
            this.tickRate = _tickRate;
        }
        applyBuff(_avatar) {
        }
        doBuffStuff(_avatar) {
            if (this.duration <= 0) {
                return false;
            }
            else if (this.duration % this.tickRate == 0) {
                this.applyBuff(_avatar);
            }
            this.duration--;
            return true;
        }
    }
    Buff_1.Buff = Buff;
    class DamageBuff extends Buff {
        value = 1;
        constructor(_id, _duration, _tickRate) {
            super(_id, _duration, _tickRate);
        }
        applyBuff(_avatar) {
            this.getBuffDamgeById(this.id, _avatar);
        }
        getBuffDamgeById(_id, _avatar) {
            switch (_id) {
                case BUFFID.BLEEDING:
                    _avatar.getDamage(this.value);
                    break;
            }
        }
    }
    Buff_1.DamageBuff = DamageBuff;
})(Buff || (Buff = {}));
var Bullets;
(function (Bullets) {
    let BULLETTYPE;
    (function (BULLETTYPE) {
        BULLETTYPE[BULLETTYPE["STANDARD"] = 0] = "STANDARD";
        BULLETTYPE[BULLETTYPE["HIGHSPEED"] = 1] = "HIGHSPEED";
        BULLETTYPE[BULLETTYPE["SLOW"] = 2] = "SLOW";
        BULLETTYPE[BULLETTYPE["MELEE"] = 3] = "MELEE";
        BULLETTYPE[BULLETTYPE["HOMING"] = 4] = "HOMING";
    })(BULLETTYPE = Bullets.BULLETTYPE || (Bullets.BULLETTYPE = {}));
    Bullets.bulletTxt = new ƒ.TextureImage();
    class Bullet extends Game.ƒ.Node {
        tag = Tag.TAG.BULLET;
        owner;
        netId = Networking.idGenerator();
        tick = 0;
        positions = [];
        hostPositions = [];
        flyDirection;
        direction;
        collider;
        hitPointsScale = 5;
        speed = 20;
        lifetime = 1 * Game.frameRate;
        knockbackForce = 4;
        type;
        time = 0;
        killcount = 1;
        async despawn() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    Networking.popID(this.netId);
                    Networking.removeBullet(this.netId);
                    Game.graph.removeChild(this);
                    // console.log(this.hostPositions);
                    // console.log(this.positions);
                }
            }
        }
        constructor(_name, _speed, _hitPoints, _lifetime, _knockbackForce, _killcount, _position, _direction, _netId) {
            super(_name);
            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            this.speed = _speed;
            this.hitPointsScale = _hitPoints;
            this.lifetime = _lifetime;
            this.knockbackForce = _knockbackForce;
            this.killcount = _killcount;
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
            this.direction = _direction;
        }
        async update() {
            this.cmpTransform.mtxLocal.translate(this.flyDirection);
            this.bulletPrediction();
            this.collisionDetection();
            this.despawn();
        }
        doKnockback(_body) {
            _body.getKnockback(this.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }
        getKnockback(_knockbackForce, _position) {
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
                if (this.collider.collides(element.collider) && element.attributes != undefined && this.killcount > 0) {
                    if (element.attributes.healthPoints > 0) {
                        element.getDamage(this.hitPointsScale);
                        element.buffs.push(new Buff.DamageBuff(Buff.BUFFID.BLEEDING, 300, 60));
                        element.getKnockback(this.knockbackForce, this.mtxLocal.translation);
                        this.lifetime = 0;
                        this.killcount--;
                    }
                }
            });
            if (this.owner == Tag.TAG.ENEMY) {
                colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.PLAYER);
                colliders.forEach((element) => {
                    if (this.collider.collides(element.collider) && element.attributes != undefined && this.killcount > 0) {
                        if (element.attributes.healthPoints > 0 && element.attributes.hitable) {
                            element.getDamage(this.hitPointsScale);
                            element.getKnockback(this.knockbackForce, this.mtxLocal.translation);
                            Game.graph.addChild(new UI.DamageUI(element.cmpTransform.mtxLocal.translation, this.hitPointsScale));
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
    class MeleeBullet extends Bullet {
        constructor(_name, _speed, _hitPoints, _lifetime, _knockbackForce, _killcount, _position, _direction, _netId) {
            super(_name, _speed, _hitPoints, _lifetime, _knockbackForce, _killcount, _position, _direction, _netId);
            this.speed = 6;
            this.hitPointsScale = 10;
            this.lifetime = 6;
            this.killcount = 4;
        }
        async loadTexture() {
        }
    }
    Bullets.MeleeBullet = MeleeBullet;
    class HomingBullet extends Bullet {
        target = new ƒ.Vector3(0, 0, 0);
        rotateSpeed = 2;
        targetDirection;
        constructor(_name, _speed, _hitPoints, _lifetime, _knockbackForce, _killcount, _position, _direction, _target, _netId) {
            super(_name, _speed, _hitPoints, _lifetime, _knockbackForce, _killcount, _position, _direction, _netId);
            this.speed = 20;
            this.hitPointsScale = 5;
            this.lifetime = 1 * Game.frameRate;
            this.killcount = 1;
            if (_target != null) {
                this.target = _target;
            }
            else {
                this.target = ƒ.Vector3.SUM(this.mtxLocal.translation, _direction);
            }
            this.targetDirection = _direction;
        }
        async update() {
            this.calculateHoming();
            super.update();
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
    let spawnTime = 0 * Game.frameRate;
    let currentTime = spawnTime;
    let maxEnemies = 0;
    function spawnEnemies() {
        if (Networking.client.idHost == Networking.client.id) {
            let currentRoom = Game.graph.getChildren().find(elem => elem.tag == Tag.TAG.ROOM);
            maxEnemies = currentRoom.enemyCount;
            while (maxEnemies > 0) {
                maxEnemies = currentRoom.enemyCount;
                if (currentTime == spawnTime) {
                    let position = new ƒ.Vector2((Math.random() * 7 - (Math.random() * 7)) * 2, (Math.random() * 7 - (Math.random() * 7) * 2));
                    position.add(currentRoom.mtxLocal.translation.toVector2());
                    // console.log(position);
                    spawnByID(Entity.ID.REDTICK, position);
                    currentRoom.enemyCount--;
                }
                currentTime--;
                if (currentTime <= 0) {
                    currentTime = spawnTime;
                }
            }
        }
    }
    EnemySpawner.spawnEnemies = spawnEnemies;
    function spawnByID(_id, _position, _attributes, _netID) {
        let enemy;
        switch (_id) {
            case Entity.ID.BAT:
                if (_attributes == null && _netID == null) {
                    const ref = Game.enemiesJSON.find(enemy => enemy.name == "bat");
                    enemy = new Enemy.EnemyDumb(Entity.ID.BAT, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, Math.random() * ref.attributes.knockbackForce + 0.5, ref.attributes.armor), _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyDumb(Entity.ID.BAT, _attributes, _position, _netID);
                }
                break;
            case Entity.ID.REDTICK:
                if (_attributes == null && _netID == null) {
                    const ref = Game.enemiesJSON.find(enemy => enemy.name == "redtick");
                    enemy = new Enemy.EnemyDumb(Entity.ID.REDTICK, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, Math.random() * ref.attributes.scale + 0.5, ref.attributes.knockbackForce, ref.attributes.armor), _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyDumb(Entity.ID.REDTICK, _attributes, _position, _netID);
                }
                break;
            case Entity.ID.SMALLTICK:
                if (_attributes == null && _netID == null) {
                    const ref = Game.enemiesJSON.find(enemy => enemy.name == "smalltick");
                    enemy = new Enemy.EnemyDumb(Entity.ID.SMALLTICK, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, Math.random() * ref.attributes.scale + 0.5, ref.attributes.knockbackForce, ref.attributes.armor), _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyDumb(Entity.ID.SMALLTICK, _attributes, _position, _netID);
                }
                break;
            case Entity.ID.SKELETON:
                break;
        }
        if (enemy != null) {
            Game.graph.addChild(enemy);
        }
    }
    EnemySpawner.spawnByID = spawnByID;
    function networkSpawnById(_id, _position, _attributes, _netID) {
        spawnByID(_id, _position, _attributes, _netID);
    }
    EnemySpawner.networkSpawnById = networkSpawnById;
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
    function addPercentageAmountToValue(_baseValue, _percentageAmount) {
        return _baseValue * ((100 + _percentageAmount) / 100);
    }
    Calculation.addPercentageAmountToValue = addPercentageAmountToValue;
    function subPercentageAmountToValue(_baseValue, _percentageAmount) {
        return _baseValue * (100 / (100 + _percentageAmount));
    }
    Calculation.subPercentageAmountToValue = subPercentageAmountToValue;
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
        Game.avatar1.move(moveVector);
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
        FUNCTION[FUNCTION["AVATARPREDICTION"] = 5] = "AVATARPREDICTION";
        FUNCTION[FUNCTION["UPDATEINVENTORY"] = 6] = "UPDATEINVENTORY";
        FUNCTION[FUNCTION["KNOCKBACKREQUEST"] = 7] = "KNOCKBACKREQUEST";
        FUNCTION[FUNCTION["KNOCKBACKPUSH"] = 8] = "KNOCKBACKPUSH";
        FUNCTION[FUNCTION["SPAWNBULLET"] = 9] = "SPAWNBULLET";
        FUNCTION[FUNCTION["SPAWNBULLETENEMY"] = 10] = "SPAWNBULLETENEMY";
        FUNCTION[FUNCTION["BULLETTRANSFORM"] = 11] = "BULLETTRANSFORM";
        FUNCTION[FUNCTION["BULLETDIE"] = 12] = "BULLETDIE";
        FUNCTION[FUNCTION["SPAWNENEMY"] = 13] = "SPAWNENEMY";
        FUNCTION[FUNCTION["ENEMYTRANSFORM"] = 14] = "ENEMYTRANSFORM";
        FUNCTION[FUNCTION["ENEMYSTATE"] = 15] = "ENEMYSTATE";
        FUNCTION[FUNCTION["ENEMYDIE"] = 16] = "ENEMYDIE";
        FUNCTION[FUNCTION["SPAWNINTERNALITEM"] = 17] = "SPAWNINTERNALITEM";
        FUNCTION[FUNCTION["UPDATEATTRIBUTES"] = 18] = "UPDATEATTRIBUTES";
        FUNCTION[FUNCTION["UPDATEWEAPON"] = 19] = "UPDATEWEAPON";
        FUNCTION[FUNCTION["ITEMDIE"] = 20] = "ITEMDIE";
        FUNCTION[FUNCTION["SENDROOM"] = 21] = "SENDROOM";
        FUNCTION[FUNCTION["SWITCHROOMREQUEST"] = 22] = "SWITCHROOMREQUEST";
        FUNCTION[FUNCTION["UPDATEBUFF"] = 23] = "UPDATEBUFF";
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
                            const attributes = message.content.attributes;
                            Game.avatar2 = new Player.Melee(Entity.ID.PLAYER2, attributes);
                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            Game.graph.appendChild(Game.avatar2);
                        }
                        else if (message.content.type == Player.PLAYERTYPE.RANGED) {
                            const attributes = message.content.attributes;
                            Game.avatar2 = new Player.Ranged(Entity.ID.PLAYER2, attributes);
                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            Game.graph.appendChild(Game.avatar2);
                        }
                    }
                    //Runtime updates and communication
                    if (Game.connected) {
                        //Sync avatar2 position and rotation
                        if (message.content != undefined && message.content.text == FUNCTION.TRANSFORM.toString()) {
                            // let test: Game.ƒ.Vector3 = message.content.value.data;
                            // // console.log(test);
                            let moveVector = new Game.ƒ.Vector3(message.content.value.data[0], message.content.value.data[1], message.content.value.data[2]);
                            let rotateVector = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);
                            if (Game.avatar2 != undefined) {
                                Game.avatar2.mtxLocal.translation = moveVector;
                                Game.avatar2.mtxLocal.rotation = rotateVector;
                                Game.avatar2.collider.position = moveVector.toVector2();
                            }
                        }
                        if (message.content != undefined && message.content.text == FUNCTION.AVATARPREDICTION.toString()) {
                            if (Networking.client.id != Networking.client.idHost) {
                                let newPosition = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                Game.avatar1.hostPositions[message.content.tick] = newPosition;
                            }
                        }
                        //Update inventory
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEINVENTORY.toString()) {
                            let item = Game.items.find(elem => elem.netId == message.content.netId);
                            Game.avatar2.items.push(item);
                        }
                        //Client request for move knockback
                        if (message.content != undefined && message.content.text == FUNCTION.KNOCKBACKREQUEST.toString()) {
                            let position = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            let enemy = Game.enemies.find(elem => elem.netId == message.content.netId);
                            enemy.getKnockback(message.content.knockbackForce, position);
                        }
                        //Host push move knockback from enemy
                        if (message.content != undefined && message.content.text == FUNCTION.KNOCKBACKPUSH.toString()) {
                            if (Networking.client.id != Networking.client.idHost) {
                                let position = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                Game.avatar1.getKnockback(message.content.knockbackForce, position);
                            }
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
                            const attributes = message.content.attributes;
                            EnemySpawner.networkSpawnById(message.content.id, new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]), attributes, message.content.netId);
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
                                    case Entity.ANIMATIONSTATES.IDLE:
                                        enemy.setAnimation(enemy.animations["idle"]);
                                        enemy.currentAnimation = Entity.ANIMATIONSTATES.IDLE;
                                        break;
                                    case Entity.ANIMATIONSTATES.WALK:
                                        enemy.setAnimation(enemy.animations["walk"]);
                                        enemy.currentAnimation = Entity.ANIMATIONSTATES.WALK;
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
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNINTERNALITEM.toString()) {
                            if (Networking.client.id != Networking.client.idHost) {
                                let newItem = message.content.item;
                                // Game.graph.addChild(newItem);
                                Game.graph.addChild(new Items.InternalItem(message.content.id, new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]), message.content.netId));
                            }
                        }
                        //apply item attributes
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEATTRIBUTES.toString()) {
                            const tempAttributes = message.content.attributes;
                            Game.avatar2.attributes = tempAttributes;
                            Game.avatar2.mtxLocal.scale(new ƒ.Vector3(Game.avatar2.attributes.scale, Game.avatar2.attributes.scale, Game.avatar2.attributes.scale));
                        }
                        //apply weapon
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEWEAPON.toString()) {
                            const tempWeapon = message.content.weapon;
                            Game.avatar2.weapon = tempWeapon;
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
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.PLAYERTYPE.MELEE, attributes: Game.avatar1.attributes, position: Game.avatar1.cmpTransform.mtxLocal.translation } });
        }
        else if (_type == Player.PLAYERTYPE.RANGED) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.PLAYERTYPE.RANGED, attributes: Game.avatar1.attributes, position: Game.avatar1.cmpTransform.mtxLocal.translation } });
        }
        else {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Player.PLAYERTYPE.RANGED, attributes: Game.avatar1.attributes, position: Game.avatar1.cmpTransform.mtxLocal.translation } });
        }
    }
    Networking.spawnPlayer = spawnPlayer;
    function setClient() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: Networking.FUNCTION.CONNECTED, value: Networking.client.id } });
    }
    Networking.setClient = setClient;
    function updateAvatarPosition(_position, _rotation) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.TRANSFORM, value: _position, rotation: _rotation } });
    }
    Networking.updateAvatarPosition = updateAvatarPosition;
    function avatarPrediction(_position, _tick) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.AVATARPREDICTION, position: _position, tick: _tick } });
        }
    }
    Networking.avatarPrediction = avatarPrediction;
    function knockbackRequest(_netId, _knockbackForce, _position) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.client.idHost, content: { text: FUNCTION.KNOCKBACKREQUEST, netId: _netId, knockbackForce: _knockbackForce, position: _position } });
    }
    Networking.knockbackRequest = knockbackRequest;
    function knockbackPush(_knockbackForce, _position) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.KNOCKBACKPUSH, knockbackForce: _knockbackForce, position: _position } });
    }
    Networking.knockbackPush = knockbackPush;
    function updateInventory(_netId) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.UPDATEINVENTORY, netId: _netId } });
    }
    Networking.updateInventory = updateInventory;
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
    function spawnEnemy(_enemy, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNENEMY, id: _enemy.id, attributes: _enemy.attributes, position: _enemy.mtxLocal.translation, netId: _netId } });
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
    async function spawnInternalItem(_item, _id, _position, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            await Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNINTERNALITEM, item: _item, id: _id, position: _position, netId: _netId } });
        }
    }
    Networking.spawnInternalItem = spawnInternalItem;
    function updateAvatarAttributes(_attributes) {
        if (Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.UPDATEATTRIBUTES, attributes: _attributes } });
        }
        else {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEATTRIBUTES, attributes: _attributes } });
        }
    }
    Networking.updateAvatarAttributes = updateAvatarAttributes;
    function updateAvatarWeapon(_weapon) {
        if (Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.UPDATEWEAPON, weapon: _weapon } });
        }
        else {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEWEAPON, weapon: _weapon } });
        }
    }
    Networking.updateAvatarWeapon = updateAvatarWeapon;
    function removeItem(_netId) {
        if (Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.ITEMDIE, netId: _netId } });
        }
        else {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ITEMDIE, netId: _netId } });
        }
    }
    Networking.removeItem = removeItem;
    //#endregion
    //#region buffs
    async function updateBuffList(_buff, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            await Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEBUFF, buffList: _buff, netId: _netId } });
        }
    }
    Networking.updateBuffList = updateBuffList;
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
    class Player extends Entity.Entity {
        items = [];
        weapon = new Weapons.Weapon(12, 1, Bullets.BULLETTYPE.STANDARD, 1);
        tick = 0;
        positions = [];
        hostPositions = [];
        time = 0;
        abilityCount = 1;
        currentabilityCount = this.abilityCount;
        abilityCooldownTime = 10;
        currentabilityCooldownTime = this.abilityCooldownTime;
        constructor(_id, _attributes) {
            super(_id, _attributes);
            this.tag = Tag.TAG.PLAYER;
        }
        move(_direction) {
            if (_direction.magnitude != 0) {
                _direction = Game.ƒ.Vector3.NORMALIZATION(_direction, 1);
            }
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
            _direction.scale((1 / 60 * this.attributes.speed));
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
            super.collide(_direction);
            let itemCollider = Game.items;
            itemCollider.forEach(item => {
                if (this.collider.collides(item.collider)) {
                    if (item instanceof Items.InternalItem) {
                        Networking.updateInventory(item.netId);
                        item.doYourThing(this);
                        this.items.push(item);
                    }
                }
            });
            let enemyColliders = Game.enemies;
            enemyColliders.forEach(element => {
                if (this.collider.collides(element.collider)) {
                    let intersection = this.collider.getIntersection(element.collider);
                    let areaBeforeMove = intersection;
                    if (areaBeforeMove < this.collider.radius + element.collider.radius) {
                        let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                        let newDirection = new Game.ƒ.Vector2(_direction.x, 0);
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                        if (this.collider.getIntersection(element.collider) != null) {
                            let newIntersection = this.collider.getIntersection(element.collider);
                            let areaAfterMove = newIntersection;
                            if (areaBeforeMove < areaAfterMove) {
                                this.canMoveX = false;
                            }
                        }
                        this.collider.position = oldPosition;
                        newDirection = new Game.ƒ.Vector2(0, _direction.y);
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                        if (this.collider.getIntersection(element.collider) != null) {
                            let newIntersection = this.collider.getIntersection(element.collider);
                            let areaAfterMove = newIntersection;
                            if (areaBeforeMove < areaAfterMove) {
                                this.canMoveY = false;
                            }
                        }
                        this.collider.position = oldPosition;
                    }
                    else {
                        this.canMoveX = false;
                        this.canMoveY = false;
                    }
                    //TODO: Sync knockback correctly over network
                    // if (Networking.client.id == Networking.client.idHost) {
                    //     element.getKnockback(this.attributes.knockbackForce, this.mtxLocal.translation);
                    // } else {
                    //     Networking.knockbackRequest(element.netId, this.attributes.knockbackForce, this.mtxLocal.translation);
                    // }
                }
            });
            if (this.canMoveX && this.canMoveY) {
                this.cmpTransform.mtxLocal.translate(_direction, false);
            }
            else if (this.canMoveX && !this.canMoveY) {
                _direction = new ƒ.Vector3(_direction.x, 0, _direction.z);
                this.cmpTransform.mtxLocal.translate(_direction, false);
            }
            else if (!this.canMoveX && this.canMoveY) {
                _direction = new ƒ.Vector3(0, _direction.y, _direction.z);
                this.cmpTransform.mtxLocal.translate(_direction, false);
            }
            // if (Networking.client.id == Networking.client.idHost) {
            //     Game.avatar2.avatarPrediction();
            // }
            // if (Networking.client.id != Networking.client.idHost) {
            //     Game.avatar1.avatarPrediction();
            // } 
        }
        avatarPrediction() {
            this.time += Game.ƒ.Loop.timeFrameGame;
            while (this.time >= 1) {
                this.positions.push(new ƒ.Vector3(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.translation.z));
                if (Game.connected) {
                    Networking.avatarPrediction(this.cmpTransform.mtxLocal.translation, this.tick);
                }
                this.tick++;
                this.time -= 1;
            }
            if (Networking.client.id != Networking.client.idHost) {
                if (this.tick >= 1 && this.hostPositions[this.tick - 1] != undefined && this.positions[this.tick - 1] != undefined) {
                    if (this.hostPositions[this.tick - 1].x != this.positions[this.tick - 1].x || this.hostPositions[this.tick - 1].y != this.positions[this.tick - 1].y) {
                        console.log(this.positions[this.tick - 1]);
                        console.log(this.hostPositions[this.tick - 1]);
                        console.log("correct");
                        this.correctPosition();
                    }
                }
            }
        }
        async correctPosition() {
            if (this.hostPositions[this.tick] != undefined) {
                console.log(this.cmpTransform.mtxLocal.translation);
                this.cmpTransform.mtxLocal.translation = this.hostPositions[this.tick];
                console.log(this.cmpTransform.mtxLocal.translation);
            }
            else {
                setTimeout(() => { this.correctPosition; }, 100);
            }
        }
        attack(_direction, _netId, _sync) {
            this.weapon.shoot(this.tag, this.mtxLocal.translation.toVector2(), _direction, _netId, _sync);
        }
        doKnockback(_body) {
            // (<Enemy.Enemy>_body).getKnockback(this.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }
        getKnockback(_knockbackForce, _position) {
            super.getKnockback(_knockbackForce, _position);
        }
        doAbility() {
        }
        cooldown() {
            this.weapon.cooldown(this.attributes.coolDownReduction);
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
        weapon = new Weapons.Weapon(12, 1, Bullets.BULLETTYPE.MELEE, 2);
        attack(_direction, _netId, _sync) {
            this.weapon.shoot(this.tag, this.mtxLocal.translation.toVector2(), _direction, _netId, _sync);
        }
        //Block
        doAbility() {
            if (this.currentabilityCount > 0) {
                this.attributes.hitable = false;
                setTimeout(() => {
                    this.attributes.hitable = true;
                }, 600);
                this.currentabilityCount--;
            }
        }
    }
    Player_1.Melee = Melee;
    class Ranged extends Player {
        performAbility = false;
        lastMoveDirection;
        move(_direction) {
            if (this.performAbility) {
                super.move(this.lastMoveDirection);
            }
            else {
                super.move(_direction);
                this.lastMoveDirection = _direction;
            }
        }
        //Dash
        doAbility() {
            if (this.currentabilityCount > 0) {
                this.performAbility = true;
                this.attributes.hitable = false;
                this.attributes.speed *= 2;
                setTimeout(() => {
                    this.attributes.speed /= 2;
                    setTimeout(() => {
                        this.attributes.speed /= 1;
                        this.attributes.hitable = true;
                        this.performAbility = false;
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
        finished = false;
        enemyCount;
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
                    this.enemyCount = 5;
                    this.finished = true;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.startRoomMat);
                    break;
                case ROOMTYPE.NORMAL:
                    this.enemyCount = Math.round(Math.random() * 10) + 20;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.normalRoomMat);
                    break;
                case ROOMTYPE.MERCHANT:
                    this.enemyCount = 0;
                    this.finished = true;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.merchantRoomMat);
                    break;
                case ROOMTYPE.TREASURE:
                    this.enemyCount = 0;
                    this.finished = true;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.treasureRoomMat);
                    break;
                case ROOMTYPE.CHALLENGE:
                    this.enemyCount = Math.round(Math.random() * 20) + 30;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.challengeRoomMat);
                    break;
                case ROOMTYPE.BOSS:
                    this.enemyCount = 0;
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
        wallThickness = 3;
        constructor(_position, _width, _direction) {
            super("Wall");
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("red", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("red")))));
            this.cmpTransform.mtxLocal.translation = _position.toVector3(0);
            if (_direction[0]) {
                this.cmpTransform.mtxLocal.translation.y += _width / 2 + this.wallThickness / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(_width + this.wallThickness * 2, this.wallThickness, 0);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.wallThickness, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction[1]) {
                this.cmpTransform.mtxLocal.translation.x += _width / 2 + this.wallThickness / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.wallThickness, _width, 0);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.wallThickness, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction[2]) {
                this.cmpTransform.mtxLocal.translation.y -= _width / 2 + this.wallThickness / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(_width + this.wallThickness * 2, this.wallThickness, 0);
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
            if (Networking.client.id == Networking.client.idHost) {
                Generation.switchRoom(this.parentRoom, this.direction);
            }
            else {
                Networking.switchRoomRequest(this.parentRoom.coordinates, this.direction);
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
        console.log(_room);
        Networking.sendRoom(_room.name, _room.coordinates, _room.exits, _room.roomType);
    }
    function addRoom(_currentRoom, _roomType) {
        let numberOfExits = countBool(_currentRoom.exits);
        let randomNumber = Math.round(Math.random() * (numberOfExits - 1));
        let possibleExitIndex = getExitIndex(_currentRoom.exits);
        console.log(_roomType + ": " + possibleExitIndex + "____ " + randomNumber);
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
        if (_currentRoom.finished) {
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
            EnemySpawner.spawnEnemies();
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
        player1UI.querySelector("#HP").style.width = (Game.avatar1.attributes.healthPoints / Game.avatar1.attributes.maxHealthPoints * 100) + "%";
        //InventoryUI
        Game.avatar1.items.forEach((element) => {
            let exsist = false;
            //search DOMImg for Item
            player1UI.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                if (imgElement.src == document.URL + element.imgSrc.substring(2)) {
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
            player2UI.querySelector("#HP").style.width = (Game.avatar2.attributes.healthPoints / Game.avatar2.attributes.maxHealthPoints * 100) + "%";
            //InventoryUI
            Game.avatar2.items.forEach((element) => {
                let exsist = false;
                //search DOMImg for Item
                player2UI.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                    if (imgElement.src == document.URL + element.imgSrc.substring(2)) {
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
        bulletType = Bullets.BULLETTYPE.STANDARD;
        projectileAmount = 1;
        constructor(_cooldownTime, _attackCount, _bulletType, _projectileAmount) {
            this.cooldownTime = _cooldownTime;
            this.attackCount = _attackCount;
            this.bulletType = _bulletType;
            this.projectileAmount = _projectileAmount;
        }
        shoot(_owner, _position, _direciton, _netId, _sync) {
            if (this.currentAttackCount > 0) {
                _direciton.normalize();
                let magazine = this.loadMagazine(_position, _direciton, this.bulletType, this.projectileAmount, _netId);
                this.setBulletDirection(magazine);
                this.fire(_owner, magazine, _sync);
                this.currentAttackCount--;
            }
        }
        fire(_owner, _magazine, _sync) {
            _magazine.forEach(bullet => {
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
                bullet.owner = _owner;
                Game.graph.addChild(bullet);
                if (_sync) {
                    Networking.spawnBullet(bullet.direction, bullet.netId);
                }
            });
        }
        setBulletDirection(_magazine) {
            switch (_magazine.length) {
                case 1:
                    return _magazine;
                case 2:
                    _magazine[0].mtxLocal.rotateZ(45 / 2);
                    _magazine[1].mtxLocal.rotateZ(45 / 2 * -1);
                    return _magazine;
                case 3:
                    _magazine[0].mtxLocal.rotateZ(45 / 2);
                    _magazine[1].mtxLocal.rotateZ(45 / 2 * -1);
                default:
                    return _magazine;
            }
        }
        loadMagazine(_position, _direction, _bulletType, _amount, _netId) {
            let magazine = [];
            for (let i = 0; i < _amount; i++) {
                switch (_bulletType) {
                    case Bullets.BULLETTYPE.STANDARD:
                        const standardRef = Game.bulletsJSON.find(bullet => bullet.type == Bullets.BULLETTYPE.STANDARD);
                        magazine.push(new Bullets.Bullet(standardRef.name, standardRef.speed, standardRef.hitPointsScale, standardRef.lifetime, standardRef.knockbackForce, standardRef.killcount, _position, _direction, _netId));
                        break;
                    case Bullets.BULLETTYPE.SLOW:
                        const slowRef = Game.bulletsJSON.find(bullet => bullet.type == Bullets.BULLETTYPE.SLOW);
                        magazine.push(new Bullets.Bullet(slowRef.name, slowRef.speed, slowRef.hitPointsScale, slowRef.lifetime, slowRef.knockbackForce, slowRef.killcount, _position, _direction, _netId));
                        break;
                    case Bullets.BULLETTYPE.MELEE:
                        const meleeRef = Game.bulletsJSON.find(bullet => bullet.type == Bullets.BULLETTYPE.MELEE);
                        magazine.push(new Bullets.Bullet(meleeRef.name, meleeRef.speed, meleeRef.hitPointsScale, meleeRef.lifetime, meleeRef.knockbackForce, meleeRef.killcount, _position, _direction, _netId));
                        break;
                }
            }
            return magazine;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL0NsYXNzZXMvTWFpbi50cyIsIi4uL0NsYXNzZXMvRW50aXR5LnRzIiwiLi4vQ2xhc3Nlcy9FbmVteS50cyIsIi4uL0NsYXNzZXMvSW50ZXJmYWNlcy50cyIsIi4uL0NsYXNzZXMvSXRlbXMudHMiLCIuLi9DbGFzc2VzL0FuaW1hdGlvbkdlbmVyYXRpb24udHMiLCIuLi9DbGFzc2VzL0F0dHJpYnV0ZXMudHMiLCIuLi9DbGFzc2VzL0Jvc3MudHMiLCIuLi9DbGFzc2VzL0J1ZmYudHMiLCIuLi9DbGFzc2VzL0J1bGxldC50cyIsIi4uL0NsYXNzZXMvQ29sbGlkZXIudHMiLCIuLi9DbGFzc2VzL0VuZW15U3Bhd25lci50cyIsIi4uL0NsYXNzZXMvR2FtZUNhbGN1bGF0aW9uLnRzIiwiLi4vQ2xhc3Nlcy9JbnB1dFN5c3RlbS50cyIsIi4uL0NsYXNzZXMvTGFuZHNjYXBlLnRzIiwiLi4vQ2xhc3Nlcy9OZXR3b3JraW5nLnRzIiwiLi4vQ2xhc3Nlcy9QbGF5ZXIudHMiLCIuLi9DbGFzc2VzL1Jvb20udHMiLCIuLi9DbGFzc2VzL1Jvb21HZW5lcmF0aW9uLnRzIiwiLi4vQ2xhc3Nlcy9UYWcudHMiLCIuLi9DbGFzc2VzL1VJLnRzIiwiLi4vQ2xhc3Nlcy9XZWFwb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtQkFBbUI7QUFDbkIsd0RBQXdEO0FBQ3hELHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFFdEIsSUFBVSxJQUFJLENBMFNiO0FBL1NELG1CQUFtQjtBQUNuQix3REFBd0Q7QUFDeEQsc0RBQXNEO0FBQ3RELHNCQUFzQjtBQUV0QixXQUFVLElBQUk7SUFDVixJQUFZLFVBR1g7SUFIRCxXQUFZLFVBQVU7UUFDbEIsaURBQU8sQ0FBQTtRQUNQLDZDQUFLLENBQUE7SUFDVCxDQUFDLEVBSFcsVUFBVSxHQUFWLGVBQVUsS0FBVixlQUFVLFFBR3JCO0lBRWEsTUFBQyxHQUFHLFNBQVMs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QVcsQ0FBQyxDQUFDO1lBQ3BDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakYsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFeEksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUgsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUgsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENB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LFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDaE87WUFDRCxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDZixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7Z0JBQzFELElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDbkcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDaE87WUFDRCxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDZixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7Z0JBQzFELElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDbkcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDaE87WUFDRCxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDZixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7Z0JBQzFELElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDbkcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxR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UUFHTSxRQUFRLENBQUMsT0FBZTtZQUMzQixJQUFJLG9CQUFvQixHQUFHLElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDO1lBQ3ZELElBQUksSUFBSSxDQUFDLGtCQUFrQixJQUFJLENBQUMsRUFBRTtnQkFDOUIsSUFBSSxJQUFJLENBQUMsbUJBQW1CLElBQUksQ0FBQyxFQUFFO29CQUMvQixJQUFJLENBQUMsbUJBQW1CLEdBQUcsb0JBQW9CLENBQUM7b0JBQ2hELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDO2lCQUM5QztxQkFBTTtvQkFDSCx5Q0FBeUM7b0JBRXpDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2lCQUM5QjthQUNKO1FBRUwsQ0FBQztLQUNKO0lBekZZLGNBQU0sU0F5RmxCLENBQUE7QUFFTCxDQUFDLEVBNUZTLE9BQU8sS0FBUCxPQUFPLFFBNEZoQiIsInNvdXJjZXNDb250ZW50IjpbIi8vI3JlZ2lvbiBcIkltcG9ydHNcIlxyXG4vLy88cmVmZXJlbmNlIHR5cGVzPVwiLi4vRlVER0UvQ29yZS9CdWlsZC9GdWRnZUNvcmUuanNcIi8+XHJcbi8vLzxyZWZlcmVuY2UgdHlwZXM9XCIuLi9GVURHRS9BaWQvQnVpbGQvRnVkZ2VBaWQuanNcIi8+XHJcbi8vI2VuZHJlZ2lvbiBcIkltcG9ydHNcIlxyXG5cclxubmFtZXNwYWNlIEdhbWUge1xyXG4gICAgZXhwb3J0IGVudW0gR0FNRVNUQVRFUyB7XHJcbiAgICAgICAgUExBWUlORyxcclxuICAgICAgICBQQVVTRVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbXBvcnQgxpIgPSBGdWRnZUNvcmU7XHJcbiAgICBleHBvcnQgaW1wb3J0IMaSQWlkID0gRnVkZ2VBaWQ7XHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBcIkRvbUVsZW1lbnRzXCJcclxuICAgIGV4cG9ydCBsZXQgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCA9IDxIVE1MQ2FudmFzRWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNhbnZhc1wiKTtcclxuICAgIC8vIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBpbml0KTtcclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBzdGFydCk7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJhbmdlZFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcGxheWVyQ2hvaWNlKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTWVsZWVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHBsYXllckNob2ljZSk7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJEb21FbGVtZW50c1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiUHVibGljVmFyaWFibGVzXCJcclxuICAgIGV4cG9ydCBsZXQgZ2FtZXN0YXRlOiBHQU1FU1RBVEVTID0gR0FNRVNUQVRFUy5QQVVTRTtcclxuICAgIGV4cG9ydCBsZXQgdmlld3BvcnQ6IMaSLlZpZXdwb3J0ID0gbmV3IMaSLlZpZXdwb3J0KCk7XHJcbiAgICBleHBvcnQgbGV0IGdyYXBoOiDGki5Ob2RlID0gbmV3IMaSLk5vZGUoXCJHcmFwaFwiKTtcclxuXHJcbiAgICBleHBvcnQgbGV0IGF2YXRhcjE6IFBsYXllci5QbGF5ZXI7XHJcbiAgICBleHBvcnQgbGV0IGF2YXRhcjI6IFBsYXllci5QbGF5ZXI7XHJcblxyXG4gICAgZXhwb3J0IGxldCBjdXJyZW50Um9vbTogR2VuZXJhdGlvbi5Sb29tO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY29ubmVjdGVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IGZyYW1lUmF0ZTogbnVtYmVyID0gNjA7XHJcblxyXG4gICAgZXhwb3J0IGxldCBlbmVtaWVzOiBFbmVteS5FbmVteVtdID0gW107XHJcbiAgICBleHBvcnQgbGV0IGJ1bGxldHM6IEJ1bGxldHMuQnVsbGV0W107XHJcbiAgICBleHBvcnQgbGV0IGl0ZW1zOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuICAgIC8vSlNPTlxyXG4gICAgZXhwb3J0IGxldCBlbmVtaWVzSlNPTjogRW50aXR5LkVudGl0eVtdO1xyXG4gICAgZXhwb3J0IGxldCBpbnRlcm5hbEl0ZW1KU09OOiBJdGVtcy5JbnRlcm5hbEl0ZW1bXTtcclxuICAgIGV4cG9ydCBsZXQgYnVsbGV0c0pTT046IEJ1bGxldHMuQnVsbGV0W107XHJcbiAgICAvLyNlbmRyZWdpb24gXCJQdWJsaWNWYXJpYWJsZXNcIlxyXG5cclxuICAgIC8vI3JlZ2lvbiBcIlByaXZhdGVWYXJpYWJsZXNcIlxyXG4gICAgbGV0IGl0ZW0xOiBJdGVtcy5JdGVtO1xyXG4gICAgbGV0IGNtcENhbWVyYTogxpIuQ29tcG9uZW50Q2FtZXJhID0gbmV3IMaSLkNvbXBvbmVudENhbWVyYSgpO1xyXG4gICAgbGV0IHBsYXllclR5cGU6IFBsYXllci5QTEFZRVJUWVBFO1xyXG4gICAgY29uc3QgZGFtcGVyOiBudW1iZXIgPSAzLjU7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJQcml2YXRlVmFyaWFibGVzXCJcclxuXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBcImVzc2VudGlhbFwiXHJcbiAgICBhc3luYyBmdW5jdGlvbiBpbml0KCkge1xyXG5cclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIEdlbmVyYXRpb24uZ2VuZXJhdGVSb29tcygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ3JhcGguYXBwZW5kQ2hpbGQoYXZhdGFyMSk7XHJcblxyXG4gICAgICAgIMaSQWlkLmFkZFN0YW5kYXJkTGlnaHRDb21wb25lbnRzKGdyYXBoKTtcclxuXHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0ZVooMjUpO1xyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC5yb3RhdGVZKDE4MCk7XHJcblxyXG4gICAgICAgIHZpZXdwb3J0LmluaXRpYWxpemUoXCJWaWV3cG9ydFwiLCBncmFwaCwgY21wQ2FtZXJhLCBjYW52YXMpO1xyXG5cclxuICAgICAgICBkcmF3KCk7XHJcblxyXG4gICAgICAgIGhlbHBlcigpO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBoZWxwZXIoKSB7XHJcbiAgICAgICAgICAgIGlmIChhdmF0YXIyICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgxpIuTG9vcC5zdGFydCjGki5MT09QX01PREUuVElNRV9HQU1FLCBmcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaGVscGVyKCk7XHJcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlKCk6IHZvaWQge1xyXG5cclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgSW5wdXRTeXN0ZW0ubW92ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZHJhdygpO1xyXG5cclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgY2FtZXJhVXBkYXRlKCk7XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICBhdmF0YXIxLmNvb2xkb3duKCk7XHJcbiAgICAgICAgICAgICAgICBhdmF0YXIyLmNvb2xkb3duKCk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhclBvc2l0aW9uKEdhbWUuYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgR2FtZS5hdmF0YXIxLm10eExvY2FsLnJvdGF0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8jcmVnaW9uIGNvdW50IGl0ZW1zXHJcbiAgICAgICAgICAgIGl0ZW1zID0gPEl0ZW1zLkl0ZW1bXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8SXRlbXMuSXRlbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5JVEVNKVxyXG4gICAgICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtcy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGVsZW1lbnQuZGVzcGF3bigpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICg8SXRlbXMuSW50ZXJuYWxJdGVtPmVsZW1lbnQpLmNvbGxpc2lvbkRldGVjdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgICAgICBidWxsZXRzID0gPEJ1bGxldHMuQnVsbGV0W10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEJ1bGxldHMuQnVsbGV0PmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLkJVTExFVClcclxuICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICBidWxsZXRzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC51cGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBkYW1hZ2VVSTogVUkuRGFtYWdlVUlbXSA9IDxVSS5EYW1hZ2VVSVtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxVSS5EYW1hZ2VVST5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5EQU1BR0VVSSlcclxuICAgICAgICAgICAgZGFtYWdlVUkuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQubW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC5saWZlc3BhbihncmFwaCk7XHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICBlbmVtaWVzID0gPEVuZW15LkVuZW15W10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVuZW15LkVuZW15PmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLkVORU1ZKVxyXG4gICAgICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICBlbmVtaWVzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC51cGRhdGUoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEVuZW15LkVuZW15U2hvb3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxFbmVteS5FbmVteVNob290PmVsZW1lbnQpLndlYXBvbi5jb29sZG93bihlbGVtZW50LmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGN1cnJlbnRSb29tID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbSA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtKS50YWcgPT0gVGFnLlRBRy5ST09NKSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFJvb20uZW5lbXlDb3VudCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFJvb20uZmluaXNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBVSS51cGRhdGVVSSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzdGFydCgpIHtcclxuICAgICAgICBsb2FkVGV4dHVyZXMoKTtcclxuICAgICAgICBsb2FkSlNPTigpO1xyXG5cclxuICAgICAgICAvL2FkZCBzcHJpdGUgdG8gZ3JhcGhlIGZvciBzdGFydHNjcmVlblxyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRHYW1lXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuY29ubmV0aW5nKCk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcblxyXG4gICAgICAgICAgICB3YWl0T25Db25uZWN0aW9uKCk7XHJcblxyXG4gICAgICAgICAgICB3YWl0Rm9ySG9zdCgpO1xyXG5cclxuICAgICAgICAgICAgd2FpdEZvckxvYmJ5KCk7XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiB3YWl0Rm9yTG9iYnkoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnRzLmxlbmd0aCA+PSAyICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAhPSB1bmRlZmluZWQgJiYgKE5ldHdvcmtpbmcuY2xpZW50LnBlZXJzW05ldHdvcmtpbmcuY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBOZXR3b3JraW5nLmNsaWVudC5pZCkuaWRdLmRhdGFDaGFubmVsICE9IHVuZGVmaW5lZCAmJlxyXG4gICAgICAgICAgICAgICAgICAgIChOZXR3b3JraW5nLmNsaWVudC5wZWVyc1tOZXR3b3JraW5nLmNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gTmV0d29ya2luZy5jbGllbnQuaWQpLmlkXS5kYXRhQ2hhbm5lbC5yZWFkeVN0YXRlID09IFwib3BlblwiKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkxvYmJ5c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdEZvckxvYmJ5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gd2FpdEZvckhvc3QoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnRzLmxlbmd0aCA+PSAyICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNldEhvc3QoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRGb3JIb3N0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ3JlZGl0c1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBsb2FkSlNPTigpIHtcclxuICAgICAgICBjb25zdCBsb2FkRW5lbXkgPSBhd2FpdCAoYXdhaXQgZmV0Y2goXCIuL1Jlc291cmNlcy9FbmVtaWVzU3RvcmFnZS5qc29uXCIpKS5qc29uKCk7XHJcbiAgICAgICAgZW5lbWllc0pTT04gPSAoPEVudGl0eS5FbnRpdHlbXT5sb2FkRW5lbXkuZW5lbWllcyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGxvYWRJdGVtID0gYXdhaXQgKGF3YWl0IGZldGNoKFwiLi9SZXNvdXJjZXMvSXRlbVN0b3JhZ2UuanNvblwiKSkuanNvbigpO1xyXG4gICAgICAgIGludGVybmFsSXRlbUpTT04gPSAoPEl0ZW1zLkludGVybmFsSXRlbVtdPmxvYWRJdGVtLmludGVybmFsSXRlbXMpO1xyXG5cclxuICAgICAgICBjb25zdCBsb2FkQnVsbGV0cyA9IGF3YWl0IChhd2FpdCBmZXRjaChcIi4vUmVzb3VyY2VzL0J1bGxldFN0b3JhZ2UuanNvblwiKSkuanNvbigpO1xyXG4gICAgICAgIGJ1bGxldHNKU09OID0gKDxCdWxsZXRzLkJ1bGxldFtdPmxvYWRCdWxsZXRzLnN0YW5kYXJkQnVsbGV0cyk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIGxvYWRUZXh0dXJlcygpIHtcclxuICAgICAgICBhd2FpdCBCdWxsZXRzLmJ1bGxldFR4dC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvYXJyb3cwMS5wbmdcIik7XHJcblxyXG4gICAgICAgIC8vVUlcclxuICAgICAgICBhd2FpdCBVSS50eHRaZXJvLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS8wLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRPbmUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzEucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFRvdy5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvMi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0VGhyZWUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzMucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dEZvdXIubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzQucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dEZpdmUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFNpeC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvNi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0U2V2ZW4ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzcucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dEVpZ2h0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS84LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHROaW5lLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS85LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRUZW4ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlLzEwLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgLy9FTkVNWVxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0QmF0SWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9iYXQvYmF0SWRsZS5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0UmVkVGlja0lkbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvdGljay9yZWRUaWNrSWRsZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRSZWRUaWNrV2Fsay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy90aWNrL3JlZFRpY2tXYWxrLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRTbWFsbFRpY2tJZGxlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3NtYWxsVGljay9zbWFsbFRpY2tJZGxlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFNtYWxsVGlja1dhbGsubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc21hbGxUaWNrL3NtYWxsVGlja1dhbGsucG5nXCIpXHJcblxyXG4gICAgICAgIEFuaW1hdGlvbkdlbmVyYXRpb24uY3JlYXRlQWxsQW5pbWF0aW9ucygpO1xyXG5cclxuICAgICAgICAvL0l0ZW1zXHJcbiAgICAgICAgYXdhaXQgSXRlbXMudHh0SWNlQnVja2V0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy9pY2VCdWNrZXQucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEl0ZW1zLnR4dEhlYWx0aFVwLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy9oZWFsdGhVcC5wbmdcIik7XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiB3YWl0T25Db25uZWN0aW9uKCkge1xyXG4gICAgICAgIE5ldHdvcmtpbmcuc2V0Q2xpZW50KCk7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50cy5maWx0ZXIoZWxlbSA9PiBlbGVtLnJlYWR5ID09IHRydWUpLmxlbmd0aCA+PSAyICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJJTUhPU1RcIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBhd2FpdCBpbml0KCk7XHJcbiAgICAgICAgICAgIGdhbWVzdGF0ZSA9IEdBTUVTVEFURVMuUExBWUlORztcclxuICAgICAgICAgICAgYXdhaXQgTmV0d29ya2luZy5zcGF3blBsYXllcihwbGF5ZXJUeXBlKTtcclxuICAgICAgICAgICAgRW5lbXlTcGF3bmVyLnNwYXduRW5lbWllcygpO1xyXG5cclxuXHJcblxyXG4gICAgICAgICAgICAvLyNyZWdpb24gaW5pdCBJdGVtc1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtMSA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oSXRlbXMuSVRFTUlELlNDQUxFVVAsIG5ldyDGki5WZWN0b3IyKDAsIDIpLCBudWxsKTtcclxuICAgICAgICAgICAgICAgIGxldCBpdGVtMiA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oSXRlbXMuSVRFTUlELlNDQUxFVVAsIG5ldyDGki5WZWN0b3IyKDAsIC0yKSwgbnVsbCk7XHJcblxyXG4gICAgICAgICAgICAgICAgZ3JhcGguYXBwZW5kQ2hpbGQoaXRlbTEpO1xyXG4gICAgICAgICAgICAgICAgZ3JhcGguYXBwZW5kQ2hpbGQoaXRlbTIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQod2FpdE9uQ29ubmVjdGlvbiwgMzAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGxheWVyQ2hvaWNlKF9lOiBFdmVudCkge1xyXG4gICAgICAgIGlmICgoPEhUTUxCdXR0b25FbGVtZW50Pl9lLnRhcmdldCkuaWQgPT0gXCJSYW5nZWRcIikge1xyXG4gICAgICAgICAgICBhdmF0YXIxID0gbmV3IFBsYXllci5SYW5nZWQoRW50aXR5LklELlBMQVlFUjEsIG5ldyBFbnRpdHkuQXR0cmlidXRlcygxMCwgNSwgNSwgMSwgMiwgNSkpO1xyXG4gICAgICAgICAgICBwbGF5ZXJUeXBlID0gUGxheWVyLlBMQVlFUlRZUEUuUkFOR0VEO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoKDxIVE1MQnV0dG9uRWxlbWVudD5fZS50YXJnZXQpLmlkID09IFwiTWVsZWVcIikge1xyXG4gICAgICAgICAgICBhdmF0YXIxID0gbmV3IFBsYXllci5NZWxlZShFbnRpdHkuSUQuUExBWUVSMSwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKDEwLCAxLCA1LCAxLCAyLCAxMCkpO1xyXG4gICAgICAgICAgICBwbGF5ZXJUeXBlID0gUGxheWVyLlBMQVlFUlRZUEUuTUVMRUU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTG9iYnlzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcblxyXG4gICAgICAgIHJlYWR5U2F0ZSgpO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkeVNhdGUoKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMubGVuZ3RoID49IDIgJiYgTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zZXRDbGllbnRSZWFkeSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMuZmlsdGVyKGVsZW0gPT4gZWxlbS5yZWFkeSA9PSB0cnVlKS5sZW5ndGggPCAyKSB7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsgcmVhZHlTYXRlKCkgfSwgMjAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmF3KCk6IHZvaWQge1xyXG4gICAgICAgIHZpZXdwb3J0LmRyYXcoKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2FtZXJhVXBkYXRlKCkge1xyXG4gICAgICAgIGxldCBkaXJlY3Rpb24gPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UoYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgZGlyZWN0aW9uLnNjYWxlKDEgLyBmcmFtZVJhdGUgKiBkYW1wZXIpO1xyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGUobmV3IMaSLlZlY3RvcjMoLWRpcmVjdGlvbi54LCBkaXJlY3Rpb24ueSwgMCksIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIMaSLkxvb3AuYWRkRXZlbnRMaXN0ZW5lcijGki5FVkVOVC5MT09QX0ZSQU1FLCB1cGRhdGUpO1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiZXNzZW50aWFsXCJcclxuXHJcbn1cclxuIiwibmFtZXNwYWNlIEVudGl0eSB7XHJcbiAgICBleHBvcnQgY2xhc3MgRW50aXR5IGV4dGVuZHMgR2FtZS7GkkFpZC5Ob2RlU3ByaXRlIHtcclxuICAgICAgICBjdXJyZW50QW5pbWF0aW9uOiBBTklNQVRJT05TVEFURVM7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRztcclxuICAgICAgICBpZDogRW50aXR5LklEO1xyXG4gICAgICAgIGF0dHJpYnV0ZXM6IEF0dHJpYnV0ZXM7XHJcbiAgICAgICAgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG4gICAgICAgIGNhbk1vdmVYOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICBjYW5Nb3ZlWTogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgbW92ZURpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICBhbmltYXRpb25zOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbnMgPSB7fTtcclxuICAgICAgICBwZXJmb3JtS25vY2tiYWNrOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgaWRsZVNjYWxlOiBudW1iZXI7XHJcbiAgICAgICAgYnVmZnM6IEJ1ZmYuQnVmZltdID0gW107XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfYXR0cmlidXRlczogQXR0cmlidXRlcykge1xyXG4gICAgICAgICAgICBzdXBlcihnZXROYW1lQnlJZChfaWQpKTtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0gX2F0dHJpYnV0ZXM7XHJcbiAgICAgICAgICAgIGlmIChBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGFuaSA9IEFuaW1hdGlvbkdlbmVyYXRpb24uZ2V0QW5pbWF0aW9uQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9ucyA9IGFuaS5hbmltYXRpb25zO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pZGxlU2NhbGUgPSBhbmkuaWRsZVNjYWxlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjModGhpcy5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMuYXR0cmlidXRlcy5zY2FsZSkpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ29sbGlkZXIoKTtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVCdWZmcygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlQ29sbGlkZXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwZGF0ZUJ1ZmZzKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5idWZmcy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5idWZmcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYnVmZnNbaV0gaW5zdGFuY2VvZiBCdWZmLkRhbWFnZUJ1ZmYpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuYnVmZnNbaV0uZG9CdWZmU3R1ZmYodGhpcykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idWZmcy5zbGljZShpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcblxyXG5cclxuICAgICAgICBjb2xsaWRlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSB0cnVlO1xyXG4gICAgICAgICAgICBsZXQgY29sbGlkZXJzOiBHZW5lcmF0aW9uLldhbGxbXSA9ICg8R2VuZXJhdGlvbi5Sb29tPkdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maW5kKGVsZW1lbnQgPT4gKDxHZW5lcmF0aW9uLlJvb20+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuUk9PTSkpLndhbGxzO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXNSZWN0KGVsZW1lbnQuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUJlZm9yZU1vdmUgPSBpbnRlcnNlY3Rpb24uaGVpZ2h0ICogaW50ZXJzZWN0aW9uLndpZHRoO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCB0aGlzLm10eExvY2FsLnNjYWxpbmcueCAqIHRoaXMubXR4TG9jYWwuc2NhbGluZy55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvbGRQb3NpdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIodGhpcy5jb2xsaWRlci5wb3NpdGlvbi54LCB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMihfZGlyZWN0aW9uLngsIDApXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudC5jb2xsaWRlcikgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uLmhlaWdodCAqIG5ld0ludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMigwLCBfZGlyZWN0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnRyYW5zZm9ybSjGki5NYXRyaXgzeDMuVFJBTlNMQVRJT04obmV3RGlyZWN0aW9uKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUFmdGVyTW92ZSA9IG5ld0ludGVyc2VjdGlvbi5oZWlnaHQgKiBuZXdJbnRlcnNlY3Rpb24ud2lkdGg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVZID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXREYW1hZ2UoX3ZhbHVlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgbGV0IGhpdFZhbHVlID0gdGhpcy5nZXREYW1hZ2VSZWR1Y3Rpb24oX3ZhbHVlKTtcclxuICAgICAgICAgICAgaWYgKF92YWx1ZSAhPSBudWxsICYmIHRoaXMuYXR0cmlidXRlcy5oaXRhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC09IGhpdFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXcgVUkuRGFtYWdlVUkodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiwgTWF0aC5yb3VuZChoaXRWYWx1ZSkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBnZXREYW1hZ2VSZWR1Y3Rpb24oX3ZhbHVlOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gX3ZhbHVlICogKDEgLSAodGhpcy5hdHRyaWJ1dGVzLmFybW9yIC8gMTAwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vI3JlZ2lvbiBrbm9ja2JhY2tcclxuICAgICAgICBwdWJsaWMgZG9Lbm9ja2JhY2soX2JvZHk6IEVudGl0eS5FbnRpdHkpIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMucGVyZm9ybUtub2NrYmFjaykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wZXJmb3JtS25vY2tiYWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBfcG9zaXRpb24udG9WZWN0b3IyKCkpLnRvVmVjdG9yMygwKTtcclxuICAgICAgICAgICAgICAgIGxldCBrbm9ja0JhY2tTY2FsaW5nOiBudW1iZXIgPSBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMuYXR0cmlidXRlcy5zY2FsZTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKF9rbm9ja2JhY2tGb3JjZSAqIDEgLyBrbm9ja0JhY2tTY2FsaW5nKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24uYWRkKGRpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgcmVkdWNlS25vY2tiYWNrKHRoaXMsIGRpcmVjdGlvbiwgdGhpcy5tb3ZlRGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiByZWR1Y2VLbm9ja2JhY2soX2VsZW06IEVudGl0eSwgX2RpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzLCBfbW92ZURpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gX2tub2NrYmFja0ZvcmNlID0gX2tub2NrYmFja0ZvcmNlIC8ga25vY2tCYWNrU2NhbGluZztcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2tub2NrYmFja0ZvcmNlID4gMC4wMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9tb3ZlRGlyZWN0aW9uLnN1YnRyYWN0KGRpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2tub2NrYmFja0ZvcmNlIC89IDM7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKF9rbm9ja2JhY2tGb3JjZSAqICgxIC8ga25vY2tCYWNrU2NhbGluZykpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9tb3ZlRGlyZWN0aW9uLmFkZChkaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZHVjZUtub2NrYmFjayhfZWxlbSwgX2RpcmVjdGlvbiwgX21vdmVEaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAyMDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9tb3ZlRGlyZWN0aW9uLnN1YnRyYWN0KGRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9lbGVtLnBlcmZvcm1Lbm9ja2JhY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuXHJcbiAgICB9XHJcbiAgICBleHBvcnQgZW51bSBBTklNQVRJT05TVEFURVMge1xyXG4gICAgICAgIElETEUsIFdBTEssIFNVTU1PTlxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBlbnVtIElEIHtcclxuICAgICAgICBQTEFZRVIxLFxyXG4gICAgICAgIFBMQVlFUjIsXHJcbiAgICAgICAgQkFULFxyXG4gICAgICAgIFJFRFRJQ0ssXHJcbiAgICAgICAgU01BTExUSUNLLFxyXG4gICAgICAgIFNLRUxFVE9OXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldE5hbWVCeUlkKF9pZDogRW50aXR5LklEKTogc3RyaW5nIHtcclxuICAgICAgICBzd2l0Y2ggKF9pZCkge1xyXG4gICAgICAgICAgICBjYXNlIElELlBMQVlFUjE6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJwbGF5ZXIxXCI7XHJcbiAgICAgICAgICAgIGNhc2UgSUQuUExBWUVSMjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInBsYXllcjJcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5CQVQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJiYXRcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5SRURUSUNLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwicmVkVGlja1wiO1xyXG4gICAgICAgICAgICBjYXNlIElELlNNQUxMVElDSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInNtYWxsVGlja1wiO1xyXG4gICAgICAgICAgICBjYXNlIElELlNLRUxFVE9OOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwic2tlbGV0b25cIjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXkge1xyXG4gICAgZXhwb3J0IGxldCB0eHRUaWNrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGVudW0gQkVIQVZJT1VSIHtcclxuICAgICAgICBJRExFLCBGT0xMT1csIEZMRUUsIE1PVkUsIFNVTU1PTiwgREFTSFxyXG4gICAgfVxyXG5cclxuICAgIGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteSBleHRlbmRzIEVudGl0eS5FbnRpdHkgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklLbm9ja2JhY2thYmxlIHtcclxuICAgICAgICBjdXJyZW50U3RhdGU6IEJFSEFWSU9VUjtcclxuICAgICAgICBwdWJsaWMgbmV0SWQ6IG51bWJlcjtcclxuICAgICAgICB0YXJnZXQ6IMaSLlZlY3RvcjI7XHJcbiAgICAgICAgbGlmZXRpbWU6IG51bWJlcjtcclxuICAgICAgICBtb3ZlRGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuWkVSTygpO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfYXR0cmlidXRlcyk7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IF9hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IEJFSEFWSU9VUi5JRExFO1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRBbmltYXRpb24gPSBFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEU7XHJcbiAgICAgICAgICAgIHRoaXMudGFnID0gVGFnLlRBRy5FTkVNWTtcclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgMC4xKTtcclxuICAgICAgICAgICAgaWYgKF9uZXRJZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm5ldElkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucG9wSUQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLmN1cnJlbnRJRHMucHVzaChfbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV0SWQgPSBOZXR3b3JraW5nLmlkR2VuZXJhdG9yKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25zW1wiaWRsZVwiXSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgKHRoaXMubXR4TG9jYWwuc2NhbGluZy54ICogdGhpcy5pZGxlU2NhbGUpIC8gMilcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkVuZW15KHRoaXMsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgc3VwZXIudXBkYXRlKCk7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZUJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICB0aGlzLm1vdmUodGhpcy5tb3ZlRGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbmVteVBvc2l0aW9uKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLm5ldElkLCB0aGlzLmN1cnJlbnRBbmltYXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRvS25vY2tiYWNrKF9ib2R5OiBFbnRpdHkuRW50aXR5KTogdm9pZCB7XHJcbiAgICAgICAgICAgIC8vICg8UGxheWVyLlBsYXllcj5fYm9keSkuZ2V0S25vY2tiYWNrKHRoaXMuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZSwgX3Bvc2l0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbi5hZGQoX2RpcmVjdGlvbilcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlKHRoaXMubW92ZURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbi5zdWJ0cmFjdChfZGlyZWN0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgbW92ZVNpbXBsZShfdGFyZ2V0OiDGki5WZWN0b3IyKTogxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gX3RhcmdldDtcclxuICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICBkaXJlY3Rpb24uc2NhbGUoKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUF3YXkoX3RhcmdldDogxpIuVmVjdG9yMik6IMaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBsZXQgbW92ZVNpbXBsZSA9IHRoaXMubW92ZVNpbXBsZShfdGFyZ2V0KTtcclxuICAgICAgICAgICAgbW92ZVNpbXBsZS54ICo9IC0xO1xyXG4gICAgICAgICAgICBtb3ZlU2ltcGxlLnkgKj0gLTE7XHJcbiAgICAgICAgICAgIHJldHVybiBtb3ZlU2ltcGxlO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXREYW1hZ2UoX3ZhbHVlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuZ2V0RGFtYWdlKF92YWx1ZSk7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIDw9IDApIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5yZW1vdmVFbmVteSh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGllKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRpZSgpIHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBjb2xsaWRlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgc3VwZXIuY29sbGlkZShfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBhdmF0YXJDb2xsaWRlcnM6IFBsYXllci5QbGF5ZXJbXSA9IDxQbGF5ZXIuUGxheWVyW10+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuUExBWUVSKTtcclxuICAgICAgICAgICAgYXZhdGFyQ29sbGlkZXJzLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQmVmb3JlTW92ZSA9IGludGVyc2VjdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgdGhpcy5jb2xsaWRlci5yYWRpdXMgKyBlbGVtZW50LmNvbGxpZGVyLnJhZGl1cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgb2xkUG9zaXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKHRoaXMuY29sbGlkZXIucG9zaXRpb24ueCwgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoX2RpcmVjdGlvbi54LCAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnRyYW5zZm9ybSjGki5NYXRyaXgzeDMuVFJBTlNMQVRJT04obmV3RGlyZWN0aW9uKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcikgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBuZXdJbnRlcnNlY3Rpb247XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVggPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKDAsIF9kaXJlY3Rpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50LmNvbGxpZGVyKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUFmdGVyTW92ZSA9IG5ld0ludGVyc2VjdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgPT0gR2FtZS5hdmF0YXIxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmdldEtub2NrYmFjayh0aGlzLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50ID09IEdhbWUuYXZhdGFyMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5rbm9ja2JhY2tQdXNoKHRoaXMuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcblxyXG5cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNhbk1vdmVYICYmIHRoaXMuY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNhbk1vdmVYICYmICF0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoX2RpcmVjdGlvbi54LCAwLCBfZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuY2FuTW92ZVggJiYgdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIF9kaXJlY3Rpb24ueSwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzd2l0Y2hBbmltYXRpb24oX25hbWU6IHN0cmluZykge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKF9uYW1lKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiaWRsZVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRBbmltYXRpb24gIT0gRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbnNbX25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRGcmFtZURpcmVjdGlvbigxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mcmFtZXJhdGUgPSBBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCkuaWRsZUZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QW5pbWF0aW9uID0gRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVuZW15U3RhdGUodGhpcy5jdXJyZW50QW5pbWF0aW9uLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwid2Fsa1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRBbmltYXRpb24gIT0gRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbnNbX25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRGcmFtZURpcmVjdGlvbigxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mcmFtZXJhdGUgPSBBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCkud2Fsa0ZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QW5pbWF0aW9uID0gRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVuZW15U3RhdGUodGhpcy5jdXJyZW50QW5pbWF0aW9uLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwic3VtbW9uXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEFuaW1hdGlvbiAhPSBFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLlNVTU1PTikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25zW19uYW1lXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0RnJhbWVEaXJlY3Rpb24oMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZnJhbWVyYXRlID0gQW5pbWF0aW9uR2VuZXJhdGlvbi5nZXRBbmltYXRpb25CeUlkKHRoaXMuaWQpLndhbGtGcmFtZVJhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvbiA9IEVudGl0eS5BTklNQVRJT05TVEFURVMuU1VNTU9OO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVuZW15U3RhdGUodGhpcy5jdXJyZW50QW5pbWF0aW9uLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15RHVtYiBleHRlbmRzIEVuZW15IHtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci51cGRhdGUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJlaGF2aW91cigpIHtcclxuICAgICAgICAgICAgbGV0IHRhcmdldCA9IENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRhcmdldCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLm1hZ25pdHVkZTtcclxuICAgICAgICAgICAgLy9UT0RPOiBzZXQgdG8gMyBhZnRlciB0ZXN0aW5nXHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZSA+IDMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YXRlID0gQkVIQVZJT1VSLkZPTExPV1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U3RhdGUgPSBCRUhBVklPVVIuSURMRTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmVoYXZpb3VyKCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jdXJyZW50U3RhdGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgQkVIQVZJT1VSLklETEU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oXCJpZGxlXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCRUhBVklPVVIuRk9MTE9XOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKFwid2Fsa1wiKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVTaW1wbGUoQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIC8vIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgLy8gdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uc1tcImlkbGVcIl0pO1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyBleHBvcnQgY2xhc3MgRW5lbXlEYXNoIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgLy8gICAgIGlzQXR0YWNraW5nID0gZmFsc2U7XHJcbiAgICAvLyAgICAgcGVyZm9tckFiaWxpdHkgPSBmYWxzZTtcclxuICAgIC8vICAgICBsYXN0TW92ZURpcmVjaXRvbjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgLy8gICAgIGRhc2hDb3VudDogbnVtYmVyID0gMTtcclxuICAgIC8vICAgICBhdmF0YXJzOiBQbGF5ZXIuUGxheWVyW10gPSBbXTtcclxuICAgIC8vICAgICByYW5kb21QbGF5ZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpO1xyXG5cclxuICAgIC8vICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX2F0dHJpYnV0ZXM6IEVudGl0eS5BdHRyaWJ1dGVzLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgLy8gICAgICAgICBzdXBlcihfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAvLyAgICAgfVxyXG5cclxuICAgIC8vICAgICBwdWJsaWMgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgLy8gICAgICAgICBzdXBlci51cGRhdGUoKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIGJlaGF2aW91cigpIHtcclxuICAgIC8vICAgICAgICAgdGhpcy5hdmF0YXJzID0gW0dhbWUuYXZhdGFyMSwgR2FtZS5hdmF0YXIyXVxyXG4gICAgLy8gICAgICAgICB0aGlzLnRhcmdldCA9ICg8UGxheWVyLlBsYXllcj50aGlzLmF2YXRhcnNbdGhpcy5yYW5kb21QbGF5ZXJdKS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuXHJcblxyXG4gICAgLy8gICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGU7XHJcblxyXG4gICAgLy8gICAgICAgICBpZiAoZGlzdGFuY2UgPiA1KSB7XHJcbiAgICAvLyAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTdGF0ZSA9IEJFSEFWSU9VUi5GT0xMT1c7XHJcbiAgICAvLyAgICAgICAgICAgICB0aGlzLmlzQXR0YWNraW5nID0gZmFsc2U7XHJcbiAgICAvLyAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgZWxzZSBpZiAoZGlzdGFuY2UgPCAzICYmICF0aGlzLmlzQXR0YWNraW5nKSB7XHJcbiAgICAvLyAgICAgICAgICAgICB0aGlzLmRvRGFzaCgpO1xyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgICAgIGVsc2Uge1xyXG4gICAgLy8gICAgICAgICAgICAgLy8gdGhpcy5jdXJyZW50U3RhdGUgPSBCRUhBVklPVVIuSURMRTtcclxuICAgIC8vICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAvLyAgICAgfVxyXG5cclxuXHJcbiAgICAvLyAgICAgZG9EYXNoKCkge1xyXG4gICAgLy8gICAgICAgICBpZiAoIXRoaXMuaXNBdHRhY2tpbmcpIHtcclxuICAgIC8vICAgICAgICAgICAgIHRoaXMuaXNBdHRhY2tpbmcgPSB0cnVlO1xyXG4gICAgLy8gICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLmhpdGFibGUgPSBmYWxzZTtcclxuICAgIC8vICAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcy5zcGVlZCAqPSAyO1xyXG4gICAgLy8gICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLnNwZWVkIC89IDI7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLmhpdGFibGUgPSB0cnVlO1xyXG4gICAgLy8gICAgICAgICAgICAgfSwgMzAwKTtcclxuICAgIC8vICAgICAgICAgfVxyXG4gICAgLy8gICAgIH1cclxuXHJcblxyXG5cclxuXHJcbiAgICAvLyAgICAgbW92ZUJlaGF2aW91cigpOiB2b2lkIHtcclxuICAgIC8vICAgICAgICAgdGhpcy5iZWhhdmlvdXIoKTtcclxuICAgIC8vICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRTdGF0ZSkge1xyXG4gICAgLy8gICAgICAgICAgICAgY2FzZSBCRUhBVklPVVIuRk9MTE9XOlxyXG4gICAgLy8gICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKFwid2Fsa1wiKTtcclxuICAgIC8vICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0F0dGFja2luZykge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVTaW1wbGUodGhpcy5sYXN0TW92ZURpcmVjaXRvbi50b1ZlY3RvcjIoKSkudG9WZWN0b3IzKCk7XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgfVxyXG4gICAgLy8gICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVTaW1wbGUodGhpcy50YXJnZXQpLnRvVmVjdG9yMygpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RNb3ZlRGlyZWNpdG9uID0gdGhpcy5tb3ZlRGlyZWN0aW9uO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgIC8vICAgICAgICAgICAgIGNhc2UgQkVIQVZJT1VSLklETEU6XHJcbiAgICAvLyAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oXCJpZGxlXCIpO1xyXG4gICAgLy8gICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgfVxyXG4gICAgLy8gfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteVBhdHJvbCBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICBwYXRyb2xQb2ludHM6IMaSLlZlY3RvcjJbXSA9IFtuZXcgxpIuVmVjdG9yMigwLCA0KSwgbmV3IMaSLlZlY3RvcjIoNSwgMCldO1xyXG4gICAgICAgIHdhaXRUaW1lOiBudW1iZXIgPSAxMDAwO1xyXG4gICAgICAgIGN1cnJlblBvaW50SW5kZXg6IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLnVwZGF0ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5wYXRyb2woKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHBhdHJvbCgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24uZ2V0RGlzdGFuY2UoxpIuVmVjdG9yMy5TVU0odGhpcy5wYXRyb2xQb2ludHNbdGhpcy5jdXJyZW5Qb2ludEluZGV4XS50b1ZlY3RvcjMoKSwgR2FtZS5jdXJyZW50Um9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbikpID4gMC4zKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVTaW1wbGUoKMaSLlZlY3RvcjIuU1VNKHRoaXMucGF0cm9sUG9pbnRzW3RoaXMuY3VycmVuUG9pbnRJbmRleF0sIEdhbWUuY3VycmVudFJvb20ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpKSkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW5Qb2ludEluZGV4ICsgMSA8IHRoaXMucGF0cm9sUG9pbnRzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlblBvaW50SW5kZXgrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVuUG9pbnRJbmRleCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwgdGhpcy53YWl0VGltZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15U2hvb3QgZXh0ZW5kcyBFbmVteSB7XHJcbiAgICAgICAgd2VhcG9uOiBXZWFwb25zLldlYXBvbjtcclxuICAgICAgICB2aWV3UmFkaXVzOiBudW1iZXIgPSAzO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogbnVtYmVyLCBfYXR0cmlidXRlczogRW50aXR5LkF0dHJpYnV0ZXMsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX3dlYXBvbjogV2VhcG9ucy5XZWFwb24sIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMud2VhcG9uID0gX3dlYXBvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgc3VwZXIudXBkYXRlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvb3QoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzaG9vdChfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgbGV0IHRhcmdldDogxpIuVmVjdG9yMyA9IENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pXHJcbiAgICAgICAgICAgIGxldCBfZGlyZWN0aW9uID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRhcmdldCwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIC8vIGlmICh0aGlzLndlYXBvbi5jdXJyZW50QXR0YWNrQ291bnQgPiAwICYmIF9kaXJlY3Rpb24ubWFnbml0dWRlIDwgdGhpcy52aWV3UmFkaXVzKSB7XHJcbiAgICAgICAgICAgIC8vICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAvLyAgICAgLy8gbGV0IGJ1bGxldDogQnVsbGV0cy5CdWxsZXQgPSBuZXcgQnVsbGV0cy5Ib21pbmdCdWxsZXQobmV3IMaSLlZlY3RvcjIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSksIF9kaXJlY3Rpb24sIENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICAvLyAgICAgYnVsbGV0Lm93bmVyID0gdGhpcy50YWc7XHJcbiAgICAgICAgICAgIC8vICAgICBidWxsZXQuZmx5RGlyZWN0aW9uLnNjYWxlKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIGJ1bGxldC5zcGVlZCk7XHJcbiAgICAgICAgICAgIC8vICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGJ1bGxldCk7XHJcbiAgICAgICAgICAgIC8vICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgTmV0d29ya2luZy5zcGF3bkJ1bGxldEF0RW5lbXkoYnVsbGV0Lm5ldElkLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgLy8gICAgICAgICB0aGlzLndlYXBvbi5jdXJyZW50QXR0YWNrQ291bnQtLTtcclxuICAgICAgICAgICAgLy8gICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgdGhpcy53ZWFwb24uc2hvb3QodGhpcy50YWcsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIF9kaXJlY3Rpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgLy8gZXhwb3J0IGNsYXNzIEVuZW15Q2lyY2xlIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgLy8gICAgIGRpc3RhbmNlOiBudW1iZXIgPSA1O1xyXG5cclxuICAgIC8vICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3RlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyKSB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyKF9uYW1lLCBfcHJvcGVydGllcywgX3Bvc2l0aW9uKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIG1vdmUoKTogdm9pZCB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyLm1vdmUoKTtcclxuICAgIC8vICAgICAgICAgdGhpcy5tb3ZlQ2lyY2xlKCk7XHJcbiAgICAvLyAgICAgfVxyXG5cclxuICAgIC8vICAgICBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpOiB2b2lkIHtcclxuICAgIC8vICAgICAgICAgc3VwZXIubGlmZXNwYW4oX2dyYXBoKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIGFzeW5jIG1vdmVDaXJjbGUoKSB7XHJcbiAgICAvLyAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnRhcmdldCk7XHJcbiAgICAvLyAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjEgPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgIC8vICAgICAgICAgLy8gbGV0IGRpc3RhbmNlUGxheWVyMiA9IHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKEdhbWUucGxheWVyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICBpZiAoZGlzdGFuY2VQbGF5ZXIxID4gdGhpcy5kaXN0YW5jZSkge1xyXG4gICAgLy8gICAgICAgICAgICAgdGhpcy5tb3ZlU2ltcGxlKCk7XHJcbiAgICAvLyAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgZWxzZSB7XHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgZGVncmVlID0gQ2FsY3VsYXRpb24uY2FsY0RlZ3JlZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy50YXJnZXQpXHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgYWRkID0gMDtcclxuXHJcbiAgICAvLyAgICAgICAgICAgICAvLyB3aGlsZSAoZGlzdGFuY2VQbGF5ZXIxIDw9IHRoaXMuZGlzdGFuY2UpIHtcclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgSW5wdXRTeXN0ZW0uY2FsY1Bvc2l0aW9uRnJvbURlZ3JlZShkZWdyZWUgKyBhZGQsIHRoaXMuZGlzdGFuY2UpLnRvVmVjdG9yMygwKSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBkaXJlY3Rpb24uc2NhbGUoKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKGRpcmVjdGlvbiwgdHJ1ZSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgYWRkICs9IDU7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyB9XHJcblxyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgfVxyXG4gICAgLy8gfVxyXG59IiwibmFtZXNwYWNlIEludGVyZmFjZXMge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJU3Bhd25hYmxlIHtcclxuICAgICAgICBsaWZldGltZT86IG51bWJlcjtcclxuICAgICAgICBkZXNwYXduKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJS25vY2tiYWNrYWJsZSB7XHJcbiAgICAgICAgZG9Lbm9ja2JhY2soX2JvZHk6IEVudGl0eS5FbnRpdHkpOiB2b2lkO1xyXG4gICAgICAgIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUtpbGxhYmxlIHtcclxuICAgICAgICBvbkRlYXRoKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRGFtYWdlYWJsZSB7XHJcbiAgICAgICAgZ2V0RGFtYWdlKCk6IHZvaWQ7XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgSXRlbXMge1xyXG4gICAgZXhwb3J0IGVudW0gSVRFTUlEIHtcclxuICAgICAgICBDT09MRE9XTixcclxuICAgICAgICBETUdVUCxcclxuICAgICAgICBTUEVFRFVQLFxyXG4gICAgICAgIFBST0pFQ1RJTEVTVVAsXHJcbiAgICAgICAgSEVBTFRIVVAsXHJcbiAgICAgICAgU0NBTEVVUCxcclxuICAgICAgICBTQ0FMRURPV04sXHJcbiAgICAgICAgQVJNT1JVUCxcclxuICAgICAgICBIT01FQ09NSU5HXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRJY2VCdWNrZXQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0RG1nVXA6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0SGVhbHRoVXA6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcblxyXG5cclxuXHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgSXRlbSBleHRlbmRzIEdhbWUuxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuSVRFTTtcclxuICAgICAgICBpZDogSVRFTUlEO1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyID0gTmV0d29ya2luZy5pZEdlbmVyYXRvcigpO1xyXG4gICAgICAgIHB1YmxpYyBkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBpbWdTcmM6IHN0cmluZztcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG4gICAgICAgIHRyYW5zZm9ybTogxpIuQ29tcG9uZW50VHJhbnNmb3JtID0gbmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpO1xyXG4gICAgICAgIHBvc2l0aW9uOiDGki5WZWN0b3IyXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogSVRFTUlELCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihnZXRJbnRlcm5hbEl0ZW1CeUlkKF9pZCkubmFtZSk7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRJbnRlcm5hbEl0ZW1CeUlkKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uID0gX3Bvc2l0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLnRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IF9wb3NpdGlvbi50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgaWYgKF9uZXRJZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucG9wSUQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLmN1cnJlbnRJRHMucHVzaChfbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmRlc2NyaXB0aW9uID0gaXRlbS5kZXNjcmlwdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5pbWdTcmMgPSBpdGVtLmltZ1NyYztcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyDGki5NZXNoUXVhZCgpKSk7XHJcbiAgICAgICAgICAgIGxldCBtYXRlcmlhbDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJ3aGl0ZVwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobWF0ZXJpYWwpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfcG9zaXRpb24udG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBsb2FkVGV4dHVyZShfdGV4dHVyZTogxpIuVGV4dHVyZUltYWdlKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgICAgIGxldCBuZXdUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgICAgICAgICAgbmV3VHh0ID0gX3RleHR1cmU7XHJcbiAgICAgICAgICAgIGxldCBuZXdDb2F0OiDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQgPSBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKCk7XHJcbiAgICAgICAgICAgIG5ld0NvYXQudGV4dHVyZSA9IG5ld1R4dDtcclxuICAgICAgICAgICAgbGV0IG5ld010cjogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtdHJcIiwgxpIuU2hhZGVyRmxhdFRleHR1cmVkLCBuZXdDb2F0KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50TWF0ZXJpYWwpLm1hdGVyaWFsID0gbmV3TXRyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0UG9zaXRpb24oX3Bvc2l0aW9uOiDGki5WZWN0b3IyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfcG9zaXRpb24udG9WZWN0b3IzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZGVzcGF3bigpOiB2b2lkIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5yZW1vdmVJdGVtKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZG9Zb3VyVGhpbmcoX2F2YXRhcjogUGxheWVyLlBsYXllcikge1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgSW50ZXJuYWxJdGVtIGV4dGVuZHMgSXRlbSB7XHJcbiAgICAgICAgdmFsdWU6IG51bWJlcjtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IElURU1JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBnZXRJbnRlcm5hbEl0ZW1CeUlkKF9pZCkudmFsdWU7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0VGV4dHVyZUJ5SWQoX2lkKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkludGVybmFsSXRlbSh0aGlzLCB0aGlzLmlkLCBfcG9zaXRpb24sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZG9Zb3VyVGhpbmcoX2F2YXRhcjogUGxheWVyLlBsYXllcikge1xyXG4gICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZXNCeUlkKHRoaXMuaWQsIF9hdmF0YXIpO1xyXG4gICAgICAgICAgICB0aGlzLmRlc3Bhd24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldEF0dHJpYnV0ZXNCeUlkKF9pZDogSVRFTUlELCBfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5DT09MRE9XTjpcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24gPSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24sIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuZGVzY3JpcHRpb24gKyBcIjogXCIgKyBfYXZhdGFyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyQXR0cmlidXRlcyhfYXZhdGFyLmF0dHJpYnV0ZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuRE1HVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cyArPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuZGVzY3JpcHRpb24gKyBcIjogXCIgKyBfYXZhdGFyLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhckF0dHJpYnV0ZXMoX2F2YXRhci5hdHRyaWJ1dGVzKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNQRUVEVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkID0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmRlc2NyaXB0aW9uICsgXCI6IFwiICsgX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhckF0dHJpYnV0ZXMoX2F2YXRhci5hdHRyaWJ1dGVzKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlBST0pFQ1RJTEVTVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24ucHJvamVjdGlsZUFtb3VudCArPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuZGVzY3JpcHRpb24gKyBcIjogXCIgKyBfYXZhdGFyLndlYXBvbi5wcm9qZWN0aWxlQW1vdW50KTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhcldlYXBvbihfYXZhdGFyLndlYXBvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5IRUFMVEhVUDpcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzID0gQ2FsY3VsYXRpb24uYWRkUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cywgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5kZXNjcmlwdGlvbiArIFwiOiBcIiArIF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyQXR0cmlidXRlcyhfYXZhdGFyLmF0dHJpYnV0ZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0NBTEVVUDpcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy51cGRhdGVTY2FsZURlcGVuZGVuY2llcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjMoX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuZGVzY3JpcHRpb24gKyBcIjogXCIgKyBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyQXR0cmlidXRlcyhfYXZhdGFyLmF0dHJpYnV0ZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogc2V0IG5ldyBjb2xsaWRlciBhbmQgc3luYyBvdmVyIG5ldHdvcmtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNDQUxFRE9XTjpcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUgPSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjMoX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy51cGRhdGVTY2FsZURlcGVuZGVuY2llcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuZGVzY3JpcHRpb24gKyBcIjogXCIgKyBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyQXR0cmlidXRlcyhfYXZhdGFyLmF0dHJpYnV0ZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogc2V0IG5ldyBjb2xsaWRlciBhbmQgc3luYyBvdmVyIG5ldHdvcmtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkFSTU9SVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmFybW9yICs9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5kZXNjcmlwdGlvbiArIFwiOiBcIiArIF9hdmF0YXIuYXR0cmlidXRlcy5hcm1vcik7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJBdHRyaWJ1dGVzKF9hdmF0YXIuYXR0cmlidXRlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5IT01FQ09NSU5HOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogdGFsayB3aXRoIHRvYmlcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldFRleHR1cmVCeUlkKF9pZDogSVRFTUlEKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5DT09MRE9XTjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dEljZUJ1Y2tldCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5ETUdVUDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dEljZUJ1Y2tldCk7IC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5TUEVFRFVQOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5QUk9KRUNUSUxFU1VQOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5IRUFMVEhVUDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dEhlYWx0aFVwKTtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0NBTEVVUDpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0NBTEVET1dOOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkFSTU9SVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRJbnRlcm5hbEl0ZW1CeUlkKF9pZDogSVRFTUlEKTogSXRlbXMuSW50ZXJuYWxJdGVtIHtcclxuICAgICAgICByZXR1cm4gR2FtZS5pbnRlcm5hbEl0ZW1KU09OLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IF9pZCk7XHJcbiAgICB9XHJcblxyXG59IiwibmFtZXNwYWNlIEFuaW1hdGlvbkdlbmVyYXRpb24ge1xyXG4gICAgZXhwb3J0IGxldCB0eHRSZWRUaWNrSWRsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRSZWRUaWNrV2FsazogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0U21hbGxUaWNrSWRsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTbWFsbFRpY2tXYWxrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRCYXRJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG4gICAgY2xhc3MgTXlBbmltYXRpb25DbGFzcyB7XHJcbiAgICAgICAgcHVibGljIGlkOiBFbnRpdHkuSUQ7XHJcbiAgICAgICAgcHVibGljIHNwcml0ZVNoZWV0SWRsZTogxpIuQ29hdFRleHR1cmVkO1xyXG4gICAgICAgIHB1YmxpYyBzcHJpdGVTaGVldFdhbGs6IMaSLkNvYXRUZXh0dXJlZDtcclxuICAgICAgICBpZGxlTnVtYmVyT2ZGcmFtZXM6IG51bWJlcjtcclxuICAgICAgICB3YWxrTnVtYmVyT2ZGcmFtZXM6IG51bWJlcjtcclxuICAgICAgICBpZGxlRnJhbWVSYXRlOiBudW1iZXI7XHJcbiAgICAgICAgd2Fsa0ZyYW1lUmF0ZTogbnVtYmVyO1xyXG5cclxuICAgICAgICBjbHJXaGl0ZTogxpIuQ29sb3IgPSDGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKTtcclxuICAgICAgICBhbmltYXRpb25zOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbnMgPSB7fTtcclxuICAgICAgICBpZGxlU2NhbGU6IG51bWJlcjtcclxuICAgICAgICB3YWxrU2NhbGU6IG51bWJlcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsXHJcbiAgICAgICAgICAgIF90eHRJZGxlOiDGki5UZXh0dXJlSW1hZ2UsXHJcbiAgICAgICAgICAgIF9pZGxlTnVtYmVyT2ZGcmFtZXM6IG51bWJlcixcclxuICAgICAgICAgICAgX2lkbGVGcmFtZVJhdGU6IG51bWJlcixcclxuICAgICAgICAgICAgX3R4dFdhbGs/OiDGki5UZXh0dXJlSW1hZ2UsXHJcbiAgICAgICAgICAgIF93YWxrTnVtYmVyT2ZGcmFtZXM/OiBudW1iZXIsXHJcbiAgICAgICAgICAgIF93YWxrRnJhbWVSYXRlPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlU2hlZXRJZGxlID0gbmV3IMaSLkNvYXRUZXh0dXJlZCh0aGlzLmNscldoaXRlLCBfdHh0SWRsZSk7XHJcbiAgICAgICAgICAgIHRoaXMuaWRsZUZyYW1lUmF0ZSA9IF9pZGxlRnJhbWVSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLmlkbGVOdW1iZXJPZkZyYW1lcyA9IF9pZGxlTnVtYmVyT2ZGcmFtZXM7XHJcbiAgICAgICAgICAgIGlmIChfdHh0V2FsayAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3ByaXRlU2hlZXRXYWxrID0gbmV3IMaSLkNvYXRUZXh0dXJlZCh0aGlzLmNscldoaXRlLCBfdHh0V2Fsayk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndhbGtGcmFtZVJhdGUgPSBfd2Fsa0ZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMud2Fsa051bWJlck9mRnJhbWVzID0gX3dhbGtOdW1iZXJPZkZyYW1lcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3ByaXRlU2hlZXRXYWxrID0gbmV3IMaSLkNvYXRUZXh0dXJlZCh0aGlzLmNscldoaXRlLCBfdHh0SWRsZSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndhbGtGcmFtZVJhdGUgPSBfaWRsZUZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMud2Fsa051bWJlck9mRnJhbWVzID0gX2lkbGVOdW1iZXJPZkZyYW1lcztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCBzaGVldEFycmF5OiBNeUFuaW1hdGlvbkNsYXNzW10gPSBbXTtcclxuICAgIC8vI3JlZ2lvbiBhbmltYXRpb25cclxuXHJcbiAgICBsZXQgYmF0QW5pbWF0aW9uOiBNeUFuaW1hdGlvbkNsYXNzID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELkJBVCwgdHh0QmF0SWRsZSwgNCwgMTIpO1xyXG4gICAgbGV0IHJlZFRpY2tBbmltYXRpb246IE15QW5pbWF0aW9uQ2xhc3MgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuUkVEVElDSywgdHh0UmVkVGlja0lkbGUsIDYsIDEyLCB0eHRSZWRUaWNrV2FsaywgNCwgMTIpO1xyXG4gICAgbGV0IHNtYWxsVGlja0FuaW1hdGlvbjogTXlBbmltYXRpb25DbGFzcyA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TTUFMTFRJQ0ssIHR4dFJlZFRpY2tJZGxlLCA2LCAxMiwgdHh0UmVkVGlja1dhbGssIDQsIDEyKTtcclxuXHJcbiAgICAoPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPmJhdEFuaW1hdGlvbi5hbmltYXRpb25zW1wiXCJdKVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRBbmltYXRpb25CeUlkKF9pZDogRW50aXR5LklEKTogTXlBbmltYXRpb25DbGFzcyB7XHJcbiAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuQkFUOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJhdEFuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuUkVEVElDSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiByZWRUaWNrQW5pbWF0aW9uO1xyXG4gICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5TTUFMTFRJQ0s6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc21hbGxUaWNrQW5pbWF0aW9uO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlQWxsQW5pbWF0aW9ucygpIHtcclxuICAgICAgICBzaGVldEFycmF5LnB1c2goYmF0QW5pbWF0aW9uLCByZWRUaWNrQW5pbWF0aW9uLCBzbWFsbFRpY2tBbmltYXRpb24pO1xyXG5cclxuICAgICAgICBzaGVldEFycmF5LmZvckVhY2gob2JqID0+IHtcclxuICAgICAgICAgICAgbGV0IGlkbGVXaWR0aDogbnVtYmVyID0gb2JqLnNwcml0ZVNoZWV0SWRsZS50ZXh0dXJlLnRleEltYWdlU291cmNlLndpZHRoIC8gb2JqLmlkbGVOdW1iZXJPZkZyYW1lcztcclxuICAgICAgICAgICAgbGV0IGlkbGVIZWlndGg6IG51bWJlciA9IG9iai5zcHJpdGVTaGVldElkbGUudGV4dHVyZS50ZXhJbWFnZVNvdXJjZS5oZWlnaHQ7XHJcbiAgICAgICAgICAgIGxldCB3YWxrV2lkdGg6IG51bWJlciA9IG9iai5zcHJpdGVTaGVldFdhbGsudGV4dHVyZS50ZXhJbWFnZVNvdXJjZS53aWR0aCAvIG9iai53YWxrTnVtYmVyT2ZGcmFtZXM7XHJcbiAgICAgICAgICAgIGxldCB3YWxrSGVpZ3RoOiBudW1iZXIgPSBvYmouc3ByaXRlU2hlZXRXYWxrLnRleHR1cmUudGV4SW1hZ2VTb3VyY2UuaGVpZ2h0O1xyXG4gICAgICAgICAgICBnZW5lcmF0ZUFuaW1hdGlvbkZyb21HcmlkKG9iai5zcHJpdGVTaGVldElkbGUsIG9iai5hbmltYXRpb25zLCBcImlkbGVcIiwgaWRsZVdpZHRoLCBpZGxlSGVpZ3RoLCBvYmouaWRsZU51bWJlck9mRnJhbWVzLCBvYmouaWRsZUZyYW1lUmF0ZSwgMjIpO1xyXG4gICAgICAgICAgICBnZW5lcmF0ZUFuaW1hdGlvbkZyb21HcmlkKG9iai5zcHJpdGVTaGVldFdhbGssIG9iai5hbmltYXRpb25zLCBcIndhbGtcIiwgd2Fsa1dpZHRoLCB3YWxrSGVpZ3RoLCBvYmoud2Fsa051bWJlck9mRnJhbWVzLCBvYmoud2Fsa0ZyYW1lUmF0ZSwgMjIpO1xyXG4gICAgICAgICAgICBvYmouaWRsZVNjYWxlID0gZ2V0UGl4ZWxSYXRpbyhpZGxlSGVpZ3RoLCBpZGxlV2lkdGgpO1xyXG4gICAgICAgICAgICBvYmoud2Fsa1NjYWxlID0gZ2V0UGl4ZWxSYXRpbyh3YWxrSGVpZ3RoLCB3YWxrV2lkdGgpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0UGl4ZWxSYXRpbyhfd2lkdGg6IG51bWJlciwgX2hlaWdodDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgbWF4ID0gTWF0aC5tYXgoX3dpZHRoLCBfaGVpZ2h0KTtcclxuICAgICAgICBsZXQgbWluID0gTWF0aC5taW4oX3dpZHRoLCBfaGVpZ2h0KTtcclxuXHJcbiAgICAgICAgbGV0IHNjYWxlID0gMSAvIG1heCAqIG1pbjtcclxuICAgICAgICByZXR1cm4gc2NhbGU7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlQW5pbWF0aW9uRnJvbUdyaWQoX3Nwcml0ZXNoZWV0OiDGki5Db2F0VGV4dHVyZWQsIF9hbmltYXRpb25zaGVldDogxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb25zLCBfYW5pbWF0aW9uTmFtZTogc3RyaW5nLCBfd2lkdGg6IG51bWJlciwgX2hlaWdodDogbnVtYmVyLCBfbnVtYmVyT2ZGcmFtZXM6IG51bWJlciwgX2ZyYW1lUmF0ZTogbnVtYmVyLCBfcmVzb2x1dGlvbjogbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IG5hbWUgPSBfYW5pbWF0aW9uTmFtZTtcclxuICAgICAgICBsZXQgY3JlYXRlZEFuaW1hdGlvbjogxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24gPSBuZXcgxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24obmFtZSwgX3Nwcml0ZXNoZWV0KTtcclxuICAgICAgICBjcmVhdGVkQW5pbWF0aW9uLmdlbmVyYXRlQnlHcmlkKMaSLlJlY3RhbmdsZS5HRVQoMCwgMCwgX3dpZHRoLCBfaGVpZ2h0KSwgX251bWJlck9mRnJhbWVzLCAzMiwgxpIuT1JJR0lOMkQuQ0VOVEVSLCDGki5WZWN0b3IyLlgoX3dpZHRoKSk7XHJcbiAgICAgICAgX2FuaW1hdGlvbnNoZWV0W25hbWVdID0gY3JlYXRlZEFuaW1hdGlvbjtcclxuICAgICAgICBjb25zb2xlLmxvZyhuYW1lICsgXCI6IFwiICsgX2FuaW1hdGlvbnNoZWV0W25hbWVdKTtcclxuICAgIH1cclxufVxyXG5cclxuIiwibmFtZXNwYWNlIEVudGl0eSB7XHJcbiAgICBleHBvcnQgY2xhc3MgQXR0cmlidXRlcyB7XHJcblxyXG4gICAgICAgIGhlYWx0aFBvaW50czogbnVtYmVyO1xyXG4gICAgICAgIG1heEhlYWx0aFBvaW50czogbnVtYmVyO1xyXG4gICAgICAgIGtub2NrYmFja0ZvcmNlOiBudW1iZXI7XHJcbiAgICAgICAgaGl0YWJsZTogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgYXJtb3I6IG51bWJlcjtcclxuICAgICAgICBzcGVlZDogbnVtYmVyO1xyXG4gICAgICAgIGF0dGFja1BvaW50czogbnVtYmVyO1xyXG4gICAgICAgIGNvb2xEb3duUmVkdWN0aW9uOiBudW1iZXIgPSAxO1xyXG4gICAgICAgIHNjYWxlOiBudW1iZXI7XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaGVhbHRoUG9pbnRzOiBudW1iZXIsIF9hdHRhY2tQb2ludHM6IG51bWJlciwgX3NwZWVkOiBudW1iZXIsIF9zY2FsZTogbnVtYmVyLCBfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX2FybW9yOiBudW1iZXIsIF9jb29sZG93blJlZHVjdGlvbj86IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLnNjYWxlID0gX3NjYWxlO1xyXG4gICAgICAgICAgICB0aGlzLmFybW9yID0gX2FybW9yO1xyXG4gICAgICAgICAgICB0aGlzLmhlYWx0aFBvaW50cyA9IE1hdGguZnJvdW5kKF9oZWFsdGhQb2ludHMgKiAoMTAwICsgKDEwICogdGhpcy5zY2FsZSkpIC8gMTAwKTtcclxuICAgICAgICAgICAgdGhpcy5tYXhIZWFsdGhQb2ludHMgPSB0aGlzLmhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgdGhpcy5hdHRhY2tQb2ludHMgPSBNYXRoLmZyb3VuZChfYXR0YWNrUG9pbnRzICogdGhpcy5zY2FsZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSBNYXRoLmZyb3VuZChfc3BlZWQgLyB0aGlzLnNjYWxlKTtcclxuICAgICAgICAgICAgdGhpcy5rbm9ja2JhY2tGb3JjZSA9IF9rbm9ja2JhY2tGb3JjZVxyXG4gICAgICAgICAgICB0aGlzLmtub2NrYmFja0ZvcmNlID0gdGhpcy5rbm9ja2JhY2tGb3JjZSAqICgxMDAgKyAoMTAgKiB0aGlzLnNjYWxlKSkgLyAxMDA7XHJcbiAgICAgICAgICAgIGlmIChfY29vbGRvd25SZWR1Y3Rpb24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvb2xEb3duUmVkdWN0aW9uID0gX2Nvb2xkb3duUmVkdWN0aW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGRhdGVTY2FsZURlcGVuZGVuY2llcygpIHtcclxuICAgICAgICAgICAgdGhpcy5oZWFsdGhQb2ludHMgPSBNYXRoLmZyb3VuZCh0aGlzLmhlYWx0aFBvaW50cyAqICgxMDAgKyAoMTAgKiB0aGlzLnNjYWxlKSkgLyAxMDApO1xyXG4gICAgICAgICAgICB0aGlzLmF0dGFja1BvaW50cyA9IE1hdGguZnJvdW5kKHRoaXMuYXR0YWNrUG9pbnRzICogdGhpcy5zY2FsZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSBNYXRoLmZyb3VuZCh0aGlzLnNwZWVkIC8gdGhpcy5zY2FsZSk7XHJcbiAgICAgICAgICAgIHRoaXMua25vY2tiYWNrRm9yY2UgPSB0aGlzLmtub2NrYmFja0ZvcmNlICogKDEwMCArICgxMCAqIHRoaXMuc2NhbGUpKSAvIDEwMDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXkge1xyXG4gICAgZXhwb3J0IGNsYXNzIFN1bW1vbm9yQm9zcyBleHRlbmRzIEVuZW15RHVtYiB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci51cGRhdGUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJlaGF2aW91cigpIHtcclxuICAgICAgICAgICAgbGV0IHRhcmdldCA9IENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRhcmdldCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLm1hZ25pdHVkZTtcclxuICAgICAgICAgICAgLy9UT0RPOiBzZXQgdG8gMyBhZnRlciB0ZXN0aW5nXHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZSA8IDUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YXRlID0gQkVIQVZJT1VSLkZMRUU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV4dFN0YXRlID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKTtcclxuXHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKG5leHRTdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U3RhdGUgPSBCRUhBVklPVVIuU1VNTU9OO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFN0YXRlID0gQkVIQVZJT1VSLklETEU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpIHtcclxuICAgICAgICAgICAgdGhpcy5iZWhhdmlvdXIoKTtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jdXJyZW50U3RhdGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgQkVIQVZJT1VSLklETEU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oXCJpZGxlXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCRUhBVklPVVIuRkxFRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihcIndhbGtcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5tb3ZlQXdheShDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikudG9WZWN0b3IyKCkpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCRUhBVklPVVIuU1VNTU9OOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKFwic3VtbW9uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3VtbW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAvLyBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbnNbXCJpZGxlXCJdKTtcclxuICAgICAgICAgICAgICAgIC8vICAgICAvLyBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3VtbW9uKCkge1xyXG4gICAgICAgICAgICBFbmVteVNwYXduZXIuc3Bhd25CeUlEKEVudGl0eS5JRC5TTUFMTFRJQ0ssIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIG5ldyBFbnRpdHkuQXR0cmlidXRlcyg1LCA1LCAzLCBNYXRoLnJhbmRvbSgpICogMiArIDEsIDAsIDApKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQnVmZiB7XHJcblxyXG4gICAgZXhwb3J0IGVudW0gQlVGRklEIHtcclxuICAgICAgICBCTEVFRElOR1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJ1ZmYge1xyXG4gICAgICAgIGR1cmF0aW9uOiBudW1iZXI7XHJcbiAgICAgICAgdGlja1JhdGU6IG51bWJlclxyXG4gICAgICAgIGlkOiBCVUZGSUQ7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogQlVGRklELCBfZHVyYXRpb246IG51bWJlciwgX3RpY2tSYXRlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5kdXJhdGlvbiA9IF9kdXJhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy50aWNrUmF0ZSA9IF90aWNrUmF0ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFwcGx5QnVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZG9CdWZmU3R1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5kdXJhdGlvbiAlIHRoaXMudGlja1JhdGUgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hcHBseUJ1ZmYoX2F2YXRhcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5kdXJhdGlvbi0tO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERhbWFnZUJ1ZmYgZXh0ZW5kcyBCdWZmIHtcclxuICAgICAgICB2YWx1ZTogbnVtYmVyID0gMTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEJVRkZJRCwgX2R1cmF0aW9uOiBudW1iZXIsIF90aWNrUmF0ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2R1cmF0aW9uLCBfdGlja1JhdGUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcHBseUJ1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmdldEJ1ZmZEYW1nZUJ5SWQodGhpcy5pZCwgX2F2YXRhcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRCdWZmRGFtZ2VCeUlkKF9pZDogQlVGRklELCBfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5CTEVFRElORzpcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmdldERhbWFnZSh0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBCdWxsZXRzIHtcclxuXHJcbiAgICBleHBvcnQgZW51bSBCVUxMRVRUWVBFIHtcclxuICAgICAgICBTVEFOREFSRCxcclxuICAgICAgICBISUdIU1BFRUQsXHJcbiAgICAgICAgU0xPVyxcclxuICAgICAgICBNRUxFRSxcclxuICAgICAgICBIT01JTkdcclxuICAgIH1cclxuICAgIGV4cG9ydCBsZXQgYnVsbGV0VHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEJ1bGxldCBleHRlbmRzIEdhbWUuxpIuTm9kZSBpbXBsZW1lbnRzIEludGVyZmFjZXMuSVNwYXduYWJsZSwgSW50ZXJmYWNlcy5JS25vY2tiYWNrYWJsZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuQlVMTEVUO1xyXG4gICAgICAgIG93bmVyOiBUYWcuVEFHO1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyID0gTmV0d29ya2luZy5pZEdlbmVyYXRvcigpO1xyXG5cclxuICAgICAgICBwdWJsaWMgdGljazogbnVtYmVyID0gMDtcclxuICAgICAgICBwdWJsaWMgcG9zaXRpb25zOiDGki5WZWN0b3IzW10gPSBbXTtcclxuICAgICAgICBwdWJsaWMgaG9zdFBvc2l0aW9uczogxpIuVmVjdG9yM1tdID0gW107XHJcblxyXG4gICAgICAgIHB1YmxpYyBmbHlEaXJlY3Rpb246IMaSLlZlY3RvcjM7XHJcbiAgICAgICAgZGlyZWN0aW9uOiDGki5WZWN0b3IzO1xyXG5cclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG5cclxuICAgICAgICBwdWJsaWMgaGl0UG9pbnRzU2NhbGU6IG51bWJlciA9IDU7XHJcbiAgICAgICAgcHVibGljIHNwZWVkOiBudW1iZXIgPSAyMDtcclxuICAgICAgICBsaWZldGltZTogbnVtYmVyID0gMSAqIEdhbWUuZnJhbWVSYXRlO1xyXG4gICAgICAgIGtub2NrYmFja0ZvcmNlOiBudW1iZXIgPSA0O1xyXG4gICAgICAgIHR5cGU6IEJVTExFVFRZUEU7XHJcblxyXG4gICAgICAgIHRpbWU6IG51bWJlciA9IDA7XHJcbiAgICAgICAga2lsbGNvdW50OiBudW1iZXIgPSAxO1xyXG5cclxuICAgICAgICBhc3luYyBkZXNwYXduKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA+PSAwICYmIHRoaXMubGlmZXRpbWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saWZldGltZS0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnJlbW92ZUJ1bGxldCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuaG9zdFBvc2l0aW9ucyk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2codGhpcy5wb3NpdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfc3BlZWQ6IG51bWJlciwgX2hpdFBvaW50czogbnVtYmVyLCBfbGlmZXRpbWU6IG51bWJlciwgX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9raWxsY291bnQ6IG51bWJlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUpO1xyXG5cclxuICAgICAgICAgICAgaWYgKF9uZXRJZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucG9wSUQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLmN1cnJlbnRJRHMucHVzaChfbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IF9zcGVlZDtcclxuICAgICAgICAgICAgdGhpcy5oaXRQb2ludHNTY2FsZSA9IF9oaXRQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSBfbGlmZXRpbWU7XHJcbiAgICAgICAgICAgIHRoaXMua25vY2tiYWNrRm9yY2UgPSBfa25vY2tiYWNrRm9yY2U7XHJcbiAgICAgICAgICAgIHRoaXMua2lsbGNvdW50ID0gX2tpbGxjb3VudDtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRMaWdodChuZXcgxpIuTGlnaHRQb2ludCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDApO1xyXG4gICAgICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWVzaCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBuZXdQb3NpdGlvbiA9IG5ldyDGki5WZWN0b3IyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKyB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcihuZXdQb3NpdGlvbiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55IC8gMS41KTtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVSb3RhdGlvbihfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSgpO1xyXG4gICAgICAgICAgICB0aGlzLmZseURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWCgpO1xyXG4gICAgICAgICAgICB0aGlzLmRpcmVjdGlvbiA9IF9kaXJlY3Rpb247XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgYXN5bmMgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUodGhpcy5mbHlEaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB0aGlzLmJ1bGxldFByZWRpY3Rpb24oKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaXNpb25EZXRlY3Rpb24oKTtcclxuICAgICAgICAgICAgdGhpcy5kZXNwYXduKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkb0tub2NrYmFjayhfYm9keTogxpJBaWQuTm9kZVNwcml0ZSk6IHZvaWQge1xyXG4gICAgICAgICAgICAoPEVuZW15LkVuZW15Pl9ib2R5KS5nZXRLbm9ja2JhY2sodGhpcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjMpOiB2b2lkIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGRhdGVSb3RhdGlvbihfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwucm90YXRlWihDYWxjdWxhdGlvbi5jYWxjRGVncmVlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCDGki5WZWN0b3IzLlNVTShfZGlyZWN0aW9uLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikpICsgOTApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYnVsbGV0UHJlZGljdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy50aW1lICs9IEdhbWUuxpIuTG9vcC50aW1lRnJhbWVHYW1lO1xyXG5cclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMudGltZSA+PSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBvc2l0aW9ucy5wdXNoKG5ldyDGki5WZWN0b3IzKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnopKTtcclxuICAgICAgICAgICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQnVsbGV0KHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLm5ldElkLCB0aGlzLnRpY2spO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy50aWNrKys7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWUgLT0gMTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGljayA+PSAxICYmIHRoaXMuaG9zdFBvc2l0aW9uc1t0aGlzLnRpY2sgLSAxXSAhPSB1bmRlZmluZWQgJiYgdGhpcy5wb3NpdGlvbnNbdGhpcy50aWNrIC0gMV0gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaG9zdFBvc2l0aW9uc1t0aGlzLnRpY2sgLSAxXS54ICE9IHRoaXMucG9zaXRpb25zW3RoaXMudGljayAtIDFdLnggfHwgdGhpcy5ob3N0UG9zaXRpb25zW3RoaXMudGljayAtIDFdLnkgIT0gdGhpcy5wb3NpdGlvbnNbdGhpcy50aWNrIC0gMV0ueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvcnJlY3RQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgY29ycmVjdFBvc2l0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5ob3N0UG9zaXRpb25zW3RoaXMudGlja10gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHRoaXMuaG9zdFBvc2l0aW9uc1t0aGlzLnRpY2tdO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7IHRoaXMuY29ycmVjdFBvc2l0aW9uIH0sIDEwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxvYWRUZXh0dXJlKCkge1xyXG4gICAgICAgICAgICBsZXQgbmV3VHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICAgICAgICAgIGxldCBuZXdDb2F0OiDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQgPSBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKCk7XHJcbiAgICAgICAgICAgIGxldCBuZXdNdHI6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibXRyXCIsIMaSLlNoYWRlckZsYXRUZXh0dXJlZCwgbmV3Q29hdCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgb2xkQ29tQ29hdDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuXHJcbiAgICAgICAgICAgIG9sZENvbUNvYXQgPSB0aGlzLmdldENvbXBvbmVudCjGki5Db21wb25lbnRNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICBuZXdUeHQgPSBidWxsZXRUeHQ7XHJcbiAgICAgICAgICAgIG5ld0NvYXQuY29sb3IgPSDGki5Db2xvci5DU1MoXCJXSElURVwiKTtcclxuICAgICAgICAgICAgbmV3Q29hdC50ZXh0dXJlID0gbmV3VHh0O1xyXG4gICAgICAgICAgICBvbGRDb21Db2F0Lm1hdGVyaWFsID0gbmV3TXRyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgY29sbGlzaW9uRGV0ZWN0aW9uKCkge1xyXG4gICAgICAgICAgICBsZXQgbmV3UG9zaXRpb24gPSBuZXcgxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBuZXdQb3NpdGlvbjtcclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyczogYW55W10gPSBbXTtcclxuICAgICAgICAgICAgaWYgKHRoaXMub3duZXIgPT0gVGFnLlRBRy5QTEFZRVIpIHtcclxuICAgICAgICAgICAgICAgIGNvbGxpZGVycyA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVuZW15LkVuZW15PmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLkVORU1ZKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5hdHRyaWJ1dGVzICE9IHVuZGVmaW5lZCAmJiB0aGlzLmtpbGxjb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoKDxFbmVteS5FbmVteT5lbGVtZW50KS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxFbmVteS5FbmVteT5lbGVtZW50KS5nZXREYW1hZ2UodGhpcy5oaXRQb2ludHNTY2FsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkuYnVmZnMucHVzaChuZXcgQnVmZi5EYW1hZ2VCdWZmKEJ1ZmYuQlVGRklELkJMRUVESU5HLCAzMDAsIDYwKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkuZ2V0S25vY2tiYWNrKHRoaXMua25vY2tiYWNrRm9yY2UsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5raWxsY291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm93bmVyID09IFRhZy5UQUcuRU5FTVkpIHtcclxuICAgICAgICAgICAgICAgIGNvbGxpZGVycyA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuUExBWUVSKTtcclxuICAgICAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5hdHRyaWJ1dGVzICE9IHVuZGVmaW5lZCAmJiB0aGlzLmtpbGxjb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA+IDAgJiYgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmF0dHJpYnV0ZXMuaGl0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmdldERhbWFnZSh0aGlzLmhpdFBvaW50c1NjYWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5nZXRLbm9ja2JhY2sodGhpcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBVSS5EYW1hZ2VVSSgoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLmhpdFBvaW50c1NjYWxlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMua2lsbGNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb2xsaWRlcnMgPSBbXTtcclxuICAgICAgICAgICAgY29sbGlkZXJzID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbWVudCA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5ST09NKSkud2FsbHM7XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlc1JlY3QoZWxlbWVudC5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIE1lbGVlQnVsbGV0IGV4dGVuZHMgQnVsbGV0IHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfc3BlZWQ6IG51bWJlciwgX2hpdFBvaW50czogbnVtYmVyLCBfbGlmZXRpbWU6IG51bWJlciwgX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9raWxsY291bnQ6IG51bWJlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUsIF9zcGVlZCwgX2hpdFBvaW50cywgX2xpZmV0aW1lLCBfa25vY2tiYWNrRm9yY2UsIF9raWxsY291bnQsIF9wb3NpdGlvbiwgX2RpcmVjdGlvbiwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IDY7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0UG9pbnRzU2NhbGUgPSAxMDtcclxuICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDY7XHJcbiAgICAgICAgICAgIHRoaXMua2lsbGNvdW50ID0gNDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIGxvYWRUZXh0dXJlKCkge1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEhvbWluZ0J1bGxldCBleHRlbmRzIEJ1bGxldCB7XHJcbiAgICAgICAgdGFyZ2V0OiDGki5WZWN0b3IzID0gbmV3IMaSLlZlY3RvcjMoMCwgMCwgMCk7XHJcbiAgICAgICAgcm90YXRlU3BlZWQ6IG51bWJlciA9IDI7XHJcbiAgICAgICAgdGFyZ2V0RGlyZWN0aW9uOiDGki5WZWN0b3IzO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfc3BlZWQ6IG51bWJlciwgX2hpdFBvaW50czogbnVtYmVyLCBfbGlmZXRpbWU6IG51bWJlciwgX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9raWxsY291bnQ6IG51bWJlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfdGFyZ2V0PzogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lLCBfc3BlZWQsIF9oaXRQb2ludHMsIF9saWZldGltZSwgX2tub2NrYmFja0ZvcmNlLCBfa2lsbGNvdW50LCBfcG9zaXRpb24sIF9kaXJlY3Rpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSAyMDtcclxuICAgICAgICAgICAgdGhpcy5oaXRQb2ludHNTY2FsZSA9IDU7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSAxICogR2FtZS5mcmFtZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMua2lsbGNvdW50ID0gMTtcclxuICAgICAgICAgICAgaWYgKF90YXJnZXQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBfdGFyZ2V0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSDGki5WZWN0b3IzLlNVTSh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLCBfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnRhcmdldERpcmVjdGlvbiA9IF9kaXJlY3Rpb247XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGFzeW5jIHVwZGF0ZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVIb21pbmcoKTtcclxuICAgICAgICAgICAgc3VwZXIudXBkYXRlKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhbGN1bGF0ZUhvbWluZygpIHtcclxuICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldCwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGlmIChuZXdEaXJlY3Rpb24ueCAhPSAwICYmIG5ld0RpcmVjdGlvbi55ICE9IDApIHtcclxuICAgICAgICAgICAgICAgIG5ld0RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgcm90YXRlQW1vdW50MjogbnVtYmVyID0gxpIuVmVjdG9yMy5DUk9TUyhuZXdEaXJlY3Rpb24sIHRoaXMudGFyZ2V0RGlyZWN0aW9uKS56O1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnJvdGF0ZVooLXJvdGF0ZUFtb3VudDIgKiB0aGlzLnJvdGF0ZVNwZWVkKTtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXREaXJlY3Rpb24gPSBDYWxjdWxhdGlvbi5nZXRSb3RhdGVkVmVjdG9yQnlBbmdsZTJEKHRoaXMudGFyZ2V0RGlyZWN0aW9uLCAtcm90YXRlQW1vdW50MiAqIHRoaXMucm90YXRlU3BlZWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBDb2xsaWRlciB7XHJcbiAgICBleHBvcnQgY2xhc3MgQ29sbGlkZXIge1xyXG4gICAgICAgIHJhZGl1czogbnVtYmVyO1xyXG4gICAgICAgIHBvc2l0aW9uOiDGki5WZWN0b3IyO1xyXG4gICAgICAgIGdldCB0b3AoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLnBvc2l0aW9uLnkgLSB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCBsZWZ0KCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi54IC0gdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgcmlnaHQoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLnBvc2l0aW9uLnggKyB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCBib3R0b20oKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLnBvc2l0aW9uLnkgKyB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9yYWRpdXM6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uID0gX3Bvc2l0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLnJhZGl1cyA9IF9yYWRpdXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb2xsaWRlcyhfY29sbGlkZXI6IENvbGxpZGVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZTogxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvc2l0aW9uLCBfY29sbGlkZXIucG9zaXRpb24pO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5yYWRpdXMgKyBfY29sbGlkZXIucmFkaXVzID4gZGlzdGFuY2UubWFnbml0dWRlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb2xsaWRlc1JlY3QoX2NvbGxpZGVyOiBHYW1lLsaSLlJlY3RhbmdsZSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5sZWZ0ID4gX2NvbGxpZGVyLnJpZ2h0KSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnJpZ2h0IDwgX2NvbGxpZGVyLmxlZnQpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMudG9wID4gX2NvbGxpZGVyLmJvdHRvbSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5ib3R0b20gPCBfY29sbGlkZXIudG9wKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0SW50ZXJzZWN0aW9uKF9jb2xsaWRlcjogQ29sbGlkZXIpOiBudW1iZXIge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29sbGlkZXMoX2NvbGxpZGVyKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlOiDGki5WZWN0b3IyID0gxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMucG9zaXRpb24sIF9jb2xsaWRlci5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb24gPSB0aGlzLnJhZGl1cyArIF9jb2xsaWRlci5yYWRpdXMgLSBkaXN0YW5jZS5tYWduaXR1ZGU7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaW50ZXJzZWN0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0SW50ZXJzZWN0aW9uUmVjdChfY29sbGlkZXI6IMaSLlJlY3RhbmdsZSk6IMaSLlJlY3RhbmdsZSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb2xsaWRlc1JlY3QoX2NvbGxpZGVyKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbjogxpIuUmVjdGFuZ2xlID0gbmV3IMaSLlJlY3RhbmdsZSgpO1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24ueCA9IE1hdGgubWF4KHRoaXMubGVmdCwgX2NvbGxpZGVyLmxlZnQpO1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24ueSA9IE1hdGgubWF4KHRoaXMudG9wLCBfY29sbGlkZXIudG9wKTtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLndpZHRoID0gTWF0aC5taW4odGhpcy5yaWdodCwgX2NvbGxpZGVyLnJpZ2h0KSAtIGludGVyc2VjdGlvbi54O1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24uaGVpZ2h0ID0gTWF0aC5taW4odGhpcy5ib3R0b20sIF9jb2xsaWRlci5ib3R0b20pIC0gaW50ZXJzZWN0aW9uLnk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaW50ZXJzZWN0aW9uO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBFbmVteVNwYXduZXIge1xyXG4gICAgbGV0IHNwYXduVGltZTogbnVtYmVyID0gMCAqIEdhbWUuZnJhbWVSYXRlO1xyXG4gICAgbGV0IGN1cnJlbnRUaW1lOiBudW1iZXIgPSBzcGF3blRpbWU7XHJcbiAgICBsZXQgbWF4RW5lbWllczogbnVtYmVyID0gMDtcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25FbmVtaWVzKCk6IHZvaWQge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgbGV0IGN1cnJlbnRSb29tID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbSA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtKS50YWcgPT0gVGFnLlRBRy5ST09NKSk7XHJcbiAgICAgICAgICAgIG1heEVuZW1pZXMgPSBjdXJyZW50Um9vbS5lbmVteUNvdW50O1xyXG4gICAgICAgICAgICB3aGlsZSAobWF4RW5lbWllcyA+IDApIHtcclxuICAgICAgICAgICAgICAgIG1heEVuZW1pZXMgPSBjdXJyZW50Um9vbS5lbmVteUNvdW50O1xyXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRUaW1lID09IHNwYXduVGltZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbiA9IG5ldyDGki5WZWN0b3IyKChNYXRoLnJhbmRvbSgpICogNyAtIChNYXRoLnJhbmRvbSgpICogNykpICogMiwgKE1hdGgucmFuZG9tKCkgKiA3IC0gKE1hdGgucmFuZG9tKCkgKiA3KSAqIDIpKTtcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbi5hZGQoY3VycmVudFJvb20ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBzcGF3bkJ5SUQoRW50aXR5LklELlJFRFRJQ0ssIHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50Um9vbS5lbmVteUNvdW50LS07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50VGltZS0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRUaW1lIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50VGltZSA9IHNwYXduVGltZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduQnlJRChfaWQ6IEVudGl0eS5JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfYXR0cmlidXRlcz86IEVudGl0eS5BdHRyaWJ1dGVzLCBfbmV0SUQ/OiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgZW5lbXk6IEVuZW15LkVuZW15O1xyXG4gICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELkJBVDpcclxuICAgICAgICAgICAgICAgIGlmIChfYXR0cmlidXRlcyA9PSBudWxsICYmIF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVmID0gR2FtZS5lbmVtaWVzSlNPTi5maW5kKGVuZW15ID0+IGVuZW15Lm5hbWUgPT0gXCJiYXRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEdW1iKEVudGl0eS5JRC5CQVQsIG5ldyBFbnRpdHkuQXR0cmlidXRlcyhyZWYuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgcmVmLmF0dHJpYnV0ZXMuc3BlZWQsIHJlZi5hdHRyaWJ1dGVzLnNjYWxlLCBNYXRoLnJhbmRvbSgpICogcmVmLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UgKyAwLjUsIHJlZi5hdHRyaWJ1dGVzLmFybW9yKSwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteUR1bWIoRW50aXR5LklELkJBVCwgX2F0dHJpYnV0ZXMsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5SRURUSUNLOlxyXG4gICAgICAgICAgICAgICAgaWYgKF9hdHRyaWJ1dGVzID09IG51bGwgJiYgX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWYgPSBHYW1lLmVuZW1pZXNKU09OLmZpbmQoZW5lbXkgPT4gZW5lbXkubmFtZSA9PSBcInJlZHRpY2tcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEdW1iKEVudGl0eS5JRC5SRURUSUNLLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCBNYXRoLnJhbmRvbSgpICogcmVmLmF0dHJpYnV0ZXMuc2NhbGUgKyAwLjUsIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCByZWYuYXR0cmlidXRlcy5hcm1vciksIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RHVtYihFbnRpdHkuSUQuUkVEVElDSywgX2F0dHJpYnV0ZXMsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5TTUFMTFRJQ0s6XHJcbiAgICAgICAgICAgICAgICBpZiAoX2F0dHJpYnV0ZXMgPT0gbnVsbCAmJiBfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlZiA9IEdhbWUuZW5lbWllc0pTT04uZmluZChlbmVteSA9PiBlbmVteS5uYW1lID09IFwic21hbGx0aWNrXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RHVtYihFbnRpdHkuSUQuU01BTExUSUNLLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCBNYXRoLnJhbmRvbSgpICogcmVmLmF0dHJpYnV0ZXMuc2NhbGUgKyAwLjUsIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCByZWYuYXR0cmlidXRlcy5hcm1vciksIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RHVtYihFbnRpdHkuSUQuU01BTExUSUNLLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlNLRUxFVE9OOlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChlbmVteSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoZW5lbXkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbmV0d29ya1NwYXduQnlJZChfaWQ6IEVudGl0eS5JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfYXR0cmlidXRlczogRW50aXR5LkF0dHJpYnV0ZXMsIF9uZXRJRDogbnVtYmVyKSB7XHJcbiAgICAgICAgc3Bhd25CeUlEKF9pZCwgX3Bvc2l0aW9uLCBfYXR0cmlidXRlcywgX25ldElEKTtcclxuICAgIH1cclxuXHJcbn0iLCJuYW1lc3BhY2UgQ2FsY3VsYXRpb24ge1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldENsb3NlckF2YXRhclBvc2l0aW9uKF9zdGFydFBvaW50OiDGki5WZWN0b3IzKTogxpIuVmVjdG9yMyB7XHJcbiAgICAgICAgbGV0IHRhcmdldCA9IEdhbWUuYXZhdGFyMTtcclxuXHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjEgPSBfc3RhcnRQb2ludC5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlUGxheWVyMiA9IF9zdGFydFBvaW50LmdldERpc3RhbmNlKEdhbWUuYXZhdGFyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlUGxheWVyMSA8IGRpc3RhbmNlUGxheWVyMikge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0ID0gR2FtZS5hdmF0YXIxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0ID0gR2FtZS5hdmF0YXIyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGFyZ2V0LmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbjtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGNEZWdyZWUoX2NlbnRlcjogxpIuVmVjdG9yMywgX3RhcmdldDogxpIuVmVjdG9yMyk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IHhEaXN0YW5jZTogbnVtYmVyID0gX3RhcmdldC54IC0gX2NlbnRlci54O1xyXG4gICAgICAgIGxldCB5RGlzdGFuY2U6IG51bWJlciA9IF90YXJnZXQueSAtIF9jZW50ZXIueTtcclxuICAgICAgICBsZXQgZGVncmVlczogbnVtYmVyID0gTWF0aC5hdGFuMih5RGlzdGFuY2UsIHhEaXN0YW5jZSkgKiAoMTgwIC8gTWF0aC5QSSkgLSA5MDtcclxuICAgICAgICByZXR1cm4gZGVncmVlcztcclxuXHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRChfdmVjdG9yVG9Sb3RhdGU6IMaSLlZlY3RvcjMsIF9hbmdsZTogbnVtYmVyKTogxpIuVmVjdG9yMyB7XHJcbiAgICAgICAgbGV0IGFuZ2xlVG9SYWRpYW46IG51bWJlciA9IF9hbmdsZSAqIChNYXRoLlBJIC8gMTgwKTtcclxuXHJcbiAgICAgICAgbGV0IG5ld1ggPSBfdmVjdG9yVG9Sb3RhdGUueCAqIE1hdGguY29zKGFuZ2xlVG9SYWRpYW4pIC0gX3ZlY3RvclRvUm90YXRlLnkgKiBNYXRoLnNpbihhbmdsZVRvUmFkaWFuKTtcclxuICAgICAgICBsZXQgbmV3WSA9IF92ZWN0b3JUb1JvdGF0ZS54ICogTWF0aC5zaW4oYW5nbGVUb1JhZGlhbikgKyBfdmVjdG9yVG9Sb3RhdGUueSAqIE1hdGguY29zKGFuZ2xlVG9SYWRpYW4pO1xyXG5cclxuICAgICAgICByZXR1cm4gbmV3IMaSLlZlY3RvcjMobmV3WCwgbmV3WSwgX3ZlY3RvclRvUm90YXRlLnopO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBhZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYmFzZVZhbHVlOiBudW1iZXIsIF9wZXJjZW50YWdlQW1vdW50OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBfYmFzZVZhbHVlICogKCgxMDAgKyBfcGVyY2VudGFnZUFtb3VudCkgLyAxMDApO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9iYXNlVmFsdWU6IG51bWJlciwgX3BlcmNlbnRhZ2VBbW91bnQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIF9iYXNlVmFsdWUgKiAoMTAwIC8gKDEwMCArIF9wZXJjZW50YWdlQW1vdW50KSk7XHJcbiAgICB9XHJcblxyXG5cclxufSIsIm5hbWVzcGFjZSBJbnB1dFN5c3RlbSB7XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwga2V5Ym9hcmREb3duRXZlbnQpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGtleWJvYXJkVXBFdmVudCk7XHJcbiAgICBHYW1lLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGF0dGFjayk7XHJcbiAgICBHYW1lLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIHJvdGF0ZVRvTW91c2UpO1xyXG5cclxuICAgIC8vI3JlZ2lvbiByb3RhdGVcclxuICAgIGxldCBtb3VzZVBvc2l0aW9uOiDGki5WZWN0b3IzO1xyXG5cclxuICAgIGZ1bmN0aW9uIHJvdGF0ZVRvTW91c2UoX21vdXNlRXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgbGV0IHJheTogxpIuUmF5ID0gR2FtZS52aWV3cG9ydC5nZXRSYXlGcm9tQ2xpZW50KG5ldyDGki5WZWN0b3IyKF9tb3VzZUV2ZW50Lm9mZnNldFgsIF9tb3VzZUV2ZW50Lm9mZnNldFkpKTtcclxuICAgICAgICAgICAgbW91c2VQb3NpdGlvbiA9IHJheS5pbnRlcnNlY3RQbGFuZShuZXcgxpIuVmVjdG9yMygwLCAwLCAwKSwgbmV3IMaSLlZlY3RvcjMoMCwgMCwgMSkpO1xyXG4gICAgICAgICAgICBHYW1lLmF2YXRhcjEubXR4TG9jYWwucm90YXRpb24gPSBuZXcgxpIuVmVjdG9yMygwLCAwLCBDYWxjdWxhdGlvbi5jYWxjRGVncmVlKEdhbWUuYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgbW91c2VQb3NpdGlvbikpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGNQb3NpdGlvbkZyb21EZWdyZWUoX2RlZ3JlZXM6IG51bWJlciwgX2Rpc3RhbmNlOiBudW1iZXIpOiDGki5WZWN0b3IyIHtcclxuICAgICAgICBsZXQgZGlzdGFuY2UgPSA1O1xyXG4gICAgICAgIGxldCBuZXdEZWcgPSAoX2RlZ3JlZXMgKiBNYXRoLlBJKSAvIDE4MDtcclxuICAgICAgICBsZXQgeSA9IE1hdGguY29zKG5ld0RlZyk7XHJcbiAgICAgICAgbGV0IHggPSBNYXRoLnNpbihuZXdEZWcpICogLTE7XHJcbiAgICAgICAgbGV0IGNvb3JkID0gbmV3IMaSLlZlY3RvcjIoeCwgeSk7XHJcbiAgICAgICAgY29vcmQuc2NhbGUoZGlzdGFuY2UpO1xyXG4gICAgICAgIHJldHVybiBjb29yZDtcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBtb3ZlIGFuZCBhYmlsaXR5XHJcbiAgICBsZXQgY29udHJvbGxlciA9IG5ldyBNYXA8c3RyaW5nLCBib29sZWFuPihbXHJcbiAgICAgICAgW1wiV1wiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiQVwiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiU1wiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiRFwiLCBmYWxzZV1cclxuICAgIF0pO1xyXG5cclxuICAgIGZ1bmN0aW9uIGtleWJvYXJkRG93bkV2ZW50KF9lOiBLZXlib2FyZEV2ZW50KSB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGlmIChfZS5jb2RlLnRvVXBwZXJDYXNlKCkgIT0gXCJTUEFDRVwiKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQga2V5OiBzdHJpbmcgPSBfZS5jb2RlLnRvVXBwZXJDYXNlKCkuc3Vic3RyaW5nKDMpO1xyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlci5zZXQoa2V5LCB0cnVlKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vRG8gYWJpbHR5IGZyb20gcGxheWVyXHJcbiAgICAgICAgICAgICAgICBhYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24ga2V5Ym9hcmRVcEV2ZW50KF9lOiBLZXlib2FyZEV2ZW50KSB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGxldCBrZXk6IHN0cmluZyA9IF9lLmNvZGUudG9VcHBlckNhc2UoKS5zdWJzdHJpbmcoMyk7XHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuc2V0KGtleSwgZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbW92ZSgpIHtcclxuICAgICAgICBsZXQgbW92ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICBsZXQgaGFzQ2hhbmdlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJXXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueSArPSAxO1xyXG4gICAgICAgICAgICBoYXNDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiQVwiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnggLT0gMTtcclxuICAgICAgICAgICAgaGFzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIlNcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci55IC09IDE7XHJcbiAgICAgICAgICAgIGhhc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJEXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueCArPSAxO1xyXG4gICAgICAgICAgICBoYXNDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIEdhbWUuYXZhdGFyMS5tb3ZlKG1vdmVWZWN0b3IpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFiaWxpdHkoKSB7XHJcbiAgICAgICAgR2FtZS5hdmF0YXIxLmRvQWJpbGl0eSgpO1xyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIGF0dGFja1xyXG4gICAgZnVuY3Rpb24gYXR0YWNrKGVfOiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGxldCBtb3VzZUJ1dHRvbiA9IGVfLmJ1dHRvbjtcclxuICAgICAgICAgICAgc3dpdGNoIChtb3VzZUJ1dHRvbikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vbGVmdCBtb3VzZSBidXR0b24gcGxheWVyLmF0dGFja1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRShtb3VzZVBvc2l0aW9uLCBHYW1lLmF2YXRhcjEubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZVRvTW91c2UoZV8pO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5hdHRhY2soZGlyZWN0aW9uLCBudWxsLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IHJpZ2h0IG1vdXNlIGJ1dHRvbiBwbGF5ZXIuaGVhdnlBdHRhY2sgb3Igc29tZXRoaW5nIGxpa2UgdGhhdFxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcbn0iLCJuYW1lc3BhY2UgTGV2ZWwge1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBMYW5kc2NhcGUgZXh0ZW5kcyDGki5Ob2Rle1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUpO1xyXG5cclxuICAgICAgICAgICAgLy8gdGhpcy5nZXRDaGlsZHJlbigpWzBdLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudFRyYW5zZm9ybSkubXR4TG9jYWwudHJhbnNsYXRlWigtMilcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufSIsIi8vLzxyZWZlcmVuY2UgcGF0aD1cIi4uL0ZVREdFL05ldC9CdWlsZC9DbGllbnQvRnVkZ2VDbGllbnQuZC50c1wiLz5cclxuXHJcbm5hbWVzcGFjZSBOZXR3b3JraW5nIHtcclxuICAgIGV4cG9ydCBlbnVtIEZVTkNUSU9OIHtcclxuICAgICAgICBDT05ORUNURUQsXHJcbiAgICAgICAgSE9TVCxcclxuICAgICAgICBTRVRSRUFEWSxcclxuICAgICAgICBTUEFXTixcclxuICAgICAgICBUUkFOU0ZPUk0sXHJcbiAgICAgICAgQVZBVEFSUFJFRElDVElPTixcclxuICAgICAgICBVUERBVEVJTlZFTlRPUlksXHJcbiAgICAgICAgS05PQ0tCQUNLUkVRVUVTVCxcclxuICAgICAgICBLTk9DS0JBQ0tQVVNILFxyXG4gICAgICAgIFNQQVdOQlVMTEVULFxyXG4gICAgICAgIFNQQVdOQlVMTEVURU5FTVksXHJcbiAgICAgICAgQlVMTEVUVFJBTlNGT1JNLFxyXG4gICAgICAgIEJVTExFVERJRSxcclxuICAgICAgICBTUEFXTkVORU1ZLFxyXG4gICAgICAgIEVORU1ZVFJBTlNGT1JNLFxyXG4gICAgICAgIEVORU1ZU1RBVEUsXHJcbiAgICAgICAgRU5FTVlESUUsXHJcbiAgICAgICAgU1BBV05JTlRFUk5BTElURU0sXHJcbiAgICAgICAgVVBEQVRFQVRUUklCVVRFUyxcclxuICAgICAgICBVUERBVEVXRUFQT04sXHJcbiAgICAgICAgSVRFTURJRSxcclxuICAgICAgICBTRU5EUk9PTSxcclxuICAgICAgICBTV0lUQ0hST09NUkVRVUVTVCxcclxuICAgICAgICBVUERBVEVCVUZGXHJcbiAgICB9XHJcblxyXG4gICAgaW1wb3J0IMaSQ2xpZW50ID0gRnVkZ2VOZXQuRnVkZ2VDbGllbnQ7XHJcblxyXG4gICAgZXhwb3J0IGxldCBjbGllbnQ6IMaSQ2xpZW50O1xyXG4gICAgZXhwb3J0IGxldCBjbGllbnRzOiBBcnJheTx7IGlkOiBzdHJpbmcsIHJlYWR5OiBib29sZWFuIH0+ID0gW107XHJcbiAgICBleHBvcnQgbGV0IHBvc1VwZGF0ZTogxpIuVmVjdG9yMztcclxuICAgIGV4cG9ydCBsZXQgc29tZW9uZUlzSG9zdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgZXhwb3J0IGxldCBlbmVteTogRW5lbXkuRW5lbXk7XHJcbiAgICBleHBvcnQgbGV0IGN1cnJlbnRJRHM6IG51bWJlcltdID0gW107XHJcblxyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJIb3N0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7IHNwYXduUGxheWVyKCkgfSwgdHJ1ZSk7XHJcbiAgICBsZXQgSVBDb25uZWN0aW9uID0gPEhUTUxJbnB1dEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJJUENvbm5lY3Rpb25cIik7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNvbm5lY3RpbmdcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNvbm5ldGluZywgdHJ1ZSk7XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjb25uZXRpbmcoKSB7XHJcbiAgICAgICAgY2xpZW50ID0gbmV3IMaSQ2xpZW50KCk7XHJcbiAgICAgICAgY2xpZW50LmFkZEV2ZW50TGlzdGVuZXIoRnVkZ2VOZXQuRVZFTlQuTUVTU0FHRV9SRUNFSVZFRCwgcmVjZWl2ZU1lc3NhZ2UpO1xyXG4gICAgICAgIGNsaWVudC5jb25uZWN0VG9TZXJ2ZXIoSVBDb25uZWN0aW9uLnZhbHVlKTtcclxuXHJcbiAgICAgICAgYWRkQ2xpZW50SUQoKVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBhZGRDbGllbnRJRCgpIHtcclxuICAgICAgICAgICAgaWYgKGNsaWVudC5pZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBvYmo6IHsgaWQ6IHN0cmluZywgcmVhZHk6IGJvb2xlYW4gfSA9IHsgaWQ6IGNsaWVudC5pZCwgcmVhZHk6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICBjbGllbnRzLnB1c2gob2JqKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoYWRkQ2xpZW50SUQsIDMwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiByZWNlaXZlTWVzc2FnZShfZXZlbnQ6IEN1c3RvbUV2ZW50IHwgTWVzc2FnZUV2ZW50IHwgRXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBpZiAoX2V2ZW50IGluc3RhbmNlb2YgTWVzc2FnZUV2ZW50KSB7XHJcbiAgICAgICAgICAgIGxldCBtZXNzYWdlOiBGdWRnZU5ldC5NZXNzYWdlID0gSlNPTi5wYXJzZShfZXZlbnQuZGF0YSk7XHJcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlkU291cmNlICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29tbWFuZCAhPSBGdWRnZU5ldC5DT01NQU5ELlNFUlZFUl9IRUFSVEJFQVQgJiYgbWVzc2FnZS5jb21tYW5kICE9IEZ1ZGdlTmV0LkNPTU1BTkQuQ0xJRU5UX0hFQVJUQkVBVCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vQWRkIG5ldyBjbGllbnQgdG8gYXJyYXkgY2xpZW50c1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkNPTk5FQ1RFRC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQudmFsdWUgIT0gY2xpZW50LmlkICYmIGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQgPT0gbWVzc2FnZS5jb250ZW50LnZhbHVlKSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudHMucHVzaCh7IGlkOiBtZXNzYWdlLmNvbnRlbnQudmFsdWUsIHJlYWR5OiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9TZXQgY2xpZW50IHJlYWR5XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU0VUUkVBRFkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5pZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQuaWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5yZWFkeSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gYXZhdGFyMiBhcyByYW5nZWQgb3IgbWVsZWUgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV04udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50LnR5cGUgPT0gUGxheWVyLlBMQVlFUlRZUEUuTUVMRUUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZXM6IEVudGl0eS5BdHRyaWJ1dGVzID0gbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIgPSBuZXcgUGxheWVyLk1lbGVlKEVudGl0eS5JRC5QTEFZRVIyLCBhdHRyaWJ1dGVzKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQoR2FtZS5hdmF0YXIyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmNvbnRlbnQudHlwZSA9PSBQbGF5ZXIuUExBWUVSVFlQRS5SQU5HRUQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF0dHJpYnV0ZXM6IEVudGl0eS5BdHRyaWJ1dGVzID0gbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMiA9IG5ldyBQbGF5ZXIuUmFuZ2VkKEVudGl0eS5JRC5QTEFZRVIyLCBhdHRyaWJ1dGVzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKEdhbWUuYXZhdGFyMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vUnVudGltZSB1cGRhdGVzIGFuZCBjb21tdW5pY2F0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1N5bmMgYXZhdGFyMiBwb3NpdGlvbiBhbmQgcm90YXRpb25cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVFJBTlNGT1JNLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCB0ZXN0OiBHYW1lLsaSLlZlY3RvcjMgPSBtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIC8vIGNvbnNvbGUubG9nKHRlc3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1vdmVWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcm90YXRlVmVjdG9yOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMl0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmF2YXRhcjIgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbW92ZVZlY3RvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIubXR4TG9jYWwucm90YXRpb24gPSByb3RhdGVWZWN0b3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLmNvbGxpZGVyLnBvc2l0aW9uID0gbW92ZVZlY3Rvci50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQVZBVEFSUFJFRElDVElPTi50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3UG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIxLmhvc3RQb3NpdGlvbnNbbWVzc2FnZS5jb250ZW50LnRpY2tdID0gbmV3UG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vVXBkYXRlIGludmVudG9yeVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5VUERBVEVJTlZFTlRPUlkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGl0ZW06IEl0ZW1zLkl0ZW0gPSBHYW1lLml0ZW1zLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIuaXRlbXMucHVzaChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9DbGllbnQgcmVxdWVzdCBmb3IgbW92ZSBrbm9ja2JhY2tcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uS05PQ0tCQUNLUkVRVUVTVC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5lbXk6IEVuZW15LkVuZW15ID0gR2FtZS5lbmVtaWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuZ2V0S25vY2tiYWNrKG1lc3NhZ2UuY29udGVudC5rbm9ja2JhY2tGb3JjZSwgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0hvc3QgcHVzaCBtb3ZlIGtub2NrYmFjayBmcm9tIGVuZW15XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLktOT0NLQkFDS1BVU0gudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaWVudC5pZCAhPSBjbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMl0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEuZ2V0S25vY2tiYWNrKG1lc3NhZ2UuY29udGVudC5rbm9ja2JhY2tGb3JjZSwgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGJ1bGxldCBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05CVUxMRVQudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLmF0dGFjayhuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQuZGlyZWN0aW9uLmRhdGFbMl0pLCBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGJ1bGxldCBmcm9tIGVuZW15IG9uIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05CVUxMRVRFTkVNWS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5lbXk6IEVuZW15LkVuZW15ID0gR2FtZS5lbmVtaWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5lbmVteU5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmVteSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVuZW15IGluc3RhbmNlb2YgRW5lbXkuRW5lbXlTaG9vdCAmJiBjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPEVuZW15LkVuZW15U2hvb3Q+ZW5lbXkpLnNob290KG1lc3NhZ2UuY29udGVudC5idWxsZXROZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1N5bmMgYnVsbGV0IHRyYW5zZm9ybSBmcm9tIGhvc3QgdG8gY2xpZW50XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkJVTExFVFRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5idWxsZXRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdQb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmJ1bGxldHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5ob3N0UG9zaXRpb25zW21lc3NhZ2UuY29udGVudC50aWNrXSA9IG5ld1Bvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0tpbGwgYnVsbGV0IGF0IHRoZSBjbGllbnQgZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkJVTExFVERJRS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnVsbGV0ID0gR2FtZS5idWxsZXRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJ1bGxldCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0LmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gZW5lbXkgYXQgdGhlIGNsaWVudCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05FTkVNWS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcyA9IG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRW5lbXlTcGF3bmVyLm5ldHdvcmtTcGF3bkJ5SWQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LmlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyDGki5WZWN0b3IyKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsIG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3luYyBlbmVteSB0cmFuc2Zvcm0gZnJvbSBob3N0IHRvIGNsaWVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5FTkVNWVRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5lbXkgPSBHYW1lLmVuZW1pZXMuZmluZChlbmVtID0+IGVuZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmVteSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS51cGRhdGVDb2xsaWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3luYyBhbmltYXRpb24gc3RhdGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5FTVlTVEFURS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5lbXkgPSBHYW1lLmVuZW1pZXMuZmluZChlbmVtID0+IGVuZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmVteSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UuY29udGVudC5zdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZW15LnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+ZW5lbXkuYW5pbWF0aW9uc1tcImlkbGVcIl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuY3VycmVudEFuaW1hdGlvbiA9IEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5BTklNQVRJT05TVEFURVMuV0FMSzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZW15LnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+ZW5lbXkuYW5pbWF0aW9uc1tcIndhbGtcIl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuY3VycmVudEFuaW1hdGlvbiA9IEVudGl0eS5BTklNQVRJT05TVEFURVMuV0FMSztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9LaWxsIGVuZW15IGF0IHRoZSBjbGllbnQgZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkVORU1ZRElFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmVteSA9IEdhbWUuZW5lbWllcy5maW5kKGVuZW0gPT4gZW5lbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZChlbmVteSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3BJRChtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGl0ZW0gZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdOSU5URVJOQUxJVEVNLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJdGVtOiBJdGVtcy5JbnRlcm5hbEl0ZW0gPSBtZXNzYWdlLmNvbnRlbnQuaXRlbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHYW1lLmdyYXBoLmFkZENoaWxkKG5ld0l0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IEl0ZW1zLkludGVybmFsSXRlbShtZXNzYWdlLmNvbnRlbnQuaWQsIG5ldyDGki5WZWN0b3IyKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSksIG1lc3NhZ2UuY29udGVudC5uZXRJZCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2FwcGx5IGl0ZW0gYXR0cmlidXRlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5VUERBVEVBVFRSSUJVVEVTLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBBdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcyA9IG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLmF0dHJpYnV0ZXMgPSB0ZW1wQXR0cmlidXRlcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMyhHYW1lLmF2YXRhcjIuYXR0cmlidXRlcy5zY2FsZSwgR2FtZS5hdmF0YXIyLmF0dHJpYnV0ZXMuc2NhbGUsIEdhbWUuYXZhdGFyMi5hdHRyaWJ1dGVzLnNjYWxlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vYXBwbHkgd2VhcG9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlVQREFURVdFQVBPTi50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZW1wV2VhcG9uOiBXZWFwb25zLldlYXBvbiA9IG1lc3NhZ2UuY29udGVudC53ZWFwb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIud2VhcG9uID0gdGVtcFdlYXBvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9LaWxsIGl0ZW0gZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLklURU1ESUUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbmVtID0+ICg8SXRlbXMuSXRlbT5lbmVtKS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcElEKG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2VuZCBpcyBob3N0TWVzc2FnZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5IT1NULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvbWVvbmVJc0hvc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vc2VuZCByb29tIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TRU5EUk9PTS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgb2xkT2JqZWN0czogR2FtZS7Gki5Ob2RlW10gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW0gPT4gKDxhbnk+ZWxlbSkudGFnICE9IFRhZy5UQUcuUExBWUVSKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRPYmplY3RzLmZvckVhY2goKGVsZW0pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKGVsZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb29tOiBHZW5lcmF0aW9uLlJvb20gPSBuZXcgR2VuZXJhdGlvbi5Sb29tKG1lc3NhZ2UuY29udGVudC5uYW1lLCBtZXNzYWdlLmNvbnRlbnQuY29vcmRpYW50ZXMsIG1lc3NhZ2UuY29udGVudC5leGl0cywgbWVzc2FnZS5jb250ZW50LnJvb21UeXBlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb29tLnNldERvb3JzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChyb29tKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQocm9vbS53YWxsc1swXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb20ud2FsbHNbMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hcHBlbmRDaGlsZChyb29tLndhbGxzWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQocm9vbS53YWxsc1szXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb29tLmRvb3JzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChyb29tLmRvb3JzW2ldKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gcm9vbS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9zZW5kIHJlcXVlc3QgdG8gc3dpdGNoIHJvb21zXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNXSVRDSFJPT01SRVFVRVNULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50cm9vbSA9IEdlbmVyYXRpb24ucm9vbXMuZmluZChlbGVtID0+IGVsZW0uY29vcmRpbmF0ZXNbMF0gPT0gKDxbbnVtYmVyLCBudW1iZXJdPm1lc3NhZ2UuY29udGVudC5jb29yZGlhbnRlcylbMF0gJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmNvb3JkaW5hdGVzWzFdID09ICg8W251bWJlciwgbnVtYmVyXT5tZXNzYWdlLmNvbnRlbnQuY29vcmRpYW50ZXMpWzFdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLnN3aXRjaFJvb20oY3VycmVudHJvb20sIG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2V0Q2xpZW50UmVhZHkoKSB7XHJcbiAgICAgICAgY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5pZCA9PSBjbGllbnQuaWQpLnJlYWR5ID0gdHJ1ZTtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TRVRSRUFEWSwgbmV0SWQ6IGNsaWVudC5pZCB9IH0pO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gcGxheWVyXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2V0SG9zdCgpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uSE9TVCwgaWQ6IGNsaWVudC5pZCB9IH0pO1xyXG4gICAgICAgICAgICBpZiAoIXNvbWVvbmVJc0hvc3QpIHtcclxuICAgICAgICAgICAgICAgIGNsaWVudC5iZWNvbWVIb3N0KCk7XHJcbiAgICAgICAgICAgICAgICBzb21lb25lSXNIb3N0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNvbWVvbmVJc0hvc3QgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgYXN5bmMgZnVuY3Rpb24gc3Bhd25QbGF5ZXIoX3R5cGU/OiBQbGF5ZXIuUExBWUVSVFlQRSkge1xyXG4gICAgICAgIGlmIChfdHlwZSA9PSBQbGF5ZXIuUExBWUVSVFlQRS5NRUxFRSkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTiwgdHlwZTogUGxheWVyLlBMQVlFUlRZUEUuTUVMRUUsIGF0dHJpYnV0ZXM6IEdhbWUuYXZhdGFyMS5hdHRyaWJ1dGVzLCBwb3NpdGlvbjogR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiB9IH0pXHJcbiAgICAgICAgfSBlbHNlIGlmIChfdHlwZSA9PSBQbGF5ZXIuUExBWUVSVFlQRS5SQU5HRUQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV04sIHR5cGU6IFBsYXllci5QTEFZRVJUWVBFLlJBTkdFRCwgYXR0cmlidXRlczogR2FtZS5hdmF0YXIxLmF0dHJpYnV0ZXMsIHBvc2l0aW9uOiBHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uIH0gfSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTiwgdHlwZTogUGxheWVyLlBMQVlFUlRZUEUuUkFOR0VELCBhdHRyaWJ1dGVzOiBHYW1lLmF2YXRhcjEuYXR0cmlidXRlcywgcG9zaXRpb246IEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2V0Q2xpZW50KCkge1xyXG4gICAgICAgIE5ldHdvcmtpbmcuY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogTmV0d29ya2luZy5GVU5DVElPTi5DT05ORUNURUQsIHZhbHVlOiBOZXR3b3JraW5nLmNsaWVudC5pZCB9IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVBdmF0YXJQb3NpdGlvbihfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9yb3RhdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVFJBTlNGT1JNLCB2YWx1ZTogX3Bvc2l0aW9uLCByb3RhdGlvbjogX3JvdGF0aW9uIH0gfSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gYXZhdGFyUHJlZGljdGlvbihfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMywgX3RpY2s6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5BVkFUQVJQUkVESUNUSU9OLCBwb3NpdGlvbjogX3Bvc2l0aW9uLCB0aWNrOiBfdGljayB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBrbm9ja2JhY2tSZXF1ZXN0KF9uZXRJZDogbnVtYmVyLCBfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50LmlkSG9zdCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5LTk9DS0JBQ0tSRVFVRVNULCBuZXRJZDogX25ldElkLCBrbm9ja2JhY2tGb3JjZTogX2tub2NrYmFja0ZvcmNlLCBwb3NpdGlvbjogX3Bvc2l0aW9uIH0gfSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24ga25vY2tiYWNrUHVzaChfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5LTk9DS0JBQ0tQVVNILCBrbm9ja2JhY2tGb3JjZTogX2tub2NrYmFja0ZvcmNlLCBwb3NpdGlvbjogX3Bvc2l0aW9uIH0gfSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlSW52ZW50b3J5KF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkKS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVJTlZFTlRPUlksIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIGJ1bGxldFxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduQnVsbGV0KF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOQlVMTEVULCBkaXJlY3Rpb246IF9kaXJlY3Rpb24sIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVCdWxsZXQoX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ6IG51bWJlciwgX3RpY2s/OiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQlVMTEVUVFJBTlNGT1JNLCBwb3NpdGlvbjogX3Bvc2l0aW9uLCBuZXRJZDogX25ldElkLCB0aWNrOiBfdGljayB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNwYXduQnVsbGV0QXRFbmVteShfYnVsbGV0TmV0SWQ6IG51bWJlciwgX2VuZW15TmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTkJVTExFVEVORU1ZLCBidWxsZXROZXRJZDogX2J1bGxldE5ldElkLCBlbmVteU5ldElkOiBfZW5lbXlOZXRJZCB9IH0pXHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZW1vdmVCdWxsZXQoX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQlVMTEVURElFLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBlbmVteVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduRW5lbXkoX2VuZW15OiBFbmVteS5FbmVteSwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05FTkVNWSwgaWQ6IF9lbmVteS5pZCwgYXR0cmlidXRlczogX2VuZW15LmF0dHJpYnV0ZXMsIHBvc2l0aW9uOiBfZW5lbXkubXR4TG9jYWwudHJhbnNsYXRpb24sIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVFbmVteVBvc2l0aW9uKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX25ldElkOiBudW1iZXIsIF9zdGF0ZTogRW50aXR5LkFOSU1BVElPTlNUQVRFUykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkVORU1ZVFJBTlNGT1JNLCBwb3NpdGlvbjogX3Bvc2l0aW9uLCBuZXRJZDogX25ldElkLCBhbmltYXRpb246IF9zdGF0ZSB9IH0pXHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlRW5lbXlTdGF0ZShfc3RhdGU6IEVudGl0eS5BTklNQVRJT05TVEFURVMsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5FTVlTVEFURSwgc3RhdGU6IF9zdGF0ZSwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVtb3ZlRW5lbXkoX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5FTkVNWURJRSwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBpdGVtc1xyXG4gICAgZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNwYXduSW50ZXJuYWxJdGVtKF9pdGVtOiBJdGVtcy5JbnRlcm5hbEl0ZW0sIF9pZDogbnVtYmVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOSU5URVJOQUxJVEVNLCBpdGVtOiBfaXRlbSwgaWQ6IF9pZCwgcG9zaXRpb246IF9wb3NpdGlvbiwgbmV0SWQ6IF9uZXRJZCB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVBdmF0YXJBdHRyaWJ1dGVzKF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcykge1xyXG4gICAgICAgIGlmIChjbGllbnQuaWRIb3N0ICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuSE9TVCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVBVFRSSUJVVEVTLCBhdHRyaWJ1dGVzOiBfYXR0cmlidXRlcyB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFQVRUUklCVVRFUywgYXR0cmlidXRlczogX2F0dHJpYnV0ZXMgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQXZhdGFyV2VhcG9uKF93ZWFwb246IFdlYXBvbnMuV2VhcG9uKSB7XHJcbiAgICAgICAgaWYgKGNsaWVudC5pZEhvc3QgIT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5IT1NULCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURVdFQVBPTiwgd2VhcG9uOiBfd2VhcG9uIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVXRUFQT04sIHdlYXBvbjogX3dlYXBvbiB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVtb3ZlSXRlbShfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChjbGllbnQuaWRIb3N0ICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuSE9TVCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5JVEVNRElFLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLklURU1ESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuICAgIC8vI3JlZ2lvbiBidWZmc1xyXG4gICAgZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUJ1ZmZMaXN0KF9idWZmOiBCdWZmLkJ1ZmZbXSwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgYXdhaXQgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFQlVGRiwgYnVmZkxpc3Q6IF9idWZmLCBuZXRJZDogX25ldElkIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiByb29tXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2VuZFJvb20oX25hbWU6IHN0cmluZywgX2Nvb3JkaWFudGVzOiBbbnVtYmVyLCBudW1iZXJdLCBfZXhpdHM6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSwgX3Jvb21UeXBlOiBHZW5lcmF0aW9uLlJPT01UWVBFKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFTkRST09NLCBuYW1lOiBfbmFtZSwgY29vcmRpYW50ZXM6IF9jb29yZGlhbnRlcywgZXhpdHM6IF9leGl0cywgcm9vbVR5cGU6IF9yb29tVHlwZSB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHN3aXRjaFJvb21SZXF1ZXN0KF9jb29yZGlhbnRlczogW251bWJlciwgbnVtYmVyXSwgX2RpcmVjdGlvbjogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgIT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnQuaWRIb3N0LCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNXSVRDSFJPT01SRVFVRVNULCBjb29yZGlhbnRlczogX2Nvb3JkaWFudGVzLCBkaXJlY3Rpb246IF9kaXJlY3Rpb24gfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBpZEdlbmVyYXRvcigpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBpZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDApO1xyXG4gICAgICAgIGlmIChjdXJyZW50SURzLmZpbmQoY3VySUQgPT4gY3VySUQgPT0gaWQpKSB7XHJcbiAgICAgICAgICAgIGlkR2VuZXJhdG9yKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjdXJyZW50SURzLnB1c2goaWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGlkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBwb3BJRChfaWQ6IG51bWJlcikge1xyXG4gICAgICAgIGxldCBpbmRleDogbnVtYmVyO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3VycmVudElEcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudElEc1tpXSA9PSBfaWQpIHtcclxuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN1cnJlbnRJRHMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgIH1cclxuXHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXVubG9hZFwiLCBvblVubG9hZCwgZmFsc2UpO1xyXG5cclxuICAgIGZ1bmN0aW9uIG9uVW5sb2FkKCkge1xyXG4gICAgICAgIC8vVE9ETzogVGhpbmdzIHdlIGRvIGFmdGVyIHRoZSBwbGF5ZXIgbGVmdCB0aGUgZ2FtZVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFBsYXllciB7XHJcbiAgICBleHBvcnQgZW51bSBQTEFZRVJUWVBFIHtcclxuICAgICAgICBSQU5HRUQsXHJcbiAgICAgICAgTUVMRUVcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgUGxheWVyIGV4dGVuZHMgRW50aXR5LkVudGl0eSBpbXBsZW1lbnRzIEludGVyZmFjZXMuSUtub2NrYmFja2FibGUge1xyXG4gICAgICAgIHB1YmxpYyBpdGVtczogQXJyYXk8SXRlbXMuSXRlbT4gPSBbXTtcclxuICAgICAgICBwdWJsaWMgd2VhcG9uOiBXZWFwb25zLldlYXBvbiA9IG5ldyBXZWFwb25zLldlYXBvbigxMiwgMSwgQnVsbGV0cy5CVUxMRVRUWVBFLlNUQU5EQVJELCAxKTtcclxuXHJcbiAgICAgICAgcHVibGljIHRpY2s6IG51bWJlciA9IDA7XHJcbiAgICAgICAgcHVibGljIHBvc2l0aW9uczogxpIuVmVjdG9yM1tdID0gW107XHJcbiAgICAgICAgcHVibGljIGhvc3RQb3NpdGlvbnM6IMaSLlZlY3RvcjNbXSA9IFtdO1xyXG4gICAgICAgIHRpbWU6IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgIHJlYWRvbmx5IGFiaWxpdHlDb3VudDogbnVtYmVyID0gMTtcclxuICAgICAgICBjdXJyZW50YWJpbGl0eUNvdW50OiBudW1iZXIgPSB0aGlzLmFiaWxpdHlDb3VudDtcclxuICAgICAgICByZWFkb25seSBhYmlsaXR5Q29vbGRvd25UaW1lOiBudW1iZXIgPSAxMDtcclxuICAgICAgICBjdXJyZW50YWJpbGl0eUNvb2xkb3duVGltZTogbnVtYmVyID0gdGhpcy5hYmlsaXR5Q29vbGRvd25UaW1lO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX2F0dHJpYnV0ZXM6IEVudGl0eS5BdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2F0dHJpYnV0ZXMpO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuUExBWUVSO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG1vdmUoX2RpcmVjdGlvbjogxpIuVmVjdG9yMykge1xyXG5cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ubWFnbml0dWRlICE9IDApIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBHYW1lLsaSLlZlY3RvcjMuTk9STUFMSVpBVElPTihfZGlyZWN0aW9uLCAxKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcblxyXG4gICAgICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKCgxIC8gNjAgKiB0aGlzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbi5hZGQoX2RpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGUodGhpcy5tb3ZlRGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBkb29yczogR2VuZXJhdGlvbi5Eb29yW10gPSAoPEdlbmVyYXRpb24uUm9vbT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbGVtZW50ID0+ICg8R2VuZXJhdGlvbi5Sb29tPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlJPT00pKS5kb29ycztcclxuICAgICAgICAgICAgZG9vcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXNSZWN0KGVsZW1lbnQuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgKDxHZW5lcmF0aW9uLkRvb3I+ZWxlbWVudCkuY2hhbmdlUm9vbSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbi5zdWJ0cmFjdChfZGlyZWN0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbGxpZGUoX2RpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNvbGxpZGUoX2RpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICBsZXQgaXRlbUNvbGxpZGVyOiBJdGVtcy5JdGVtW10gPSBHYW1lLml0ZW1zO1xyXG4gICAgICAgICAgICBpdGVtQ29sbGlkZXIuZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGl0ZW0uY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBJdGVtcy5JbnRlcm5hbEl0ZW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVJbnZlbnRvcnkoaXRlbS5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uZG9Zb3VyVGhpbmcodGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXRlbXMucHVzaChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICBsZXQgZW5lbXlDb2xsaWRlcnM6IEVuZW15LkVuZW15W10gPSBHYW1lLmVuZW1pZXM7XHJcbiAgICAgICAgICAgIGVuZW15Q29sbGlkZXJzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50LmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUJlZm9yZU1vdmUgPSBpbnRlcnNlY3Rpb247XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IHRoaXMuY29sbGlkZXIucmFkaXVzICsgZWxlbWVudC5jb2xsaWRlci5yYWRpdXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG9sZFBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMih0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLngsIHRoaXMuY29sbGlkZXIucG9zaXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKF9kaXJlY3Rpb24ueCwgMClcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQuY29sbGlkZXIpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMigwLCBfZGlyZWN0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnRyYW5zZm9ybSjGki5NYXRyaXgzeDMuVFJBTlNMQVRJT04obmV3RGlyZWN0aW9uKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudC5jb2xsaWRlcikgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBuZXdJbnRlcnNlY3Rpb247XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVZID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogU3luYyBrbm9ja2JhY2sgY29ycmVjdGx5IG92ZXIgbmV0d29ya1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyAgICAgZWxlbWVudC5nZXRLbm9ja2JhY2sodGhpcy5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBOZXR3b3JraW5nLmtub2NrYmFja1JlcXVlc3QoZWxlbWVudC5uZXRJZCwgdGhpcy5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5jYW5Nb3ZlWCAmJiB0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbiwgZmFsc2UpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY2FuTW92ZVggJiYgIXRoaXMuY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMyhfZGlyZWN0aW9uLngsIDAsIF9kaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuY2FuTW92ZVggJiYgdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIF9kaXJlY3Rpb24ueSwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24sIGZhbHNlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIC8vIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgLy8gICAgIEdhbWUuYXZhdGFyMi5hdmF0YXJQcmVkaWN0aW9uKCk7XHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgLy8gaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAvLyAgICAgR2FtZS5hdmF0YXIxLmF2YXRhclByZWRpY3Rpb24oKTtcclxuICAgICAgICAgICAgLy8gfSBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGF2YXRhclByZWRpY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGltZSArPSBHYW1lLsaSLkxvb3AudGltZUZyYW1lR2FtZTtcclxuXHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRpbWUgPj0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wb3NpdGlvbnMucHVzaChuZXcgxpIuVmVjdG9yMyh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi56KSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLmF2YXRhclByZWRpY3Rpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMudGljayk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpY2srKztcclxuICAgICAgICAgICAgICAgIHRoaXMudGltZSAtPSAxO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgIT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50aWNrID49IDEgJiYgdGhpcy5ob3N0UG9zaXRpb25zW3RoaXMudGljayAtIDFdICE9IHVuZGVmaW5lZCAmJiB0aGlzLnBvc2l0aW9uc1t0aGlzLnRpY2sgLSAxXSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5ob3N0UG9zaXRpb25zW3RoaXMudGljayAtIDFdLnggIT0gdGhpcy5wb3NpdGlvbnNbdGhpcy50aWNrIC0gMV0ueCB8fCB0aGlzLmhvc3RQb3NpdGlvbnNbdGhpcy50aWNrIC0gMV0ueSAhPSB0aGlzLnBvc2l0aW9uc1t0aGlzLnRpY2sgLSAxXS55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMucG9zaXRpb25zW3RoaXMudGljayAtIDFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5ob3N0UG9zaXRpb25zW3RoaXMudGljayAtIDFdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY29ycmVjdFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb3JyZWN0UG9zaXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIGNvcnJlY3RQb3NpdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaG9zdFBvc2l0aW9uc1t0aGlzLnRpY2tdICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSB0aGlzLmhvc3RQb3NpdGlvbnNbdGhpcy50aWNrXTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4geyB0aGlzLmNvcnJlY3RQb3NpdGlvbiB9LCAxMDApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgYXR0YWNrKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9uZXRJZD86IG51bWJlciwgX3N5bmM/OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIHRoaXMud2VhcG9uLnNob290KHRoaXMudGFnLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBfZGlyZWN0aW9uLCBfbmV0SWQsIF9zeW5jKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkb0tub2NrYmFjayhfYm9keTogRW50aXR5LkVudGl0eSk6IHZvaWQge1xyXG4gICAgICAgICAgICAvLyAoPEVuZW15LkVuZW15Pl9ib2R5KS5nZXRLbm9ja2JhY2sodGhpcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IzKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2UsIF9wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZG9BYmlsaXR5KCkge1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjb29sZG93bigpIHtcclxuICAgICAgICAgICAgdGhpcy53ZWFwb24uY29vbGRvd24odGhpcy5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudGFiaWxpdHlDb29sZG93blRpbWUgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb29sZG93blRpbWUgPSB0aGlzLmFiaWxpdHlDb29sZG93blRpbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50ID0gdGhpcy5hYmlsaXR5Q291bnQ7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb29sZG93blRpbWUtLTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIE1lbGVlIGV4dGVuZHMgUGxheWVyIHtcclxuXHJcbiAgICAgICAgcmVhZG9ubHkgYWJpbGl0eUNvdW50OiBudW1iZXIgPSAxO1xyXG4gICAgICAgIGN1cnJlbnRhYmlsaXR5Q291bnQ6IG51bWJlciA9IHRoaXMuYWJpbGl0eUNvdW50O1xyXG4gICAgICAgIHJlYWRvbmx5IGFiaWxpdHlDb29sZG93blRpbWU6IG51bWJlciA9IDQwO1xyXG4gICAgICAgIGN1cnJlbnRhYmlsaXR5Q29vbGRvd25UaW1lOiBudW1iZXIgPSB0aGlzLmFiaWxpdHlDb29sZG93blRpbWU7XHJcblxyXG4gICAgICAgIHB1YmxpYyB3ZWFwb246IFdlYXBvbnMuV2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKDEyLCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuTUVMRUUsIDIpO1xyXG5cclxuXHJcbiAgICAgICAgcHVibGljIGF0dGFjayhfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ/OiBudW1iZXIsIF9zeW5jPzogYm9vbGVhbikge1xyXG4gICAgICAgICAgICB0aGlzLndlYXBvbi5zaG9vdCh0aGlzLnRhZywgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgX2RpcmVjdGlvbiwgX25ldElkLCBfc3luYyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL0Jsb2NrXHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcy5oaXRhYmxlID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLmhpdGFibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSwgNjAwKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQtLTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBSYW5nZWQgZXh0ZW5kcyBQbGF5ZXIge1xyXG5cclxuICAgICAgICBwZXJmb3JtQWJpbGl0eTogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxhc3RNb3ZlRGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjM7XHJcblxyXG4gICAgICAgIHB1YmxpYyBtb3ZlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMucGVyZm9ybUFiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgIHN1cGVyLm1vdmUodGhpcy5sYXN0TW92ZURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzdXBlci5tb3ZlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5sYXN0TW92ZURpcmVjdGlvbiA9IF9kaXJlY3Rpb247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAvL0Rhc2hcclxuICAgICAgICBwdWJsaWMgZG9BYmlsaXR5KCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50YWJpbGl0eUNvdW50ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wZXJmb3JtQWJpbGl0eSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLnNwZWVkICo9IDI7XHJcblxyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLnNwZWVkIC89IDI7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcy5zcGVlZCAvPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGVyZm9ybUFiaWxpdHkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgICAgICAgICAgfSwgMzAwKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudC0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG4gICAgZXhwb3J0IGVudW0gUk9PTVRZUEUge1xyXG4gICAgICAgIFNUQVJULFxyXG4gICAgICAgIE5PUk1BTCxcclxuICAgICAgICBNRVJDSEFOVCxcclxuICAgICAgICBUUkVBU1VSRSxcclxuICAgICAgICBDSEFMTEVOR0UsXHJcbiAgICAgICAgQk9TU1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBSb29tIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuUk9PTTtcclxuICAgICAgICBwdWJsaWMgcm9vbVR5cGU6IFJPT01UWVBFXHJcbiAgICAgICAgcHVibGljIGNvb3JkaW5hdGVzOiBbbnVtYmVyLCBudW1iZXJdOyAvLyBYIFlcclxuICAgICAgICBwdWJsaWMgd2FsbHM6IFdhbGxbXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBkb29yczogRG9vcltdID0gW107XHJcbiAgICAgICAgcHVibGljIGZpbmlzaGVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgcHVibGljIGVuZW15Q291bnQ6IG51bWJlcjtcclxuICAgICAgICBuZWlnaGJvdXJOOiBSb29tO1xyXG4gICAgICAgIG5laWdoYm91ckU6IFJvb207XHJcbiAgICAgICAgbmVpZ2hib3VyUzogUm9vbTtcclxuICAgICAgICBuZWlnaGJvdXJXOiBSb29tO1xyXG4gICAgICAgIHJvb21TaXplOiBudW1iZXIgPSAzMDtcclxuICAgICAgICBleGl0czogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dIC8vIE4gRSBTIFdcclxuICAgICAgICBtZXNoOiDGki5NZXNoUXVhZCA9IG5ldyDGki5NZXNoUXVhZDtcclxuICAgICAgICBjbXBNZXNoOiDGki5Db21wb25lbnRNZXNoID0gbmV3IMaSLkNvbXBvbmVudE1lc2godGhpcy5tZXNoKTtcclxuICAgICAgICBzdGFydFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwic3RhcnRSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInllbGxvd1wiKSkpO1xyXG4gICAgICAgIG5vcm1hbFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibm9ybWFsUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgIG1lcmNoYW50Um9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtZXJjaGFudFJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiZ3JlZW5cIikpKTtcclxuICAgICAgICB0cmVhc3VyZVJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwidHJlYXN1cmVSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInllbGxvd1wiKSkpO1xyXG4gICAgICAgIGNoYWxsZW5nZVJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiY2hhbGxlbmdlUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJibHVlXCIpKSk7XHJcbiAgICAgICAgYm9zc1Jvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiYm9zc1Jvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiYmxhY2tcIikpKTtcclxuXHJcbiAgICAgICAgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX2Nvb3JkaWFudGVzOiBbbnVtYmVyLCBudW1iZXJdLCBfZXhpdHM6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSwgX3Jvb21UeXBlOiBST09NVFlQRSkge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29vcmRpbmF0ZXMgPSBfY29vcmRpYW50ZXM7XHJcbiAgICAgICAgICAgIHRoaXMuZXhpdHMgPSBfZXhpdHM7XHJcbiAgICAgICAgICAgIHRoaXMucm9vbVR5cGUgPSBfcm9vbVR5cGU7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX3Jvb21UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLlNUQVJUOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudCA9IDU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maW5pc2hlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLnN0YXJ0Um9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZW15Q291bnQgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMCkgKyAyMDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMubm9ybWFsUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLk1FUkNIQU5UOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maW5pc2hlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLm1lcmNoYW50Um9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLlRSRUFTVVJFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maW5pc2hlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLnRyZWFzdXJlUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLkNIQUxMRU5HRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZW15Q291bnQgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAyMCkgKyAzMDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMuY2hhbGxlbmdlUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLkJPU1M6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbmVteUNvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMuYm9zc1Jvb21NYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudCh0aGlzLmNtcE1lc2gpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudCh0aGlzLmNtcE1hdGVyaWFsKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjModGhpcy5yb29tU2l6ZSwgdGhpcy5yb29tU2l6ZSwgMCkpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKHRoaXMuY29vcmRpbmF0ZXNbMF0gKiB0aGlzLnJvb21TaXplLCB0aGlzLmNvb3JkaW5hdGVzWzFdICogdGhpcy5yb29tU2l6ZSwgLTAuMDIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy53YWxscy5wdXNoKG5ldyBXYWxsKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLnJvb21TaXplLCBbdHJ1ZSwgZmFsc2UsIGZhbHNlLCBmYWxzZV0pKTtcclxuICAgICAgICAgICAgdGhpcy53YWxscy5wdXNoKG5ldyBXYWxsKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLnJvb21TaXplLCBbZmFsc2UsIHRydWUsIGZhbHNlLCBmYWxzZV0pKTtcclxuICAgICAgICAgICAgdGhpcy53YWxscy5wdXNoKG5ldyBXYWxsKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLnJvb21TaXplLCBbZmFsc2UsIGZhbHNlLCB0cnVlLCBmYWxzZV0pKTtcclxuICAgICAgICAgICAgdGhpcy53YWxscy5wdXNoKG5ldyBXYWxsKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLnJvb21TaXplLCBbZmFsc2UsIGZhbHNlLCBmYWxzZSwgdHJ1ZV0pKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXREb29ycygpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHNbMF0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9vcnMucHVzaChuZXcgRG9vcih0aGlzLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgW3RydWUsIGZhbHNlLCBmYWxzZSwgZmFsc2VdLCB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHNbMV0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9vcnMucHVzaChuZXcgRG9vcih0aGlzLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgW2ZhbHNlLCB0cnVlLCBmYWxzZSwgZmFsc2VdLCB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHNbMl0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9vcnMucHVzaChuZXcgRG9vcih0aGlzLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgW2ZhbHNlLCBmYWxzZSwgdHJ1ZSwgZmFsc2VdLCB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHNbM10pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9vcnMucHVzaChuZXcgRG9vcih0aGlzLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgW2ZhbHNlLCBmYWxzZSwgZmFsc2UsIHRydWVdLCB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5kb29ycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLmRvb3JzW2ldKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldFJvb21TaXplKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJvb21TaXplO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgV2FsbCBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLldBTEw7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBHYW1lLsaSLlJlY3RhbmdsZTtcclxuICAgICAgICBwdWJsaWMgd2FsbFRoaWNrbmVzczogbnVtYmVyID0gMztcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjIsIF93aWR0aDogbnVtYmVyLCBfZGlyZWN0aW9uOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJXYWxsXCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IMaSLk1lc2hRdWFkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChuZXcgxpIuTWF0ZXJpYWwoXCJyZWRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwicmVkXCIpKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gX3Bvc2l0aW9uLnRvVmVjdG9yMygwKTtcclxuXHJcblxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvblswXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSArPSBfd2lkdGggLyAyICsgdGhpcy53YWxsVGhpY2tuZXNzIC8gMjtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKF93aWR0aCArIHRoaXMud2FsbFRoaWNrbmVzcyAqIDIsIHRoaXMud2FsbFRoaWNrbmVzcywgMCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy53YWxsVGhpY2tuZXNzLCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb25bMV0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKz0gX3dpZHRoIC8gMiArIHRoaXMud2FsbFRoaWNrbmVzcyAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyh0aGlzLndhbGxUaGlja25lc3MsIF93aWR0aCwgMCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMud2FsbFRoaWNrbmVzcywgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb25bMl0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgLT0gX3dpZHRoIC8gMiArIHRoaXMud2FsbFRoaWNrbmVzcyAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhfd2lkdGggKyB0aGlzLndhbGxUaGlja25lc3MgKiAyLCB0aGlzLndhbGxUaGlja25lc3MsIDApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLngsIHRoaXMud2FsbFRoaWNrbmVzcywgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzNdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54IC09IF93aWR0aCAvIDIgKyB0aGlzLndhbGxUaGlja25lc3MgLyAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy53YWxsVGhpY2tuZXNzLCBfd2lkdGgsIDApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLndhbGxUaGlja25lc3MsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRG9vciBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLkRPT1I7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBHYW1lLsaSLlJlY3RhbmdsZTtcclxuICAgICAgICBwdWJsaWMgZG9vcldpZHRoOiBudW1iZXIgPSAzO1xyXG4gICAgICAgIHB1YmxpYyBkb29yVGhpY2tuZXNzOiBudW1iZXIgPSAxO1xyXG4gICAgICAgIHB1YmxpYyBwYXJlbnRSb29tOiBSb29tO1xyXG5cclxuICAgICAgICBkaXJlY3Rpb246IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3BhcmVudDogUm9vbSwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjIsIF9kaXJlY3Rpb246IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSwgX3Jvb21TaXplOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJEb29yXCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5kaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLnBhcmVudFJvb20gPSBfcGFyZW50O1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IMaSLk1lc2hRdWFkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChuZXcgxpIuTWF0ZXJpYWwoXCJyZWRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiZ3JlZW5cIikpKSkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfcG9zaXRpb24udG9WZWN0b3IzKDAuMDEpO1xyXG5cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb25bMF0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKz0gX3Jvb21TaXplIC8gMjtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKHRoaXMuZG9vcldpZHRoLCB0aGlzLmRvb3JUaGlja25lc3MsIDAuMDAxKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvblsxXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCArPSBfcm9vbVNpemUgLyAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy5kb29yVGhpY2tuZXNzLCB0aGlzLmRvb3JXaWR0aCwgMC4wMDEpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzJdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55IC09IF9yb29tU2l6ZSAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyh0aGlzLmRvb3JXaWR0aCwgdGhpcy5kb29yVGhpY2tuZXNzLCAwLjAwMSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb25bM10pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnggLT0gX3Jvb21TaXplIC8gMjtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKHRoaXMuZG9vclRoaWNrbmVzcywgdGhpcy5kb29yV2lkdGgsIDAuMDAxKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNoYW5nZVJvb20oKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIEdlbmVyYXRpb24uc3dpdGNoUm9vbSh0aGlzLnBhcmVudFJvb20sIHRoaXMuZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc3dpdGNoUm9vbVJlcXVlc3QodGhpcy5wYXJlbnRSb29tLmNvb3JkaW5hdGVzLCB0aGlzLmRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgR2VuZXJhdGlvbiB7XHJcblxyXG4gICAgbGV0IG51bWJlck9mUm9vbXM6IG51bWJlciA9IDM7XHJcbiAgICBsZXQgdXNlZFBvc2l0aW9uczogW251bWJlciwgbnVtYmVyXVtdID0gW107XHJcbiAgICBleHBvcnQgbGV0IHJvb21zOiBSb29tW10gPSBbXTtcclxuXHJcbiAgICAvL3NwYXduIGNoYW5jZXNcclxuICAgIGxldCBjaGFsbGVuZ2VSb29tU3Bhd25DaGFuY2U6IG51bWJlciA9IDIwO1xyXG4gICAgbGV0IHRyZWFzdXJlUm9vbVNwYXduQ2hhbmNlOiBudW1iZXIgPSAxMDtcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVSb29tcygpOiB2b2lkIHtcclxuICAgICAgICBsZXQgc3RhcnRDb29yZHM6IFtudW1iZXIsIG51bWJlcl0gPSBbMCwgMF07XHJcblxyXG4gICAgICAgIHJvb21zLnB1c2gobmV3IFJvb20oXCJyb29tU3RhcnRcIiwgc3RhcnRDb29yZHMsIGNhbGNQYXRoRXhpdHMoc3RhcnRDb29yZHMpLCBHZW5lcmF0aW9uLlJPT01UWVBFLlNUQVJUKSlcclxuICAgICAgICB1c2VkUG9zaXRpb25zLnB1c2goc3RhcnRDb29yZHMpO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgbnVtYmVyT2ZSb29tczsgaSsrKSB7XHJcbiAgICAgICAgICAgIGFkZFJvb20ocm9vbXNbcm9vbXMubGVuZ3RoIC0gMV0sIEdlbmVyYXRpb24uUk9PTVRZUEUuTk9STUFMKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYWRkUm9vbShyb29tc1tyb29tcy5sZW5ndGggLSAxXSwgR2VuZXJhdGlvbi5ST09NVFlQRS5CT1NTKTtcclxuICAgICAgICBhZGRTcGVjaWFsUm9vbXMoKTtcclxuICAgICAgICBhZGRSb29tKHJvb21zW3Jvb21zLmxlbmd0aCAtIDNdLCBHZW5lcmF0aW9uLlJPT01UWVBFLk1FUkNIQU5UKTtcclxuICAgICAgICByb29tcy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICByb29tLmV4aXRzID0gY2FsY1Jvb21Eb29ycyhyb29tLmNvb3JkaW5hdGVzKTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cocm9vbS5jb29yZGluYXRlcyArIFwiIFwiICsgcm9vbS5leGl0cyArIFwiIFwiICsgcm9vbS5yb29tVHlwZS50b1N0cmluZygpKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJvb21zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHJvb21zW2ldLnNldERvb3JzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKHJvb21zWzBdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzBdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzFdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzJdKTtcclxuICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKHJvb21zWzBdLndhbGxzWzNdKTtcclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb29tc1swXS5kb29ycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKHJvb21zWzBdLmRvb3JzW2ldKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNlbmRSb29tKHJvb21zWzBdKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzZW5kUm9vbShfcm9vbTogUm9vbSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKF9yb29tKTtcclxuICAgICAgICBOZXR3b3JraW5nLnNlbmRSb29tKF9yb29tLm5hbWUsIF9yb29tLmNvb3JkaW5hdGVzLCBfcm9vbS5leGl0cywgX3Jvb20ucm9vbVR5cGUpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZFJvb20oX2N1cnJlbnRSb29tOiBSb29tLCBfcm9vbVR5cGU6IEdlbmVyYXRpb24uUk9PTVRZUEUpOiB2b2lkIHtcclxuICAgICAgICBsZXQgbnVtYmVyT2ZFeGl0czogbnVtYmVyID0gY291bnRCb29sKF9jdXJyZW50Um9vbS5leGl0cyk7XHJcbiAgICAgICAgbGV0IHJhbmRvbU51bWJlcjogbnVtYmVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKG51bWJlck9mRXhpdHMgLSAxKSk7XHJcbiAgICAgICAgbGV0IHBvc3NpYmxlRXhpdEluZGV4OiBudW1iZXJbXSA9IGdldEV4aXRJbmRleChfY3VycmVudFJvb20uZXhpdHMpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKF9yb29tVHlwZSArIFwiOiBcIiArIHBvc3NpYmxlRXhpdEluZGV4ICsgXCJfX19fIFwiICsgcmFuZG9tTnVtYmVyKTtcclxuICAgICAgICBsZXQgbmV3Um9vbVBvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdO1xyXG4gICAgICAgIGxldCBuZXdSb29tOiBSb29tO1xyXG5cclxuICAgICAgICBzd2l0Y2ggKHBvc3NpYmxlRXhpdEluZGV4W3JhbmRvbU51bWJlcl0pIHtcclxuICAgICAgICAgICAgY2FzZSAwOiAvLyBub3J0aFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSwgX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzFdICsgMV07XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IFJvb20oXCJyb29tTm9ybWFsXCIsIChuZXdSb29tUG9zaXRpb24pLCBjYWxjUGF0aEV4aXRzKG5ld1Jvb21Qb3NpdGlvbiksIF9yb29tVHlwZSk7XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ld1Jvb20pO1xyXG4gICAgICAgICAgICAgICAgX2N1cnJlbnRSb29tLm5laWdoYm91ck4gPSBuZXdSb29tO1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbS5uZWlnaGJvdXJTID0gX2N1cnJlbnRSb29tO1xyXG4gICAgICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5wdXNoKG5ld1Jvb21Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOiAvLyBlYXN0XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tUG9zaXRpb24gPSBbX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzBdICsgMSwgX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzFdXTtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgUm9vbShcInJvb21Ob3JtYWxcIiwgKG5ld1Jvb21Qb3NpdGlvbiksIGNhbGNQYXRoRXhpdHMobmV3Um9vbVBvc2l0aW9uKSwgX3Jvb21UeXBlKTtcclxuICAgICAgICAgICAgICAgIHJvb21zLnB1c2gobmV3Um9vbSk7XHJcbiAgICAgICAgICAgICAgICBfY3VycmVudFJvb20ubmVpZ2hib3VyRSA9IG5ld1Jvb207XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tLm5laWdoYm91clcgPSBfY3VycmVudFJvb207XHJcbiAgICAgICAgICAgICAgICB1c2VkUG9zaXRpb25zLnB1c2gobmV3Um9vbVBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6IC8vIHNvdXRoXHJcbiAgICAgICAgICAgICAgICBuZXdSb29tUG9zaXRpb24gPSBbX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzBdLCBfY3VycmVudFJvb20uY29vcmRpbmF0ZXNbMV0gLSAxXTtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgUm9vbShcInJvb21Ob3JtYWxcIiwgKG5ld1Jvb21Qb3NpdGlvbiksIGNhbGNQYXRoRXhpdHMobmV3Um9vbVBvc2l0aW9uKSwgX3Jvb21UeXBlKTtcclxuICAgICAgICAgICAgICAgIHJvb21zLnB1c2gobmV3Um9vbSk7XHJcbiAgICAgICAgICAgICAgICBfY3VycmVudFJvb20ubmVpZ2hib3VyUyA9IG5ld1Jvb207XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tLm5laWdoYm91ck4gPSBfY3VycmVudFJvb207XHJcbiAgICAgICAgICAgICAgICB1c2VkUG9zaXRpb25zLnB1c2gobmV3Um9vbVBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDM6IC8vd2VzdFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSAtIDEsIF9jdXJyZW50Um9vbS5jb29yZGluYXRlc1sxXV07XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IFJvb20oXCJyb29tTm9ybWFsXCIsIChuZXdSb29tUG9zaXRpb24pLCBjYWxjUGF0aEV4aXRzKG5ld1Jvb21Qb3NpdGlvbiksIF9yb29tVHlwZSk7XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ld1Jvb20pO1xyXG4gICAgICAgICAgICAgICAgX2N1cnJlbnRSb29tLm5laWdoYm91clcgPSBuZXdSb29tO1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbS5uZWlnaGJvdXJFID0gX2N1cnJlbnRSb29tO1xyXG4gICAgICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5wdXNoKG5ld1Jvb21Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGRTcGVjaWFsUm9vbXMoKTogdm9pZCB7XHJcbiAgICAgICAgcm9vbXMuZm9yRWFjaChyb29tID0+IHtcclxuICAgICAgICAgICAgcm9vbS5leGl0cyA9IGNhbGNQYXRoRXhpdHMocm9vbS5jb29yZGluYXRlcyk7XHJcbiAgICAgICAgICAgIGlmIChpc1NwYXduaW5nKHRyZWFzdXJlUm9vbVNwYXduQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICAgICAgYWRkUm9vbShyb29tLCBHZW5lcmF0aW9uLlJPT01UWVBFLlRSRUFTVVJFKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoaXNTcGF3bmluZyhjaGFsbGVuZ2VSb29tU3Bhd25DaGFuY2UpKSB7XHJcbiAgICAgICAgICAgICAgICBhZGRSb29tKHJvb20sIEdlbmVyYXRpb24uUk9PTVRZUEUuQ0hBTExFTkdFKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaXNTcGF3bmluZyhfc3Bhd25DaGFuY2U6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCB4ID0gTWF0aC5yYW5kb20oKSAqIDEwMDtcclxuICAgICAgICBpZiAoeCA8IF9zcGF3bkNoYW5jZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBjb3VudEJvb2woX2Jvb2w6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IGNvdW50ZXI6IG51bWJlciA9IDA7XHJcbiAgICAgICAgX2Jvb2wuZm9yRWFjaChib29sID0+IHtcclxuICAgICAgICAgICAgaWYgKGJvb2wpIHtcclxuICAgICAgICAgICAgICAgIGNvdW50ZXIrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBjb3VudGVyO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdldEV4aXRJbmRleChfZXhpdHM6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSk6IG51bWJlcltdIHtcclxuICAgICAgICBsZXQgbnVtYmVyczogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF9leGl0cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoX2V4aXRzW2ldKSB7XHJcbiAgICAgICAgICAgICAgICBudW1iZXJzLnB1c2goaSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVtYmVycztcclxuXHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIGNhbGN1bGF0ZXMgcG9zc2libGUgZXhpdHMgZm9yIG5ldyByb29tc1xyXG4gICAgICogQHBhcmFtIF9wb3NpdGlvbiBwb3NpdGlvbiBvZiByb29tXHJcbiAgICAgKiBAcmV0dXJucyBib29sZWFuIGZvciBlYWNoIGRpcmVjdGlvbiBub3J0aCwgZWFzdCwgc291dGgsIHdlc3RcclxuICAgICAqL1xyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGNQYXRoRXhpdHMoX3Bvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdKTogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dIHtcclxuICAgICAgICBsZXQgbm9ydGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgZWFzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBzb3V0aDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCB3ZXN0OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IHJvb21OZWlnaGJvdXJzOiBbbnVtYmVyLCBudW1iZXJdW107XHJcbiAgICAgICAgcm9vbU5laWdoYm91cnMgPSBzbGljZU5laWdoYm91cnMoZ2V0TmVpZ2hib3VycyhfcG9zaXRpb24pKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJvb21OZWlnaGJvdXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChyb29tTmVpZ2hib3Vyc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgc291dGggPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyb29tTmVpZ2hib3Vyc1tpXVswXSAtIF9wb3NpdGlvblswXSA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgd2VzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJvb21OZWlnaGJvdXJzW2ldWzFdIC0gX3Bvc2l0aW9uWzFdID09IDEpIHtcclxuICAgICAgICAgICAgICAgIG5vcnRoID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocm9vbU5laWdoYm91cnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gMSkge1xyXG4gICAgICAgICAgICAgICAgZWFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFtub3J0aCwgZWFzdCwgc291dGgsIHdlc3RdO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGNSb29tRG9vcnMoX3Bvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdKTogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dIHtcclxuICAgICAgICBsZXQgbm9ydGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgZWFzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBzb3V0aDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCB3ZXN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdXNlZFBvc2l0aW9ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh1c2VkUG9zaXRpb25zW2ldWzBdIC0gX3Bvc2l0aW9uWzFdKTtcclxuICAgICAgICAgICAgaWYgKHVzZWRQb3NpdGlvbnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gLTEgJiYgdXNlZFBvc2l0aW9uc1tpXVswXSAtIF9wb3NpdGlvblswXSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBzb3V0aCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHVzZWRQb3NpdGlvbnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gLTEgJiYgdXNlZFBvc2l0aW9uc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB3ZXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodXNlZFBvc2l0aW9uc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAxICYmIHVzZWRQb3NpdGlvbnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgbm9ydGggPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh1c2VkUG9zaXRpb25zW2ldWzBdIC0gX3Bvc2l0aW9uWzBdID09IDEgJiYgdXNlZFBvc2l0aW9uc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBlYXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gW25vcnRoLCBlYXN0LCBzb3V0aCwgd2VzdF07XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGdldE5laWdoYm91cnMoX3Bvc2l0aW9uOiBbbnVtYmVyLCBudW1iZXJdKTogW251bWJlciwgbnVtYmVyXVtdIHtcclxuICAgICAgICBsZXQgbmVpZ2hib3VyczogW251bWJlciwgbnVtYmVyXVtdID0gW11cclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2goW19wb3NpdGlvblswXSwgX3Bvc2l0aW9uWzFdIC0gMV0pOyAvLyBkb3duXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKFtfcG9zaXRpb25bMF0gLSAxLCBfcG9zaXRpb25bMV1dKTsgLy8gbGVmdFxyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChbX3Bvc2l0aW9uWzBdLCBfcG9zaXRpb25bMV0gKyAxXSk7IC8vIHVwXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKFtfcG9zaXRpb25bMF0gKyAxLCBfcG9zaXRpb25bMV1dKTsgLy8gcmlnaHRcclxuICAgICAgICByZXR1cm4gbmVpZ2hib3VycztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzbGljZU5laWdoYm91cnMoX25laWdoYm91cnM6IFtudW1iZXIsIG51bWJlcl1bXSk6IFtudW1iZXIsIG51bWJlcl1bXSB7XHJcbiAgICAgICAgbGV0IG5laWdoYm91cnMgPSBfbmVpZ2hib3VycztcclxuICAgICAgICBsZXQgdG9SZW1vdmVJbmRleDogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5laWdoYm91cnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgLy8gY2hlY2sgaWNoIHBvc2l0aW9uIGFscmVhZHkgdXNlZFxyXG4gICAgICAgICAgICB1c2VkUG9zaXRpb25zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAobmVpZ2hib3Vyc1tpXVswXSA9PSByb29tWzBdICYmIG5laWdoYm91cnNbaV1bMV0gPT0gcm9vbVsxXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvUmVtb3ZlSW5kZXgucHVzaChpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGNvcHk6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtdO1xyXG4gICAgICAgIHRvUmVtb3ZlSW5kZXguZm9yRWFjaChpbmRleCA9PiB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBuZWlnaGJvdXJzW2luZGV4XTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBuZWlnaGJvdXJzLmZvckVhY2gobiA9PiB7XHJcbiAgICAgICAgICAgIGNvcHkucHVzaChuKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY29weTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3dpdGNoUm9vbShfY3VycmVudFJvb206IFJvb20sIF9kaXJlY3Rpb246IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSkge1xyXG4gICAgICAgIGlmIChfY3VycmVudFJvb20uZmluaXNoZWQpIHtcclxuICAgICAgICAgICAgbGV0IG9sZE9iamVjdHM6IEdhbWUuxpIuTm9kZVtdID0gR2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtID0+ICg8YW55PmVsZW0pLnRhZyAhPSBUYWcuVEFHLlBMQVlFUik7XHJcblxyXG4gICAgICAgICAgICBvbGRPYmplY3RzLmZvckVhY2goKGVsZW0pID0+IHtcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQoZWxlbSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb25bMF0pIHtcclxuICAgICAgICAgICAgICAgIGFkZFJvb21Ub0dyYXBoKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJOKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvblsxXSkge1xyXG4gICAgICAgICAgICAgICAgYWRkUm9vbVRvR3JhcGgoX2N1cnJlbnRSb29tLm5laWdoYm91ckUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzJdKSB7XHJcbiAgICAgICAgICAgICAgICBhZGRSb29tVG9HcmFwaChfY3VycmVudFJvb20ubmVpZ2hib3VyUyk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzNdKSB7XHJcbiAgICAgICAgICAgICAgICBhZGRSb29tVG9HcmFwaChfY3VycmVudFJvb20ubmVpZ2hib3VyVyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGFkZFJvb21Ub0dyYXBoKF9yb29tOiBSb29tKSB7XHJcbiAgICAgICAgICAgICAgICBzZW5kUm9vbShfcm9vbSk7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKF9yb29tKTtcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQoX3Jvb20ud2FsbHNbMF0pO1xyXG4gICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hcHBlbmRDaGlsZChfcm9vbS53YWxsc1sxXSk7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFwcGVuZENoaWxkKF9yb29tLndhbGxzWzJdKTtcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQoX3Jvb20ud2FsbHNbM10pO1xyXG5cclxuICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfcm9vbS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb247XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfcm9vbS5kb29ycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoX3Jvb20uZG9vcnNbaV0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBFbmVteVNwYXduZXIuc3Bhd25FbmVtaWVzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFRhZyB7XHJcbiAgICBleHBvcnQgZW51bSBUQUd7XHJcbiAgICAgICAgUExBWUVSLFxyXG4gICAgICAgIEVORU1ZLFxyXG4gICAgICAgIEJVTExFVCxcclxuICAgICAgICBJVEVNLFxyXG4gICAgICAgIFJPT00sXHJcbiAgICAgICAgV0FMTCxcclxuICAgICAgICBET09SLFxyXG4gICAgICAgIERBTUFHRVVJXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgVUkge1xyXG4gICAgLy9sZXQgZGl2VUk6IEhUTUxEaXZFbGVtZW50ID0gPEhUTUxEaXZFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiVUlcIik7XHJcbiAgICBsZXQgcGxheWVyMVVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjFcIik7XHJcbiAgICBsZXQgcGxheWVyMlVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjJcIik7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVVJKCkge1xyXG4gICAgICAgIC8vQXZhdGFyMSBVSVxyXG4gICAgICAgICg8SFRNTERpdkVsZW1lbnQ+cGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSFBcIikpLnN0eWxlLndpZHRoID0gKEdhbWUuYXZhdGFyMS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyAvIEdhbWUuYXZhdGFyMS5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAqIDEwMCkgKyBcIiVcIjtcclxuXHJcbiAgICAgICAgLy9JbnZlbnRvcnlVSVxyXG4gICAgICAgIEdhbWUuYXZhdGFyMS5pdGVtcy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBleHNpc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIC8vc2VhcmNoIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICBwbGF5ZXIxVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikucXVlcnlTZWxlY3RvckFsbChcImltZ1wiKS5mb3JFYWNoKChpbWdFbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaW1nRWxlbWVudC5zcmMgPT0gZG9jdW1lbnQuVVJMICsgZWxlbWVudC5pbWdTcmMuc3Vic3RyaW5nKDIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvL25vbmUgZXhzaXN0aW5nIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICBpZiAoIWV4c2lzdCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEhUTUxJbWFnZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgbmV3SXRlbS5zcmMgPSBlbGVtZW50LmltZ1NyYztcclxuICAgICAgICAgICAgICAgIHBsYXllcjFVSS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5hcHBlbmRDaGlsZChuZXdJdGVtKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvL0F2YXRhcjIgVUlcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgKDxIVE1MRGl2RWxlbWVudD5wbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNIUFwiKSkuc3R5bGUud2lkdGggPSAoR2FtZS5hdmF0YXIyLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC8gR2FtZS5hdmF0YXIyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzICogMTAwKSArIFwiJVwiO1xyXG5cclxuICAgICAgICAgICAgLy9JbnZlbnRvcnlVSVxyXG4gICAgICAgICAgICBHYW1lLmF2YXRhcjIuaXRlbXMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGV4c2lzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vc2VhcmNoIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICAgICAgcGxheWVyMlVJLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbWdcIikuZm9yRWFjaCgoaW1nRWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbWdFbGVtZW50LnNyYyA9PSBkb2N1bWVudC5VUkwgKyBlbGVtZW50LmltZ1NyYy5zdWJzdHJpbmcoMikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL25vbmUgZXhzaXN0aW5nIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICAgICAgaWYgKCFleHNpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbTogSFRNTEltYWdlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zcmMgPSBlbGVtZW50LmltZ1NyYztcclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikuYXBwZW5kQ2hpbGQobmV3SXRlbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dFplcm86IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0T25lOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFRvdzogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRUaHJlZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRGb3VyOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dEZpdmU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U2l4OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNldmVuOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dEVpZ2h0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE5pbmU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VGVuOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERhbWFnZVVJIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuREFNQUdFVUk7XHJcbiAgICAgICAgdXA6IG51bWJlciA9IDAuMTU7XHJcbiAgICAgICAgbGlmZXRpbWU6IG51bWJlciA9IDAuNSAqIEdhbWUuZnJhbWVSYXRlO1xyXG5cclxuICAgICAgICBhc3luYyBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPj0gMCAmJiB0aGlzLmxpZmV0aW1lICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUtLTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfZGFtYWdlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJkYW1hZ2VVSVwiKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjMoMC4zMywgMC4zMywgMC4zMykpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgMC4yNSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWVzaCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUoX2RhbWFnZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBtb3ZlKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUobmV3IMaSLlZlY3RvcjMoMCwgdGhpcy51cCwgMCkpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsZSjGki5WZWN0b3IzLk9ORSgxLjAxKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxvYWRUZXh0dXJlKF90ZXh0dXJlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1R4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3Q29hdDogxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkID0gbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3TXRyOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm10clwiLCDGki5TaGFkZXJGbGF0VGV4dHVyZWQsIG5ld0NvYXQpO1xyXG4gICAgICAgICAgICBsZXQgb2xkQ29tQ29hdDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuXHJcbiAgICAgICAgICAgIG9sZENvbUNvYXQgPSB0aGlzLmdldENvbXBvbmVudCjGki5Db21wb25lbnRNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKF90ZXh0dXJlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0WmVybztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRPbmU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0VG93O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFRocmVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEZvdXI7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDU6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0Rml2ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNjpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRTZXZlbjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNzpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRFaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgODpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRFaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgOTpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHROaW5lO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxMDpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRUZW47XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBuZXdDb2F0LmNvbG9yID0gxpIuQ29sb3IuQ1NTKFwiV0hJVEVcIik7XHJcbiAgICAgICAgICAgIG5ld0NvYXQudGV4dHVyZSA9IG5ld1R4dDtcclxuICAgICAgICAgICAgb2xkQ29tQ29hdC5tYXRlcmlhbCA9IG5ld010cjtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBXZWFwb25zIHtcclxuICAgIGV4cG9ydCBjbGFzcyBXZWFwb24ge1xyXG4gICAgICAgIGNvb2xkb3duVGltZTogbnVtYmVyID0gMTA7XHJcbiAgICAgICAgcHVibGljIGN1cnJlbnRDb29sZG93blRpbWU6IG51bWJlciA9IHRoaXMuY29vbGRvd25UaW1lO1xyXG4gICAgICAgIGF0dGFja0NvdW50OiBudW1iZXIgPSAxO1xyXG4gICAgICAgIHB1YmxpYyBjdXJyZW50QXR0YWNrQ291bnQ6IG51bWJlciA9IHRoaXMuYXR0YWNrQ291bnQ7XHJcbiAgICAgICAgYnVsbGV0VHlwZTogQnVsbGV0cy5CVUxMRVRUWVBFID0gQnVsbGV0cy5CVUxMRVRUWVBFLlNUQU5EQVJEO1xyXG4gICAgICAgIHByb2plY3RpbGVBbW91bnQ6IG51bWJlciA9IDE7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29sZG93blRpbWU6IG51bWJlciwgX2F0dGFja0NvdW50OiBudW1iZXIsIF9idWxsZXRUeXBlOiBCdWxsZXRzLkJVTExFVFRZUEUsIF9wcm9qZWN0aWxlQW1vdW50OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5jb29sZG93blRpbWUgPSBfY29vbGRvd25UaW1lO1xyXG4gICAgICAgICAgICB0aGlzLmF0dGFja0NvdW50ID0gX2F0dGFja0NvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmJ1bGxldFR5cGUgPSBfYnVsbGV0VHlwZTtcclxuICAgICAgICAgICAgdGhpcy5wcm9qZWN0aWxlQW1vdW50ID0gX3Byb2plY3RpbGVBbW91bnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2hvb3QoX293bmVyOiBUYWcuVEFHLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY2l0b246IMaSLlZlY3RvcjMsIF9uZXRJZD86IG51bWJlciwgX3N5bmM/OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRBdHRhY2tDb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY2l0b24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWFnYXppbmU6IEJ1bGxldHMuQnVsbGV0W10gPSB0aGlzLmxvYWRNYWdhemluZShfcG9zaXRpb24sIF9kaXJlY2l0b24sIHRoaXMuYnVsbGV0VHlwZSwgdGhpcy5wcm9qZWN0aWxlQW1vdW50LCBfbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRCdWxsZXREaXJlY3Rpb24obWFnYXppbmUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5maXJlKF9vd25lciwgbWFnYXppbmUsIF9zeW5jKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dGFja0NvdW50LS07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZpcmUoX293bmVyOiBUYWcuVEFHLCBfbWFnYXppbmU6IEJ1bGxldHMuQnVsbGV0W10sIF9zeW5jPzogYm9vbGVhbikge1xyXG4gICAgICAgICAgICBfbWFnYXppbmUuZm9yRWFjaChidWxsZXQgPT4ge1xyXG4gICAgICAgICAgICAgICAgYnVsbGV0LmZseURpcmVjdGlvbi5zY2FsZSgxIC8gR2FtZS5mcmFtZVJhdGUgKiBidWxsZXQuc3BlZWQpXHJcbiAgICAgICAgICAgICAgICBidWxsZXQub3duZXIgPSBfb3duZXI7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGJ1bGxldCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduQnVsbGV0KGJ1bGxldC5kaXJlY3Rpb24sIGJ1bGxldC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRCdWxsZXREaXJlY3Rpb24oX21hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX21hZ2F6aW5lLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfbWFnYXppbmU7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgX21hZ2F6aW5lWzBdLm10eExvY2FsLnJvdGF0ZVooNDUgLyAyKTtcclxuICAgICAgICAgICAgICAgICAgICBfbWFnYXppbmVbMV0ubXR4TG9jYWwucm90YXRlWig0NSAvIDIgKiAtMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9tYWdhemluZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgICAgICBfbWFnYXppbmVbMF0ubXR4TG9jYWwucm90YXRlWig0NSAvIDIpO1xyXG4gICAgICAgICAgICAgICAgICAgIF9tYWdhemluZVsxXS5tdHhMb2NhbC5yb3RhdGVaKDQ1IC8gMiAqIC0xKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9tYWdhemluZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZE1hZ2F6aW5lKF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX2J1bGxldFR5cGU6IEJ1bGxldHMuQlVMTEVUVFlQRSwgX2Ftb3VudDogbnVtYmVyLCBfbmV0SWQ/OiBudW1iZXIpOiBCdWxsZXRzLkJ1bGxldFtdIHtcclxuICAgICAgICAgICAgbGV0IG1hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdID0gW107XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX2Ftb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKF9idWxsZXRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBCdWxsZXRzLkJVTExFVFRZUEUuU1RBTkRBUkQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YW5kYXJkUmVmID0gR2FtZS5idWxsZXRzSlNPTi5maW5kKGJ1bGxldCA9PiBidWxsZXQudHlwZSA9PSBCdWxsZXRzLkJVTExFVFRZUEUuU1RBTkRBUkQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWdhemluZS5wdXNoKG5ldyBCdWxsZXRzLkJ1bGxldChzdGFuZGFyZFJlZi5uYW1lLCBzdGFuZGFyZFJlZi5zcGVlZCwgc3RhbmRhcmRSZWYuaGl0UG9pbnRzU2NhbGUsIHN0YW5kYXJkUmVmLmxpZmV0aW1lLCBzdGFuZGFyZFJlZi5rbm9ja2JhY2tGb3JjZSwgc3RhbmRhcmRSZWYua2lsbGNvdW50LCBfcG9zaXRpb24sIF9kaXJlY3Rpb24sIF9uZXRJZCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQnVsbGV0cy5CVUxMRVRUWVBFLlNMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNsb3dSZWYgPSBHYW1lLmJ1bGxldHNKU09OLmZpbmQoYnVsbGV0ID0+IGJ1bGxldC50eXBlID09IEJ1bGxldHMuQlVMTEVUVFlQRS5TTE9XKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFnYXppbmUucHVzaChuZXcgQnVsbGV0cy5CdWxsZXQoc2xvd1JlZi5uYW1lLCBzbG93UmVmLnNwZWVkLCBzbG93UmVmLmhpdFBvaW50c1NjYWxlLCBzbG93UmVmLmxpZmV0aW1lLCBzbG93UmVmLmtub2NrYmFja0ZvcmNlLCBzbG93UmVmLmtpbGxjb3VudCwgX3Bvc2l0aW9uLCBfZGlyZWN0aW9uLCBfbmV0SWQpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBCdWxsZXRzLkJVTExFVFRZUEUuTUVMRUU6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lbGVlUmVmID0gR2FtZS5idWxsZXRzSlNPTi5maW5kKGJ1bGxldCA9PiBidWxsZXQudHlwZSA9PSBCdWxsZXRzLkJVTExFVFRZUEUuTUVMRUUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWdhemluZS5wdXNoKG5ldyBCdWxsZXRzLkJ1bGxldChtZWxlZVJlZi5uYW1lLCBtZWxlZVJlZi5zcGVlZCwgbWVsZWVSZWYuaGl0UG9pbnRzU2NhbGUsIG1lbGVlUmVmLmxpZmV0aW1lLCBtZWxlZVJlZi5rbm9ja2JhY2tGb3JjZSwgbWVsZWVSZWYua2lsbGNvdW50LCBfcG9zaXRpb24sIF9kaXJlY3Rpb24sIF9uZXRJZCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBtYWdhemluZTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgY29vbGRvd24oX2Zha3RvcjogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGxldCBzcGVjaWZpY0Nvb2xEb3duVGltZSA9IHRoaXMuY29vbGRvd25UaW1lICogX2Zha3RvcjtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEF0dGFja0NvdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRDb29sZG93blRpbWUgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudENvb2xkb3duVGltZSA9IHNwZWNpZmljQ29vbERvd25UaW1lO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dGFja0NvdW50ID0gdGhpcy5hdHRhY2tDb3VudDtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2codGhpcy5jdXJyZW50Q29vbGRvd25UaW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29vbGRvd25UaW1lLS07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufSJdfQ==