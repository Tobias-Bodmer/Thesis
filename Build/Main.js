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
    Game.cmpCamera = new Game.ƒ.ComponentCamera();
    Game.graph = new Game.ƒ.Node("Graph");
    Game.viewport.initialize("Viewport", Game.graph, Game.cmpCamera, Game.canvas);
    Game.connected = false;
    Game.currentNetObj = [];
    Game.entities = [];
    Game.enemies = [];
    Game.bullets = [];
    Game.items = [];
    Game.coolDowns = [];
    Game.loaded = false;
    //#endregion "PublicVariables"
    //#region "PrivateVariables"
    const damper = 3.5;
    //#endregion "PrivateVariables"
    //#region "essential"
    async function init() {
        Game.cmpCamera.mtxPivot.translation = Game.ƒ.Vector3.ZERO();
        Game.cmpCamera.mtxPivot.translateZ(25);
        Game.cmpCamera.mtxPivot.rotateY(180);
        if (Networking.client.id == Networking.client.idHost) {
            // Generation.rooms = Generation.generateNormalRooms();
            Items.ItemGenerator.fillPool();
            while (true) {
                Generation.procedualRoomGeneration();
                if (!Generation.generationFailed) {
                    break;
                }
                console.warn("GENERATION FAILED -> RESTART GENERATION");
            }
            Game.serverPredictionAvatar = new Networking.ServerPrediction(null);
        }
        Game.graph.appendChild(Game.avatar1);
        Game.ƒAid.addStandardLightComponents(Game.graph);
    }
    function update() {
        findGameObjects();
        Game.deltaTime = Game.ƒ.Loop.timeFrameGame * 0.001;
        pauseCheck();
        Game.avatar1.predict();
        cameraUpdate();
        if (Networking.client.id == Networking.client.idHost) {
            Networking.updateAvatarPosition(Game.avatar1.mtxLocal.translation, Game.avatar1.mtxLocal.rotation);
            Game.serverPredictionAvatar.update();
        }
        UI.updateUI();
        draw();
    }
    function findGameObjects() {
        Game.items = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ITEM);
        Game.bullets = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.BULLET);
        Game.entities = Game.graph.getChildren().filter(child => child instanceof Entity.Entity);
        Game.enemies = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ENEMY);
        Game.currentRoom = Game.graph.getChildren().find(elem => elem.tag == Tag.TAG.ROOM);
        Game.currentNetObj = setNetObj(Game.graph.getChildren().filter(elem => Networking.isNetworkObject(elem)));
    }
    function setNetObj(_netOj) {
        let tempNetObjs = [];
        _netOj.forEach(obj => {
            tempNetObjs.push({ netId: Networking.getNetId(obj), netObjectNode: obj });
        });
        return tempNetObjs;
    }
    function setClient() {
        if (Networking.client.socket.readyState == Networking.client.socket.OPEN && Networking.client.idRoom.toLowerCase() != "lobby") {
            Networking.setClient();
            return;
        }
        else {
            setTimeout(() => { setClient(); }, 100);
        }
    }
    function readySate() {
        if (Networking.clients.length >= 2 && Networking.client.idHost != undefined) {
            Networking.setClientReady();
        }
        else {
            setTimeout(() => { readySate(); }, 100);
        }
    }
    function startLoop() {
        if (Networking.client.id != Networking.client.idHost && Game.avatar2 != undefined) {
            Networking.loaded();
        }
        if (Game.loaded) {
            Game.ƒ.Loop.start(Game.ƒ.LOOP_MODE.TIME_GAME, Game.deltaTime);
            document.getElementById("UI").style.visibility = "visible";
        }
        else {
            setTimeout(() => {
                startLoop();
            }, 100);
        }
    }
    function start() {
        loadTextures();
        // loadJSON();
        //TODO: add sprite to graphe for startscreen
        document.getElementById("Startscreen").style.visibility = "visible";
        document.getElementById("StartGame").addEventListener("click", () => {
            document.getElementById("Startscreen").style.visibility = "hidden";
            Networking.connecting();
            waitOnConnection();
            async function waitOnConnection() {
                setClient();
                if (Networking.clients.filter(elem => elem.ready == true).length >= 2 && Networking.client.idHost != undefined) {
                    if (Networking.client.id == Networking.client.idHost) {
                        document.getElementById("IMHOST").style.visibility = "visible";
                    }
                    await loadJSON();
                    await init();
                    Game.gamestate = GAMESTATES.PLAYING;
                    // EnemySpawner.spawnEnemies();
                    if (Networking.client.id == Networking.client.idHost) {
                        // EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, Entity.ID.REDTICK, new ƒ.Vector2(3, 3), avatar1);
                        // EnemySpawner.spawnMultipleEnemiesAtRoom(5, Game.currentRoom.mtxLocal.translation.toVector2());
                        // EnemySpawner.spawnByID(Enemy.ENEMYCLASS.ENEMYSMASH, Entity.ID.OGER, new ƒ.Vector2(3, 3), null);
                        // EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONOR, Entity.ID.SUMMONOR, new ƒ.Vector2(3, 3), null);
                    }
                    //#region init Items
                    if (Networking.client.id == Networking.client.idHost) {
                        // item1 = new Items.BuffItem(Items.ITEMID.TOXICRELATIONSHIP, new ƒ.Vector2(0, 2), null);
                        let item2 = new Items.InternalItem(Items.ITEMID.THORSHAMMER);
                        item2.setPosition(new Game.ƒ.Vector2(-5, 0));
                        // let item3 = new Items.InternalItem(Items.ITEMID.SCALEUP, new ƒ.Vector2(-2, 0), null);
                        // graph.appendChild(item1);
                        Game.graph.appendChild(item2);
                        // graph.appendChild(item3);
                    }
                    Networking.spawnPlayer();
                    if (Networking.client.id == Networking.client.idHost) {
                        let roomInfos = [];
                        let coords = Generation.getCoordsFromRooms();
                        for (let i = 0; i < coords.length; i++) {
                            roomInfos.push({ coords: coords[i], roomType: Generation.rooms.find(room => room.coordinates == coords[i]).roomType });
                        }
                        Game.miniMap = new UI.Minimap(roomInfos);
                        Game.graph.addChild(Game.miniMap);
                    }
                    startLoop();
                }
                else {
                    setTimeout(waitOnConnection, 300);
                }
            }
            document.getElementById("Hostscreen").style.visibility = "visible";
            document.getElementById("Host").addEventListener("click", Networking.createRoom);
            document.getElementById("Join").addEventListener("click", () => {
                let roomId = document.getElementById("Room").value;
                Networking.joinRoom(roomId);
            });
            waitForLobby();
            function waitForLobby() {
                if (Networking.clients.length > 1 && Networking.client.idRoom.toLocaleLowerCase() != "lobby") {
                    document.getElementById("Hostscreen").style.visibility = "hidden";
                    document.getElementById("RoomId").parentElement.style.visibility = "hidden";
                    document.getElementById("Lobbyscreen").style.visibility = "visible";
                    Game.connected = true;
                }
                else {
                    setTimeout(() => {
                        waitForLobby();
                    }, 200);
                }
            }
        });
        document.getElementById("Option").addEventListener("click", () => {
            document.getElementById("Startscreen").style.visibility = "hidden";
            document.getElementById("Optionscreen").style.visibility = "visible";
            document.getElementById("BackOption").addEventListener("click", () => {
                document.getElementById("Creditscreen").style.visibility = "hidden";
                document.getElementById("Optionscreen").style.visibility = "hidden";
                document.getElementById("Startscreen").style.visibility = "visible";
            });
        });
        document.getElementById("Credits").addEventListener("click", () => {
            document.getElementById("Startscreen").style.visibility = "hidden";
            document.getElementById("Creditscreen").style.visibility = "visible";
            document.getElementById("BackCredit").addEventListener("click", () => {
                document.getElementById("Creditscreen").style.visibility = "hidden";
                document.getElementById("Optionscreen").style.visibility = "hidden";
                document.getElementById("Startscreen").style.visibility = "visible";
            });
        });
    }
    function playerChoice(_e) {
        if (_e.target.id == "Ranged") {
            Game.avatar1 = new Player.Ranged(Entity.ID.RANGED, new Entity.Attributes(10000, 5, 5, 1, 2, 5, 1, 80));
        }
        if (_e.target.id == "Melee") {
            Game.avatar1 = new Player.Melee(Entity.ID.MELEE, new Entity.Attributes(10000, 1, 5, 1, 2, 10, 1, 80));
        }
        document.getElementById("Lobbyscreen").style.visibility = "hidden";
        readySate();
    }
    function pauseCheck() {
        if ((window.screenX < -window.screen.availWidth) && (window.screenY < -window.screen.availHeight)) {
            pause(true, false);
            setTimeout(() => {
                pauseCheck();
            }, 100);
        }
        else {
            playing(true, false);
        }
    }
    function pause(_sync, _triggerOption) {
        if (Game.gamestate == GAMESTATES.PLAYING) {
            if (_sync) {
                Networking.setGamestate(false);
            }
            if (_triggerOption) {
                document.getElementById("Optionscreen").style.visibility = "visible";
                let back = document.getElementById("BackOption");
                let backClone = back.cloneNode(true);
                back.parentNode.replaceChild(backClone, back);
                document.getElementById("BackOption").addEventListener("click", () => {
                    document.getElementById("Optionscreen").style.visibility = "hidden";
                });
            }
            Game.gamestate = GAMESTATES.PAUSE;
            Game.ƒ.Loop.stop();
        }
    }
    Game.pause = pause;
    function playing(_sync, _triggerOption) {
        if (Game.gamestate == GAMESTATES.PAUSE) {
            if (_sync) {
                Networking.setGamestate(true);
            }
            if (_triggerOption) {
                document.getElementById("Optionscreen").style.visibility = "hidden";
            }
            Game.gamestate = GAMESTATES.PLAYING;
            Game.ƒ.Loop.continue();
        }
    }
    Game.playing = playing;
    async function loadJSON() {
        const loadEnemy = await (await fetch("./Resources/EnemiesStorage.json")).json();
        Game.enemiesJSON = loadEnemy.enemies;
        const loadItem = await (await fetch("./Resources/ItemStorage.json")).json();
        Game.internalItemJSON = loadItem.internalItems;
        Game.buffItemJSON = loadItem.buffItems;
        const loadBullets = await (await fetch("./Resources/BulletStorage.json")).json();
        Game.bulletsJSON = loadBullets.standardBullets;
    }
    async function loadTextures() {
        await Generation.txtStartRoom.load("./Resources/Image/Rooms/map01.png");
        await Bullets.bulletTxt.load("./Resources/Image/Projectiles/arrow.png");
        await Bullets.waterBallTxt.load("./Resources/Image/Projectiles/waterBall.png");
        //UI
        await UI.txtZero.load("./Resources/Image/white0.png");
        await UI.txtOne.load("./Resources/Image/white1.png");
        await UI.txtTow.load("./Resources/Image/white2.png");
        await UI.txtThree.load("./Resources/Image/white3.png");
        await UI.txtFour.load("./Resources/Image/white4.png");
        await UI.txtFive.load("./Resources/Image/white5.png");
        await UI.txtSix.load("./Resources/Image/white6.png");
        await UI.txtSeven.load("./Resources/Image/white7.png");
        await UI.txtEight.load("./Resources/Image/white8.png");
        await UI.txtNine.load("./Resources/Image/white9.png");
        await UI.txtTen.load("./Resources/Image/white10.png");
        //UI particle
        await UI.healParticle.load("./Resources/Image/Particles/healing.png");
        await UI.poisonParticle.load("./Resources/Image/Particles/poison.png");
        await UI.burnParticle.load("./Resources/Image/Particles/poison.png");
        await UI.bleedingParticle.load("./Resources/Image/Particles/bleeding.png");
        await UI.slowParticle.load("./Resources/Image/Particles/slow.png");
        await UI.immuneParticle.load("./Resources/Image/Particles/immune.png");
        await UI.commonParticle.load("./Resources/Image/Particles/Rarity/common.png");
        await UI.rareParticle.load("./Resources/Image/Particles/Rarity/rare.png");
        await UI.epicParticle.load("./Resources/Image/Particles/Rarity/epic.png");
        await UI.legendaryParticle.load("./Resources/Image/Particles/Rarity/legendary.png");
        await Entity.txtShadow.load("./Resources/Image/Particles/shadow.png");
        //Minimap
        await UI.normalRoom.load("./Resources/Image/Minimap/normal.png");
        await UI.challengeRoom.load("./Resources/Image/Minimap/challenge.png");
        await UI.merchantRoom.load("./Resources/Image/Minimap/merchant.png");
        await UI.treasureRoom.load("./Resources/Image/Minimap/treasure.png");
        await UI.bossRoom.load("./Resources/Image/Minimap/boss.png");
        //ENEMY
        await AnimationGeneration.txtBatIdle.load("./Resources/Image/Enemies/bat/batIdle.png");
        await AnimationGeneration.txtRedTickIdle.load("./Resources/Image/Enemies/tick/redTickIdle.png");
        await AnimationGeneration.txtRedTickWalk.load("./Resources/Image/Enemies/tick/redTickWalk.png");
        await AnimationGeneration.txtSmallTickIdle.load("./Resources/Image/Enemies/smallTick/smallTickIdle.png");
        await AnimationGeneration.txtSmallTickWalk.load("./Resources/Image/Enemies/smallTick/smallTickWalk.png");
        await AnimationGeneration.txtSkeletonIdle.load("./Resources/Image/Enemies/skeleton/skeletonIdle.png");
        await AnimationGeneration.txtSkeletonWalk.load("./Resources/Image/Enemies/skeleton/skeletonWalk.png");
        await AnimationGeneration.txtOgerIdle.load("./Resources/Image/Enemies/oger/ogerIdle.png");
        await AnimationGeneration.txtOgerWalk.load("./Resources/Image/Enemies/oger/ogerWalk.png");
        await AnimationGeneration.txtOgerAttack.load("./Resources/Image/Enemies/oger/ogerAttack.png");
        await AnimationGeneration.txtSummonerIdle.load("./Resources/Image/Enemies/summoner/summonerIdle.png");
        await AnimationGeneration.txtSummonerSummon.load("./Resources/Image/Enemies/summoner/summonerSmash.png");
        await AnimationGeneration.txtSummonerTeleport.load("./Resources/Image/Enemies/summoner/summonerTeleport.png");
        //Items
        await Items.txtIceBucket.load("./Resources/Image/Items/iceBucket.png");
        await Items.txtDmgUp.load("./Resources/Image/Items/damageUp.png");
        await Items.txtHealthUp.load("./Resources/Image/Items/healthUp.png");
        await Items.txtSpeedUp.load("./Resources/Image/Items/speedUp.png");
        await Items.txtToxicRelationship.load("./Resources/Image/Items/toxicRelationship.png");
        AnimationGeneration.generateAnimationObjects();
        //TODO: USE THIS
        // console.clear();
    }
    Game.loadTextures = loadTextures;
    function draw() {
        Game.viewport.draw();
    }
    function cameraUpdate() {
        let direction = Game.ƒ.Vector2.DIFFERENCE(Game.avatar1.mtxLocal.translation.toVector2(), Game.cmpCamera.mtxPivot.translation.toVector2());
        if (Networking.client.id == Networking.client.idHost) {
            direction.scale(Game.deltaTime * damper);
        }
        else {
            direction.scale(Game.avatar1.client.minTimeBetweenTicks * damper);
        }
        Game.cmpCamera.mtxPivot.translate(new Game.ƒ.Vector3(-direction.x, direction.y, 0), true);
        Game.miniMap.mtxLocal.translation = new Game.ƒ.Vector3(Game.cmpCamera.mtxPivot.translation.x + Game.miniMap.offsetX, Game.cmpCamera.mtxPivot.translation.y + Game.miniMap.offsetY, 0);
    }
    Game.cameraUpdate = cameraUpdate;
    Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
    //#endregion "essential"
})(Game || (Game = {}));
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
            if (element != undefined) {
                let exsist = false;
                if (element.imgSrc == undefined) {
                    exsist = true;
                }
                else {
                    //search DOMImg for Item
                    player1UI.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                        let imgName = element.imgSrc.split("/");
                        if (imgElement.src.split("/").find(elem => elem == imgName[imgName.length - 1]) != null) {
                            exsist = true;
                        }
                    });
                }
                //none exsisting DOMImg for Item
                if (!exsist) {
                    let newItem = document.createElement("img");
                    newItem.src = element.imgSrc;
                    player1UI.querySelector("#Inventory").appendChild(newItem);
                }
            }
        });
        //Avatar2 UI
        if (Game.connected) {
            player2UI.querySelector("#HP").style.width = (Game.avatar2.attributes.healthPoints / Game.avatar2.attributes.maxHealthPoints * 100) + "%";
            //InventoryUI
            Game.avatar2.items.forEach((element) => {
                if (element != undefined) {
                    let exsist = false;
                    if (element.imgSrc == undefined) {
                        exsist = true;
                    }
                    else {
                        //search DOMImg for Item
                        player2UI.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                            let imgName = element.imgSrc.split("/");
                            if (imgElement.src.split("/").find(elem => elem == imgName[imgName.length - 1]) != null) {
                                exsist = true;
                            }
                        });
                    }
                    //none exsisting DOMImg for Item
                    if (!exsist) {
                        let newItem = document.createElement("img");
                        newItem.src = element.imgSrc;
                        player2UI.querySelector("#Inventory").appendChild(newItem);
                    }
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
        tag = Tag.TAG.UI;
        up = 0.15;
        lifetime = 0.5 * 60;
        randomX = Math.random() * 0.05 - Math.random() * 0.05;
        async lifespan() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    Game.graph.removeChild(this);
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
            let mtrSolidWhite = new ƒ.Material("SolidWhite", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            let cmpMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);
            this.loadTexture(_damage);
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.update);
        }
        update = (_event) => {
            this.move();
            this.lifespan();
        };
        async move() {
            this.cmpTransform.mtxLocal.translate(new ƒ.Vector3(this.randomX, this.up, 0));
            this.cmpTransform.mtxLocal.scale(ƒ.Vector3.ONE(1.01));
        }
        loadTexture(_damage) {
            let newTxt = new ƒ.TextureImage();
            let newCoat = new ƒ.CoatRemissiveTextured();
            let newMtr = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);
            let oldComCoat = new ƒ.ComponentMaterial();
            oldComCoat = this.getComponent(ƒ.ComponentMaterial);
            switch (Math.abs(_damage)) {
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
            if (_damage >= 0) {
                newCoat.color = ƒ.Color.CSS("red");
            }
            else {
                newCoat.color = ƒ.Color.CSS("green");
                this.up = 0.1;
            }
            newCoat.texture = newTxt;
            oldComCoat.material = newMtr;
        }
    }
    UI.DamageUI = DamageUI;
    UI.healParticle = new ƒ.TextureImage();
    UI.poisonParticle = new ƒ.TextureImage();
    UI.burnParticle = new ƒ.TextureImage();
    UI.bleedingParticle = new ƒ.TextureImage();
    UI.slowParticle = new ƒ.TextureImage();
    UI.immuneParticle = new ƒ.TextureImage();
    UI.commonParticle = new ƒ.TextureImage();
    UI.rareParticle = new ƒ.TextureImage();
    UI.epicParticle = new ƒ.TextureImage();
    UI.legendaryParticle = new ƒ.TextureImage();
    class Particles extends Game.ƒAid.NodeSprite {
        id;
        animationParticles;
        particleframeNumber;
        particleframeRate;
        width;
        height;
        constructor(_id, _texture, _frameCount, _frameRate) {
            super(Buff.BUFFID[_id].toLowerCase());
            this.id = _id;
            this.particleframeNumber = _frameCount;
            this.particleframeRate = _frameRate;
            this.animationParticles = new Game.ƒAid.SpriteSheetAnimation(Buff.BUFFID[_id].toLowerCase(), new ƒ.CoatTextured(ƒ.Color.CSS("white"), _texture));
            this.height = _texture.image.height;
            this.width = _texture.image.width / this.particleframeNumber;
            this.animationParticles.generateByGrid(ƒ.Rectangle.GET(0, 0, this.width, this.height), this.particleframeNumber, 32, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(this.width));
            this.setAnimation(this.animationParticles);
            this.framerate = _frameRate;
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.translateZ(0.001);
        }
    }
    UI.Particles = Particles;
})(UI || (UI = {}));
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
        TAG[TAG["OBSTICAL"] = 7] = "OBSTICAL";
        TAG[TAG["UI"] = 8] = "UI";
    })(TAG = Tag.TAG || (Tag.TAG = {}));
})(Tag || (Tag = {}));
var Entity;
(function (Entity_1) {
    class Entity extends Game.ƒAid.NodeSprite {
        currentAnimationState;
        performKnockback = false;
        tag;
        netId;
        netObjectNode = this;
        id;
        attributes;
        collider;
        items = [];
        weapon;
        buffs = [];
        offsetColliderX;
        offsetColliderY;
        colliderScaleFaktor;
        canMoveX = true;
        canMoveY = true;
        moveDirection = Game.ƒ.Vector3.ZERO();
        animationContainer;
        idleScale;
        currentKnockback = ƒ.Vector3.ZERO();
        shadow;
        constructor(_id, _netId) {
            super(getNameById(_id));
            this.id = _id;
            this.attributes = new Entity_1.Attributes(1, 1, 1, 1, 1, 1, 1, 1);
            if (AnimationGeneration.getAnimationById(this.id) != null) {
                let ani = AnimationGeneration.getAnimationById(this.id);
                this.animationContainer = ani;
                this.idleScale = ani.scale.find(animation => animation[0] == "idle")[1];
            }
            this.addComponent(new ƒ.ComponentTransform());
            this.offsetColliderX = 0;
            this.offsetColliderY = 0;
            this.colliderScaleFaktor = 1;
            this.collider = new Collider.Collider(new ƒ.Vector2(this.mtxLocal.translation.x + (this.offsetColliderX * this.mtxLocal.scaling.x), this.mtxLocal.translation.y + (this.offsetColliderY * this.mtxLocal.scaling.y)), (this.cmpTransform.mtxLocal.scaling.x / 2) * this.colliderScaleFaktor, this.netId);
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
            if (AnimationGeneration.getAnimationById(this.id) != null) {
                let ani = AnimationGeneration.getAnimationById(this.id);
                this.animationContainer = ani;
                this.idleScale = ani.scale.find(animation => animation[0] == "idle")[1];
            }
            this.shadow = new Entity_1.Shadow(this);
            // this.addChild(this.shadow);
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            this.updateBuffs();
            this.shadow.updateShadowPos();
            if (Game.connected && Networking.client.idHost == Networking.client.id) {
                this.setCollider();
            }
        }
        updateScale() {
            this.attributes.updateScaleDependencies();
            this.mtxLocal.scaling = new ƒ.Vector3(this.attributes.scale, this.attributes.scale, this.attributes.scale);
            this.collider.setScale((this.cmpTransform.mtxLocal.scaling.x / 2) * this.colliderScaleFaktor);
        }
        setCollider() {
            this.collider.setPosition(new ƒ.Vector2(this.mtxLocal.translation.x + (this.offsetColliderX * this.mtxLocal.scaling.x), this.mtxLocal.translation.y + (this.offsetColliderY * this.mtxLocal.scaling.y)));
        }
        updateBuffs() {
            if (this.buffs.length == 0) {
                return;
            }
            for (let i = 0; i < this.buffs.length; i++) {
                this.buffs[i].doBuffStuff(this);
            }
        }
        collide(_direction) {
            this.canMoveX = true;
            this.canMoveY = true;
            let walls = Game.currentRoom.walls;
            let wallColliders = [];
            walls.forEach(elem => {
                wallColliders.push(elem.collider);
            });
            let mewDirection = _direction.clone;
            if (!mewDirection.equals(Game.ƒ.Vector3.ZERO())) {
                mewDirection.normalize();
                mewDirection.scale((Game.deltaTime * this.attributes.speed));
            }
            this.calculateCollision(wallColliders, mewDirection);
        }
        calculateCollision(_collider, _direction) {
            _collider.forEach((element) => {
                if (element instanceof Collider.Collider) {
                    if (this.collider.collides(element)) {
                        let intersection = this.collider.getIntersection(element);
                        let areaBeforeMove = intersection;
                        if (areaBeforeMove < this.collider.getRadius + element.getRadius) {
                            let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                            let newDirection = new Game.ƒ.Vector2(_direction.x, 0);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                            if (this.collider.getIntersection(element) != null) {
                                let newIntersection = this.collider.getIntersection(element);
                                let areaAfterMove = newIntersection;
                                if (areaBeforeMove < areaAfterMove) {
                                    this.canMoveX = false;
                                }
                            }
                            this.collider.position = oldPosition;
                            newDirection = new Game.ƒ.Vector2(0, _direction.y);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                            if (this.collider.getIntersection(element) != null) {
                                let newIntersection = this.collider.getIntersection(element);
                                let areaAfterMove = newIntersection;
                                if (areaBeforeMove < areaAfterMove) {
                                    this.canMoveY = false;
                                }
                            }
                            this.collider.position = oldPosition;
                        }
                        if (Networking.client.id == Networking.client.idHost) {
                            if (element.ownerNetId == Game.avatar1.netId) {
                                Game.avatar1.getKnockback(this.attributes.knockbackForce, this.mtxLocal.translation);
                            }
                            if (element.ownerNetId == Game.avatar2.netId) {
                                Networking.knockbackPush(this.attributes.knockbackForce, this.mtxLocal.translation);
                            }
                        }
                    }
                }
                else if (element instanceof Game.ƒ.Rectangle) {
                    if (this.collider.collidesRect(element)) {
                        let intersection = this.collider.getIntersectionRect(element);
                        let areaBeforeMove = intersection.height * intersection.width;
                        if (areaBeforeMove < this.mtxLocal.scaling.x * this.mtxLocal.scaling.y) {
                            let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                            let newDirection = new Game.ƒ.Vector2(_direction.x, 0);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                            if (this.collider.getIntersectionRect(element) != null) {
                                let newIntersection = this.collider.getIntersectionRect(element);
                                let areaAfterMove = newIntersection.height * newIntersection.width;
                                if (areaBeforeMove < areaAfterMove) {
                                    this.canMoveX = false;
                                }
                            }
                            this.collider.position = oldPosition;
                            newDirection = new Game.ƒ.Vector2(0, _direction.y);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                            if (this.collider.getIntersectionRect(element) != null) {
                                let newIntersection = this.collider.getIntersectionRect(element);
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
                }
            });
        }
        getDamage(_value) {
            if (Networking.client.idHost == Networking.client.id) {
                if (_value != null && this.attributes.hitable) {
                    let hitValue = this.getDamageReduction(_value);
                    this.attributes.healthPoints -= hitValue;
                    Game.graph.addChild(new UI.DamageUI(this.mtxLocal.translation, Math.round(hitValue)));
                    Networking.updateUI(this.mtxLocal.translation.toVector2(), Math.round(hitValue));
                }
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
                let knockBackScaling = Game.deltaTime * this.attributes.scale;
                direction.normalize();
                direction.scale(_knockbackForce * knockBackScaling);
                this.currentKnockback.add(direction);
            }
        }
        reduceKnockback() {
            this.currentKnockback.scale(0.5);
            // console.log(this.currentKnockback.magnitude);
            if (this.currentKnockback.magnitude < 0.0001) {
                this.currentKnockback = Game.ƒ.Vector3.ZERO();
                this.performKnockback = false;
            }
        }
        //#endregion
        switchAnimation(_name) {
            let name = ANIMATIONSTATES[_name].toLowerCase();
            if (this.animationContainer != null && this.animationContainer.animations[name] != null) {
                if (this.currentAnimationState != _name) {
                    switch (_name) {
                        case ANIMATIONSTATES.IDLE:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.IDLE;
                            break;
                        case ANIMATIONSTATES.WALK:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.WALK;
                            break;
                        case ANIMATIONSTATES.SUMMON:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.SUMMON;
                            break;
                        case ANIMATIONSTATES.ATTACK:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.ATTACK;
                            break;
                    }
                    this.framerate = this.animationContainer.frameRate.find(obj => obj[0] == name)[1];
                    this.setFrameDirection(1);
                    Networking.updateEntityAnimationState(this.currentAnimationState, this.netId);
                }
            }
            else {
                // console.warn("no animationContainer or animation with name: " + name + " at Entity: " + this.name);
            }
        }
    }
    Entity_1.Entity = Entity;
    let ANIMATIONSTATES;
    (function (ANIMATIONSTATES) {
        ANIMATIONSTATES[ANIMATIONSTATES["IDLE"] = 0] = "IDLE";
        ANIMATIONSTATES[ANIMATIONSTATES["WALK"] = 1] = "WALK";
        ANIMATIONSTATES[ANIMATIONSTATES["SUMMON"] = 2] = "SUMMON";
        ANIMATIONSTATES[ANIMATIONSTATES["ATTACK"] = 3] = "ATTACK";
    })(ANIMATIONSTATES = Entity_1.ANIMATIONSTATES || (Entity_1.ANIMATIONSTATES = {}));
    let BEHAVIOUR;
    (function (BEHAVIOUR) {
        BEHAVIOUR[BEHAVIOUR["IDLE"] = 0] = "IDLE";
        BEHAVIOUR[BEHAVIOUR["FOLLOW"] = 1] = "FOLLOW";
        BEHAVIOUR[BEHAVIOUR["FLEE"] = 2] = "FLEE";
        BEHAVIOUR[BEHAVIOUR["SUMMON"] = 3] = "SUMMON";
        BEHAVIOUR[BEHAVIOUR["ATTACK"] = 4] = "ATTACK";
    })(BEHAVIOUR = Entity_1.BEHAVIOUR || (Entity_1.BEHAVIOUR = {}));
    let ID;
    (function (ID) {
        ID[ID["RANGED"] = 0] = "RANGED";
        ID[ID["MELEE"] = 1] = "MELEE";
        ID[ID["MERCHANT"] = 2] = "MERCHANT";
        ID[ID["BAT"] = 3] = "BAT";
        ID[ID["REDTICK"] = 4] = "REDTICK";
        ID[ID["SMALLTICK"] = 5] = "SMALLTICK";
        ID[ID["SKELETON"] = 6] = "SKELETON";
        ID[ID["OGER"] = 7] = "OGER";
        ID[ID["SUMMONOR"] = 8] = "SUMMONOR";
    })(ID = Entity_1.ID || (Entity_1.ID = {}));
    function getNameById(_id) {
        switch (_id) {
            case ID.RANGED:
                return "ranged";
            case ID.MELEE:
                return "tank";
            case ID.BAT:
                return "bat";
            case ID.REDTICK:
                return "redTick";
            case ID.SMALLTICK:
                return "smallTick";
            case ID.SKELETON:
                return "skeleton";
            case ID.OGER:
                return "oger";
            case ID.SKELETON:
                return "summonor";
        }
        return null;
    }
    Entity_1.getNameById = getNameById;
})(Entity || (Entity = {}));
var Enemy;
(function (Enemy_1) {
    let ENEMYCLASS;
    (function (ENEMYCLASS) {
        ENEMYCLASS[ENEMYCLASS["ENEMYDUMB"] = 0] = "ENEMYDUMB";
        ENEMYCLASS[ENEMYCLASS["ENEMYDASH"] = 1] = "ENEMYDASH";
        ENEMYCLASS[ENEMYCLASS["ENEMYSMASH"] = 2] = "ENEMYSMASH";
        ENEMYCLASS[ENEMYCLASS["ENEMYPATROL"] = 3] = "ENEMYPATROL";
        ENEMYCLASS[ENEMYCLASS["ENEMYSHOOT"] = 4] = "ENEMYSHOOT";
        ENEMYCLASS[ENEMYCLASS["SUMMONOR"] = 5] = "SUMMONOR";
        ENEMYCLASS[ENEMYCLASS["SUMMONORADDS"] = 6] = "SUMMONORADDS";
    })(ENEMYCLASS = Enemy_1.ENEMYCLASS || (Enemy_1.ENEMYCLASS = {}));
    class Enemy extends Entity.Entity {
        currentBehaviour;
        target;
        moveDirection = Game.ƒ.Vector3.ZERO();
        flocking;
        isAggressive;
        constructor(_id, _position, _netId) {
            super(_id, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.isAggressive = false;
            let ref = Game.enemiesJSON.find(enemy => enemy.name == Entity.ID[_id].toLowerCase());
            console.log(ref);
            this.attributes = new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, ref.attributes.knockbackForce, ref.attributes.armor, ref.attributes.coolDownReduction, ref.attributes.accuracy);
            this.setAnimation(this.animationContainer.animations["idle"]);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.1);
            this.mtxLocal.scaling = new ƒ.Vector3(this.attributes.scale, this.attributes.scale, this.attributes.scale);
            this.offsetColliderX = ref.offsetColliderX;
            this.offsetColliderY = ref.offsetColliderY;
            this.colliderScaleFaktor = ref.colliderScaleFaktor;
            this.collider = new Collider.Collider(new ƒ.Vector2(this.mtxLocal.translation.x + (ref.offsetColliderX * this.mtxLocal.scaling.x), this.mtxLocal.translation.y + (ref.offsetColliderY * this.mtxLocal.scaling.y)), ((this.mtxLocal.scaling.x * this.idleScale) / 2) * this.colliderScaleFaktor, this.netId);
        }
        update() {
            if (Networking.client.id == Networking.client.idHost) {
                super.update();
                this.moveBehaviour();
                this.move(this.moveDirection);
                Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId);
            }
        }
        ;
        getDamage(_value) {
            super.getDamage(_value);
            this.isAggressive = true;
        }
        doKnockback(_body) {
            // (<Player.Player>_body).getKnockback(this.attributes.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }
        getKnockback(_knockbackForce, _position) {
            super.getKnockback(_knockbackForce, _position);
        }
        move(_direction) {
            // this.moveDirection.add(_direction);
            if (this.isAggressive) {
                this.collide(_direction);
            }
            else {
                this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            }
            // this.moveDirection.subtract(_direction);
        }
        moveBehaviour() {
        }
        moveSimple(_target) {
            this.target = _target;
            let direction = Game.ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation);
            return direction.toVector2();
        }
        moveAway(_target) {
            let moveSimple = this.moveSimple(_target);
            moveSimple.x *= -1;
            moveSimple.y *= -1;
            return moveSimple;
        }
        die() {
            Game.currentRoom.enemyCountManager.onEnemyDeath();
            Game.graph.removeChild(this);
        }
        collide(_direction) {
            let knockback = this.currentKnockback.clone;
            if (knockback.magnitude > 0) {
                // console.log("direction: " + knockback.magnitude);
            }
            if (_direction.magnitude > 0) {
                _direction.normalize();
                _direction.add(knockback);
                _direction.scale((Game.deltaTime * this.attributes.speed));
                knockback.scale((Game.deltaTime * this.attributes.speed));
                super.collide(_direction);
                let avatar = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.PLAYER);
                let avatarColliders = [];
                avatar.forEach((elem) => {
                    avatarColliders.push(elem.collider);
                });
                this.calculateCollision(avatarColliders, _direction);
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
                _direction.subtract(knockback);
                if (knockback.magnitude > 0) {
                    // console.log("knockback: " + knockback.magnitude);
                    // console.log("direction: " + _direction.magnitude);
                }
            }
            this.reduceKnockback();
        }
    }
    Enemy_1.Enemy = Enemy;
    class EnemyDumb extends Enemy {
        flocking = new Enemy_1.FlockingBehaviour(this, 2, 2, 0.1, 1, 1, 1, 0, 1);
        aggressiveDistance = 3 * 3;
        stamina = new Ability.Cooldown(180);
        recover = new Ability.Cooldown(60);
        behaviour() {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitudeSquared;
            this.flocking.update();
            //TODO: set to 3 after testing
            if (distance < this.aggressiveDistance) {
                this.isAggressive = true;
            }
            if (this.isAggressive && !this.recover.hasCoolDown) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    if (!this.stamina.hasCoolDown && !this.recover.hasCoolDown) {
                        this.stamina.startCoolDown();
                    }
                    if (this.stamina.hasCoolDown) {
                        this.moveDirection = this.flocking.getMoveVector().toVector3();
                        if (this.stamina.getCurrentCooldown == 1) {
                            this.recover.startCoolDown();
                            this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
                        }
                    }
                    break;
            }
        }
    }
    Enemy_1.EnemyDumb = EnemyDumb;
    class EnemySmash extends Enemy {
        coolDown = new Ability.Cooldown(5);
        avatars = [];
        randomPlayer = Math.round(Math.random());
        currentBehaviour = Entity.BEHAVIOUR.IDLE;
        behaviour() {
            this.avatars = [Game.avatar1, Game.avatar2];
            this.target = this.avatars[this.randomPlayer].mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            if (this.currentBehaviour == Entity.BEHAVIOUR.ATTACK && this.getCurrentFrame >= this.animationContainer.animations["attack"].frames.length - 1) {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }
            if (distance < 4 && !this.coolDown.hasCoolDown) {
                this.coolDown.startCoolDown();
                this.currentBehaviour = Entity.BEHAVIOUR.ATTACK;
            }
            if (this.coolDown.hasCoolDown && this.currentBehaviour != Entity.BEHAVIOUR.IDLE) {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }
            if (this.currentBehaviour != Entity.BEHAVIOUR.FOLLOW) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveSimple(this.target).toVector3();
                    break;
                case Entity.BEHAVIOUR.ATTACK:
                    this.switchAnimation(Entity.ANIMATIONSTATES.ATTACK);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
            }
        }
    }
    Enemy_1.EnemySmash = EnemySmash;
    class EnemyDash extends Enemy {
        dash = new Ability.Dash(this.netId, 12, 1, 5 * 60, 3);
        lastMoveDireciton;
        dashCount = 1;
        avatars = [];
        randomPlayer = Math.round(Math.random());
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.flocking = new Enemy_1.FlockingBehaviour(this, 3, 0.8, 1.5, 1, 1, 0.1, 0);
        }
        behaviour() {
            this.avatars = [Game.avatar1, Game.avatar2];
            this.target = this.avatars[this.randomPlayer].mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitudeSquared;
            this.flocking.update();
            if (!this.dash.hasCooldown()) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
            if (Math.random() * 100 < 0.1) {
                this.dash.doAbility();
            }
            if (this.moveDirection.magnitudeSquared > 0.0005) {
                this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            }
            else {
                this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            }
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    if (!this.dash.doesAbility) {
                        this.moveDirection = this.flocking.getMoveVector().toVector3();
                        this.lastMoveDireciton = this.moveDirection;
                    }
                    break;
                case Entity.BEHAVIOUR.IDLE:
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveAway(this.target).toVector3();
                    break;
            }
        }
    }
    Enemy_1.EnemyDash = EnemyDash;
    class EnemyPatrol extends Enemy {
        patrolPoints = [new ƒ.Vector2(0, 4), new ƒ.Vector2(5, 0)];
        waitTime = 1000;
        currenPointIndex = 0;
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
        viewRadius = 3;
        gotRecognized = false;
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.weapon = new Weapons.Weapon(60, 1, Bullets.BULLETTYPE.STANDARD, 2, this.netId, Weapons.AIM.NORMAL);
        }
        moveBehaviour() {
            this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            if (distance < 5) {
                this.moveDirection = this.moveAway(this.target).toVector3();
                this.gotRecognized = true;
            }
            else {
                this.moveDirection = ƒ.Vector3.ZERO();
            }
            this.shoot();
        }
        getDamage(_value) {
            super.getDamage(_value);
            this.gotRecognized = true;
        }
        shoot(_netId) {
            this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
            let _direction = ƒ.Vector3.DIFFERENCE(this.target.toVector3(0), this.mtxLocal.translation);
            if (_direction.magnitude < 3 || this.gotRecognized) {
                this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, true);
            }
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
        }
    }
    Enemy_1.EnemyShoot = EnemyShoot;
    class SummonorAdds extends EnemyDash {
        avatar;
        randomPlayer = Math.round(Math.random());
        constructor(_id, _position, _target, _netId) {
            super(_id, _position, _netId);
            this.avatar = _target;
            this.flocking = new Enemy_1.FlockingBehaviour(this, 3, 0.8, 1.5, 1, 1, 0.1, 0);
        }
        behaviour() {
            this.target = this.avatar.mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            if (distance > 5) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
            else if (distance < 3) {
                this.dash.doAbility();
            }
            this.flocking.update();
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    if (!this.dash.doesAbility) {
                        this.lastMoveDireciton = this.moveDirection;
                        this.moveDirection = this.flocking.getMoveVector().toVector3();
                    }
                    break;
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveAway(this.target).toVector3();
                    break;
            }
        }
    }
    Enemy_1.SummonorAdds = SummonorAdds;
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
        ITEMID[ITEMID["ICEBUCKETCHALLENGE"] = 0] = "ICEBUCKETCHALLENGE";
        ITEMID[ITEMID["DMGUP"] = 1] = "DMGUP";
        ITEMID[ITEMID["SPEEDUP"] = 2] = "SPEEDUP";
        ITEMID[ITEMID["PROJECTILESUP"] = 3] = "PROJECTILESUP";
        ITEMID[ITEMID["HEALTHUP"] = 4] = "HEALTHUP";
        ITEMID[ITEMID["SCALEUP"] = 5] = "SCALEUP";
        ITEMID[ITEMID["SCALEDOWN"] = 6] = "SCALEDOWN";
        ITEMID[ITEMID["ARMORUP"] = 7] = "ARMORUP";
        ITEMID[ITEMID["HOMECOMING"] = 8] = "HOMECOMING";
        ITEMID[ITEMID["TOXICRELATIONSHIP"] = 9] = "TOXICRELATIONSHIP";
        ITEMID[ITEMID["VAMPY"] = 10] = "VAMPY";
        ITEMID[ITEMID["SLOWYSLOW"] = 11] = "SLOWYSLOW";
        ITEMID[ITEMID["THORSHAMMER"] = 12] = "THORSHAMMER";
    })(ITEMID = Items.ITEMID || (Items.ITEMID = {}));
    Items.txtIceBucket = new ƒ.TextureImage();
    Items.txtDmgUp = new ƒ.TextureImage();
    Items.txtHealthUp = new ƒ.TextureImage();
    Items.txtToxicRelationship = new ƒ.TextureImage();
    Items.txtSpeedUp = new ƒ.TextureImage();
    class Item extends Game.ƒ.Node {
        tag = Tag.TAG.ITEM;
        id;
        rarity;
        netId = Networking.idGenerator();
        description;
        imgSrc;
        collider;
        transform = new ƒ.ComponentTransform();
        position;
        get getPosition() { return this.position; }
        buff = [];
        constructor(_id, _netId) {
            super(ITEMID[_id]);
            this.id = _id;
            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad()));
            let material = new ƒ.Material("white", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            this.addComponent(new ƒ.ComponentMaterial(material));
            this.addComponent(new ƒ.ComponentTransform());
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2, this.netId);
            this.buff.push(this.getBuffById());
            this.setTextureById();
        }
        clone() {
            return null;
        }
        addRarityBuff() {
            let buff = new Buff.RarityBuff(this.rarity);
            buff.addToItem(this);
        }
        getBuffById() {
            let temp = getBuffItemById(this.id);
            switch (this.id) {
                case ITEMID.TOXICRELATIONSHIP:
                    return new Buff.DamageBuff(Buff.BUFFID.POISON, temp.duration, temp.tickRate, temp.value);
                case ITEMID.VAMPY:
                    return new Buff.DamageBuff(Buff.BUFFID.BLEEDING, temp.duration, temp.tickRate, temp.value);
                case ITEMID.SLOWYSLOW:
                    return new Buff.AttributesBuff(Buff.BUFFID.SLOW, temp.duration, temp.tickRate, temp.value);
                default:
                    return null;
            }
        }
        loadTexture(_texture) {
            let newTxt = new ƒ.TextureImage();
            newTxt = _texture;
            let newCoat = new ƒ.CoatRemissiveTextured();
            newCoat.texture = newTxt;
            let newMtr = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);
            this.getComponent(Game.ƒ.ComponentMaterial).material = newMtr;
        }
        setTextureById() {
            switch (this.id) {
                case ITEMID.ICEBUCKETCHALLENGE:
                    this.loadTexture(Items.txtIceBucket);
                    break;
                case ITEMID.DMGUP:
                    this.loadTexture(Items.txtDmgUp);
                    break;
                case ITEMID.SPEEDUP:
                    this.loadTexture(Items.txtSpeedUp);
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
                case ITEMID.HOMECOMING:
                    break;
                case ITEMID.TOXICRELATIONSHIP:
                    this.loadTexture(Items.txtToxicRelationship);
                    break;
                case ITEMID.VAMPY:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.THORSHAMMER:
                    //TODO: add correct texture and change in JSON
                    break;
            }
        }
        setPosition(_position) {
            this.position = _position;
            this.mtxLocal.translation = _position.toVector3(0.01);
            this.collider.setPosition(_position);
        }
        spawn() {
            Game.graph.addChild(this);
            Networking.spawnItem(this.id, this.position, this.netId);
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
        choosenOneNetId;
        constructor(_id, _netId) {
            super(_id, _netId);
            const item = getInternalItemById(this.id);
            if (item != undefined) {
                this.name = item.name;
                this.value = item.value;
                this.description = item.description;
                this.imgSrc = item.imgSrc;
                this.rarity = item.rarity;
            }
            this.addRarityBuff();
        }
        setChoosenOneNetId(_netId) {
            this.choosenOneNetId = _netId;
        }
        doYourThing(_avatar) {
            this.setAttributesById(_avatar);
            this.despawn();
        }
        clone() {
            return new InternalItem(this.id);
        }
        setAttributesById(_avatar) {
            switch (this.id) {
                case ITEMID.ICEBUCKETCHALLENGE:
                    _avatar.attributes.coolDownReduction = Calculation.subPercentageAmountToValue(_avatar.attributes.coolDownReduction, this.value);
                    Networking.updateEntityAttributes({ value: _avatar.attributes.coolDownReduction, type: Entity.ATTRIBUTETYPE.COOLDOWNREDUCTION }, _avatar.netId);
                    break;
                case ITEMID.DMGUP:
                    _avatar.attributes.attackPoints += this.value;
                    Networking.updateEntityAttributes({ value: _avatar.attributes.attackPoints, type: Entity.ATTRIBUTETYPE.ATTACKPOINTS }, _avatar.netId);
                    break;
                case ITEMID.SPEEDUP:
                    _avatar.attributes.speed = Calculation.addPercentageAmountToValue(_avatar.attributes.speed, this.value);
                    Networking.updateEntityAttributes({ value: _avatar.attributes.speed, type: Entity.ATTRIBUTETYPE.SPEED }, _avatar.netId);
                    break;
                case ITEMID.PROJECTILESUP:
                    _avatar.weapon.projectileAmount += this.value;
                    Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    break;
                case ITEMID.HEALTHUP:
                    let currentMaxPoints = _avatar.attributes.maxHealthPoints;
                    _avatar.attributes.maxHealthPoints = Calculation.addPercentageAmountToValue(_avatar.attributes.maxHealthPoints, this.value);
                    let amount = _avatar.attributes.maxHealthPoints - currentMaxPoints;
                    _avatar.attributes.healthPoints += amount;
                    Networking.updateEntityAttributes({ value: _avatar.attributes.maxHealthPoints, type: Entity.ATTRIBUTETYPE.MAXHEALTHPOINTS }, _avatar.netId);
                    break;
                case ITEMID.SCALEUP:
                    _avatar.attributes.scale = Calculation.addPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    _avatar.updateScale();
                    Networking.updateEntityAttributes({ value: _avatar.attributes.scale, type: Entity.ATTRIBUTETYPE.SCALE }, _avatar.netId);
                    break;
                case ITEMID.SCALEDOWN:
                    _avatar.attributes.scale = Calculation.subPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    _avatar.updateScale();
                    Networking.updateEntityAttributes({ value: _avatar.attributes.scale, type: Entity.ATTRIBUTETYPE.SCALE }, _avatar.netId);
                    break;
                case ITEMID.ARMORUP:
                    _avatar.attributes.armor += this.value;
                    Networking.updateEntityAttributes({ value: _avatar.attributes.armor, type: Entity.ATTRIBUTETYPE.ARMOR }, _avatar.netId);
                    break;
                case ITEMID.HOMECOMING:
                    if (_avatar instanceof Player.Ranged) {
                        _avatar.weapon.aimType = Weapons.AIM.HOMING;
                        Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    }
                    //TODO: talk with tobi
                    break;
                case ITEMID.THORSHAMMER:
                    if (_avatar instanceof Player.Ranged) {
                        localStorage.setItem("cooldownTime", _avatar.weapon.getCoolDown.getMaxCoolDown.toString());
                        localStorage.setItem("aimType", Weapons.AIM[_avatar.weapon.aimType]);
                        localStorage.setItem("bulletType", Bullets.BULLETTYPE[_avatar.weapon.bulletType]);
                        localStorage.setItem("projectileAmount", _avatar.weapon.projectileAmount.toString());
                        _avatar.weapon.getCoolDown.setMaxCoolDown = 100 * 60;
                        _avatar.weapon.aimType = Weapons.AIM.NORMAL;
                        _avatar.weapon.bulletType = Bullets.BULLETTYPE.THORSHAMMER;
                        _avatar.weapon.projectileAmount = 1;
                        Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    }
                    break;
            }
        }
    }
    Items.InternalItem = InternalItem;
    class BuffItem extends Item {
        value;
        tickRate;
        duration;
        constructor(_id, _netId) {
            super(_id, _netId);
            let temp = getBuffItemById(this.id);
            this.name = temp.name;
            this.value = temp.value;
            this.tickRate = temp.tickRate;
            this.duration = temp.duration;
            this.imgSrc = temp.imgSrc;
            this.rarity = temp.rarity;
            this.addRarityBuff();
        }
        doYourThing(_avatar) {
            this.setBuffById(_avatar);
            this.despawn();
        }
        clone() {
            return new BuffItem(this.id);
        }
        setBuffById(_avatar) {
            switch (this.id) {
                case ITEMID.TOXICRELATIONSHIP:
                    let newBuff = this.buff.find(buff => buff.id == Buff.BUFFID.POISON).clone();
                    newBuff.duration = undefined;
                    newBuff.value = 0.5;
                    newBuff.addToEntity(_avatar);
                    break;
            }
        }
    }
    Items.BuffItem = BuffItem;
    function getInternalItemById(_id) {
        return Game.internalItemJSON.find(item => item.id == _id);
    }
    Items.getInternalItemById = getInternalItemById;
    function getBuffItemById(_id) {
        return Game.buffItemJSON.find(item => item.id == _id);
    }
    Items.getBuffItemById = getBuffItemById;
    class ItemGenerator {
        static itemPool = [];
        static fillPool() {
            Game.internalItemJSON.forEach(item => {
                this.itemPool.push(new Items.InternalItem(item.id));
            });
            Game.buffItemJSON.forEach(item => {
                this.itemPool.push(new BuffItem(item.id));
            });
        }
        static getRandomItem() {
            let possibleItems = [];
            possibleItems = this.getPossibleItems();
            let randomIndex = Math.round(Math.random() * (possibleItems.length - 1));
            let returnItem = possibleItems[randomIndex];
            // this.itemPool.splice(this.itemPool.indexOf(returnItem));
            return returnItem.clone();
        }
        static getRandomItemByRarity(_rarity) {
            let possibleItems = this.itemPool.filter(item => item.rarity == _rarity);
            let randomIndex = Math.round(Math.random() * (possibleItems.length - 1));
            let returnItem = possibleItems[randomIndex];
            return returnItem.clone();
        }
        static getPossibleItems() {
            let chosenRarity = this.getRarity();
            switch (chosenRarity) {
                case RARITY.COMMON:
                    return this.itemPool.filter(item => item.rarity == RARITY.COMMON);
                case RARITY.RARE:
                    return this.itemPool.filter(item => item.rarity == RARITY.RARE);
                case RARITY.EPIC:
                    return this.itemPool.filter(item => item.rarity == RARITY.EPIC);
                case RARITY.LEGENDARY:
                    return this.itemPool.filter(item => item.rarity == RARITY.LEGENDARY);
                default:
                    return this.itemPool.filter(item => item.rarity = RARITY.COMMON);
            }
        }
        static getRarity() {
            let rarityNumber = Math.round(Math.random() * 100);
            if (rarityNumber >= 50) {
                return RARITY.COMMON;
            }
            if (rarityNumber >= 20 && rarityNumber < 50) {
                return RARITY.RARE;
            }
            if (rarityNumber >= 5 && rarityNumber < 20) {
                return RARITY.EPIC;
            }
            if (rarityNumber < 5) {
                return RARITY.LEGENDARY;
            }
            return RARITY.COMMON;
        }
    }
    Items.ItemGenerator = ItemGenerator;
    let RARITY;
    (function (RARITY) {
        RARITY[RARITY["COMMON"] = 0] = "COMMON";
        RARITY[RARITY["RARE"] = 1] = "RARE";
        RARITY[RARITY["EPIC"] = 2] = "EPIC";
        RARITY[RARITY["LEGENDARY"] = 3] = "LEGENDARY";
    })(RARITY = Items.RARITY || (Items.RARITY = {}));
})(Items || (Items = {}));
var AnimationGeneration;
(function (AnimationGeneration) {
    AnimationGeneration.txtRedTickIdle = new ƒ.TextureImage();
    AnimationGeneration.txtRedTickWalk = new ƒ.TextureImage();
    AnimationGeneration.txtSmallTickIdle = new ƒ.TextureImage();
    AnimationGeneration.txtSmallTickWalk = new ƒ.TextureImage();
    AnimationGeneration.txtBatIdle = new ƒ.TextureImage();
    AnimationGeneration.txtSkeletonIdle = new ƒ.TextureImage();
    AnimationGeneration.txtSkeletonWalk = new ƒ.TextureImage();
    AnimationGeneration.txtOgerIdle = new ƒ.TextureImage();
    AnimationGeneration.txtOgerWalk = new ƒ.TextureImage();
    AnimationGeneration.txtOgerAttack = new ƒ.TextureImage();
    AnimationGeneration.txtSummonerIdle = new ƒ.TextureImage();
    AnimationGeneration.txtSummonerSummon = new ƒ.TextureImage();
    AnimationGeneration.txtSummonerTeleport = new ƒ.TextureImage();
    AnimationGeneration.ƒAid = FudgeAid;
    class AnimationContainer {
        id;
        animations = {};
        scale = [];
        frameRate = [];
        constructor(_id) {
            this.id = _id;
            this.getAnimationById();
        }
        addAnimation(_ani, _scale, _frameRate) {
            this.animations[_ani.name] = _ani;
            this.scale.push([_ani.name, _scale]);
            this.frameRate.push([_ani.name, _frameRate]);
        }
        getAnimationById() {
            switch (this.id) {
                case Entity.ID.BAT:
                    this.addAnimation(batIdle.generatedSpriteAnimation, batIdle.animationScale, batIdle.frameRate);
                    break;
                case Entity.ID.REDTICK:
                    this.addAnimation(redTickIdle.generatedSpriteAnimation, redTickIdle.animationScale, redTickIdle.frameRate);
                    this.addAnimation(redTickWalk.generatedSpriteAnimation, redTickWalk.animationScale, redTickWalk.frameRate);
                    break;
                case Entity.ID.SMALLTICK:
                    this.addAnimation(smallTickIdle.generatedSpriteAnimation, smallTickIdle.animationScale, smallTickIdle.frameRate);
                    this.addAnimation(smallTickWalk.generatedSpriteAnimation, smallTickWalk.animationScale, smallTickWalk.frameRate);
                    break;
                case Entity.ID.SKELETON:
                    this.addAnimation(skeletonIdle.generatedSpriteAnimation, skeletonIdle.animationScale, skeletonIdle.frameRate);
                    this.addAnimation(skeletonWalk.generatedSpriteAnimation, skeletonWalk.animationScale, skeletonWalk.frameRate);
                    break;
                case Entity.ID.OGER:
                    this.addAnimation(ogerIdle.generatedSpriteAnimation, ogerIdle.animationScale, ogerIdle.frameRate);
                    this.addAnimation(ogerWalk.generatedSpriteAnimation, ogerWalk.animationScale, ogerWalk.frameRate);
                    this.addAnimation(ogerAttack.generatedSpriteAnimation, ogerAttack.animationScale, ogerAttack.frameRate);
                    break;
                case Entity.ID.SUMMONOR:
                    this.addAnimation(summonerIdle.generatedSpriteAnimation, summonerIdle.animationScale, summonerIdle.frameRate);
                    this.addAnimation(summonerWalk.generatedSpriteAnimation, summonerWalk.animationScale, summonerWalk.frameRate);
                    this.addAnimation(summonerSummon.generatedSpriteAnimation, summonerSummon.animationScale, summonerSummon.frameRate);
                    this.addAnimation(summonerTeleport.generatedSpriteAnimation, summonerTeleport.animationScale, summonerTeleport.frameRate);
                    break;
            }
        }
    }
    AnimationGeneration.AnimationContainer = AnimationContainer;
    class MyAnimationClass {
        id;
        animationName;
        spriteSheet;
        amountOfFrames;
        frameRate;
        generatedSpriteAnimation;
        animationScale;
        constructor(_id, _animationName, _texture, _amountOfFrames, _frameRate) {
            this.id = _id;
            this.animationName = _animationName;
            this.spriteSheet = _texture;
            this.frameRate = _frameRate;
            this.amountOfFrames = _amountOfFrames;
            generateAnimationFromGrid(this);
        }
    }
    //#region spriteSheet
    let batIdle;
    let redTickIdle;
    let redTickWalk;
    let smallTickIdle;
    let smallTickWalk;
    let skeletonIdle;
    let skeletonWalk;
    let ogerIdle;
    let ogerWalk;
    let ogerAttack;
    let summonerIdle;
    let summonerWalk;
    let summonerSummon;
    let summonerTeleport;
    //#endregion
    //#region AnimationContainer
    let batAnimation;
    let redTickAnimation;
    let smallTickAnimation;
    let skeletonAnimation;
    let ogerAnimation;
    let summonerAnimation;
    //#endregion
    function generateAnimationObjects() {
        batIdle = new MyAnimationClass(Entity.ID.BAT, "idle", AnimationGeneration.txtBatIdle, 4, 12);
        redTickIdle = new MyAnimationClass(Entity.ID.REDTICK, "idle", AnimationGeneration.txtRedTickIdle, 6, 12);
        redTickWalk = new MyAnimationClass(Entity.ID.REDTICK, "walk", AnimationGeneration.txtRedTickWalk, 4, 16);
        smallTickIdle = new MyAnimationClass(Entity.ID.SMALLTICK, "idle", AnimationGeneration.txtSmallTickIdle, 6, 12);
        smallTickWalk = new MyAnimationClass(Entity.ID.SMALLTICK, "walk", AnimationGeneration.txtSmallTickWalk, 4, 12);
        skeletonIdle = new MyAnimationClass(Entity.ID.SKELETON, "idle", AnimationGeneration.txtSkeletonIdle, 5, 12);
        skeletonWalk = new MyAnimationClass(Entity.ID.SKELETON, "walk", AnimationGeneration.txtSkeletonWalk, 7, 12);
        ogerIdle = new MyAnimationClass(Entity.ID.OGER, "idle", AnimationGeneration.txtOgerIdle, 5, 6);
        ogerWalk = new MyAnimationClass(Entity.ID.OGER, "walk", AnimationGeneration.txtOgerWalk, 6, 6);
        ogerAttack = new MyAnimationClass(Entity.ID.OGER, "attack", AnimationGeneration.txtOgerAttack, 10, 12);
        summonerIdle = new MyAnimationClass(Entity.ID.SUMMONOR, "idle", AnimationGeneration.txtSummonerIdle, 6, 12);
        summonerWalk = new MyAnimationClass(Entity.ID.SUMMONOR, "walk", AnimationGeneration.txtSummonerIdle, 6, 12);
        summonerSummon = new MyAnimationClass(Entity.ID.SUMMONOR, "summon", AnimationGeneration.txtSummonerSummon, 13, 12);
        summonerTeleport = new MyAnimationClass(Entity.ID.SUMMONOR, "teleport", AnimationGeneration.txtSummonerTeleport, 6, 12);
        batAnimation = new AnimationContainer(Entity.ID.BAT);
        redTickAnimation = new AnimationContainer(Entity.ID.REDTICK);
        smallTickAnimation = new AnimationContainer(Entity.ID.SMALLTICK);
        skeletonAnimation = new AnimationContainer(Entity.ID.SKELETON);
        ogerAnimation = new AnimationContainer(Entity.ID.OGER);
        summonerAnimation = new AnimationContainer(Entity.ID.SUMMONOR);
    }
    AnimationGeneration.generateAnimationObjects = generateAnimationObjects;
    function getAnimationById(_id) {
        switch (_id) {
            case Entity.ID.BAT:
                return batAnimation;
            case Entity.ID.REDTICK:
                return redTickAnimation;
            case Entity.ID.SMALLTICK:
                return smallTickAnimation;
            case Entity.ID.SKELETON:
                return skeletonAnimation;
            case Entity.ID.OGER:
                return ogerAnimation;
            case Entity.ID.SUMMONOR:
                return summonerAnimation;
            default:
                return null;
        }
    }
    AnimationGeneration.getAnimationById = getAnimationById;
    function getPixelRatio(_width, _height) {
        let max = Math.max(_width, _height);
        let min = Math.min(_width, _height);
        let scale = 1 / max * min;
        return scale;
    }
    function generateAnimationFromGrid(_class) {
        let clrWhite = ƒ.Color.CSS("white");
        let coatedSpriteSheet = new ƒ.CoatTextured(clrWhite, _class.spriteSheet);
        let width = _class.spriteSheet.texImageSource.width / _class.amountOfFrames;
        let height = _class.spriteSheet.texImageSource.height;
        let createdAnimation = new AnimationGeneration.ƒAid.SpriteSheetAnimation(_class.animationName, coatedSpriteSheet);
        createdAnimation.generateByGrid(ƒ.Rectangle.GET(0, 0, width, height), _class.amountOfFrames, 32, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(width));
        _class.animationScale = getPixelRatio(width, height);
        _class.generatedSpriteAnimation = createdAnimation;
    }
    AnimationGeneration.generateAnimationFromGrid = generateAnimationFromGrid;
})(AnimationGeneration || (AnimationGeneration = {}));
var Networking;
(function (Networking) {
    class Prediction {
        timer = 0;
        currentTick = 0;
        minTimeBetweenTicks;
        gameTickRate = 62.5;
        bufferSize = 1024;
        ownerNetId;
        get owner() { return Game.currentNetObj.find(elem => elem.netId == this.ownerNetId).netObjectNode; }
        ;
        stateBuffer;
        constructor(_ownerNetId) {
            this.minTimeBetweenTicks = 1 / this.gameTickRate;
            this.stateBuffer = new Array(this.bufferSize);
            this.ownerNetId = _ownerNetId;
        }
        handleTick() {
        }
        processMovement(_input) {
            return null;
        }
    } //#region  bullet Prediction
    Networking.Prediction = Prediction;
    class BulletPrediction extends Prediction {
        processMovement(input) {
            let cloneInputVector = input.inputVector.clone;
            let bullet = this.owner;
            bullet.move(cloneInputVector);
            let newStatePayload = { tick: input.tick, position: bullet.mtxLocal.translation };
            return newStatePayload;
        }
    }
    class ServerBulletPrediction extends BulletPrediction {
        inputQueue = new Queue();
        updateEntityToCheck(_netId) {
            this.ownerNetId = _netId;
        }
        update() {
            this.timer += Game.deltaTime;
            while (this.timer >= this.minTimeBetweenTicks) {
                this.timer -= this.minTimeBetweenTicks;
                this.handleTick();
                this.currentTick++;
            }
        }
        handleTick() {
            let bufferIndex = -1;
            while (this.inputQueue.getQueueLength() > 0) {
                let inputPayload = this.inputQueue.dequeue();
                bufferIndex = inputPayload.tick % this.bufferSize;
                let statePayload = this.processMovement(inputPayload);
                this.stateBuffer[bufferIndex] = statePayload;
            }
            if (bufferIndex != -1) {
                //Send to client new position
                Networking.sendServerBuffer(this.ownerNetId, this.stateBuffer[bufferIndex]);
            }
        }
        onClientInput(inputPayload) {
            this.inputQueue.enqueue(inputPayload);
        }
    }
    Networking.ServerBulletPrediction = ServerBulletPrediction;
    class ClientBulletPrediction extends BulletPrediction {
        inputBuffer;
        latestServerState;
        lastProcessedState;
        flyDirection;
        AsyncTolerance = 0.2;
        constructor(_ownerNetId) {
            super(_ownerNetId);
            this.inputBuffer = new Array(this.bufferSize);
        }
        update() {
            try {
                this.flyDirection = this.owner.flyDirection;
            }
            catch (error) {
                console.log("cant find owner");
            }
            this.timer += Game.deltaTime;
            while (this.timer >= this.minTimeBetweenTicks) {
                this.timer -= this.minTimeBetweenTicks;
                this.handleTick();
                this.currentTick++;
            }
        }
        handleTick() {
            if (this.latestServerState != this.lastProcessedState) {
                this.handleServerReconciliation();
            }
            let bufferIndex = this.currentTick % this.bufferSize;
            let inputPayload = { tick: this.currentTick, inputVector: this.flyDirection };
            this.inputBuffer[bufferIndex] = inputPayload;
            // console.log(inputPayload.tick + "___" + inputPayload.inputVector);
            this.stateBuffer[bufferIndex] = this.processMovement(inputPayload);
            //send inputPayload to host
            Networking.sendBulletInput(this.ownerNetId, inputPayload);
        }
        onServerMovementState(_serverState) {
            this.latestServerState = _serverState;
        }
        handleServerReconciliation() {
            this.lastProcessedState = this.latestServerState;
            let serverStateBufferIndex = this.latestServerState.tick % this.bufferSize;
            let positionError = Game.ƒ.Vector3.DIFFERENCE(this.latestServerState.position, this.stateBuffer[serverStateBufferIndex].position).magnitude;
            if (positionError > this.AsyncTolerance) {
                console.warn(this.owner.name + " need to be updated to: X:" + this.latestServerState.position.x + " Y: " + this.latestServerState.position.y);
                this.owner.mtxLocal.translation = this.latestServerState.position;
                this.stateBuffer[serverStateBufferIndex] = this.latestServerState;
                let tickToProcess = (this.latestServerState.tick + 1);
                while (tickToProcess < this.currentTick) {
                    let statePayload = this.processMovement(this.inputBuffer[tickToProcess % this.bufferSize]);
                    let bufferIndex = tickToProcess % this.bufferSize;
                    this.stateBuffer[bufferIndex] = statePayload;
                    tickToProcess++;
                }
            }
        }
    }
    Networking.ClientBulletPrediction = ClientBulletPrediction;
    //#endregion
    //#region  avatar Precdiction
    class AvatarPrediction extends Prediction {
        processMovement(input) {
            let cloneInputVector = input.inputVector.clone;
            if (cloneInputVector.magnitude > 0) {
                cloneInputVector.normalize();
            }
            if (Networking.client.id == Networking.client.idHost && input.doesAbility) {
                this.owner.doAbility();
            }
            this.owner.move(cloneInputVector);
            let newStatePayload = { tick: input.tick, position: this.owner.mtxLocal.translation };
            return newStatePayload;
        }
    }
    class ClientPrediction extends AvatarPrediction {
        inputBuffer;
        latestServerState;
        lastProcessedState;
        horizontalInput;
        verticalInput;
        doesAbility;
        AsyncTolerance = 0.1;
        constructor(_ownerNetId) {
            super(_ownerNetId);
            this.inputBuffer = new Array(this.bufferSize);
        }
        update() {
            this.horizontalInput = InputSystem.move().x;
            this.verticalInput = InputSystem.move().y;
            this.timer += Game.deltaTime;
            while (this.timer >= this.minTimeBetweenTicks) {
                this.timer -= this.minTimeBetweenTicks;
                this.handleTick();
                this.currentTick++;
            }
        }
        handleTick() {
            if (this.latestServerState != this.lastProcessedState) {
                this.handleServerReconciliation();
            }
            let bufferIndex = this.currentTick % this.bufferSize;
            this.switchAvatarAbilityState();
            let inputPayload = { tick: this.currentTick, inputVector: new ƒ.Vector3(this.horizontalInput, this.verticalInput, 0), doesAbility: this.doesAbility };
            this.inputBuffer[bufferIndex] = inputPayload;
            // console.log(inputPayload.tick + "___" + inputPayload.inputVector.clone);
            this.stateBuffer[bufferIndex] = this.processMovement(inputPayload);
            //send inputPayload to host
            Networking.sendClientInput(this.ownerNetId, inputPayload);
        }
        switchAvatarAbilityState() {
            if (this.owner.id == Entity.ID.RANGED) {
                this.doesAbility = this.owner.dash.doesAbility;
            }
            else {
                this.doesAbility = this.owner.block.doesAbility;
            }
        }
        onServerMovementState(_serverState) {
            this.latestServerState = _serverState;
        }
        handleServerReconciliation() {
            this.lastProcessedState = this.latestServerState;
            let serverStateBufferIndex = this.latestServerState.tick % this.bufferSize;
            let positionError = Game.ƒ.Vector3.DIFFERENCE(this.latestServerState.position, this.stateBuffer[serverStateBufferIndex].position).magnitude;
            if (positionError > this.AsyncTolerance) {
                console.warn("you need to be updated to: X:" + this.latestServerState.position.x + " Y: " + this.latestServerState.position.y);
                this.owner.mtxLocal.translation = this.latestServerState.position;
                this.stateBuffer[serverStateBufferIndex] = this.latestServerState;
                let tickToProcess = (this.latestServerState.tick + 1);
                while (tickToProcess < this.currentTick) {
                    let statePayload = this.processMovement(this.inputBuffer[tickToProcess % this.bufferSize]);
                    let bufferIndex = tickToProcess % this.bufferSize;
                    this.stateBuffer[bufferIndex] = statePayload;
                    tickToProcess++;
                }
            }
        }
    }
    Networking.ClientPrediction = ClientPrediction;
    class ServerPrediction extends AvatarPrediction {
        inputQueue = new Queue();
        updateEntityToCheck(_netId) {
            this.ownerNetId = _netId;
        }
        update() {
            this.timer += Game.deltaTime;
            while (this.timer >= this.minTimeBetweenTicks) {
                this.timer -= this.minTimeBetweenTicks;
                this.handleTick();
                this.currentTick++;
            }
        }
        handleTick() {
            let bufferIndex = -1;
            while (this.inputQueue.getQueueLength() > 0) {
                let inputPayload = this.inputQueue.dequeue();
                bufferIndex = inputPayload.tick % this.bufferSize;
                let statePayload = this.processMovement(inputPayload);
                this.stateBuffer[bufferIndex] = statePayload;
            }
            if (bufferIndex != -1) {
                //Send to client new position
                Networking.sendServerBuffer(this.ownerNetId, this.stateBuffer[bufferIndex]);
            }
        }
        onClientInput(inputPayload) {
            this.inputQueue.enqueue(inputPayload);
        }
    }
    Networking.ServerPrediction = ServerPrediction;
    //#endregion
    class Queue {
        items;
        constructor() {
            this.items = [];
        }
        enqueue(_item) {
            this.items.push(_item);
        }
        dequeue() {
            return this.items.shift();
        }
        getQueueLength() {
            return this.items.length;
        }
        getItems() {
            return this.items;
        }
    }
})(Networking || (Networking = {}));
var Ability;
(function (Ability_1) {
    class Ability {
        ownerNetId;
        get owner() { return Game.entities.find(elem => elem.netId == this.ownerNetId); }
        ;
        cooldown;
        abilityCount;
        currentabilityCount;
        duration;
        doesAbility = false;
        constructor(_ownerNetId, _duration, _abilityCount, _cooldownTime) {
            this.ownerNetId = _ownerNetId;
            this.abilityCount = _abilityCount;
            this.currentabilityCount = this.abilityCount;
            this.duration = new Cooldown(_duration);
            this.cooldown = new Cooldown(_cooldownTime);
        }
        eventUpdate = (_event) => {
            this.updateAbility();
        };
        updateAbility() {
            if (this.doesAbility && !this.duration.hasCoolDown) {
                this.deactivateAbility();
                this.doesAbility = false;
            }
        }
        doAbility() {
            //do stuff
            if (!this.cooldown.hasCoolDown && this.currentabilityCount <= 0) {
                this.currentabilityCount = this.abilityCount;
            }
            if (!this.cooldown.hasCoolDown && this.currentabilityCount > 0) {
                this.doesAbility = true;
                this.activateAbility();
                this.duration.startCoolDown();
                this.currentabilityCount--;
                if (this.currentabilityCount <= 0) {
                    this.cooldown.startCoolDown();
                }
            }
        }
        hasCooldown() {
            return this.cooldown.hasCoolDown;
        }
        activateAbility() {
            Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
        deactivateAbility() {
            Game.ƒ.Loop.removeEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
    }
    Ability_1.Ability = Ability;
    class Block extends Ability {
        activateAbility() {
            super.activateAbility();
            this.owner.attributes.hitable = false;
        }
        deactivateAbility() {
            super.deactivateAbility();
            this.owner.attributes.hitable = true;
        }
    }
    Ability_1.Block = Block;
    class Dash extends Ability {
        speed;
        constructor(_ownerNetId, _duration, _abilityCount, _cooldownTime, _speed) {
            super(_ownerNetId, _duration, _abilityCount, _cooldownTime);
            this.speed = _speed;
        }
        activateAbility() {
            super.activateAbility();
            console.log("activate");
            this.owner.attributes.hitable = false;
            this.owner.attributes.speed *= this.speed;
        }
        deactivateAbility() {
            super.deactivateAbility();
            console.log("deactivate");
            this.owner.attributes.hitable = true;
            this.owner.attributes.speed /= this.speed;
        }
    }
    Ability_1.Dash = Dash;
    class SpawnSummoners extends Ability {
        spawnRadius = 1;
        activateAbility() {
            super.activateAbility();
            if (Networking.client.id == Networking.client.idHost) {
                let position = new ƒ.Vector2(this.owner.mtxLocal.translation.x + Math.random() * this.spawnRadius, this.owner.mtxLocal.translation.y + 2);
                if (Math.round(Math.random()) > 0.5) {
                    EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, Entity.ID.BAT, position, Game.avatar1, null);
                }
                else {
                    EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, Entity.ID.BAT, position, Game.avatar2, null);
                }
            }
        }
    }
    Ability_1.SpawnSummoners = SpawnSummoners;
    class circleShoot extends Ability {
        bulletAmount;
        bullets = [];
        activateAbility() {
            super.activateAbility();
            this.bullets = [];
            for (let i = 0; i < this.bulletAmount; i++) {
                this.bullets.push(new Bullets.Bullet(Bullets.BULLETTYPE.STANDARD, this.owner.mtxLocal.translation.toVector2(), Game.ƒ.Vector3.ZERO(), this.ownerNetId));
                this.bullets[i].mtxLocal.rotateZ((360 / this.bulletAmount * i));
            }
            for (let i = 0; i < this.bulletAmount; i++) {
                Game.graph.addChild(this.bullets[i]);
                Networking.spawnBullet(Weapons.AIM.NORMAL, this.bullets[i].direction, this.bullets[i].netId, this.ownerNetId);
            }
        }
    }
    Ability_1.circleShoot = circleShoot;
    class Cooldown {
        hasCoolDown;
        coolDown;
        get getMaxCoolDown() { return this.coolDown; }
        ;
        set setMaxCoolDown(_param) { this.hasCoolDown = false; this.coolDown = _param; this.currentCooldown = this.coolDown; }
        currentCooldown;
        get getCurrentCooldown() { return this.currentCooldown; }
        ;
        constructor(_number) {
            this.coolDown = _number;
            this.currentCooldown = _number;
            this.hasCoolDown = false;
        }
        startCoolDown() {
            this.hasCoolDown = true;
            Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
        endCoolDown() {
            this.hasCoolDown = false;
            Game.ƒ.Loop.removeEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.updateCoolDown();
        };
        updateCoolDown() {
            if (this.hasCoolDown && this.currentCooldown > 0) {
                this.currentCooldown--;
            }
            if (this.currentCooldown <= 0 && this.hasCoolDown) {
                this.endCoolDown();
                this.currentCooldown = this.coolDown;
            }
        }
    }
    Ability_1.Cooldown = Cooldown;
})(Ability || (Ability = {}));
var Entity;
(function (Entity) {
    let ATTRIBUTETYPE;
    (function (ATTRIBUTETYPE) {
        ATTRIBUTETYPE[ATTRIBUTETYPE["HEALTHPOINTS"] = 0] = "HEALTHPOINTS";
        ATTRIBUTETYPE[ATTRIBUTETYPE["MAXHEALTHPOINTS"] = 1] = "MAXHEALTHPOINTS";
        ATTRIBUTETYPE[ATTRIBUTETYPE["KNOCKBACKFORCE"] = 2] = "KNOCKBACKFORCE";
        ATTRIBUTETYPE[ATTRIBUTETYPE["HITABLE"] = 3] = "HITABLE";
        ATTRIBUTETYPE[ATTRIBUTETYPE["ARMOR"] = 4] = "ARMOR";
        ATTRIBUTETYPE[ATTRIBUTETYPE["SPEED"] = 5] = "SPEED";
        ATTRIBUTETYPE[ATTRIBUTETYPE["ATTACKPOINTS"] = 6] = "ATTACKPOINTS";
        ATTRIBUTETYPE[ATTRIBUTETYPE["COOLDOWNREDUCTION"] = 7] = "COOLDOWNREDUCTION";
        ATTRIBUTETYPE[ATTRIBUTETYPE["SCALE"] = 8] = "SCALE";
    })(ATTRIBUTETYPE = Entity.ATTRIBUTETYPE || (Entity.ATTRIBUTETYPE = {}));
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
        accuracy = 80;
        constructor(_healthPoints, _attackPoints, _speed, _scale, _knockbackForce, _armor, _cooldownReduction, _accuracy) {
            this.scale = _scale;
            this.armor = _armor;
            this.healthPoints = _healthPoints;
            this.maxHealthPoints = this.healthPoints;
            this.attackPoints = _attackPoints;
            this.speed = _speed;
            this.knockbackForce = _knockbackForce;
            this.coolDownReduction = _cooldownReduction;
            this.accuracy = _accuracy;
        }
        updateScaleDependencies() {
            this.maxHealthPoints = Math.round(this.maxHealthPoints * (100 + (10 * this.scale)) / 100);
            this.healthPoints = Math.round(this.healthPoints * (100 + (10 * this.scale)) / 100);
            this.attackPoints = Math.round(this.attackPoints * this.scale);
            this.speed = Math.fround(this.speed / this.scale);
            this.knockbackForce = this.knockbackForce * (100 + (10 * this.scale)) / 100;
            console.log("im beeing called");
        }
    }
    Entity.Attributes = Attributes;
})(Entity || (Entity = {}));
var Enemy;
(function (Enemy) {
    class Summonor extends Enemy.EnemyShoot {
        damageTaken = 0;
        attackPhaseCd = new Ability.Cooldown(580);
        defencePhaseCd = new Ability.Cooldown(720);
        beginShooting = false;
        shootingCount = 3;
        currentShootingCount = 0;
        summon = new Ability.SpawnSummoners(this.netId, 0, 1, 45);
        dash = new Ability.Dash(this.netId, 45, 1, 13 * 60, 5);
        shoot360 = new Ability.circleShoot(this.netId, 0, 3, 5 * 60);
        dashWeapon = new Weapons.Weapon(12, 1, Bullets.BULLETTYPE.SUMMONER, 1, this.netId, Weapons.AIM.NORMAL);
        flock = new Enemy.FlockingBehaviour(this, 4, 4, 0, 0, 1, 1, 1, 2);
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
        }
        behaviour() {
            this.target = Game.avatar1.mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            this.flock.update();
            this.moveDirection = this.flock.getMoveVector().toVector3();
            if (distance < 5) {
                this.gotRecognized = true;
                this.flock.avoidWeight = 5;
                //TODO: Intro animation here and when it is done then fight...
            }
            else {
                this.flock.avoidWeight = 0;
            }
            if (this.damageTaken >= 25) {
                new Buff.AttributesBuff(Buff.BUFFID.IMMUNE, null, 1, 0).addToEntity(this);
                // new Buff.DamageBuff(Buff.BUFFID.POISON, 120, 30, 3).addToEntity(this);
                this.currentBehaviour = Entity.BEHAVIOUR.SUMMON;
                // this.damageTaken = 0;
            }
            else {
                this.currentBehaviour = Entity.BEHAVIOUR.FLEE;
            }
        }
        getDamage(_value) {
            super.getDamage(_value);
            this.damageTaken += _value;
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.attackingPhase();
                    break;
                case Entity.BEHAVIOUR.SUMMON:
                    this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);
                    this.defencePhase();
                    break;
                default:
                    // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                    break;
            }
        }
        attackingPhase() {
            if (!this.attackPhaseCd.hasCoolDown) {
                this.attackPhaseCd.setMaxCoolDown = Math.round(this.attackPhaseCd.getMaxCoolDown + Math.random() * 5 + Math.random() * -5);
                this.attackPhaseCd.startCoolDown();
            }
            if (this.attackPhaseCd.hasCoolDown) {
                let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
                if (distance > 10 || this.dash.doesAbility) {
                    this.moveDirection = Calculation.getRotatedVectorByAngle2D(this.moveDirection, 90);
                    if (Math.round(Math.random() * 100) >= 10) {
                        this.dash.doAbility();
                    }
                }
                else {
                    // this.moveDirection = this.moveAway(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
                }
                if (this.dash.doesAbility) {
                    this.dashWeapon.shoot(this.mtxLocal.translation.toVector2(), Game.ƒ.Vector2.DIFFERENCE(this.target, this.mtxLocal.translation.toVector2()).toVector3(), null, true);
                    this.dashWeapon.getCoolDown.setMaxCoolDown = Calculation.clampNumber(Math.random() * 30, 8, 30);
                }
            }
            else {
                this.mtxLocal.translation = (new ƒ.Vector2(0, 0)).toVector3();
                this.shooting360();
            }
        }
        defencePhase() {
            this.summon.doAbility();
            //TODO: make if dependent from teleport animation frame
            // if (!this.mtxLocal.translation.equals(new ƒ.Vector2(0, -13).toVector3(), 1)) {
            // let summonPosition: Game.ƒ.Vector2 = new ƒ.Vector2(0, -10);
            // this.mtxLocal.translation = summonPosition.toVector3();
            // // } else {
            // if (!this.defencePhaseCd.hasCoolDown) {
            //     this.defencePhaseCd.setMaxCoolDown = Math.round(this.defencePhaseCd.getMaxCoolDown + Math.random() * 5 + Math.random() * -5);
            //     this.defencePhaseCd.startCoolDown();
            // }
            // if (this.defencePhaseCd.hasCoolDown) {
            //     if (this.mtxLocal.translation.equals(summonPosition.toVector3(), 1) && this.getCurrentFrame == 9) {
            //         console.log("spawning");
            //         this.moveDirection = ƒ.Vector3.ZERO();
            //         // this.summon.doAbility();
            //     }
            // } else {
            //     // (<Buff.AttributesBuff>this.buffs.find(buff => buff.id == Buff.BUFFID.IMMUNE)).duration = 0;
            //     this.mtxLocal.translation = (new ƒ.Vector2(0, 0)).toVector3();
            //     this.shooting360();
            //     this.currentBehaviour = Entity.BEHAVIOUR.FLEE;
            // }
            // }
        }
        shooting360() {
            if (!this.beginShooting) {
                this.currentShootingCount = Math.round(this.shootingCount + Math.random() * 2);
                this.beginShooting = true;
            }
            else {
                if (this.currentShootingCount > 0) {
                    this.shoot360.bulletAmount = Math.round(8 + Math.random() * 8);
                    this.shoot360.doAbility();
                    if (this.shoot360.doesAbility) {
                        this.currentShootingCount--;
                    }
                }
                else {
                    this.beginShooting = false;
                }
            }
        }
    }
    Enemy.Summonor = Summonor;
})(Enemy || (Enemy = {}));
var Buff;
(function (Buff_1) {
    let BUFFID;
    (function (BUFFID) {
        BUFFID[BUFFID["BLEEDING"] = 0] = "BLEEDING";
        BUFFID[BUFFID["POISON"] = 1] = "POISON";
        BUFFID[BUFFID["HEAL"] = 2] = "HEAL";
        BUFFID[BUFFID["SLOW"] = 3] = "SLOW";
        BUFFID[BUFFID["IMMUNE"] = 4] = "IMMUNE";
    })(BUFFID = Buff_1.BUFFID || (Buff_1.BUFFID = {}));
    class Buff {
        duration;
        tickRate;
        id;
        noDuration;
        coolDown;
        constructor(_id, _duration, _tickRate) {
            this.id = _id;
            this.duration = _duration;
            this.tickRate = _tickRate;
            this.noDuration = 0;
            if (_duration != undefined) {
                this.coolDown = new Ability.Cooldown(_duration);
            }
            else {
                this.coolDown = undefined;
            }
        }
        getParticleById(_id) {
            switch (_id) {
                case BUFFID.POISON:
                    return new UI.Particles(BUFFID.POISON, UI.poisonParticle, 6, 12);
                case BUFFID.IMMUNE:
                    return new UI.Particles(BUFFID.IMMUNE, UI.immuneParticle, 1, 6);
                default:
                    return null;
            }
        }
        clone() {
            return this;
        }
        applyBuff(_avatar) {
            if (Networking.client.id == Networking.client.idHost) {
                this.getBuffById(this.id, _avatar, true);
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        /**
         * removes the buff from the buff list, removes the particle and sends the new list to the client
         * @param _avatar entity the buff should be removed
         */
        removeBuff(_avatar) {
            _avatar.removeChild(_avatar.getChildren().find(child => child.id == this.id));
            _avatar.buffs.splice(_avatar.buffs.indexOf(this));
            if (Networking.client.idHost == Networking.client.id) {
                this.getBuffById(this.id, _avatar, false);
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        /**
         * only use this function to add buffs to entities
         * @param _avatar entity it should be add to
         * @returns
         */
        addToEntity(_avatar) {
            if (_avatar.buffs.filter(buff => buff.id == this.id).length > 0) {
                return;
            }
            else {
                _avatar.buffs.push(this);
                this.addParticle(_avatar);
                if (this.coolDown != undefined) {
                    this.coolDown.startCoolDown();
                }
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        /**
         * buff applies its buff stats to the entity and deletes itself when its duration is over
         * @param _avatar entity it should be add to
         */
        doBuffStuff(_avatar) {
        }
        getBuffById(_id, _avatar, _add) {
        }
        addParticle(_avatar) {
            if (_avatar.getChildren().find(child => child.id == this.id) == undefined) {
                let particle = this.getParticleById(this.id);
                if (particle != undefined) {
                    _avatar.addChild(particle);
                    particle.mtxLocal.scale(new ƒ.Vector3(_avatar.mtxLocal.scaling.x, _avatar.mtxLocal.scaling.y, 1));
                    particle.mtxLocal.translation = new ƒ.Vector2(_avatar.offsetColliderX, _avatar.offsetColliderY).toVector3(0.1);
                    particle.activate(true);
                }
            }
        }
    }
    Buff_1.Buff = Buff;
    class RarityBuff {
        id;
        constructor(_id) {
            this.id = _id;
        }
        addToItem(_item) {
            this.addParticleToItem(_item);
        }
        getParticleById(_id) {
            switch (_id) {
                case Items.RARITY.COMMON:
                    return new UI.Particles(_id, UI.commonParticle, 1, 12);
                case Items.RARITY.RARE:
                    return new UI.Particles(_id, UI.rareParticle, 1, 12);
                case Items.RARITY.EPIC:
                    return new UI.Particles(_id, UI.epicParticle, 1, 12);
                case Items.RARITY.LEGENDARY:
                    return new UI.Particles(_id, UI.legendaryParticle, 1, 12);
                default:
                    return new UI.Particles(_id, UI.commonParticle, 1, 12);
            }
        }
        addParticleToItem(_item) {
            if (_item.getChildren().find(child => child.id == this.id) == undefined) {
                let particle = this.getParticleById(this.id);
                if (particle != undefined) {
                    _item.addChild(particle);
                    particle.mtxLocal.scale(new ƒ.Vector3(_item.mtxLocal.scaling.x, _item.mtxLocal.scaling.y, 1));
                    particle.mtxLocal.translateZ(0.1);
                    particle.activate(true);
                }
            }
        }
    }
    Buff_1.RarityBuff = RarityBuff;
    class DamageBuff extends Buff {
        value;
        constructor(_id, _duration, _tickRate, _value) {
            super(_id, _duration, _tickRate);
            this.value = _value;
        }
        clone() {
            return new DamageBuff(this.id, this.duration, this.tickRate, this.value);
        }
        doBuffStuff(_avatar) {
            if (this.coolDown != undefined) {
                if (!this.coolDown.hasCoolDown) {
                    this.removeBuff(_avatar);
                    return;
                }
                else if (this.coolDown.getCurrentCooldown % this.tickRate == 0) {
                    this.applyBuff(_avatar);
                }
            }
            else {
                if (this.noDuration % this.tickRate == 0) {
                    this.applyBuff(_avatar);
                }
                this.noDuration++;
            }
        }
        getBuffById(_id, _avatar, _add) {
            if (_add) {
                switch (_id) {
                    case BUFFID.BLEEDING:
                        _avatar.getDamage(this.value);
                        break;
                    case BUFFID.POISON:
                        // only do damage to player until he has 20% health
                        if (_avatar instanceof Player.Player) {
                            if (_avatar.attributes.healthPoints > _avatar.attributes.maxHealthPoints * 0.2) {
                                _avatar.getDamage(this.value);
                            }
                        }
                        else {
                            _avatar.getDamage(this.value);
                        }
                        break;
                }
            }
            else {
                return;
            }
        }
    }
    Buff_1.DamageBuff = DamageBuff;
    class AttributesBuff extends Buff {
        isBuffApplied;
        value;
        removedValue;
        constructor(_id, _duration, _tickRate, _value) {
            super(_id, _duration, _tickRate);
            this.isBuffApplied = false;
            this.value = _value;
        }
        clone() {
            return new AttributesBuff(this.id, this.duration, this.tickRate, this.value);
        }
        doBuffStuff(_avatar) {
            if (this.duration != undefined) {
                if (this.duration <= 0) {
                    this.removeBuff(_avatar);
                }
                else if (!this.isBuffApplied) {
                    this.applyBuff(_avatar);
                    this.isBuffApplied = true;
                }
                this.duration--;
            }
            else {
                if (!this.isBuffApplied) {
                    this.applyBuff(_avatar);
                    this.isBuffApplied = true;
                }
                this.addParticle(_avatar);
            }
        }
        getBuffById(_id, _avatar, _add) {
            switch (_id) {
                case BUFFID.SLOW:
                    if (_add) {
                        this.removedValue = Calculation.subPercentageAmountToValue(_avatar.attributes.speed, 50);
                        _avatar.attributes.speed -= this.removedValue;
                    }
                    else {
                        _avatar.attributes.speed += this.removedValue;
                    }
                    break;
                case BUFFID.IMMUNE:
                    if (_add) {
                        _avatar.attributes.hitable = false;
                    }
                    else {
                        _avatar.attributes.hitable = false;
                    }
                    let payload = { value: _avatar.attributes.hitable, type: Entity.ATTRIBUTETYPE.HITABLE };
                    Networking.updateEntityAttributes(payload, _avatar.netId);
                    break;
            }
        }
    }
    Buff_1.AttributesBuff = AttributesBuff;
})(Buff || (Buff = {}));
var Bullets;
(function (Bullets) {
    let BULLETTYPE;
    (function (BULLETTYPE) {
        BULLETTYPE[BULLETTYPE["STANDARD"] = 0] = "STANDARD";
        BULLETTYPE[BULLETTYPE["HIGHSPEED"] = 1] = "HIGHSPEED";
        BULLETTYPE[BULLETTYPE["SLOW"] = 2] = "SLOW";
        BULLETTYPE[BULLETTYPE["MELEE"] = 3] = "MELEE";
        BULLETTYPE[BULLETTYPE["SUMMONER"] = 4] = "SUMMONER";
        // TODO: speak with maurice
        BULLETTYPE[BULLETTYPE["THORSHAMMER"] = 5] = "THORSHAMMER";
    })(BULLETTYPE = Bullets.BULLETTYPE || (Bullets.BULLETTYPE = {}));
    Bullets.bulletTxt = new ƒ.TextureImage();
    Bullets.waterBallTxt = new ƒ.TextureImage();
    class Bullet extends Game.ƒ.Node {
        tag = Tag.TAG.BULLET;
        ownerNetId;
        get owner() { return Game.entities.find(elem => elem.netId == this.ownerNetId); }
        ;
        netId;
        clientPrediction;
        serverPrediction;
        flyDirection;
        direction;
        collider;
        hitPointsScale;
        speed = 20;
        lifetime = 1 * 60;
        knockbackForce = 4;
        type;
        time = 0;
        killcount = 1;
        texturePath;
        despawn() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    Networking.popID(this.netId);
                    Networking.removeBullet(this.netId);
                    Game.graph.removeChild(this);
                    if (this.type == BULLETTYPE.THORSHAMMER) {
                        this.spawnThorsHammer();
                    }
                }
            }
        }
        constructor(_bulletType, _position, _direction, _ownerId, _netId) {
            super(BULLETTYPE[_bulletType]);
            this.type = _bulletType;
            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            else {
                this.netId = Networking.idGenerator();
            }
            let ref = Game.bulletsJSON.find(bullet => bullet.name == BULLETTYPE[_bulletType].toLowerCase());
            this.speed = ref.speed;
            this.hitPointsScale = ref.hitPointsScale;
            this.lifetime = ref.lifetime;
            this.knockbackForce = ref.knockbackForce;
            this.killcount = ref.killcount;
            this.texturePath = ref.texturePath;
            // this.addComponent(new ƒ.ComponentLight(new ƒ.LightPoint(ƒ.Color.CSS("white"))));
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            let mesh = new ƒ.MeshQuad();
            let cmpMesh = new ƒ.ComponentMesh(mesh);
            this.addComponent(cmpMesh);
            let mtrSolidWhite = new ƒ.Material("SolidWhite", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            let cmpMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);
            let colliderPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider = new Collider.Collider(colliderPosition, this.cmpTransform.mtxLocal.scaling.y / 1.5, this.netId);
            this.updateRotation(_direction);
            this.loadTexture();
            this.flyDirection = ƒ.Vector3.X();
            this.direction = _direction;
            this.ownerNetId = _ownerId;
            this.serverPrediction = new Networking.ServerBulletPrediction(this.netId);
            this.clientPrediction = new Networking.ClientBulletPrediction(this.netId);
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            this.predict();
        }
        predict() {
            if (Networking.client.idHost != Networking.client.id && this.owner == Game.avatar1) {
                this.clientPrediction.update();
            }
            else {
                if (this.owner == Game.avatar2) {
                    this.serverPrediction.update();
                }
                else {
                    this.move(this.flyDirection.clone);
                    Networking.updateBullet(this.mtxLocal.translation, this.mtxLocal.rotation, this.netId);
                }
            }
            if (Networking.client.idHost == Networking.client.id) {
                this.despawn();
            }
        }
        move(_direction) {
            _direction.normalize();
            if (Networking.client.idHost == Networking.client.id && this.owner == Game.avatar2) {
                _direction.scale(this.clientPrediction.minTimeBetweenTicks * this.speed);
            }
            else {
                _direction.scale(Game.deltaTime * this.speed);
            }
            this.cmpTransform.mtxLocal.translate(_direction);
            this.collisionDetection();
        }
        doKnockback(_body) {
        }
        getKnockback(_knockbackForce, _position) {
        }
        updateRotation(_direction) {
            this.mtxLocal.rotateZ(Calculation.calcDegree(this.cmpTransform.mtxLocal.translation, ƒ.Vector3.SUM(_direction, this.cmpTransform.mtxLocal.translation)) + 90);
        }
        spawnThorsHammer() {
            if (Networking.client.id == Networking.client.idHost) {
                let removeItem = this.owner.items.find(item => item.id == Items.ITEMID.THORSHAMMER);
                Networking.updateInventory(false, removeItem.id, removeItem.netId, this.ownerNetId);
                this.owner.items.splice(this.owner.items.indexOf(removeItem), 1);
                let item = new Items.InternalItem(Items.ITEMID.THORSHAMMER);
                item.setPosition(this.mtxWorld.translation.toVector2());
                if (this.owner == Game.avatar1) {
                    item.setChoosenOneNetId(Game.avatar2.netId);
                }
                else {
                    item.setChoosenOneNetId(Game.avatar1.netId);
                }
                item.spawn();
                this.owner.weapon.getCoolDown.setMaxCoolDown = +localStorage.getItem("cooldownTime");
                this.owner.weapon.aimType = Weapons.AIM[localStorage.getItem("aimType")];
                this.owner.weapon.bulletType = BULLETTYPE[localStorage.getItem("bulletType")];
                this.owner.weapon.projectileAmount = +localStorage.getItem("projectileAmount");
                Networking.updateAvatarWeapon(this.owner.weapon, this.ownerNetId);
            }
        }
        loadTexture() {
            if (this.texturePath != "" || this.texturePath != null) {
                let newTxt = new ƒ.TextureImage();
                let newCoat = new ƒ.CoatRemissiveTextured();
                let newMtr = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);
                let oldComCoat = new ƒ.ComponentMaterial();
                oldComCoat = this.getComponent(ƒ.ComponentMaterial);
                switch (this.texturePath) {
                    case Bullets.bulletTxt.url:
                        newTxt = Bullets.bulletTxt;
                        break;
                    case Bullets.waterBallTxt.url:
                        newTxt = Bullets.waterBallTxt;
                        break;
                    default:
                        break;
                }
                newCoat.color = ƒ.Color.CSS("WHITE");
                newCoat.texture = newTxt;
                oldComCoat.material = newMtr;
            }
        }
        setBuff(_target) {
            this.owner.items.forEach(item => {
                item.buff.forEach(buff => {
                    if (buff != undefined) {
                        buff.clone().addToEntity(_target);
                    }
                });
            });
        }
        collisionDetection() {
            let newPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider.position = newPosition;
            let colliders = [];
            if (this.owner.tag == Tag.TAG.PLAYER) {
                colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ENEMY);
            }
            colliders.forEach((_elem) => {
                let element = _elem;
                if (this.collider.collides(element.collider) && element.attributes != undefined && this.killcount > 0) {
                    if (element.attributes.healthPoints > 0) {
                        if (element instanceof Enemy.SummonorAdds) {
                            if (element.avatar == this.owner) {
                                this.lifetime = 0;
                                this.killcount--;
                                return;
                            }
                        }
                        element.getDamage(this.owner.attributes.attackPoints * this.hitPointsScale);
                        this.setBuff(element);
                        element.getKnockback(this.knockbackForce, this.mtxLocal.translation);
                        this.lifetime = 0;
                        this.killcount--;
                    }
                }
            });
            if (this.owner.tag == Tag.TAG.ENEMY) {
                colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.PLAYER);
                colliders.forEach((_elem) => {
                    let element = _elem;
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
            colliders.forEach((_elem) => {
                let element = _elem;
                if (this.collider.collidesRect(element.collider)) {
                    this.lifetime = 0;
                }
            });
        }
    }
    Bullets.Bullet = Bullet;
    class HomingBullet extends Bullet {
        target;
        rotateSpeed = 2;
        targetDirection;
        constructor(_bullettype, _position, _direction, _ownerId, _target, _netId) {
            super(_bullettype, _position, _direction, _ownerId, _netId);
            this.speed = 20;
            this.hitPointsScale = 1;
            this.lifetime = 1 * 60;
            this.killcount = 1;
            if (_target != null) {
                this.target = _target;
            }
            // else {
            //     this.target = ƒ.Vector3.SUM(this.mtxLocal.translation, _direction);
            // }
            this.targetDirection = _direction;
            if (Networking.client.idHost == Networking.client.id) {
                this.setTarget(Game.avatar2.netId);
            }
        }
        update() {
            super.update();
        }
        move(_direction) {
            super.move(_direction);
            if (Networking.client.id == Networking.client.idHost) {
                this.calculateHoming();
            }
            else {
                if (this.owner == Game.avatar1) {
                    this.calculateHoming();
                }
            }
        }
        setTarget(_netID) {
            if (Game.entities.find(ent => ent.netId == _netID) != undefined) {
                this.target = Game.entities.find(ent => ent.netId == _netID).mtxLocal.translation;
            }
        }
        calculateHoming() {
            let newDirection = ƒ.Vector3.DIFFERENCE(this.target, this.mtxLocal.translation);
            if (newDirection.x != 0 && newDirection.y != 0) {
                newDirection.normalize();
            }
            let rotateAmount2 = ƒ.Vector3.CROSS(newDirection, this.mtxLocal.getX()).z;
            this.mtxLocal.rotateZ(-rotateAmount2 * this.rotateSpeed);
        }
    }
    Bullets.HomingBullet = HomingBullet;
})(Bullets || (Bullets = {}));
var Collider;
(function (Collider_1) {
    class Collider {
        ownerNetId;
        radius;
        get getRadius() { return this.radius; }
        ;
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
        constructor(_position, _radius, _netId) {
            this.position = _position;
            this.radius = _radius;
            this.ownerNetId = _netId;
        }
        setPosition(_position) {
            this.position = _position;
        }
        setScale(_scaleAmount) {
            this.radius = _scaleAmount;
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
    let spawnTime = 0 * 60;
    let currentTime = spawnTime;
    function spawnMultipleEnemiesAtRoom(_maxEnemies, _roomPos) {
        if (Networking.client.idHost == Networking.client.id) {
            //TODO: depending on currentroom.enemyCount and decrease it 
            let spawnedEnemies = 0;
            while (spawnedEnemies < _maxEnemies) {
                if (currentTime == spawnTime) {
                    let position = new ƒ.Vector2(((Math.random() * Game.currentRoom.roomSize / 2) - ((Math.random() * Game.currentRoom.roomSize / 2))), ((Math.random() * Game.currentRoom.roomSize / 2) - ((Math.random() * Game.currentRoom.roomSize / 2))));
                    position.add(_roomPos);
                    //TODO: use ID to get random enemies
                    spawnByID(Enemy.ENEMYCLASS.ENEMYDUMB, Entity.ID.SMALLTICK, position);
                    spawnedEnemies++;
                }
                currentTime--;
                if (currentTime <= 0) {
                    currentTime = spawnTime;
                }
            }
        }
    }
    EnemySpawner.spawnMultipleEnemiesAtRoom = spawnMultipleEnemiesAtRoom;
    function getRandomEnemyId() {
        let random = Math.round(Math.random() * Object.keys(Entity.ID).length / 2);
        if (random <= 2) {
            return getRandomEnemyId();
        }
        else {
            console.log(random);
            return random;
        }
    }
    function spawnByID(_enemyClass, _id, _position, _target, _netID) {
        let enemy;
        switch (_enemyClass) {
            case Enemy.ENEMYCLASS.ENEMYDASH:
                if (_netID == null) {
                    enemy = new Enemy.EnemyDash(_id, _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyDash(_id, _position, _netID);
                }
                break;
            case Enemy.ENEMYCLASS.ENEMYDUMB:
                if (_netID == null) {
                    enemy = new Enemy.EnemyDumb(_id, _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyDumb(_id, _position, _netID);
                }
                break;
            case Enemy.ENEMYCLASS.ENEMYPATROL:
                if (_netID == null) {
                    enemy = new Enemy.EnemyPatrol(_id, _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyPatrol(_id, _position, _netID);
                }
                break;
            // case Enemy.E:
            //     if (_netID == null) {
            //         enemy = new Enemy.EnemyShoot(_id, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, Math.random() * ref.attributes.knockbackForce + 0.5, ref.attributes.armor), _position, _netID);
            //     } else {
            //         enemy = new Enemy.EnemyShoot(_id, _attributes, _position, _netID);
            //     }
            //     break;
            case Enemy.ENEMYCLASS.ENEMYSMASH:
                if (_netID == null) {
                    enemy = new Enemy.EnemySmash(_id, _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemySmash(_id, _position, _netID);
                }
                break;
            case Enemy.ENEMYCLASS.SUMMONORADDS:
                if (_netID == null) {
                    enemy = new Enemy.SummonorAdds(_id, _position, _target, _netID);
                }
                else {
                    enemy = new Enemy.SummonorAdds(_id, _position, _target, _netID);
                }
                break;
            case Enemy.ENEMYCLASS.SUMMONOR:
                if (_netID == null) {
                    enemy = new Enemy.Summonor(_id, _position, _netID);
                }
                else {
                    enemy = new Enemy.Summonor(_id, _position, _netID);
                }
                break;
            default:
                break;
        }
        if (enemy != null) {
            Game.graph.addChild(enemy);
            Networking.spawnEnemy(_enemyClass, enemy, enemy.netId);
        }
    }
    EnemySpawner.spawnByID = spawnByID;
    function networkSpawnById(_enemyClass, _id, _position, _netID, _target) {
        if (_target != null) {
            if (Game.avatar1.netId == _target) {
                spawnByID(_enemyClass, _id, _position, Game.avatar1, _netID);
            }
            else {
                spawnByID(_enemyClass, _id, _position, Game.avatar2, _netID);
            }
        }
        else {
            spawnByID(_enemyClass, _id, _position, null, _netID);
        }
    }
    EnemySpawner.networkSpawnById = networkSpawnById;
})(EnemySpawner || (EnemySpawner = {}));
var Enemy;
(function (Enemy) {
    class FlockingBehaviour {
        currentNeighbours;
        sightRadius;
        avoidRadius;
        enemies = [];
        pos;
        myEnemy;
        cohesionWeight;
        allignWeight;
        avoidWeight;
        toTargetWeight;
        notToTargetWeight;
        obsticalAvoidWeight = 1.5;
        obsticalCollider;
        constructor(_enemy, _sightRadius, _avoidRadius, _cohesionWeight, _allignWeight, _avoidWeight, _toTargetWeight, _notToTargetWeight, _obsticalAvoidWeight) {
            this.pos = _enemy.mtxLocal.translation.toVector2();
            this.myEnemy = _enemy;
            this.sightRadius = _sightRadius;
            this.avoidRadius = _avoidRadius;
            this.cohesionWeight = _cohesionWeight;
            this.allignWeight = _allignWeight;
            this.avoidWeight = _avoidWeight;
            this.toTargetWeight = _toTargetWeight;
            this.notToTargetWeight = _notToTargetWeight;
            if (_obsticalAvoidWeight != null) {
                this.obsticalAvoidWeight = _obsticalAvoidWeight;
            }
            this.obsticalCollider = new Collider.Collider(this.pos, this.myEnemy.collider.getRadius * 1.75, this.myEnemy.netId);
        }
        update() {
            this.enemies = Game.enemies;
            this.pos = this.myEnemy.mtxLocal.translation.toVector2();
            this.obsticalCollider.position = this.pos;
            this.findNeighbours();
        }
        findNeighbours() {
            this.currentNeighbours = [];
            this.enemies.forEach(enem => {
                if (this.myEnemy.netId != enem.netId) {
                    if (enem.mtxLocal.translation.getDistance(this.pos.toVector3()) < this.sightRadius) {
                        this.currentNeighbours.push(enem);
                    }
                }
            });
        }
        calculateCohesionMove() {
            if (this.currentNeighbours.length <= 0) {
                return ƒ.Vector2.ZERO();
            }
            else {
                let cohesionMove = ƒ.Vector2.ZERO();
                this.currentNeighbours.forEach(enem => {
                    cohesionMove = Game.ƒ.Vector2.SUM(cohesionMove, enem.mtxLocal.translation.toVector2());
                });
                cohesionMove.scale(1 / this.currentNeighbours.length);
                cohesionMove.subtract(this.pos);
                cohesionMove = Calculation.getRotatedVectorByAngle2D(this.myEnemy.moveDirection, Calculation.calcDegree(this.myEnemy.mtxLocal.translation, cohesionMove.toVector3()) / 10).toVector2();
                return cohesionMove;
            }
        }
        calculateAllignmentMove() {
            if (this.currentNeighbours.length <= 0) {
                return this.myEnemy.moveDirection.toVector2();
            }
            else {
                let allignmentMove = ƒ.Vector2.ZERO();
                this.currentNeighbours.forEach(enem => {
                    allignmentMove = Game.ƒ.Vector2.SUM(allignmentMove, enem.moveDirection.toVector2());
                });
                allignmentMove.scale(1 / this.currentNeighbours.length);
                return allignmentMove;
            }
        }
        calculateAvoidanceMove() {
            if (this.currentNeighbours.length <= 0) {
                return ƒ.Vector2.ZERO();
            }
            else {
                let avoidanceMove = ƒ.Vector2.ZERO();
                let nAvoid = 0;
                this.currentNeighbours.forEach(enem => {
                    if (enem.mtxLocal.translation.getDistance(this.pos.toVector3()) < this.avoidRadius) {
                        nAvoid++;
                        avoidanceMove = Game.ƒ.Vector2.SUM(avoidanceMove, Game.ƒ.Vector2.DIFFERENCE(this.pos, enem.mtxLocal.translation.toVector2()));
                    }
                });
                if (nAvoid > 0) {
                    avoidanceMove.scale(1 / nAvoid);
                }
                return avoidanceMove;
            }
        }
        calculateObsticalAvoidanceMove() {
            let obsticals = [];
            Game.currentRoom.walls.forEach(elem => {
                obsticals.push(elem);
            });
            Game.currentRoom.obsticals.forEach(elem => {
                obsticals.push(elem);
            });
            let returnVector = Game.ƒ.Vector2.ZERO();
            let nAvoid = 0;
            obsticals.forEach(obstical => {
                if (obstical.collider instanceof Game.ƒ.Rectangle && this.obsticalCollider.collidesRect(obstical.collider)) {
                    let move = Game.ƒ.Vector2.DIFFERENCE(this.pos, obstical.mtxLocal.translation.toVector2());
                    move.normalize();
                    let intersection = this.obsticalCollider.getIntersectionRect(obstical.collider);
                    let areaBeforeMove = intersection.width * intersection.height;
                    this.obsticalCollider.position.add(new Game.ƒ.Vector2(move.x, 0));
                    if (this.obsticalCollider.collidesRect(obstical.collider)) {
                        intersection = this.obsticalCollider.getIntersectionRect(obstical.collider);
                        let afterBeforeMove = intersection.width * intersection.height;
                        if (areaBeforeMove <= afterBeforeMove) {
                            returnVector.add(new Game.ƒ.Vector2(0, move.y));
                        }
                        else {
                            returnVector.add(new Game.ƒ.Vector2(move.x, 0));
                        }
                    }
                    else {
                        returnVector.add(new Game.ƒ.Vector2(move.x, 0));
                    }
                    this.obsticalCollider.position.subtract(new Game.ƒ.Vector2(move.x, 0));
                    nAvoid++;
                }
                if (obstical.collider instanceof Collider.Collider && this.obsticalCollider.collides(obstical.collider)) {
                    let move = Game.ƒ.Vector2.DIFFERENCE(this.pos, obstical.mtxLocal.translation.toVector2());
                    let localAway = Game.ƒ.Vector2.SUM(move, this.myEnemy.mtxLocal.translation.toVector2());
                    let distancePos = (Game.ƒ.Vector2.DIFFERENCE(this.myEnemy.target, Game.ƒ.Vector2.SUM(Calculation.getRotatedVectorByAngle2D(localAway.clone.toVector3(), 135).toVector2(), this.myEnemy.mtxLocal.translation.toVector2())));
                    let distanceNeg = (Game.ƒ.Vector2.DIFFERENCE(this.myEnemy.target, Game.ƒ.Vector2.SUM(Calculation.getRotatedVectorByAngle2D(localAway.clone.toVector3(), -135).toVector2(), this.myEnemy.mtxLocal.translation.toVector2())));
                    if (distanceNeg.magnitudeSquared > distancePos.magnitudeSquared) {
                        move.add(Calculation.getRotatedVectorByAngle2D(move.clone.toVector3(), 135).toVector2());
                    }
                    else {
                        move.add(Calculation.getRotatedVectorByAngle2D(move.clone.toVector3(), -135).toVector2());
                    }
                    returnVector.add(move);
                    nAvoid++;
                }
            });
            if (nAvoid > 0) {
                returnVector.scale(1 / nAvoid);
            }
            return returnVector;
        }
        getMoveVector() {
            let cohesion = Game.ƒ.Vector2.ZERO();
            let avoid = Game.ƒ.Vector2.ZERO();
            let allign = Game.ƒ.Vector2.ZERO();
            let obsticalAvoid = Game.ƒ.Vector2.ZERO();
            let target = this.myEnemy.moveSimple(this.myEnemy.target);
            if (target.magnitudeSquared > this.toTargetWeight * this.toTargetWeight) {
                target.normalize;
                target.scale(this.toTargetWeight);
            }
            let notToTarget = this.myEnemy.moveAway(this.myEnemy.target);
            if (notToTarget.magnitudeSquared > this.notToTargetWeight * this.notToTargetWeight) {
                notToTarget.normalize;
                notToTarget.scale(this.notToTargetWeight);
            }
            cohesion = this.calculateCohesionMove();
            if (cohesion.magnitudeSquared > this.cohesionWeight * this.cohesionWeight) {
                cohesion.normalize;
                cohesion.scale(this.cohesionWeight);
            }
            avoid = this.calculateAvoidanceMove();
            if (avoid.magnitudeSquared > this.avoidWeight * this.avoidWeight) {
                avoid.normalize;
                avoid.scale(this.avoidWeight);
            }
            allign = this.calculateAllignmentMove();
            if (allign.magnitudeSquared > this.allignWeight * this.allignWeight) {
                allign.normalize;
                allign.scale(this.allignWeight);
            }
            obsticalAvoid = this.calculateObsticalAvoidanceMove();
            if (obsticalAvoid.magnitudeSquared > this.obsticalAvoidWeight * this.obsticalAvoidWeight) {
                obsticalAvoid.normalize;
                obsticalAvoid.scale(this.obsticalAvoidWeight);
            }
            let move = Game.ƒ.Vector2.SUM(notToTarget, target, cohesion, avoid, allign, obsticalAvoid);
            return move;
        }
    }
    Enemy.FlockingBehaviour = FlockingBehaviour;
})(Enemy || (Enemy = {}));
var Entity;
(function (Entity) {
    class Merchant extends Entity.Entity {
        constructor(_id, _netId) {
            super(_id, _netId);
        }
    }
    Entity.Merchant = Merchant;
})(Entity || (Entity = {}));
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
    function clampNumber(_number, _min, _max) {
        return Math.max(_min, Math.min(_number, _max));
    }
    Calculation.clampNumber = clampNumber;
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
            // Game.avatar1.mtxLocal.rotation = new ƒ.Vector3(0, 0, Calculation.calcDegree(Game.avatar1.mtxLocal.translation, mousePosition));
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
        if (_e.code.toUpperCase() == "ESCAPE") {
            if (Game.gamestate == Game.GAMESTATES.PLAYING) {
                Game.pause(true, true);
            }
            else {
                Game.playing(true, true);
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
        if (controller.get("W")) {
            moveVector.y += 1;
        }
        if (controller.get("A")) {
            moveVector.x -= 1;
        }
        if (controller.get("S")) {
            moveVector.y -= 1;
        }
        if (controller.get("D")) {
            moveVector.x += 1;
        }
        // Game.avatar1.move(moveVector);
        return moveVector;
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
var UI;
(function (UI) {
    class Minimap extends Game.ƒ.Node {
        tag = Tag.TAG.UI;
        minmapInfo;
        roomMinimapsize = 0.8;
        miniRooms = [];
        offsetX = 11;
        offsetY = 6;
        currentRoom;
        pointer;
        constructor(_minimapInfo) {
            super("Minimap");
            this.minmapInfo = _minimapInfo;
            this.pointer = new Game.ƒ.Node("pointer");
            this.pointer.addComponent(new ƒ.ComponentMesh(new Game.ƒ.MeshQuad));
            this.pointer.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("challengeRoomMat", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")))));
            this.pointer.addComponent(new ƒ.ComponentTransform());
            this.pointer.mtxLocal.scale(Game.ƒ.Vector3.ONE(this.roomMinimapsize / 2));
            this.pointer.mtxLocal.translateZ(10);
            this.addChild(this.pointer);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.scale(new Game.ƒ.Vector3(this.roomMinimapsize, this.roomMinimapsize, this.roomMinimapsize));
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
            this.createMiniRooms();
            this.setCurrentRoom(Game.currentRoom);
            if (Networking.client.id == Networking.client.idHost) {
                Networking.spawnMinimap(this.minmapInfo);
            }
        }
        createMiniRooms() {
            this.minmapInfo.forEach(element => {
                this.miniRooms.push(new MiniRoom(element.coords, element.roomType));
            });
            this.miniRooms.forEach(room => {
                this.addChild(room);
            });
        }
        eventUpdate = (_event) => {
            this.update();
        };
        setCurrentRoom(_room) {
            this.miniRooms.find(room => room.coordinates.equals(_room.coordinates)).isDiscovered();
            if (this.currentRoom != undefined) {
                let subX = this.currentRoom.coordinates.x - _room.coordinates.x;
                let subY = this.currentRoom.coordinates.y - _room.coordinates.y;
                this.offsetX += subX * this.roomMinimapsize;
                this.offsetY += subY * this.roomMinimapsize;
            }
            this.currentRoom = _room;
        }
        update() {
            if (this.currentRoom != undefined) {
                if (this.currentRoom != Game.currentRoom) {
                    this.setCurrentRoom(Game.currentRoom);
                }
                this.pointer.mtxLocal.translation = this.miniRooms.find(room => room.coordinates.equals(Game.currentRoom.coordinates)).mtxLocal.translation;
            }
        }
    }
    UI.Minimap = Minimap;
    UI.normalRoom = new ƒ.TextureImage();
    ;
    UI.challengeRoom = new ƒ.TextureImage();
    ;
    UI.merchantRoom = new ƒ.TextureImage();
    ;
    UI.treasureRoom = new ƒ.TextureImage();
    ;
    UI.bossRoom = new ƒ.TextureImage();
    ;
    class MiniRoom extends Game.ƒ.Node {
        discovered;
        coordinates;
        roomType;
        opacity = 0.75;
        roomMat;
        mesh = new ƒ.MeshQuad;
        constructor(_coordinates, _roomType) {
            super("MinimapRoom");
            this.coordinates = _coordinates;
            this.roomType = _roomType;
            this.discovered = false;
            this.addComponent(new Game.ƒ.ComponentMesh(this.mesh));
            let cmpMaterial;
            switch (this.roomType) {
                case Generation.ROOMTYPE.START:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.normalRoom));
                    break;
                case Generation.ROOMTYPE.NORMAL:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.normalRoom));
                    break;
                case Generation.ROOMTYPE.MERCHANT:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.merchantRoom));
                    break;
                case Generation.ROOMTYPE.TREASURE:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.treasureRoom));
                    break;
                case Generation.ROOMTYPE.CHALLENGE:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.challengeRoom));
                    break;
                case Generation.ROOMTYPE.BOSS:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.bossRoom));
                    break;
            }
            cmpMaterial = new ƒ.ComponentMaterial(this.roomMat);
            this.addComponent(cmpMaterial);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(this.coordinates.x, this.coordinates.y, 1);
            // this.activate(false);
        }
        isDiscovered() {
            this.discovered = true;
            this.activate(true);
        }
    }
})(UI || (UI = {}));
///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>
var Networking;
///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>
(function (Networking) {
    let FUNCTION;
    (function (FUNCTION) {
        FUNCTION[FUNCTION["CONNECTED"] = 0] = "CONNECTED";
        FUNCTION[FUNCTION["SETGAMESTATE"] = 1] = "SETGAMESTATE";
        FUNCTION[FUNCTION["LOADED"] = 2] = "LOADED";
        FUNCTION[FUNCTION["SETREADY"] = 3] = "SETREADY";
        FUNCTION[FUNCTION["SPAWN"] = 4] = "SPAWN";
        FUNCTION[FUNCTION["TRANSFORM"] = 5] = "TRANSFORM";
        FUNCTION[FUNCTION["CLIENTMOVEMENT"] = 6] = "CLIENTMOVEMENT";
        FUNCTION[FUNCTION["SERVERBUFFER"] = 7] = "SERVERBUFFER";
        FUNCTION[FUNCTION["UPDATEINVENTORY"] = 8] = "UPDATEINVENTORY";
        FUNCTION[FUNCTION["KNOCKBACKREQUEST"] = 9] = "KNOCKBACKREQUEST";
        FUNCTION[FUNCTION["KNOCKBACKPUSH"] = 10] = "KNOCKBACKPUSH";
        FUNCTION[FUNCTION["SPAWNBULLET"] = 11] = "SPAWNBULLET";
        FUNCTION[FUNCTION["BULLETPREDICT"] = 12] = "BULLETPREDICT";
        FUNCTION[FUNCTION["BULLETTRANSFORM"] = 13] = "BULLETTRANSFORM";
        FUNCTION[FUNCTION["BULLETDIE"] = 14] = "BULLETDIE";
        FUNCTION[FUNCTION["SPAWNENEMY"] = 15] = "SPAWNENEMY";
        FUNCTION[FUNCTION["ENEMYTRANSFORM"] = 16] = "ENEMYTRANSFORM";
        FUNCTION[FUNCTION["ENTITYANIMATIONSTATE"] = 17] = "ENTITYANIMATIONSTATE";
        FUNCTION[FUNCTION["ENEMYDIE"] = 18] = "ENEMYDIE";
        FUNCTION[FUNCTION["SPAWNINTERNALITEM"] = 19] = "SPAWNINTERNALITEM";
        FUNCTION[FUNCTION["UPDATEATTRIBUTES"] = 20] = "UPDATEATTRIBUTES";
        FUNCTION[FUNCTION["UPDATEWEAPON"] = 21] = "UPDATEWEAPON";
        FUNCTION[FUNCTION["ITEMDIE"] = 22] = "ITEMDIE";
        FUNCTION[FUNCTION["SENDROOM"] = 23] = "SENDROOM";
        FUNCTION[FUNCTION["SWITCHROOMREQUEST"] = 24] = "SWITCHROOMREQUEST";
        FUNCTION[FUNCTION["UPDATEBUFF"] = 25] = "UPDATEBUFF";
        FUNCTION[FUNCTION["UPDATEUI"] = 26] = "UPDATEUI";
        FUNCTION[FUNCTION["SPWANMINIMAP"] = 27] = "SPWANMINIMAP";
    })(FUNCTION = Networking.FUNCTION || (Networking.FUNCTION = {}));
    var ƒClient = FudgeNet.FudgeClient;
    Networking.createdRoom = false;
    Networking.clients = [];
    Networking.someoneIsHost = false;
    Networking.currentIDs = [];
    document.getElementById("HostSpawn").addEventListener("click", () => { spawnPlayer(); }, true);
    let IPConnection = document.getElementById("IPConnection");
    document.getElementById("Connecting").addEventListener("click", connecting, true);
    function connecting() {
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
    Networking.connecting = connecting;
    async function receiveMessage(_event) {
        if (_event instanceof MessageEvent) {
            let message = JSON.parse(_event.data);
            if (message.content != undefined && message.content.text == FUNCTION.LOADED.toString()) {
                Game.loaded = true;
            }
            if (message.idSource != Networking.client.id) {
                if (message.command == FudgeNet.COMMAND.ROOM_CREATE) {
                    console.log(message.content.room);
                    let html = document.getElementById("RoomId");
                    html.parentElement.style.visibility = "visible";
                    html.textContent = message.content.room;
                    Networking.createdRoom = true;
                    joinRoom(message.content.room);
                }
                if (message.command == FudgeNet.COMMAND.ROOM_ENTER) {
                    if (Networking.createdRoom) {
                        Networking.client.becomeHost();
                    }
                }
                if (message.command != FudgeNet.COMMAND.SERVER_HEARTBEAT && message.command != FudgeNet.COMMAND.CLIENT_HEARTBEAT) {
                    //Add new client to array clients
                    if (message.content != undefined && message.content.text == FUNCTION.CONNECTED.toString()) {
                        if (message.content.value != Networking.client.id && Networking.clients.find(element => element == message.content.value) == undefined) {
                            if (Networking.clients.find(elem => elem.id == message.content.value) == null) {
                                Networking.clients.push({ id: message.content.value, ready: false });
                            }
                        }
                    }
                    if (message.content != undefined && message.content.text == FUNCTION.SETGAMESTATE.toString()) {
                        if (message.content.playing) {
                            Game.playing(false, true);
                        }
                        else if (!message.content.playing) {
                            Game.pause(false, true);
                        }
                    }
                    //SPAWN MINIMAP BY CLIENT
                    if (message.content != undefined && message.content.text == FUNCTION.SPWANMINIMAP.toString()) {
                        let oldMiniMapInfo = message.content.miniMapInfos;
                        let newMiniMapInfo = [];
                        for (let i = 0; i < oldMiniMapInfo.length; i++) {
                            let newCoords = new Game.ƒ.Vector2(oldMiniMapInfo[i].coords.data[0], oldMiniMapInfo[i].coords.data[1]);
                            newMiniMapInfo.push({ coords: newCoords, roomType: oldMiniMapInfo[i].roomType });
                        }
                        Game.miniMap = new UI.Minimap(newMiniMapInfo);
                        Game.graph.addChild(Game.miniMap);
                    }
                    //FROM CLIENT INPUT VECTORS FROM AVATAR
                    if (message.content != undefined && message.content.text == FUNCTION.CLIENTMOVEMENT.toString()) {
                        let inputVector = new Game.ƒ.Vector3(message.content.input.inputVector.data[0], message.content.input.inputVector.data[1], message.content.input.inputVector.data[2]);
                        let input = { tick: message.content.input.tick, inputVector: inputVector, doesAbility: message.content.input.doesAbility };
                        Game.serverPredictionAvatar.updateEntityToCheck(message.content.netId);
                        Game.serverPredictionAvatar.onClientInput(input);
                    }
                    // TO CLIENT CALCULATED POSITION FOR AVATAR
                    if (message.content != undefined && message.content.text == FUNCTION.SERVERBUFFER.toString()) {
                        let netObj = Game.currentNetObj.find(entity => entity.netId == message.content.netId);
                        let position = new Game.ƒ.Vector3(message.content.buffer.position.data[0], message.content.buffer.position.data[1], message.content.buffer.position.data[2]);
                        let state = { tick: message.content.buffer.tick, position: position };
                        if (netObj != undefined) {
                            let obj = netObj.netObjectNode;
                            if (obj instanceof Player.Player) {
                                obj.client.onServerMovementState(state);
                            }
                            else {
                                obj.clientPrediction.onServerMovementState(state);
                            }
                        }
                    }
                    //FROM CLIENT BULLET VECTORS
                    if (message.content != undefined && message.content.text == FUNCTION.BULLETPREDICT.toString()) {
                        let inputVector = new Game.ƒ.Vector3(message.content.input.inputVector.data[0], message.content.input.inputVector.data[1], message.content.input.inputVector.data[2]);
                        let input = { tick: message.content.input.tick, inputVector: inputVector };
                        let netObj = Game.currentNetObj.find(elem => elem.netId == message.content.netId);
                        let bullet;
                        if (netObj != undefined) {
                            bullet = netObj.netObjectNode;
                            console.log(bullet + "" + message.content.netId);
                            bullet.serverPrediction.updateEntityToCheck(message.content.netId);
                            bullet.serverPrediction.onClientInput(input);
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
                        let netId = message.content.netId;
                        let attributes = new Entity.Attributes(message.content.attributes.healthPoints, message.content.attributes.attackPoints, message.content.attributes.speed, message.content.attributes.scale, message.content.attributes.knockbackForce, message.content.attributes.armor, message.content.attributes.coolDownReduction, message.content.attributes.accuracy);
                        if (message.content.type == Entity.ID.MELEE) {
                            Game.avatar2 = new Player.Melee(Entity.ID.MELEE, attributes, netId);
                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], 0);
                            Game.graph.addChild(Game.avatar2);
                        }
                        else if (message.content.type == Entity.ID.RANGED) {
                            Game.avatar2 = new Player.Ranged(Entity.ID.RANGED, attributes, netId);
                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], 0);
                            Game.graph.addChild(Game.avatar2);
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
                                if (Networking.client.id == Networking.client.idHost) {
                                    // Game.avatar2.avatarPrediction();
                                }
                            }
                        }
                        //Update inventory
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEINVENTORY.toString()) {
                            let newItem;
                            if (Items.getBuffItemById(message.content.itemId) != null) {
                                newItem = new Items.BuffItem(message.content.itemId, message.content.itemNetId);
                            }
                            else if (Items.getInternalItemById(message.content.itemId) != null) {
                                newItem = new Items.InternalItem(message.content.itemId, message.content.itemNetId);
                            }
                            let entity = Game.entities.find(elem => elem.netId == message.content.netId);
                            if (message.content.add) {
                                entity.items.push(newItem);
                            }
                            else {
                                entity.items.splice(entity.items.indexOf(entity.items.find(item => item.id == newItem.id)), 1);
                            }
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
                            let bullet;
                            let entity = Game.entities.find(elem => elem.netId == message.content.ownerNetId);
                            if (entity != null) {
                                let weapon = entity.weapon;
                                let direciton = new Game.ƒ.Vector3(message.content.direction.data[0], message.content.direction.data[1], message.content.direction.data[2]);
                                switch (message.content.aimType) {
                                    case Weapons.AIM.NORMAL:
                                        bullet = new Bullets.Bullet(weapon.bulletType, entity.mtxLocal.translation.toVector2(), direciton, entity.netId, message.content.bulletNetId);
                                        break;
                                    case Weapons.AIM.HOMING:
                                        let bulletTarget = new Game.ƒ.Vector3(message.content.bulletTarget.data[0], message.content.bulletTarget.data[1], message.content.bulletTarget.data[2]);
                                        bullet = new Bullets.HomingBullet(weapon.bulletType, entity.mtxLocal.translation.toVector2(), direciton, entity.netId, bulletTarget, message.content.bulletNetId);
                                        break;
                                    default:
                                        break;
                                }
                                Game.graph.addChild(bullet);
                            }
                        }
                        //Sync bullet transform from host to client
                        if (message.content != undefined && message.content.text == FUNCTION.BULLETTRANSFORM.toString()) {
                            if (Game.bullets.find(element => element.netId == message.content.netId) != null) {
                                let newPosition = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                let newRotation = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);
                                Game.bullets.find(element => element.netId == message.content.netId).mtxLocal.translation = newPosition;
                                Game.bullets.find(element => element.netId == message.content.netId).mtxLocal.rotation = newRotation;
                            }
                        }
                        //Kill bullet at the client from host
                        if (message.content != undefined && message.content.text == FUNCTION.BULLETDIE.toString()) {
                            if (Networking.client.id != Networking.client.idHost) {
                                let bullet = Game.bullets.find(element => element.netId == message.content.netId);
                                if (bullet != undefined) {
                                    bullet.lifetime = 0;
                                    bullet.despawn();
                                }
                            }
                        }
                        //Spawn enemy at the client 
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNENEMY.toString()) {
                            //TODO: change attributes
                            EnemySpawner.networkSpawnById(message.content.enemyClass, message.content.id, new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]), message.content.netId, message.content.target);
                        }
                        //Sync enemy transform from host to client
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYTRANSFORM.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.netId);
                            if (enemy != undefined) {
                                enemy.cmpTransform.mtxLocal.translation = new ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                enemy.setCollider();
                            }
                        }
                        //Sync animation state
                        if (message.content != undefined && message.content.text == FUNCTION.ENTITYANIMATIONSTATE.toString()) {
                            let entity = Game.entities.find(enem => enem.netId == message.content.netId);
                            if (entity != undefined) {
                                entity.switchAnimation(message.content.state);
                            }
                        }
                        //Kill enemy at the client from host
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYDIE.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.netId);
                            Game.graph.removeChild(enemy);
                            popID(message.content.netId);
                        }
                        //update Entity buff List
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEBUFF.toString()) {
                            let buffList = message.content.buffList;
                            let entity = Game.entities.find(ent => ent.netId == message.content.netId);
                            // let newBuffs: Buff.Buff[] = [];
                            entity.buffs.forEach(oldBuff => {
                                let buffToCheck = buffList.find(buff => buff.id == oldBuff.id);
                                if (buffToCheck == undefined) {
                                    oldBuff.removeBuff(entity);
                                }
                            });
                            buffList.forEach(buff => {
                                switch (buff.id) {
                                    case Buff.BUFFID.POISON | Buff.BUFFID.BLEEDING:
                                        new Buff.DamageBuff(buff.id, buff.duration, buff.tickRate, buff.value).addToEntity(entity);
                                        break;
                                    case Buff.BUFFID.IMMUNE:
                                        new Buff.AttributesBuff(buff.id, buff.duration, buff.tickRate, buff.value).addToEntity(entity);
                                        break;
                                }
                            });
                            // entity.buffs.forEach(buff => {
                            //     let flag: boolean = false;
                            //     buffList.forEach(newBuff => {
                            //         if (buff.id == newBuff.id) {
                            //             flag = true;
                            //         }
                            //     })
                            //     if (!flag) {
                            //         entity.removeChild(entity.getChildren().find(child => (<UI.Particles>child).id == buff.id));
                            //     }
                            // });
                            // entity.buffs = newBuffs;
                        }
                        //update UI
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEUI.toString()) {
                            let position = new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]);
                            Game.graph.addChild(new UI.DamageUI(position.toVector3(), message.content.value));
                        }
                        //Spawn item from host
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNINTERNALITEM.toString()) {
                            if (Networking.client.id != Networking.client.idHost) {
                                if (Items.getBuffItemById(message.content.id) != null) {
                                    let newItem = new Items.BuffItem(message.content.id, message.content.netId);
                                    newItem.setPosition(new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]));
                                    Game.graph.addChild(newItem);
                                }
                                else if (Items.getInternalItemById(message.content.id) != null) {
                                    let newItem = new Items.InternalItem(message.content.id, message.content.netId);
                                    newItem.setPosition(new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]));
                                    Game.graph.addChild(newItem);
                                }
                            }
                        }
                        //apply item attributes
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEATTRIBUTES.toString()) {
                            let entity = Game.entities.find(elem => elem.netId == message.content.netId);
                            switch (message.content.payload.type) {
                                case Entity.ATTRIBUTETYPE.HEALTHPOINTS:
                                    entity.attributes.healthPoints = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.MAXHEALTHPOINTS:
                                    entity.attributes.maxHealthPoints = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.KNOCKBACKFORCE:
                                    entity.attributes.knockbackForce = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.HITABLE:
                                    entity.attributes.hitable = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.ARMOR:
                                    entity.attributes.armor = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.SPEED:
                                    entity.attributes.speed = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.ATTACKPOINTS:
                                    entity.attributes.attackPoints = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.COOLDOWNREDUCTION:
                                    entity.attributes.coolDownReduction = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.SCALE:
                                    entity.attributes.scale = message.content.payload.value;
                                    entity.updateScale();
                                    break;
                            }
                        }
                        //apply weapon
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEWEAPON.toString()) {
                            let refWeapon = message.content.weapon;
                            console.log(message.content.weapon.cooldown.coolDown);
                            const tempWeapon = new Weapons.Weapon(message.content.weapon.cooldown.coolDown, message.content.weapon.attackCount, refWeapon.bulletType, refWeapon.projectileAmount, refWeapon.ownerNetId, refWeapon.aimType);
                            Game.entities.find(elem => elem.netId == message.content.netId).weapon = tempWeapon;
                        }
                        //Kill item from host
                        if (message.content != undefined && message.content.text == FUNCTION.ITEMDIE.toString()) {
                            let item = Game.graph.getChildren().find(enem => enem.netId == message.content.netId);
                            Game.graph.removeChild(item);
                            popID(message.content.netId);
                        }
                        //send room 
                        if (message.content != undefined && message.content.text == FUNCTION.SENDROOM.toString()) {
                            let coordiantes = new Game.ƒ.Vector2(message.content.room.coordinates.data[0], message.content.room.coordinates.data[1]);
                            let tanslation = new Game.ƒ.Vector3(message.content.room.translation.data[0], message.content.room.translation.data[1], message.content.room.translation.data[2]);
                            let roomInfo = { coordinates: coordiantes, roomSize: message.content.room.roomSize, exits: message.content.room.exits, roomType: message.content.room.roomType, translation: tanslation };
                            let newRoom;
                            switch (roomInfo.roomType) {
                                case Generation.ROOMTYPE.START:
                                    newRoom = new Generation.StartRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                                case Generation.ROOMTYPE.NORMAL:
                                    newRoom = new Generation.NormalRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                                case Generation.ROOMTYPE.BOSS:
                                    newRoom = new Generation.BossRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                                case Generation.ROOMTYPE.TREASURE:
                                    newRoom = new Generation.TreasureRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                                case Generation.ROOMTYPE.MERCHANT:
                                    newRoom = new Generation.MerchantRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                            }
                            newRoom.exits = roomInfo.exits;
                            newRoom.mtxLocal.translation = roomInfo.translation;
                            newRoom.setSpawnPoints();
                            newRoom.openDoors();
                            Generation.addRoomToGraph(newRoom);
                        }
                        //send request to switch rooms
                        if (message.content != undefined && message.content.text == FUNCTION.SWITCHROOMREQUEST.toString()) {
                            Generation.switchRoom(message.content.direction);
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
    function setGamestate(_playing) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.SETGAMESTATE, playing: _playing } });
    }
    Networking.setGamestate = setGamestate;
    function createRoom() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, command: FudgeNet.COMMAND.ROOM_CREATE });
    }
    Networking.createRoom = createRoom;
    function joinRoom(_roomId) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, command: FudgeNet.COMMAND.ROOM_ENTER, content: { room: _roomId } });
    }
    Networking.joinRoom = joinRoom;
    //#region player
    function loaded() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.LOADED } });
    }
    Networking.loaded = loaded;
    function spawnPlayer() {
        if (Game.avatar1.id == Entity.ID.MELEE) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Entity.ID.MELEE, attributes: Game.avatar1.attributes, position: Game.avatar1.cmpTransform.mtxLocal.translation, netId: Game.avatar1.netId } });
        }
        else {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Entity.ID.RANGED, attributes: Game.avatar1.attributes, position: Game.avatar1.cmpTransform.mtxLocal.translation, netId: Game.avatar1.netId } });
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
    function sendClientInput(_netId, _inputPayload) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.CLIENTMOVEMENT, netId: _netId, input: _inputPayload } });
    }
    Networking.sendClientInput = sendClientInput;
    function sendServerBuffer(_netId, _buffer) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.SERVERBUFFER, netId: _netId, buffer: _buffer } });
        }
    }
    Networking.sendServerBuffer = sendServerBuffer;
    function knockbackRequest(_netId, _knockbackForce, _position) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.client.idHost, content: { text: FUNCTION.KNOCKBACKREQUEST, netId: _netId, knockbackForce: _knockbackForce, position: _position } });
    }
    Networking.knockbackRequest = knockbackRequest;
    function knockbackPush(_knockbackForce, _position) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.KNOCKBACKPUSH, knockbackForce: _knockbackForce, position: _position } });
    }
    Networking.knockbackPush = knockbackPush;
    function updateInventory(_add, _itemId, _itemNetId, _netId) {
        if (Networking.client.id == Networking.client.idHost) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.UPDATEINVENTORY, add: _add, itemId: _itemId, itemNetId: _itemNetId, netId: _netId } });
        }
    }
    Networking.updateInventory = updateInventory;
    function spawnMinimap(_miniMapInfos) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPWANMINIMAP, miniMapInfos: _miniMapInfos } });
    }
    Networking.spawnMinimap = spawnMinimap;
    //#endregion
    //#region bullet
    function spawnBullet(_aimType, _direction, _bulletNetId, _ownerNetId, _bulletTarget) {
        if (Game.connected) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.SPAWNBULLET, aimType: _aimType, direction: _direction, ownerNetId: _ownerNetId, bulletNetId: _bulletNetId, bulletTarget: _bulletTarget } });
        }
    }
    Networking.spawnBullet = spawnBullet;
    function sendBulletInput(_netId, _inputPayload) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.BULLETPREDICT, netId: _netId, input: _inputPayload } });
    }
    Networking.sendBulletInput = sendBulletInput;
    function updateBullet(_position, _rotation, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.BULLETTRANSFORM, position: _position, rotation: _rotation, netId: _netId } });
        }
    }
    Networking.updateBullet = updateBullet;
    function removeBullet(_netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.BULLETDIE, netId: _netId } });
        }
    }
    Networking.removeBullet = removeBullet;
    //#endregion
    //#region enemy
    function spawnEnemy(_enemyClass, _enemy, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNENEMY, enemyClass: _enemyClass, id: _enemy.id, attributes: _enemy.attributes, position: _enemy.mtxLocal.translation, netId: _netId, target: _enemy.target } });
        }
    }
    Networking.spawnEnemy = spawnEnemy;
    function updateEnemyPosition(_position, _netId) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENEMYTRANSFORM, position: _position, netId: _netId } });
    }
    Networking.updateEnemyPosition = updateEnemyPosition;
    function updateEntityAnimationState(_state, _netId) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENTITYANIMATIONSTATE, state: _state, netId: _netId } });
        }
        // else {
        //     client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id == client.idHost).id, content: { text: FUNCTION.ENTITYANIMATIONSTATE, state: _state, netId: _netId } })
        // }
    }
    Networking.updateEntityAnimationState = updateEntityAnimationState;
    function removeEnemy(_netId) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENEMYDIE, netId: _netId } });
    }
    Networking.removeEnemy = removeEnemy;
    //#endregion
    //#region items
    function spawnItem(_id, _position, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNINTERNALITEM, id: _id, position: _position, netId: _netId } });
        }
    }
    Networking.spawnItem = spawnItem;
    function updateEntityAttributes(_attributePayload, _netId) {
        if (Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.UPDATEATTRIBUTES, payload: _attributePayload, netId: _netId } });
        }
        else {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEATTRIBUTES, payload: _attributePayload, netId: _netId } });
        }
    }
    Networking.updateEntityAttributes = updateEntityAttributes;
    function updateAvatarWeapon(_weapon, _targetNetId) {
        if (Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.UPDATEWEAPON, weapon: _weapon, netId: _targetNetId } });
        }
        else {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEWEAPON, weapon: _weapon, netId: _targetNetId } });
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
    function updateBuffList(_buffList, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEBUFF, buffList: _buffList, netId: _netId } });
        }
    }
    Networking.updateBuffList = updateBuffList;
    //#endregion
    //#region UI
    function updateUI(_position, _value) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEUI, position: _position, value: _value } });
        }
    }
    Networking.updateUI = updateUI;
    //#endregion
    //#region room
    function sendRoom(_room) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SENDROOM, room: _room } });
        }
    }
    Networking.sendRoom = sendRoom;
    function switchRoomRequest(_direction) {
        if (Game.connected && Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.client.idHost, content: { text: FUNCTION.SWITCHROOMREQUEST, direction: _direction } });
        }
    }
    Networking.switchRoomRequest = switchRoomRequest;
    //#endregion
    function idGenerator() {
        let id = Math.floor(Math.random() * 1000);
        if (Networking.currentIDs.find(element => element == id)) {
            idGenerator();
        }
        else {
            Networking.currentIDs.push(id);
        }
        return id;
    }
    Networking.idGenerator = idGenerator;
    function popID(_id) {
        Networking.currentIDs = Networking.currentIDs.filter(elem => elem != _id);
    }
    Networking.popID = popID;
    function isNetworkObject(_object) {
        return "netId" in _object;
    }
    Networking.isNetworkObject = isNetworkObject;
    function getNetId(_object) {
        if (isNetworkObject(_object)) {
            return _object.netId;
        }
        return null;
    }
    Networking.getNetId = getNetId;
    window.addEventListener("beforeunload", onUnload, false);
    function onUnload() {
        //TODO: Things we do after the player left the game
    }
})(Networking || (Networking = {}));
var Player;
(function (Player_1) {
    class Player extends Entity.Entity {
        weapon = new Weapons.Weapon(25, 1, Bullets.BULLETTYPE.STANDARD, 1, this.netId, Weapons.AIM.NORMAL);
        client;
        abilityCount = 1;
        currentabilityCount = this.abilityCount;
        constructor(_id, _attributes, _netId) {
            super(_id, _netId);
            this.attributes = _attributes;
            this.tag = Tag.TAG.PLAYER;
            this.client = new Networking.ClientPrediction(this.netId);
        }
        move(_direction) {
            if (_direction.magnitude > 0) {
                _direction.normalize();
                this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            }
            else if (_direction.magnitude == 0) {
                this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            }
            this.setCollider();
            this.scaleMoveVector(_direction);
            this.moveDirection.add(_direction);
            this.collide(this.moveDirection);
            this.moveDirection.subtract(_direction);
            let walls = Game.currentRoom.getChildren();
            walls.forEach((wall) => {
                if (wall.door != undefined && wall.door.isActive) {
                    if (this.collider.collidesRect(wall.door.collider)) {
                        wall.door.changeRoom();
                    }
                }
            });
        }
        scaleMoveVector(_direction) {
            if (Networking.client.id == Networking.client.idHost && this == Game.avatar1) {
                _direction.scale((Game.deltaTime * this.attributes.speed));
            }
            else {
                _direction.scale((this.client.minTimeBetweenTicks * this.attributes.speed));
            }
        }
        predict() {
            if (Networking.client.idHost != Networking.client.id) {
                this.client.update();
            }
            else {
                this.move(InputSystem.move());
            }
        }
        collide(_direction) {
            super.collide(_direction);
            if (Networking.client.id == Networking.client.idHost) {
                this.getItemCollision();
            }
            let enemies = Game.enemies;
            let enemiesCollider = [];
            enemies.forEach(element => {
                enemiesCollider.push(element.collider);
            });
            //TODO: uncomment
            // this.calculateCollider(enemiesCollider, _direction);
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
        getItemCollision() {
            let itemCollider = Game.items;
            itemCollider.forEach(item => {
                if (this.collider.collides(item.collider)) {
                    if (item instanceof Items.InternalItem && item.choosenOneNetId != undefined) {
                        if (item.choosenOneNetId != this.netId) {
                            return;
                        }
                    }
                    if (Game.currentRoom.roomType == Generation.ROOMTYPE.TREASURE) {
                        Game.currentRoom.onItemCollect(item);
                    }
                    if (Game.currentRoom.roomType == Generation.ROOMTYPE.MERCHANT) {
                        if (!Game.currentRoom.onItemCollect(item, this)) {
                            return;
                        }
                    }
                    Networking.updateInventory(true, item.id, item.netId, this.netId);
                    item.doYourThing(this);
                    this.items.push(item);
                    //TODO: add that deletet out of room if collected
                    if (item instanceof Items.InternalItem) {
                        console.log(item.name + ": " + item.description + " smth changed to: " + item.value);
                    }
                    if (item instanceof Items.BuffItem) {
                        console.log(item.name + ": " + item.description + " smth changed to: " + Buff.BUFFID[item.buff[0].id].toString());
                    }
                }
            });
        }
        attack(_direction, _netId, _sync) {
            this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, _sync);
        }
        doKnockback(_body) {
            // (<Enemy.Enemy>_body).getKnockback(this.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }
        getKnockback(_knockbackForce, _position) {
            super.getKnockback(_knockbackForce, _position);
        }
        doAbility() {
        }
    }
    Player_1.Player = Player;
    class Melee extends Player {
        block = new Ability.Block(this.netId, 600, 1, 5 * 60);
        abilityCooldownTime = 40;
        currentabilityCooldownTime = this.abilityCooldownTime;
        weapon = new Weapons.Weapon(12, 1, Bullets.BULLETTYPE.MELEE, 1, this.netId, Weapons.AIM.NORMAL);
        attack(_direction, _netId, _sync) {
            this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, _sync);
        }
        //Block
        doAbility() {
        }
    }
    Player_1.Melee = Melee;
    class Ranged extends Player {
        dash = new Ability.Dash(this.netId, 8, 1, 60, 5);
        performAbility = false;
        lastMoveDirection;
        move(_direction) {
            if (this.dash.doesAbility) {
                super.move(this.lastMoveDirection);
            }
            else {
                super.move(_direction);
                if (_direction.magnitude > 0) {
                    this.lastMoveDirection = _direction;
                }
            }
        }
        //Dash
        doAbility() {
            this.dash.doAbility();
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
    class EnemyCountManager {
        maxEnemyCount;
        get getMaxEnemyCount() { return this.maxEnemyCount; }
        ;
        currentEnemyCoount;
        finished;
        constructor(_enemyCount) {
            this.maxEnemyCount = _enemyCount;
            this.currentEnemyCoount = _enemyCount;
            this.finished = false;
            if (_enemyCount <= 0) {
                this.finished = true;
            }
        }
        onEnemyDeath() {
            this.currentEnemyCoount--;
            if (this.currentEnemyCoount <= 0) {
                this.finished = true;
            }
        }
    }
    Generation.EnemyCountManager = EnemyCountManager;
    Generation.txtStartRoom = new Game.ƒ.TextureImage();
    class Room extends ƒ.Node {
        tag;
        roomType;
        coordinates;
        walls = [];
        obsticals = [];
        enemyCountManager;
        positionUpdated = false;
        roomSize = 30;
        exits; // N E S W
        mesh = new ƒ.MeshQuad;
        cmpMesh = new ƒ.ComponentMesh(this.mesh);
        avatarSpawnPointN;
        get getSpawnPointN() { return this.avatarSpawnPointN; }
        ;
        avatarSpawnPointE;
        get getSpawnPointE() { return this.avatarSpawnPointE; }
        ;
        avatarSpawnPointS;
        get getSpawnPointS() { return this.avatarSpawnPointS; }
        ;
        avatarSpawnPointW;
        get getSpawnPointW() { return this.avatarSpawnPointW; }
        ;
        cmpMaterial = new ƒ.ComponentMaterial();
        constructor(_coordiantes, _roomSize, _roomType) {
            super("room");
            this.tag = Tag.TAG.ROOM;
            this.coordinates = _coordiantes;
            this.enemyCountManager = new EnemyCountManager(0);
            if (_roomSize != undefined) {
                this.roomSize = _roomSize;
            }
            if (_roomType != undefined) {
                this.roomType = _roomType;
            }
            this.exits = { north: false, east: false, south: false, west: false };
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.scaling = new ƒ.Vector3(this.roomSize, this.roomSize, 1);
            this.addComponent(this.cmpMesh);
            this.addComponent(this.cmpMaterial);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(0, 0, -0.01);
            this.addWalls();
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        onAddToGraph() {
        }
        update() {
        }
        addWalls() {
            this.addChild((new Wall(new ƒ.Vector2(0.5, 0), new ƒ.Vector2(1 / this.roomSize, 1 + 1 / this.roomSize), this)));
            this.addChild((new Wall(new ƒ.Vector2(0, 0.5), new ƒ.Vector2(1, 1 / this.roomSize), this)));
            this.addChild((new Wall(new ƒ.Vector2(-0.5, 0), new ƒ.Vector2(1 / this.roomSize, 1 + 1 / this.roomSize), this)));
            this.addChild((new Wall(new ƒ.Vector2(0, -0.5), new ƒ.Vector2(1, 1 / this.roomSize), this)));
            this.getChildren().filter(elem => elem.tag == Tag.TAG.WALL).forEach(wall => {
                this.walls.push(wall);
            });
        }
        setSpawnPoints() {
            this.avatarSpawnPointE = new ƒ.Vector2(this.mtxLocal.translation.x + ((this.roomSize / 2) - 2), this.mtxLocal.translation.y);
            this.avatarSpawnPointW = new ƒ.Vector2(this.mtxLocal.translation.x - ((this.roomSize / 2) - 2), this.mtxLocal.translation.y);
            this.avatarSpawnPointN = new ƒ.Vector2(this.mtxLocal.translation.x, this.mtxLocal.translation.y + ((this.roomSize / 2) - 2));
            this.avatarSpawnPointS = new ƒ.Vector2(this.mtxLocal.translation.x, this.mtxLocal.translation.y - ((this.roomSize / 2) - 2));
        }
        getRoomSize() {
            return this.roomSize;
        }
        setRoomExit(_neighbour) {
            let dif = Game.ƒ.Vector2.DIFFERENCE(_neighbour.coordinates, this.coordinates);
            if (dif.equals(Generation.compareNorth)) {
                this.exits.north = true;
            }
            if (dif.equals(Generation.compareEast)) {
                this.exits.east = true;
            }
            if (dif.equals(Generation.compareSouth)) {
                this.exits.south = true;
            }
            if (dif.equals(Generation.compareWest)) {
                this.exits.west = true;
            }
        }
        openDoors() {
            if (this.exits.north) {
                this.walls.find(wall => wall.door.direction.north == true).door.openDoor();
            }
            if (this.exits.east) {
                this.walls.find(wall => wall.door.direction.east == true).door.openDoor();
            }
            if (this.exits.south) {
                this.walls.find(wall => wall.door.direction.south == true).door.openDoor();
            }
            if (this.exits.west) {
                this.walls.find(wall => wall.door.direction.west == true).door.openDoor();
            }
        }
    }
    Generation.Room = Room;
    class StartRoom extends Room {
        startRoomMat = new ƒ.Material("startRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtStartRoom));
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.START);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.startRoomMat;
        }
    }
    Generation.StartRoom = StartRoom;
    class NormalRoom extends Room {
        normalRoomMat = new ƒ.Material("normalRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.NORMAL);
            this.enemyCountManager = new EnemyCountManager(5);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.normalRoomMat;
        }
    }
    Generation.NormalRoom = NormalRoom;
    class BossRoom extends Room {
        bossRoomMat = new ƒ.Material("bossRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black")));
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.BOSS);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.bossRoomMat;
        }
    }
    Generation.BossRoom = BossRoom;
    class TreasureRoom extends Room {
        treasureRoomMat = new ƒ.Material("treasureRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("yellow")));
        spawnChance = 25;
        get getSpawnChance() { return this.spawnChance; }
        ;
        treasureCount = 2;
        treasures = [];
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.TREASURE);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.treasureRoomMat;
            if (Networking.client.id == Networking.client.idHost) {
                this.createTreasures();
            }
        }
        createTreasures() {
            let treasures = [];
            for (let i = 0; i < this.treasureCount; i++) {
                treasures.push(Items.ItemGenerator.getRandomItem());
            }
            this.treasures = treasures;
        }
        onAddToGraph() {
            let i = 0;
            this.treasures.forEach(item => {
                item.setPosition(new ƒ.Vector2(this.mtxLocal.translation.x + i, this.mtxLocal.translation.y));
                item.spawn();
                i++;
            });
        }
        onItemCollect(_item) {
            if (this.treasures.find(item => item == _item) != undefined) {
                this.treasures.splice(this.treasures.indexOf(_item), 1);
            }
        }
    }
    Generation.TreasureRoom = TreasureRoom;
    class MerchantRoom extends Room {
        merchantRoomMat = new ƒ.Material("merchantRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")));
        merchant = new Entity.Merchant(Entity.ID.MERCHANT);
        items = [];
        itemsSpawnPoints = [];
        itemCount = 5;
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.MERCHANT);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.merchantRoomMat;
            this.merchant.mtxLocal.translateZ(0.01);
            this.merchant.mtxLocal.translateY(5 / this.roomSize);
            this.merchant.mtxLocal.scale(Game.ƒ.Vector3.ONE(1 / this.roomSize));
            this.addChild(this.merchant);
            if (Networking.client.id == Networking.client.idHost) {
                this.createShop();
            }
        }
        createShop() {
            let items = [];
            for (let i = 0; i < this.itemCount; i++) {
                items.push(Items.ItemGenerator.getRandomItem());
            }
            this.items = items;
        }
        onAddToGraph() {
            this.createSpawnPoints();
            let i = 0;
            this.items.forEach(item => {
                if (item.getPosition != undefined) {
                    if (this.itemsSpawnPoints.find(pos => pos.equals(item.getPosition)) == undefined) {
                        item.setPosition(this.itemsSpawnPoints[i]);
                    }
                }
                else {
                    item.setPosition(this.itemsSpawnPoints[i]);
                }
                item.spawn();
                i++;
            });
        }
        createSpawnPoints() {
            this.itemsSpawnPoints = [];
            let middle = this.mtxWorld.clone.translation;
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x, middle.y + 3));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x + 3, middle.y + 3));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x - 3, middle.y + 3));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x + 2, middle.y + 1));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x - 2, middle.y + 1));
        }
        onItemCollect(_item, _avatar) {
            if (this.items.find(item => item == _item) != undefined) {
                return this.shoping(_item, _avatar);
            }
            return false;
        }
        shoping(_item, _avatar) {
            let sameRarity = _avatar.items.filter(item => item.rarity == _item.rarity);
            let lowerRarity = [];
            if (_item.rarity != Items.RARITY.COMMON) {
                lowerRarity = _avatar.items.filter(item => item.rarity == (_item.rarity - 1));
            }
            if (sameRarity.length > 0) {
                let index = Math.round(Math.random() * (sameRarity.length - 1));
                _avatar.items = _avatar.items.filter(item => item != sameRarity[index]);
                this.items.splice(this.items.indexOf(_item), 1);
            }
            else {
                if (lowerRarity.length >= 3) {
                    let index1 = Math.round(Math.random() * (lowerRarity.length - 1));
                    _avatar.items = _avatar.items.filter(item => item != lowerRarity[index1]);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index1]), 1);
                    lowerRarity.slice(index1, 1);
                    let index2 = Math.round(Math.random() * (lowerRarity.length - 1));
                    _avatar.items = _avatar.items.filter(item => item != lowerRarity[index2]);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index2]), 1);
                    lowerRarity.slice(index2, 1);
                    let index3 = Math.round(Math.random() * (lowerRarity.length - 1));
                    _avatar.items = _avatar.items.filter(item => item != lowerRarity[index3]);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index3]), 1);
                    lowerRarity.slice(index3, 1);
                    this.items.splice(this.items.indexOf(_item), 1);
                }
                else {
                    return false;
                }
            }
            return true;
        }
    }
    Generation.MerchantRoom = MerchantRoom;
    class ChallengeRoom extends Room {
        challengeRoomMat = new ƒ.Material("challengeRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")));
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.CHALLENGE);
        }
    }
    Generation.ChallengeRoom = ChallengeRoom;
    class Wall extends ƒ.Node {
        tag = Tag.TAG.WALL;
        collider;
        door;
        constructor(_pos, _scaling, _room) {
            super("Wall");
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("red", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("red")))));
            let newPos = _pos.toVector3(0.01);
            this.mtxLocal.translation = newPos;
            this.mtxLocal.scaling = _scaling.toVector3(1);
            if (_pos.x != 0) {
                if (_pos.x > 0) {
                    this.addDoor(_pos, _scaling);
                }
                else if (_pos.x < 0) {
                    this.addDoor(_pos, _scaling);
                }
            }
            else {
                if (_pos.y > 0) {
                    this.addDoor(_pos, _scaling);
                }
                else if (_pos.y < 0) {
                    this.addDoor(_pos, _scaling);
                }
            }
        }
        addDoor(_pos, _scaling) {
            this.door = new Door();
            this.addChild(this.door);
            if (Math.abs(_pos.x) > 0) {
                this.door.mtxLocal.scaling = new Game.ƒ.Vector3(1, _scaling.x / _scaling.y * 3, 1);
                if (_pos.x > 0) {
                    this.door.direction = { north: false, east: true, south: false, west: false };
                    this.door.mtxLocal.translateX(-0.5);
                }
                else {
                    this.door.direction = { north: false, east: false, south: false, west: true };
                    this.door.mtxLocal.translateX(0.5);
                }
            }
            else {
                this.door.mtxLocal.scaling = new Game.ƒ.Vector3(_scaling.y / _scaling.x * 3, 1, 1);
                if (_pos.y > 0) {
                    this.door.direction = { north: true, east: false, south: false, west: false };
                    this.door.mtxLocal.translateY(-0.5);
                }
                else {
                    this.door.direction = { north: false, east: false, south: true, west: false };
                    this.door.mtxLocal.translateY(0.5);
                }
            }
        }
        setCollider() {
            this.collider = new Game.ƒ.Rectangle(this.mtxWorld.translation.x, this.mtxWorld.translation.y, this.mtxWorld.scaling.x, this.mtxWorld.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
        }
    }
    Generation.Wall = Wall;
    class Door extends ƒ.Node {
        tag = Tag.TAG.DOOR;
        collider;
        direction;
        constructor() {
            super("Door");
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("green", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")))));
            this.mtxLocal.translateZ(0.1);
            this.closeDoor();
        }
        setCollider() {
            if (this.isActive) {
                this.collider = new Game.ƒ.Rectangle(this.mtxWorld.translation.x, this.mtxWorld.translation.y, this.mtxWorld.scaling.x, this.mtxWorld.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
        }
        changeRoom() {
            if (Networking.client.id == Networking.client.idHost) {
                Generation.switchRoom(this.direction);
            }
            else {
                Networking.switchRoomRequest(this.direction);
            }
        }
        openDoor() {
            this.activate(true);
        }
        closeDoor() {
            this.activate(false);
        }
    }
    Generation.Door = Door;
    class Obsitcal extends ƒ.Node {
        tag = Tag.TAG.OBSTICAL;
        collider;
        parentRoom;
        direction;
        constructor(_parent, _position, _scale) {
            super("Obstical");
            this.parentRoom = _parent;
            this.parentRoom.obsticals.push(this);
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("black", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black")))));
            this.mtxLocal.translation = _position.toVector3(0.01);
            this.mtxLocal.scale(Game.ƒ.Vector3.ONE(_scale));
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, null);
        }
    }
    Generation.Obsitcal = Obsitcal;
})(Generation || (Generation = {}));
var Generation;
(function (Generation) {
    let numberOfRooms = 5;
    Generation.generationFailed = false;
    Generation.rooms = [];
    Generation.compareNorth = new ƒ.Vector2(0, 1);
    Generation.compareEast = new ƒ.Vector2(1, 0);
    Generation.compareSouth = new ƒ.Vector2(0, -1);
    Generation.compareWest = new ƒ.Vector2(-1, 0);
    //spawn chances
    let challengeRoomSpawnChance = 30;
    function procedualRoomGeneration() {
        Generation.rooms = [];
        Generation.generationFailed = false;
        Generation.rooms.push(generateStartRoom());
        Generation.rooms.push.apply(Generation.rooms, generateNormalRooms());
        addBossRoom();
        Generation.rooms.push.apply(Generation.rooms, generateTreasureRoom());
        Generation.rooms.push(generateMerchantRoom());
        setExits();
        Generation.rooms.forEach(room => { console.log(room.mtxLocal.translation.clone.toString()); });
        moveRoomToWorldCoords(Generation.rooms[0]);
        setExits();
        addRoomToGraph(Generation.rooms[0]);
    }
    Generation.procedualRoomGeneration = procedualRoomGeneration;
    /**
     * generates a grid thats connected toggether from a given starting point
     * @param _startCoord the starting point
     * @returns vector2 array of a connecting grid without overlaps
     */
    function generateSnakeGrid(_startCoord) {
        let grid = [];
        grid.push(_startCoord);
        for (let i = 0; i < numberOfRooms; i++) {
            let nextCoord = getNextPossibleCoordFromSpecificCoord(grid, grid[grid.length - 1]);
            if (nextCoord == undefined) {
                break;
            }
            else {
                grid.push(nextCoord);
            }
        }
        return grid;
    }
    /**
     * function to get a random neigihbour taking care of an acutal grid
     * @param _grid existing grid the function should care about
     * @param _specificCoord the coord you want the next possible coord
     * @returns a vector2 coord thats not inside of _grid and around  _specificCoord
     */
    function getNextPossibleCoordFromSpecificCoord(_grid, _specificCoord) {
        let coordNeighbours = getNeighbourCoordinate(_specificCoord);
        for (let i = 0; i < coordNeighbours.length; i++) {
            let randomIndex = Math.round(Math.random() * (coordNeighbours.length - 1));
            let nextCoord = coordNeighbours[randomIndex];
            if (_grid.find(coord => coord.equals(nextCoord))) {
                coordNeighbours = coordNeighbours.filter(coord => !coord.equals(nextCoord));
                continue;
            }
            else {
                return nextCoord;
            }
        }
        return null;
    }
    /**
     * function to get all neighbours ignoring the current grid
     * @param _coord coordiante you want the neighbour from
     * @returns 4 neighbours in direction N E S and W
     */
    function getNeighbourCoordinate(_coord) {
        let neighbours = [];
        neighbours.push(new ƒ.Vector2(_coord.x + 1, _coord.y));
        neighbours.push(new ƒ.Vector2(_coord.x - 1, _coord.y));
        neighbours.push(new ƒ.Vector2(_coord.x, _coord.y + 1));
        neighbours.push(new ƒ.Vector2(_coord.x, _coord.y - 1));
        return neighbours;
    }
    function generateStartRoom() {
        let startRoom = new Generation.StartRoom(new ƒ.Vector2(0, 0), 20);
        return startRoom;
    }
    function generateNormalRooms() {
        let gridCoords;
        let normalRooms = [];
        while (true) {
            gridCoords = generateSnakeGrid(Generation.rooms[0].coordinates);
            if ((gridCoords.length - 1) == numberOfRooms) {
                break;
            }
        }
        gridCoords.forEach(coord => {
            normalRooms.push(new Generation.NormalRoom(coord, 20));
        });
        return normalRooms;
    }
    function addBossRoom() {
        let biggestDistance = ƒ.Vector2.ZERO();
        Generation.rooms.forEach(room => {
            if (Math.abs(room.coordinates.x) > biggestDistance.x && Math.abs(room.coordinates.y) > biggestDistance.y) {
                biggestDistance = room.coordinates;
            }
        });
        let roomCoord = getCoordsFromRooms();
        let nextCoord = getNextPossibleCoordFromSpecificCoord(roomCoord, roomCoord[roomCoord.length - 1]);
        if (nextCoord == undefined) {
            // nextCoord = getNextPossibleCoordFromSpecificCoord(roomCoord, roomCoord[roomCoord.length - 2]);
            Generation.generationFailed = true;
        }
        else {
            Generation.rooms.push(new Generation.BossRoom(nextCoord, 30));
        }
    }
    function generateTreasureRoom() {
        let roomCoords = getCoordsFromRooms();
        let newTreasureRooms = [];
        Generation.rooms.forEach(room => {
            if (room.roomType == Generation.ROOMTYPE.NORMAL) {
                let nextCoord = getNextPossibleCoordFromSpecificCoord(roomCoords, room.coordinates);
                if (nextCoord != undefined) {
                    let trRoom = new Generation.TreasureRoom(nextCoord, 10);
                    if (isSpawning(trRoom.getSpawnChance)) {
                        newTreasureRooms.push(trRoom);
                    }
                }
            }
        });
        return newTreasureRooms;
    }
    function generateMerchantRoom() {
        for (let i = 0; i < Generation.rooms.length; i++) {
            if (i > 0) {
                let nextCoord = getNextPossibleCoordFromSpecificCoord(getCoordsFromRooms(), Generation.rooms[i].coordinates);
                if (nextCoord != undefined) {
                    return new Generation.MerchantRoom(nextCoord, 20);
                }
            }
        }
        Generation.generationFailed = true;
        return null;
    }
    /**
     * function to get coordiantes from all existing rooms
     * @returns Vector2 array with coordinates of all current existing rooms in RoomGeneration.rooms
     */
    function getCoordsFromRooms() {
        let coords = [];
        Generation.rooms.forEach(room => {
            coords.push(room.coordinates);
        });
        return coords;
    }
    Generation.getCoordsFromRooms = getCoordsFromRooms;
    function setExits() {
        Generation.rooms.forEach(room => {
            let neighbours = Generation.rooms.filter(element => element != room);
            neighbours.forEach(neighbour => {
                room.setRoomExit(neighbour);
                room.setSpawnPoints();
                room.openDoors();
            });
        });
    }
    function isSpawning(_spawnChance) {
        let x = Math.round(Math.random() * 100);
        if (x < _spawnChance) {
            return true;
        }
        return false;
    }
    function moveRoomToWorldCoords(_firstRoom) {
        let neighbourN = Generation.rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2(_firstRoom.coordinates.clone.x, (_firstRoom.coordinates.clone.y + 1))));
        let neighbourE = Generation.rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2((_firstRoom.coordinates.clone.x + 1), _firstRoom.coordinates.clone.y)));
        let neighbourS = Generation.rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2(_firstRoom.coordinates.clone.x, (_firstRoom.coordinates.clone.y - 1))));
        let neighbourW = Generation.rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2((_firstRoom.coordinates.clone.x - 1), _firstRoom.coordinates.clone.y)));
        if (neighbourN != undefined && !neighbourN.positionUpdated) {
            neighbourN.mtxLocal.translation = new ƒ.Vector3(neighbourN.coordinates.x * (_firstRoom.roomSize / 2 + neighbourN.roomSize / 2), neighbourN.coordinates.y * (_firstRoom.roomSize / 2 + neighbourN.roomSize / 2), -0.01);
            neighbourN.positionUpdated = true;
            moveRoomToWorldCoords(neighbourN);
        }
        if (neighbourE != undefined && !neighbourE.positionUpdated) {
            neighbourE.mtxLocal.translation = new ƒ.Vector3(neighbourE.coordinates.x * (_firstRoom.roomSize / 2 + neighbourE.roomSize / 2), neighbourE.coordinates.y * (_firstRoom.roomSize / 2 + neighbourE.roomSize / 2), -0.01);
            neighbourE.positionUpdated = true;
            moveRoomToWorldCoords(neighbourE);
        }
        if (neighbourS != undefined && !neighbourS.positionUpdated) {
            neighbourS.mtxLocal.translation = new ƒ.Vector3(neighbourS.coordinates.x * (_firstRoom.roomSize / 2 + neighbourS.roomSize / 2), neighbourS.coordinates.y * (_firstRoom.roomSize / 2 + neighbourS.roomSize / 2), -0.01);
            neighbourS.positionUpdated = true;
            moveRoomToWorldCoords(neighbourS);
        }
        if (neighbourW != undefined && !neighbourW.positionUpdated) {
            neighbourW.mtxLocal.translation = new ƒ.Vector3(neighbourW.coordinates.x * (_firstRoom.roomSize / 2 + neighbourW.roomSize / 2), neighbourW.coordinates.y * (_firstRoom.roomSize / 2 + neighbourW.roomSize / 2), -0.01);
            neighbourW.positionUpdated = true;
            moveRoomToWorldCoords(neighbourW);
        }
    }
    function switchRoom(_direction) {
        if (Game.currentRoom.enemyCountManager.finished) {
            let newRoom;
            let newPosition;
            if (_direction.north) {
                newRoom = Generation.rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x, Game.currentRoom.coordinates.y + 1)));
                newPosition = newRoom.getSpawnPointS;
            }
            if (_direction.east) {
                newRoom = Generation.rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x + 1, Game.currentRoom.coordinates.y)));
                newPosition = newRoom.getSpawnPointW;
            }
            if (_direction.south) {
                newRoom = Generation.rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x, Game.currentRoom.coordinates.y - 1)));
                newPosition = newRoom.getSpawnPointN;
            }
            if (_direction.west) {
                newRoom = Generation.rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x - 1, Game.currentRoom.coordinates.y)));
                newPosition = newRoom.getSpawnPointE;
            }
            if (newRoom == undefined) {
                console.error("no room found");
                return;
            }
            if (Networking.client.id == Networking.client.idHost) {
                // Game.cmpCamera.mtxPivot.translation = newPosition.toVector3(Game.cmpCamera.mtxPivot.translation.z);
                Game.avatar1.cmpTransform.mtxLocal.translation = newPosition.toVector3();
                Game.avatar2.cmpTransform.mtxLocal.translation = newPosition.toVector3();
            }
            addRoomToGraph(newRoom);
        }
    }
    Generation.switchRoom = switchRoom;
    /**
     * removes erything unreliable from the grpah and adds the new room to the graph , sending it to the client & spawns enemies if existing in room
     * @param _room the room it should spawn
     */
    function addRoomToGraph(_room) {
        Networking.sendRoom({ coordinates: _room.coordinates, roomSize: _room.roomSize, exits: _room.exits, roomType: _room.roomType, translation: _room.mtxLocal.translation });
        let oldObjects = Game.graph.getChildren().filter(elem => (elem.tag != Tag.TAG.PLAYER));
        oldObjects = oldObjects.filter(elem => (elem.tag != Tag.TAG.UI));
        oldObjects.forEach((elem) => {
            Game.graph.removeChild(elem);
        });
        Game.graph.addChild(_room);
        Game.viewport.calculateTransforms();
        if (Networking.client.id == Networking.client.idHost) {
            _room.onAddToGraph();
        }
        _room.walls.forEach(wall => {
            wall.setCollider();
            if (wall.door != undefined) {
                wall.door.setCollider();
            }
        });
        Game.currentRoom = _room;
        EnemySpawner.spawnMultipleEnemiesAtRoom(Game.currentRoom.enemyCountManager.getMaxEnemyCount, Game.currentRoom.mtxLocal.translation.toVector2());
    }
    Generation.addRoomToGraph = addRoomToGraph;
})(Generation || (Generation = {}));
var Entity;
(function (Entity) {
    Entity.txtShadow = new Game.ƒ.TextureImage();
    class Shadow extends Game.ƒ.Node {
        mesh = new ƒ.MeshQuad;
        shadowMatt = new ƒ.Material("startRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Entity.txtShadow));
        shadowParent;
        constructor(_parent) {
            super("shadow");
            this.shadowParent = _parent;
            this.addComponent(new Game.ƒ.ComponentMesh(this.mesh));
            let cmpMaterial = new ƒ.ComponentMaterial(this.shadowMatt);
            ;
            this.addComponent(cmpMaterial);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxWorld.translation = new Game.ƒ.Vector3(_parent.mtxLocal.translation.x, _parent.mtxLocal.translation.y, -0.01);
            this.mtxLocal.scaling = new Game.ƒ.Vector3(2, 2, 2);
        }
        updateShadowPos() {
            this.mtxLocal.translation = new ƒ.Vector3(0, 0, this.shadowParent.mtxLocal.translation.z * -1);
        }
    }
    Entity.Shadow = Shadow;
})(Entity || (Entity = {}));
var Weapons;
(function (Weapons) {
    class Weapon {
        ownerNetId;
        get owner() { return Game.entities.find(elem => elem.netId == this.ownerNetId); }
        ;
        cooldown;
        get getCoolDown() { return this.cooldown; }
        ;
        attackCount;
        get getAttackCount() { return this.attackCount; }
        ;
        currentAttackCount;
        aimType;
        bulletType = Bullets.BULLETTYPE.STANDARD;
        projectileAmount = 1;
        constructor(_cooldownTime, _attackCount, _bulletType, _projectileAmount, _ownerNetId, _aimType) {
            this.attackCount = _attackCount;
            this.currentAttackCount = _attackCount;
            this.bulletType = _bulletType;
            this.projectileAmount = _projectileAmount;
            this.ownerNetId = _ownerNetId;
            this.aimType = _aimType;
            this.cooldown = new Ability.Cooldown(_cooldownTime);
        }
        shoot(_position, _direciton, _bulletNetId, _sync) {
            if (_sync) {
                if (this.currentAttackCount <= 0 && !this.cooldown.hasCoolDown) {
                    this.currentAttackCount = this.attackCount;
                }
                if (this.currentAttackCount > 0 && !this.cooldown.hasCoolDown) {
                    if (this.owner.attributes.accuracy < 100) {
                        this.inaccuracy(_direciton);
                    }
                    _direciton.normalize();
                    let magazine = this.loadMagazine(_position, _direciton, this.bulletType, _bulletNetId);
                    this.setBulletDirection(magazine);
                    this.fire(magazine, _sync);
                    this.currentAttackCount--;
                    if (this.currentAttackCount <= 0 && !this.cooldown.hasCoolDown) {
                        this.cooldown.setMaxCoolDown = this.cooldown.getMaxCoolDown * this.owner.attributes.coolDownReduction;
                        this.cooldown.startCoolDown();
                    }
                }
            }
            else {
                _direciton.normalize();
                let magazine = this.loadMagazine(_position, _direciton, this.bulletType, _bulletNetId);
                this.setBulletDirection(magazine);
                this.fire(magazine, _sync);
            }
        }
        inaccuracy(_direciton) {
            _direciton.x = _direciton.x + Math.random() * 10 / this.owner.attributes.accuracy - Math.random() * 10 / this.owner.attributes.accuracy;
            _direciton.y = _direciton.y + Math.random() * 10 / this.owner.attributes.accuracy - Math.random() * 10 / this.owner.attributes.accuracy;
        }
        fire(_magazine, _sync) {
            _magazine.forEach(bullet => {
                Game.graph.addChild(bullet);
                if (_sync) {
                    if (bullet instanceof Bullets.HomingBullet) {
                        Networking.spawnBullet(this.aimType, bullet.direction, bullet.netId, this.ownerNetId, bullet.target);
                    }
                    else {
                        Networking.spawnBullet(this.aimType, bullet.direction, bullet.netId, this.ownerNetId);
                    }
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
        loadMagazine(_position, _direction, _bulletType, _netId) {
            let magazine = [];
            for (let i = 0; i < this.projectileAmount; i++) {
                switch (this.aimType) {
                    case AIM.NORMAL:
                        magazine.push(new Bullets.Bullet(this.bulletType, _position, _direction, this.ownerNetId, _netId));
                        break;
                    case AIM.HOMING:
                        magazine.push(new Bullets.HomingBullet(this.bulletType, _position, _direction, this.ownerNetId, null, _netId));
                        break;
                }
            }
            return magazine;
        }
    }
    Weapons.Weapon = Weapon;
    let AIM;
    (function (AIM) {
        AIM[AIM["NORMAL"] = 0] = "NORMAL";
        AIM[AIM["HOMING"] = 1] = "HOMING";
    })(AIM = Weapons.AIM || (Weapons.AIM = {}));
})(Weapons || (Weapons = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL0NsYXNzZXMvTWFpbi50cyIsIi4uL0NsYXNzZXMvVUkudHMiLCIuLi9DbGFzc2VzL1RhZy50cyIsIi4uL0NsYXNzZXMvRW50aXR5LnRzIiwiLi4vQ2xhc3Nlcy9FbmVteS50cyIsIi4uL0NsYXNzZXMvSW50ZXJmYWNlcy50cyIsIi4uL0NsYXNzZXMvSXRlbXMudHMiLCIuLi9DbGFzc2VzL0FuaW1hdGlvbkdlbmVyYXRpb24udHMiLCIuLi9DbGFzc2VzL1ByZWRpY3Rpb24udHMiLCIuLi9DbGFzc2VzL0FiaWxpdHkudHMiLCIuLi9DbGFzc2VzL0F0dHJpYnV0ZXMudHMiLCIuLi9DbGFzc2VzL0Jvc3MudHMiLCIuLi9DbGFzc2VzL0J1ZmYudHMiLCIuLi9DbGFzc2VzL0J1bGxldC50cyIsIi4uL0NsYXNzZXMvQ29sbGlkZXIudHMiLCIuLi9DbGFzc2VzL0VuZW15U3Bhd25lci50cyIsIi4uL0NsYXNzZXMvRmxvY2tpbmcudHMiLCIuLi9DbGFzc2VzL0ZyaWVuZGx5Q3JlYXR1cmVzLnRzIiwiLi4vQ2xhc3Nlcy9HYW1lQ2FsY3VsYXRpb24udHMiLCIuLi9DbGFzc2VzL0lucHV0U3lzdGVtLnRzIiwiLi4vQ2xhc3Nlcy9MYW5kc2NhcGUudHMiLCIuLi9DbGFzc2VzL01pbmltYXAudHMiLCIuLi9DbGFzc2VzL05ldHdvcmtpbmcudHMiLCIuLi9DbGFzc2VzL1BsYXllci50cyIsIi4uL0NsYXNzZXMvUm9vbS50cyIsIi4uL0NsYXNzZXMvUm9vbUdlbmVyYXRpb24udHMiLCIuLi9DbGFzc2VzL1NoYWRvdy50cyIsIi4uL0NsYXNzZXMvV2VhcG9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsbUJBQW1CO0FBQ25CLHdEQUF3RDtBQUN4RCxzREFBc0Q7QUFDdEQsc0JBQXNCO0FBRXRCLElBQVUsSUFBSSxDQSthYjtBQXBiRCxtQkFBbUI7QUFDbkIsd0RBQXdEO0FBQ3hELHNEQUFzRDtB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QU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRSxvQkFBQSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFM0YsWUFBWSxHQUFHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLG9CQUFBLGVBQWUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEYsWUFBWSxHQUFHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLG9CQUFBLGVBQWUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFeEYsUUFBUSxHQUFHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLG9CQUFBLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0UsUUFBUSxHQUFHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLG9CQUFBLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0UsVUFBVSxHQUFHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLG9CQUFBLGFBQWEsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFbkYsWUFBWSxHQUFHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLG9CQUFBLGVBQWUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEYsWUFBWSxHQUFHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLG9CQUFBLGVBQWUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEYsY0FBYyxHQUFHLElBQUks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QUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0osSUFBSSxVQUFVLEdBQVMsV0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0osSUFBSSxVQUFVLEdBQVMsV0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0osSUFBSSxVQUFVLEdBQVMsV0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0osSUFBSSxVQUFVLElBQUksU0FBUyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBRTtZQUN4RCxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZOLFVBQVUsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1lBQ2xDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3JDO1FBQ0QsSUFBSSxVQUFVLElBQUksU0FBUyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBRTtZQUN4RCxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZOLFVBQVUsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1lBQ2xDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3JDO1FBQ0QsSUFBSSxVQUFVLElBQUksU0FBUyxJ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SUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7d0JBQy9HLE1BQU07aUJBQ2I7YUFDSjtZQUNELE9BQU8sUUFBUSxDQUFDO1FBQ3BCLENBQUM7S0FDSjtJQXBHWSxjQUFNLFNBb0dsQixDQUFBO0lBRUQsSUFBWSxHQUdYO0lBSEQsV0FBWSxHQUFHO1FBQ1gsaUNBQU0sQ0FBQTtRQUNOLGlDQUFNLENBQUE7SUFDVixDQUFDLEVBSFcsR0FBRyxHQUFILFdBQUcsS0FBSCxXQUFHLFFBR2Q7QUFFTCxDQUFDLEVBNUdTLE9BQU8sS0FBUCxPQUFPLFFBNEdoQiIsInNvdXJjZXNDb250ZW50IjpbIi8vI3JlZ2lvbiBcIkltcG9ydHNcIlxyXG4vLy88cmVmZXJlbmNlIHR5cGVzPVwiLi4vRlVER0UvQ29yZS9CdWlsZC9GdWRnZUNvcmUuanNcIi8+XHJcbi8vLzxyZWZlcmVuY2UgdHlwZXM9XCIuLi9GVURHRS9BaWQvQnVpbGQvRnVkZ2VBaWQuanNcIi8+XHJcbi8vI2VuZHJlZ2lvbiBcIkltcG9ydHNcIlxyXG5cclxubmFtZXNwYWNlIEdhbWUge1xyXG4gICAgZXhwb3J0IGVudW0gR0FNRVNUQVRFUyB7XHJcbiAgICAgICAgUExBWUlORyxcclxuICAgICAgICBQQVVTRVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbXBvcnQgxpIgPSBGdWRnZUNvcmU7XHJcbiAgICBleHBvcnQgaW1wb3J0IMaSQWlkID0gRnVkZ2VBaWQ7XHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBcIkRvbUVsZW1lbnRzXCJcclxuICAgIGV4cG9ydCBsZXQgY2FudmFzOiBIVE1MQ2FudmFzRWxlbWVudCA9IDxIVE1MQ2FudmFzRWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNhbnZhc1wiKTtcclxuICAgIC8vIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBpbml0KTtcclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBzdGFydCk7XHJcblxyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJSYW5nZWRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHBsYXllckNob2ljZSk7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk1lbGVlXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBwbGF5ZXJDaG9pY2UpO1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiRG9tRWxlbWVudHNcIlxyXG5cclxuICAgIC8vI3JlZ2lvbiBcIlB1YmxpY1ZhcmlhYmxlc1wiXHJcbiAgICBleHBvcnQgbGV0IGdhbWVzdGF0ZTogR0FNRVNUQVRFUyA9IEdBTUVTVEFURVMuUEFVU0U7XHJcbiAgICBleHBvcnQgbGV0IHZpZXdwb3J0OiDGki5WaWV3cG9ydCA9IG5ldyDGki5WaWV3cG9ydCgpO1xyXG4gICAgZXhwb3J0IGxldCBjbXBDYW1lcmE6IMaSLkNvbXBvbmVudENhbWVyYSA9IG5ldyDGki5Db21wb25lbnRDYW1lcmEoKTtcclxuICAgIGV4cG9ydCBsZXQgZ3JhcGg6IMaSLk5vZGUgPSBuZXcgxpIuTm9kZShcIkdyYXBoXCIpO1xyXG5cclxuICAgIHZpZXdwb3J0LmluaXRpYWxpemUoXCJWaWV3cG9ydFwiLCBncmFwaCwgY21wQ2FtZXJhLCBjYW52YXMpO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgYXZhdGFyMTogUGxheWVyLlBsYXllcjtcclxuICAgIGV4cG9ydCBsZXQgYXZhdGFyMjogUGxheWVyLlBsYXllcjtcclxuXHJcbiAgICBleHBvcnQgbGV0IGN1cnJlbnRSb29tOiBHZW5lcmF0aW9uLlJvb207XHJcbiAgICBleHBvcnQgbGV0IG1pbmlNYXA6IFVJLk1pbmltYXA7XHJcblxyXG4gICAgZXhwb3J0IGxldCBjb25uZWN0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIGV4cG9ydCBsZXQgZGVsdGFUaW1lOiBudW1iZXI7XHJcblxyXG4gICAgZXhwb3J0IGxldCBzZXJ2ZXJQcmVkaWN0aW9uQXZhdGFyOiBOZXR3b3JraW5nLlNlcnZlclByZWRpY3Rpb247XHJcblxyXG4gICAgZXhwb3J0IGxldCBjdXJyZW50TmV0T2JqOiBJbnRlcmZhY2VzLklOZXR3b3JrT2JqZWN0c1tdID0gW107XHJcblxyXG4gICAgZXhwb3J0IGxldCBlbnRpdGllczogRW50aXR5LkVudGl0eVtdID0gW107XHJcbiAgICBleHBvcnQgbGV0IGVuZW1pZXM6IEVuZW15LkVuZW15W10gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgYnVsbGV0czogQnVsbGV0cy5CdWxsZXRbXSA9IFtdO1xyXG4gICAgZXhwb3J0IGxldCBpdGVtczogSXRlbXMuSXRlbVtdID0gW107XHJcblxyXG4gICAgZXhwb3J0IGxldCBjb29sRG93bnM6IEFiaWxpdHkuQ29vbGRvd25bXSA9IFtdO1xyXG4gICAgLy9KU09OXHJcbiAgICBleHBvcnQgbGV0IGVuZW1pZXNKU09OOiBFbnRpdHkuRW50aXR5W107XHJcbiAgICBleHBvcnQgbGV0IGludGVybmFsSXRlbUpTT046IEl0ZW1zLkludGVybmFsSXRlbVtdO1xyXG4gICAgZXhwb3J0IGxldCBidWZmSXRlbUpTT046IEl0ZW1zLkJ1ZmZJdGVtW107XHJcblxyXG4gICAgZXhwb3J0IGxldCBidWxsZXRzSlNPTjogQnVsbGV0cy5CdWxsZXRbXTtcclxuICAgIGV4cG9ydCBsZXQgbG9hZGVkID0gZmFsc2U7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJQdWJsaWNWYXJpYWJsZXNcIlxyXG5cclxuICAgIC8vI3JlZ2lvbiBcIlByaXZhdGVWYXJpYWJsZXNcIlxyXG4gICAgY29uc3QgZGFtcGVyOiBudW1iZXIgPSAzLjU7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJQcml2YXRlVmFyaWFibGVzXCJcclxuXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBcImVzc2VudGlhbFwiXHJcbiAgICBhc3luYyBmdW5jdGlvbiBpbml0KCkge1xyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGVaKDI1KTtcclxuICAgICAgICBjbXBDYW1lcmEubXR4UGl2b3Qucm90YXRlWSgxODApO1xyXG5cclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIC8vIEdlbmVyYXRpb24ucm9vbXMgPSBHZW5lcmF0aW9uLmdlbmVyYXRlTm9ybWFsUm9vbXMoKTtcclxuICAgICAgICAgICAgSXRlbXMuSXRlbUdlbmVyYXRvci5maWxsUG9vbCgpO1xyXG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICAgICAgR2VuZXJhdGlvbi5wcm9jZWR1YWxSb29tR2VuZXJhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFHZW5lcmF0aW9uLmdlbmVyYXRpb25GYWlsZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkdFTkVSQVRJT04gRkFJTEVEIC0+IFJFU1RBUlQgR0VORVJBVElPTlwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZXJ2ZXJQcmVkaWN0aW9uQXZhdGFyID0gbmV3IE5ldHdvcmtpbmcuU2VydmVyUHJlZGljdGlvbihudWxsKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdyYXBoLmFwcGVuZENoaWxkKGF2YXRhcjEpO1xyXG5cclxuICAgICAgICDGkkFpZC5hZGRTdGFuZGFyZExpZ2h0Q29tcG9uZW50cyhncmFwaCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgIGZpbmRHYW1lT2JqZWN0cygpO1xyXG4gICAgICAgIGRlbHRhVGltZSA9IEdhbWUuxpIuTG9vcC50aW1lRnJhbWVHYW1lICogMC4wMDE7XHJcbiAgICAgICAgcGF1c2VDaGVjaygpO1xyXG4gICAgICAgIEdhbWUuYXZhdGFyMS5wcmVkaWN0KCk7XHJcbiAgICAgICAgY2FtZXJhVXBkYXRlKCk7XHJcblxyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJQb3NpdGlvbihHYW1lLmF2YXRhcjEubXR4TG9jYWwudHJhbnNsYXRpb24sIEdhbWUuYXZhdGFyMS5tdHhMb2NhbC5yb3RhdGlvbik7XHJcbiAgICAgICAgICAgIHNlcnZlclByZWRpY3Rpb25BdmF0YXIudXBkYXRlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBVSS51cGRhdGVVSSgpO1xyXG5cclxuICAgICAgICBkcmF3KCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZmluZEdhbWVPYmplY3RzKCk6IHZvaWQge1xyXG4gICAgICAgIGl0ZW1zID0gPEl0ZW1zLkl0ZW1bXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8SXRlbXMuSXRlbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5JVEVNKTtcclxuICAgICAgICBidWxsZXRzID0gPEJ1bGxldHMuQnVsbGV0W10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEJ1bGxldHMuQnVsbGV0PmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLkJVTExFVCk7XHJcbiAgICAgICAgZW50aXRpZXMgPSA8RW50aXR5LkVudGl0eVtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGNoaWxkID0+ICg8RW50aXR5LkVudGl0eT5jaGlsZCkgaW5zdGFuY2VvZiBFbnRpdHkuRW50aXR5KTtcclxuICAgICAgICBlbmVtaWVzID0gPEVuZW15LkVuZW15W10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVuZW15LkVuZW15PmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLkVORU1ZKTtcclxuICAgICAgICBjdXJyZW50Um9vbSA9ICg8R2VuZXJhdGlvbi5Sb29tPkdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maW5kKGVsZW0gPT4gKDxHZW5lcmF0aW9uLlJvb20+ZWxlbSkudGFnID09IFRhZy5UQUcuUk9PTSkpO1xyXG4gICAgICAgIGN1cnJlbnROZXRPYmogPSBzZXROZXRPYmooZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbSA9PiBOZXR3b3JraW5nLmlzTmV0d29ya09iamVjdChlbGVtKSkpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNldE5ldE9iaihfbmV0T2o6IEdhbWUuxpIuTm9kZVtdKTogSW50ZXJmYWNlcy5JTmV0d29ya09iamVjdHNbXSB7XHJcbiAgICAgICAgbGV0IHRlbXBOZXRPYmpzOiBJbnRlcmZhY2VzLklOZXR3b3JrT2JqZWN0c1tdID0gW107XHJcbiAgICAgICAgX25ldE9qLmZvckVhY2gob2JqID0+IHtcclxuICAgICAgICAgICAgdGVtcE5ldE9ianMucHVzaCg8SW50ZXJmYWNlcy5JTmV0d29ya09iamVjdHM+eyBuZXRJZDogTmV0d29ya2luZy5nZXROZXRJZChvYmopLCBuZXRPYmplY3ROb2RlOiBvYmogfSlcclxuICAgICAgICB9KVxyXG4gICAgICAgIHJldHVybiB0ZW1wTmV0T2JqcztcclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIHNldENsaWVudCgpIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuc29ja2V0LnJlYWR5U3RhdGUgPT0gTmV0d29ya2luZy5jbGllbnQuc29ja2V0Lk9QRU4gJiYgTmV0d29ya2luZy5jbGllbnQuaWRSb29tLnRvTG93ZXJDYXNlKCkgIT0gXCJsb2JieVwiKSB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc2V0Q2xpZW50KCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsgc2V0Q2xpZW50KCkgfSwgMTAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmVhZHlTYXRlKCkge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMubGVuZ3RoID49IDIgJiYgTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNldENsaWVudFJlYWR5KCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7IHJlYWR5U2F0ZSgpIH0sIDEwMCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHN0YXJ0TG9vcCgpIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgIT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICYmIGF2YXRhcjIgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcubG9hZGVkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChHYW1lLmxvYWRlZCkge1xyXG4gICAgICAgICAgICDGki5Mb29wLnN0YXJ0KMaSLkxPT1BfTU9ERS5USU1FX0dBTUUsIGRlbHRhVGltZSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiVUlcIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgc3RhcnRMb29wKCk7XHJcbiAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHN0YXJ0KCkge1xyXG4gICAgICAgIGxvYWRUZXh0dXJlcygpO1xyXG4gICAgICAgIC8vIGxvYWRKU09OKCk7XHJcblxyXG4gICAgICAgIC8vVE9ETzogYWRkIHNwcml0ZSB0byBncmFwaGUgZm9yIHN0YXJ0c2NyZWVuXHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydEdhbWVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuXHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuY29ubmVjdGluZygpO1xyXG5cclxuICAgICAgICAgICAgd2FpdE9uQ29ubmVjdGlvbigpO1xyXG4gICAgICAgICAgICBhc3luYyBmdW5jdGlvbiB3YWl0T25Db25uZWN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgc2V0Q2xpZW50KCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnRzLmZpbHRlcihlbGVtID0+IGVsZW0ucmVhZHkgPT0gdHJ1ZSkubGVuZ3RoID49IDIgJiYgTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJJTUhPU1RcIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBsb2FkSlNPTigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGluaXQoKTtcclxuICAgICAgICAgICAgICAgICAgICBnYW1lc3RhdGUgPSBHQU1FU1RBVEVTLlBMQVlJTkc7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gRW5lbXlTcGF3bmVyLnNwYXduRW5lbWllcygpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVuZW15U3Bhd25lci5zcGF3bkJ5SUQoRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUkFERFMsIEVudGl0eS5JRC5SRURUSUNLLCBuZXcgxpIuVmVjdG9yMigzLCAzKSwgYXZhdGFyMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVuZW15U3Bhd25lci5zcGF3bk11bHRpcGxlRW5lbWllc0F0Um9vbSg1LCBHYW1lLmN1cnJlbnRSb29tLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5lbXlTcGF3bmVyLnNwYXduQnlJRChFbmVteS5FTkVNWUNMQVNTLkVORU1ZU01BU0gsIEVudGl0eS5JRC5PR0VSLCBuZXcgxpIuVmVjdG9yMigzLCAzKSwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVuZW15U3Bhd25lci5zcGF3bkJ5SUQoRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUiwgRW50aXR5LklELlNVTU1PTk9SLCBuZXcgxpIuVmVjdG9yMigzLCAzKSwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyNyZWdpb24gaW5pdCBJdGVtc1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXRlbTEgPSBuZXcgSXRlbXMuQnVmZkl0ZW0oSXRlbXMuSVRFTUlELlRPWElDUkVMQVRJT05TSElQLCBuZXcgxpIuVmVjdG9yMigwLCAyKSwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpdGVtMiA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oSXRlbXMuSVRFTUlELlRIT1JTSEFNTUVSKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbTIuc2V0UG9zaXRpb24obmV3IMaSLlZlY3RvcjIoLTUsIDApKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQgaXRlbTMgPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKEl0ZW1zLklURU1JRC5TQ0FMRVVQLCBuZXcgxpIuVmVjdG9yMigtMiwgMCksIG51bGwpO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdyYXBoLmFwcGVuZENoaWxkKGl0ZW0xKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JhcGguYXBwZW5kQ2hpbGQoaXRlbTIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBncmFwaC5hcHBlbmRDaGlsZChpdGVtMyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduUGxheWVyKCk7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb29tSW5mb3M6IEludGVyZmFjZXMuSU1pbmltYXBJbmZvc1tdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb29yZHM6IEdhbWUuxpIuVmVjdG9yMltdID0gR2VuZXJhdGlvbi5nZXRDb29yZHNGcm9tUm9vbXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvb21JbmZvcy5wdXNoKDxJbnRlcmZhY2VzLklNaW5pbWFwSW5mb3M+eyBjb29yZHM6IGNvb3Jkc1tpXSwgcm9vbVR5cGU6IEdlbmVyYXRpb24ucm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMgPT0gY29vcmRzW2ldKS5yb29tVHlwZSB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pbmlNYXAgPSBuZXcgVUkuTWluaW1hcChyb29tSW5mb3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBncmFwaC5hZGRDaGlsZChtaW5pTWFwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICBzdGFydExvb3AoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCh3YWl0T25Db25uZWN0aW9uLCAzMDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJIb3N0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSG9zdFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgTmV0d29ya2luZy5jcmVhdGVSb29tKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJKb2luXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcm9vbUlkOiBzdHJpbmcgPSAoPEhUTUxJbnB1dEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJSb29tXCIpKS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuam9pblJvb20ocm9vbUlkKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB3YWl0Rm9yTG9iYnkoKTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gd2FpdEZvckxvYmJ5KCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50cy5sZW5ndGggPiAxICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkUm9vbS50b0xvY2FsZUxvd2VyQ2FzZSgpICE9IFwibG9iYnlcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSG9zdHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJvb21JZFwiKS5wYXJlbnRFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkxvYmJ5c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdEZvckxvYmJ5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQmFja09wdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDcmVkaXRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvbnNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNyZWRpdHNcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDcmVkaXRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG5cclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJCYWNrQ3JlZGl0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNyZWRpdHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBsYXllckNob2ljZShfZTogRXZlbnQpIHtcclxuICAgICAgICBpZiAoKDxIVE1MQnV0dG9uRWxlbWVudD5fZS50YXJnZXQpLmlkID09IFwiUmFuZ2VkXCIpIHtcclxuICAgICAgICAgICAgYXZhdGFyMSA9IG5ldyBQbGF5ZXIuUmFuZ2VkKEVudGl0eS5JRC5SQU5HRUQsIG5ldyBFbnRpdHkuQXR0cmlidXRlcygxMDAwMCwgNSwgNSwgMSwgMiwgNSwgMSwgODApKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCg8SFRNTEJ1dHRvbkVsZW1lbnQ+X2UudGFyZ2V0KS5pZCA9PSBcIk1lbGVlXCIpIHtcclxuICAgICAgICAgICAgYXZhdGFyMSA9IG5ldyBQbGF5ZXIuTWVsZWUoRW50aXR5LklELk1FTEVFLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMoMTAwMDAsIDEsIDUsIDEsIDIsIDEwLCAxLCA4MCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkxvYmJ5c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgIHJlYWR5U2F0ZSgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXVzZUNoZWNrKCkge1xyXG4gICAgICAgIGlmICgod2luZG93LnNjcmVlblggPCAtd2luZG93LnNjcmVlbi5hdmFpbFdpZHRoKSAmJiAod2luZG93LnNjcmVlblkgPCAtd2luZG93LnNjcmVlbi5hdmFpbEhlaWdodCkpIHtcclxuICAgICAgICAgICAgcGF1c2UodHJ1ZSwgZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBwYXVzZUNoZWNrKCk7XHJcbiAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcGxheWluZyh0cnVlLCBmYWxzZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBwYXVzZShfc3luYzogYm9vbGVhbiwgX3RyaWdnZXJPcHRpb246IGJvb2xlYW4pIHtcclxuICAgICAgICBpZiAoZ2FtZXN0YXRlID09IEdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc2V0R2FtZXN0YXRlKGZhbHNlKTtcclxuICAgICAgICAgICAgfSBpZiAoX3RyaWdnZXJPcHRpb24pIHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgYmFjayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQmFja09wdGlvblwiKTtcclxuICAgICAgICAgICAgICAgIGxldCBiYWNrQ2xvbmUgPSBiYWNrLmNsb25lTm9kZSh0cnVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBiYWNrLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGJhY2tDbG9uZSwgYmFjayk7XHJcblxyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJCYWNrT3B0aW9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25zY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBnYW1lc3RhdGUgPSBHQU1FU1RBVEVTLlBBVVNFO1xyXG4gICAgICAgICAgICDGki5Mb29wLnN0b3AoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHBsYXlpbmcoX3N5bmM6IGJvb2xlYW4sIF90cmlnZ2VyT3B0aW9uOiBib29sZWFuKSB7XHJcbiAgICAgICAgaWYgKGdhbWVzdGF0ZSA9PSBHQU1FU1RBVEVTLlBBVVNFKSB7XHJcbiAgICAgICAgICAgIGlmIChfc3luYykge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zZXRHYW1lc3RhdGUodHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF90cmlnZ2VyT3B0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvbnNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBnYW1lc3RhdGUgPSBHQU1FU1RBVEVTLlBMQVlJTkc7XHJcbiAgICAgICAgICAgIMaSLkxvb3AuY29udGludWUoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gbG9hZEpTT04oKSB7XHJcbiAgICAgICAgY29uc3QgbG9hZEVuZW15ID0gYXdhaXQgKGF3YWl0IGZldGNoKFwiLi9SZXNvdXJjZXMvRW5lbWllc1N0b3JhZ2UuanNvblwiKSkuanNvbigpO1xyXG4gICAgICAgIGVuZW1pZXNKU09OID0gKDxFbnRpdHkuRW50aXR5W10+bG9hZEVuZW15LmVuZW1pZXMpO1xyXG5cclxuICAgICAgICBjb25zdCBsb2FkSXRlbSA9IGF3YWl0IChhd2FpdCBmZXRjaChcIi4vUmVzb3VyY2VzL0l0ZW1TdG9yYWdlLmpzb25cIikpLmpzb24oKTtcclxuICAgICAgICBpbnRlcm5hbEl0ZW1KU09OID0gKDxJdGVtcy5JbnRlcm5hbEl0ZW1bXT5sb2FkSXRlbS5pbnRlcm5hbEl0ZW1zKTtcclxuICAgICAgICBidWZmSXRlbUpTT04gPSAoPEl0ZW1zLkJ1ZmZJdGVtW10+bG9hZEl0ZW0uYnVmZkl0ZW1zKTtcclxuXHJcblxyXG4gICAgICAgIGNvbnN0IGxvYWRCdWxsZXRzID0gYXdhaXQgKGF3YWl0IGZldGNoKFwiLi9SZXNvdXJjZXMvQnVsbGV0U3RvcmFnZS5qc29uXCIpKS5qc29uKCk7XHJcbiAgICAgICAgYnVsbGV0c0pTT04gPSAoPEJ1bGxldHMuQnVsbGV0W10+bG9hZEJ1bGxldHMuc3RhbmRhcmRCdWxsZXRzKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRUZXh0dXJlcygpIHtcclxuICAgICAgICBhd2FpdCBHZW5lcmF0aW9uLnR4dFN0YXJ0Um9vbS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUm9vbXMvbWFwMDEucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBCdWxsZXRzLmJ1bGxldFR4dC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUHJvamVjdGlsZXMvYXJyb3cucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEJ1bGxldHMud2F0ZXJCYWxsVHh0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9Qcm9qZWN0aWxlcy93YXRlckJhbGwucG5nXCIpXHJcblxyXG4gICAgICAgIC8vVUlcclxuICAgICAgICBhd2FpdCBVSS50eHRaZXJvLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTAucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dE9uZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGUxLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRUb3cubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlMi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0VGhyZWUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlMy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0Rm91ci5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU0LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRGaXZlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFNpeC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU2LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRTZXZlbi5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU3LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRFaWdodC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU4LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHROaW5lLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTkucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFRlbi5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGUxMC5wbmdcIik7XHJcblxyXG4gICAgICAgIC8vVUkgcGFydGljbGVcclxuICAgICAgICBhd2FpdCBVSS5oZWFsUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9oZWFsaW5nLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5wb2lzb25QYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL3BvaXNvbi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuYnVyblBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvcG9pc29uLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5ibGVlZGluZ1BhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvYmxlZWRpbmcucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnNsb3dQYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL3Nsb3cucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLmltbXVuZVBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvaW1tdW5lLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgVUkuY29tbW9uUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9SYXJpdHkvY29tbW9uLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5yYXJlUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9SYXJpdHkvcmFyZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuZXBpY1BhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvUmFyaXR5L2VwaWMucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLmxlZ2VuZGFyeVBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvUmFyaXR5L2xlZ2VuZGFyeS5wbmdcIik7XHJcblxyXG5cclxuICAgICAgICBhd2FpdCBFbnRpdHkudHh0U2hhZG93LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvc2hhZG93LnBuZ1wiKTtcclxuXHJcbiAgICAgICAgLy9NaW5pbWFwXHJcbiAgICAgICAgYXdhaXQgVUkubm9ybWFsUm9vbS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvTWluaW1hcC9ub3JtYWwucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLmNoYWxsZW5nZVJvb20ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL01pbmltYXAvY2hhbGxlbmdlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5tZXJjaGFudFJvb20ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL01pbmltYXAvbWVyY2hhbnQucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnRyZWFzdXJlUm9vbS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvTWluaW1hcC90cmVhc3VyZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuYm9zc1Jvb20ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL01pbmltYXAvYm9zcy5wbmdcIik7XHJcblxyXG5cclxuICAgICAgICAvL0VORU1ZXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRCYXRJZGxlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL2JhdC9iYXRJZGxlLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRSZWRUaWNrSWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy90aWNrL3JlZFRpY2tJZGxlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFJlZFRpY2tXYWxrLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3RpY2svcmVkVGlja1dhbGsucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFNtYWxsVGlja0lkbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc21hbGxUaWNrL3NtYWxsVGlja0lkbGUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U21hbGxUaWNrV2Fsay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9zbWFsbFRpY2svc21hbGxUaWNrV2Fsay5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U2tlbGV0b25JZGxlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3NrZWxldG9uL3NrZWxldG9uSWRsZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRTa2VsZXRvbldhbGsubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc2tlbGV0b24vc2tlbGV0b25XYWxrLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRPZ2VySWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9vZ2VyL29nZXJJZGxlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dE9nZXJXYWxrLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL29nZXIvb2dlcldhbGsucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0T2dlckF0dGFjay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9vZ2VyL29nZXJBdHRhY2sucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFN1bW1vbmVySWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9zdW1tb25lci9zdW1tb25lcklkbGUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U3VtbW9uZXJTdW1tb24ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc3VtbW9uZXIvc3VtbW9uZXJTbWFzaC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRTdW1tb25lclRlbGVwb3J0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3N1bW1vbmVyL3N1bW1vbmVyVGVsZXBvcnQucG5nXCIpO1xyXG5cclxuXHJcblxyXG5cclxuICAgICAgICAvL0l0ZW1zXHJcbiAgICAgICAgYXdhaXQgSXRlbXMudHh0SWNlQnVja2V0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy9pY2VCdWNrZXQucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEl0ZW1zLnR4dERtZ1VwLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy9kYW1hZ2VVcC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgSXRlbXMudHh0SGVhbHRoVXAubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0l0ZW1zL2hlYWx0aFVwLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBJdGVtcy50eHRTcGVlZFVwLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy9zcGVlZFVwLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBJdGVtcy50eHRUb3hpY1JlbGF0aW9uc2hpcC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvSXRlbXMvdG94aWNSZWxhdGlvbnNoaXAucG5nXCIpO1xyXG5cclxuXHJcbiAgICAgICAgQW5pbWF0aW9uR2VuZXJhdGlvbi5nZW5lcmF0ZUFuaW1hdGlvbk9iamVjdHMoKTtcclxuXHJcbiAgICAgICAgLy9UT0RPOiBVU0UgVEhJU1xyXG4gICAgICAgIC8vIGNvbnNvbGUuY2xlYXIoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmF3KCk6IHZvaWQge1xyXG4gICAgICAgIHZpZXdwb3J0LmRyYXcoKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2FtZXJhVXBkYXRlKCkge1xyXG4gICAgICAgIGxldCBkaXJlY3Rpb24gPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UoYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZShkZWx0YVRpbWUgKiBkYW1wZXIpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZShhdmF0YXIxLmNsaWVudC5taW5UaW1lQmV0d2VlblRpY2tzICogZGFtcGVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0ZShuZXcgxpIuVmVjdG9yMygtZGlyZWN0aW9uLngsIGRpcmVjdGlvbi55LCAwKSwgdHJ1ZSk7XHJcbiAgICAgICAgbWluaU1hcC5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGlvbi54ICsgbWluaU1hcC5vZmZzZXRYLCBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRpb24ueSArIG1pbmlNYXAub2Zmc2V0WSwgMCk7XHJcbiAgICB9XHJcblxyXG4gICAgxpIuTG9vcC5hZGRFdmVudExpc3RlbmVyKMaSLkVWRU5ULkxPT1BfRlJBTUUsIHVwZGF0ZSk7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJlc3NlbnRpYWxcIlxyXG5cclxufVxyXG4iLCJuYW1lc3BhY2UgVUkge1xyXG4gICAgLy9sZXQgZGl2VUk6IEhUTUxEaXZFbGVtZW50ID0gPEhUTUxEaXZFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiVUlcIik7XHJcbiAgICBsZXQgcGxheWVyMVVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjFcIik7XHJcbiAgICBsZXQgcGxheWVyMlVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjJcIik7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVVJKCkge1xyXG4gICAgICAgIC8vQXZhdGFyMSBVSVxyXG4gICAgICAgICg8SFRNTERpdkVsZW1lbnQ+cGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSFBcIikpLnN0eWxlLndpZHRoID0gKEdhbWUuYXZhdGFyMS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyAvIEdhbWUuYXZhdGFyMS5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAqIDEwMCkgKyBcIiVcIjtcclxuXHJcbiAgICAgICAgLy9JbnZlbnRvcnlVSVxyXG4gICAgICAgIEdhbWUuYXZhdGFyMS5pdGVtcy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGV4c2lzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmltZ1NyYyA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBleHNpc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIxVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikucXVlcnlTZWxlY3RvckFsbChcImltZ1wiKS5mb3JFYWNoKChpbWdFbGVtZW50KSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW1nTmFtZSA9IGVsZW1lbnQuaW1nU3JjLnNwbGl0KFwiL1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGltZ0VsZW1lbnQuc3JjLnNwbGl0KFwiL1wiKS5maW5kKGVsZW0gPT4gZWxlbSA9PSBpbWdOYW1lW2ltZ05hbWUubGVuZ3RoIC0gMV0pICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4c2lzdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgLy9ub25lIGV4c2lzdGluZyBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgICAgIGlmICghZXhzaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEhUTUxJbWFnZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc3JjID0gZWxlbWVudC5pbWdTcmM7XHJcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLmFwcGVuZENoaWxkKG5ld0l0ZW0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vQXZhdGFyMiBVSVxyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAoPEhUTUxEaXZFbGVtZW50PnBsYXllcjJVSS5xdWVyeVNlbGVjdG9yKFwiI0hQXCIpKS5zdHlsZS53aWR0aCA9IChHYW1lLmF2YXRhcjIuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLyBHYW1lLmF2YXRhcjIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgKiAxMDApICsgXCIlXCI7XHJcblxyXG4gICAgICAgICAgICAvL0ludmVudG9yeVVJXHJcbiAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5pdGVtcy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZXhzaXN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmltZ1NyYyA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcGxheWVyMlVJLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbWdcIikuZm9yRWFjaCgoaW1nRWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGltZ05hbWUgPSBlbGVtZW50LmltZ1NyYy5zcGxpdChcIi9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1nRWxlbWVudC5zcmMuc3BsaXQoXCIvXCIpLmZpbmQoZWxlbSA9PiBlbGVtID09IGltZ05hbWVbaW1nTmFtZS5sZW5ndGggLSAxXSkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4c2lzdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vbm9uZSBleHNpc3RpbmcgRE9NSW1nIGZvciBJdGVtXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFleHNpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEhUTUxJbWFnZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnNyYyA9IGVsZW1lbnQuaW1nU3JjO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikuYXBwZW5kQ2hpbGQobmV3SXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRaZXJvOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE9uZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRUb3c6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VGhyZWU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0Rm91cjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRGaXZlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNpeDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTZXZlbjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRFaWdodDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHROaW5lOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFRlbjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBEYW1hZ2VVSSBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLlVJO1xyXG4gICAgICAgIHVwOiBudW1iZXIgPSAwLjE1O1xyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXIgPSAwLjUgKiA2MDtcclxuICAgICAgICByYW5kb21YOiBudW1iZXIgPSBNYXRoLnJhbmRvbSgpICogMC4wNSAtIE1hdGgucmFuZG9tKCkgKiAwLjA1O1xyXG4gICAgICAgIGFzeW5jIGxpZmVzcGFuKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA+PSAwICYmIHRoaXMubGlmZXRpbWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saWZldGltZS0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfZGFtYWdlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJkYW1hZ2VVSVwiKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjMoMC4zMywgMC4zMywgMC4zMykpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgMC4yNSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWVzaCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckxpdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIikpKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUoX2RhbWFnZSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5SRU5ERVJfUFJFUEFSRSwgdGhpcy51cGRhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy5tb3ZlKCk7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXNwYW4oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIG1vdmUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShuZXcgxpIuVmVjdG9yMyh0aGlzLnJhbmRvbVgsIHRoaXMudXAsIDApKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGUoxpIuVmVjdG9yMy5PTkUoMS4wMSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZFRleHR1cmUoX2RhbWFnZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGxldCBuZXdUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgICAgICAgICAgbGV0IG5ld0NvYXQ6IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCA9IG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoKTtcclxuICAgICAgICAgICAgbGV0IG5ld010cjogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtdHJcIiwgxpIuU2hhZGVyRmxhdFRleHR1cmVkLCBuZXdDb2F0KTtcclxuICAgICAgICAgICAgbGV0IG9sZENvbUNvYXQ6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKCk7XHJcblxyXG4gICAgICAgICAgICBvbGRDb21Db2F0ID0gdGhpcy5nZXRDb21wb25lbnQoxpIuQ29tcG9uZW50TWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChNYXRoLmFicyhfZGFtYWdlKSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFplcm87XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0T25lO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFRvdztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRUaHJlZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNDpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRGb3VyO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEZpdmU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDY6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0U2V2ZW47XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDc6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0RWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDg6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0RWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDk6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0TmluZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMTA6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0VGVuO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RhbWFnZSA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdDb2F0LmNvbG9yID0gxpIuQ29sb3IuQ1NTKFwicmVkXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbmV3Q29hdC5jb2xvciA9IMaSLkNvbG9yLkNTUyhcImdyZWVuXCIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cCA9IDAuMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBuZXdDb2F0LnRleHR1cmUgPSBuZXdUeHQ7XHJcbiAgICAgICAgICAgIG9sZENvbUNvYXQubWF0ZXJpYWwgPSBuZXdNdHI7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBsZXQgaGVhbFBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHBvaXNvblBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IGJ1cm5QYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBibGVlZGluZ1BhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHNsb3dQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBpbW11bmVQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY29tbW9uUGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgcmFyZVBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IGVwaWNQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBsZWdlbmRhcnlQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBQYXJ0aWNsZXMgZXh0ZW5kcyBHYW1lLsaSQWlkLk5vZGVTcHJpdGUge1xyXG4gICAgICAgIGlkOiBCdWZmLkJVRkZJRCB8IEl0ZW1zLlJBUklUWTtcclxuICAgICAgICBhbmltYXRpb25QYXJ0aWNsZXM6IEdhbWUuxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb247XHJcbiAgICAgICAgcGFydGljbGVmcmFtZU51bWJlcjogbnVtYmVyO1xyXG4gICAgICAgIHBhcnRpY2xlZnJhbWVSYXRlOiBudW1iZXI7XHJcbiAgICAgICAgd2lkdGg6IG51bWJlcjtcclxuICAgICAgICBoZWlnaHQ6IG51bWJlcjtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEJ1ZmYuQlVGRklEIHwgSXRlbXMuUkFSSVRZLCBfdGV4dHVyZTogR2FtZS7Gki5UZXh0dXJlSW1hZ2UsIF9mcmFtZUNvdW50OiBudW1iZXIsIF9mcmFtZVJhdGU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihCdWZmLkJVRkZJRFtfaWRdLnRvTG93ZXJDYXNlKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gX2lkO1xyXG4gICAgICAgICAgICB0aGlzLnBhcnRpY2xlZnJhbWVOdW1iZXIgPSBfZnJhbWVDb3VudDtcclxuICAgICAgICAgICAgdGhpcy5wYXJ0aWNsZWZyYW1lUmF0ZSA9IF9mcmFtZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uUGFydGljbGVzID0gbmV3IEdhbWUuxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24oQnVmZi5CVUZGSURbX2lkXS50b0xvd2VyQ2FzZSgpLCBuZXcgxpIuQ29hdFRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpLCBfdGV4dHVyZSkpXHJcbiAgICAgICAgICAgIHRoaXMuaGVpZ2h0ID0gX3RleHR1cmUuaW1hZ2UuaGVpZ2h0O1xyXG4gICAgICAgICAgICB0aGlzLndpZHRoID0gX3RleHR1cmUuaW1hZ2Uud2lkdGggLyB0aGlzLnBhcnRpY2xlZnJhbWVOdW1iZXI7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvblBhcnRpY2xlcy5nZW5lcmF0ZUJ5R3JpZCjGki5SZWN0YW5nbGUuR0VUKDAsIDAsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSwgdGhpcy5wYXJ0aWNsZWZyYW1lTnVtYmVyLCAzMiwgxpIuT1JJR0lOMkQuQ0VOVEVSLCDGki5WZWN0b3IyLlgodGhpcy53aWR0aCkpO1xyXG4gICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbih0aGlzLmFuaW1hdGlvblBhcnRpY2xlcyk7XHJcbiAgICAgICAgICAgIHRoaXMuZnJhbWVyYXRlID0gX2ZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IEdhbWUuxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0ZVooMC4wMDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgVGFnIHtcclxuICAgIGV4cG9ydCBlbnVtIFRBRyB7XHJcbiAgICAgICAgUExBWUVSLFxyXG4gICAgICAgIEVORU1ZLFxyXG4gICAgICAgIEJVTExFVCxcclxuICAgICAgICBJVEVNLFxyXG4gICAgICAgIFJPT00sXHJcbiAgICAgICAgV0FMTCxcclxuICAgICAgICBET09SLFxyXG4gICAgICAgIE9CU1RJQ0FMLFxyXG4gICAgICAgIFVJXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW50aXR5IHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW50aXR5IGV4dGVuZHMgR2FtZS7GkkFpZC5Ob2RlU3ByaXRlIGltcGxlbWVudHMgSW50ZXJmYWNlcy5JTmV0d29ya2FibGUge1xyXG4gICAgICAgIHByaXZhdGUgY3VycmVudEFuaW1hdGlvblN0YXRlOiBBTklNQVRJT05TVEFURVM7XHJcbiAgICAgICAgcHJpdmF0ZSBwZXJmb3JtS25vY2tiYWNrOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRztcclxuICAgICAgICBwdWJsaWMgbmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgbmV0T2JqZWN0Tm9kZTogxpIuTm9kZSA9IHRoaXM7XHJcbiAgICAgICAgcHVibGljIGlkOiBFbnRpdHkuSUQ7XHJcbiAgICAgICAgcHVibGljIGF0dHJpYnV0ZXM6IEF0dHJpYnV0ZXM7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcjtcclxuICAgICAgICBwdWJsaWMgaXRlbXM6IEFycmF5PEl0ZW1zLkl0ZW0+ID0gW107XHJcbiAgICAgICAgcHVibGljIHdlYXBvbjogV2VhcG9ucy5XZWFwb247XHJcbiAgICAgICAgcHVibGljIGJ1ZmZzOiBCdWZmLkJ1ZmZbXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBvZmZzZXRDb2xsaWRlclg6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgb2Zmc2V0Q29sbGlkZXJZOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyU2NhbGVGYWt0b3I6IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgY2FuTW92ZVg6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgICAgIHByb3RlY3RlZCBjYW5Nb3ZlWTogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgcHJvdGVjdGVkIG1vdmVEaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgcHJvdGVjdGVkIGFuaW1hdGlvbkNvbnRhaW5lcjogQW5pbWF0aW9uR2VuZXJhdGlvbi5BbmltYXRpb25Db250YWluZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGlkbGVTY2FsZTogbnVtYmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBjdXJyZW50S25vY2tiYWNrOiDGki5WZWN0b3IzID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgcHVibGljIHNoYWRvdzogU2hhZG93O1xyXG5cclxuXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihnZXROYW1lQnlJZChfaWQpKTtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0gbmV3IEF0dHJpYnV0ZXMoMSwgMSwgMSwgMSwgMSwgMSwgMSwgMSk7XHJcbiAgICAgICAgICAgIGlmIChBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGFuaSA9IEFuaW1hdGlvbkdlbmVyYXRpb24uZ2V0QW5pbWF0aW9uQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uQ29udGFpbmVyID0gYW5pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pZGxlU2NhbGUgPSBhbmkuc2NhbGUuZmluZChhbmltYXRpb24gPT4gYW5pbWF0aW9uWzBdID09IFwiaWRsZVwiKVsxXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5vZmZzZXRDb2xsaWRlclggPSAwO1xyXG4gICAgICAgICAgICB0aGlzLm9mZnNldENvbGxpZGVyWSA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXJTY2FsZUZha3RvciA9IDE7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIobmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgKHRoaXMub2Zmc2V0Q29sbGlkZXJYICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLngpLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKyAodGhpcy5vZmZzZXRDb2xsaWRlclkgKiB0aGlzLm10eExvY2FsLnNjYWxpbmcueSkpLCAodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMikgKiB0aGlzLmNvbGxpZGVyU2NhbGVGYWt0b3IsIHRoaXMubmV0SWQpO1xyXG5cclxuXHJcbiAgICAgICAgICAgIGlmIChfbmV0SWQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5uZXRJZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5jdXJyZW50SURzLnB1c2goX25ldElkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV0SWQgPSBfbmV0SWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5ldElkID0gTmV0d29ya2luZy5pZEdlbmVyYXRvcigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoQW5pbWF0aW9uR2VuZXJhdGlvbi5nZXRBbmltYXRpb25CeUlkKHRoaXMuaWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGxldCBhbmkgPSBBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFuaW1hdGlvbkNvbnRhaW5lciA9IGFuaTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaWRsZVNjYWxlID0gYW5pLnNjYWxlLmZpbmQoYW5pbWF0aW9uID0+IGFuaW1hdGlvblswXSA9PSBcImlkbGVcIilbMV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5zaGFkb3cgPSBuZXcgU2hhZG93KHRoaXMpO1xyXG4gICAgICAgICAgICAvLyB0aGlzLmFkZENoaWxkKHRoaXMuc2hhZG93KTtcclxuICAgICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuUkVOREVSX1BSRVBBUkUsIHRoaXMuZXZlbnRVcGRhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGV2ZW50VXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUJ1ZmZzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2hhZG93LnVwZGF0ZVNoYWRvd1BvcygpO1xyXG4gICAgICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldENvbGxpZGVyKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVTY2FsZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLnVwZGF0ZVNjYWxlRGVwZW5kZW5jaWVzKCk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwuc2NhbGluZyA9IG5ldyDGki5WZWN0b3IzKHRoaXMuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLmF0dHJpYnV0ZXMuc2NhbGUpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnNldFNjYWxlKCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyKSAqIHRoaXMuY29sbGlkZXJTY2FsZUZha3Rvcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0Q29sbGlkZXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIuc2V0UG9zaXRpb24obmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgKHRoaXMub2Zmc2V0Q29sbGlkZXJYICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLngpLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKyAodGhpcy5vZmZzZXRDb2xsaWRlclkgKiB0aGlzLm10eExvY2FsLnNjYWxpbmcueSkpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCB1cGRhdGVCdWZmcygpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnVmZnMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnVmZnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVmZnNbaV0uZG9CdWZmU3R1ZmYodGhpcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBjb2xsaWRlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSB0cnVlO1xyXG4gICAgICAgICAgICBsZXQgd2FsbHM6IEdlbmVyYXRpb24uV2FsbFtdID0gR2FtZS5jdXJyZW50Um9vbS53YWxscztcclxuICAgICAgICAgICAgbGV0IHdhbGxDb2xsaWRlcnM6IEdhbWUuxpIuUmVjdGFuZ2xlW10gPSBbXTtcclxuICAgICAgICAgICAgd2FsbHMuZm9yRWFjaChlbGVtID0+IHtcclxuICAgICAgICAgICAgICAgIHdhbGxDb2xsaWRlcnMucHVzaChlbGVtLmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgbGV0IG1ld0RpcmVjdGlvbiA9IF9kaXJlY3Rpb24uY2xvbmU7XHJcbiAgICAgICAgICAgIGlmICghbWV3RGlyZWN0aW9uLmVxdWFscyhHYW1lLsaSLlZlY3RvcjMuWkVSTygpKSkge1xyXG4gICAgICAgICAgICAgICAgbWV3RGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgbWV3RGlyZWN0aW9uLnNjYWxlKChHYW1lLmRlbHRhVGltZSAqIHRoaXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlQ29sbGlzaW9uKHdhbGxDb2xsaWRlcnMsIG1ld0RpcmVjdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgY2FsY3VsYXRlQ29sbGlzaW9uKF9jb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXJbXSB8IEdhbWUuxpIuUmVjdGFuZ2xlW10sIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgX2NvbGxpZGVyLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgQ29sbGlkZXIuQ29sbGlkZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQmVmb3JlTW92ZSA9IGludGVyc2VjdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IHRoaXMuY29sbGlkZXIuZ2V0UmFkaXVzICsgZWxlbWVudC5nZXRSYWRpdXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvbGRQb3NpdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIodGhpcy5jb2xsaWRlci5wb3NpdGlvbi54LCB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoX2RpcmVjdGlvbi54LCAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50KSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVggPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMigwLCBfZGlyZWN0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50KSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5vd25lck5ldElkID09IEdhbWUuYXZhdGFyMS5uZXRJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5nZXRLbm9ja2JhY2sodGhpcy5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50Lm93bmVyTmV0SWQgPT0gR2FtZS5hdmF0YXIyLm5ldElkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5rbm9ja2JhY2tQdXNoKHRoaXMuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChlbGVtZW50IGluc3RhbmNlb2YgR2FtZS7Gki5SZWN0YW5nbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlc1JlY3QoZWxlbWVudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFCZWZvcmVNb3ZlID0gaW50ZXJzZWN0aW9uLmhlaWdodCAqIGludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IHRoaXMubXR4TG9jYWwuc2NhbGluZy54ICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvbGRQb3NpdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIodGhpcy5jb2xsaWRlci5wb3NpdGlvbi54LCB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoX2RpcmVjdGlvbi54LCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uLmhlaWdodCAqIG5ld0ludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoMCwgX2RpcmVjdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uLmhlaWdodCAqIG5ld0ludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVZID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXREYW1hZ2UoX3ZhbHVlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKF92YWx1ZSAhPSBudWxsICYmIHRoaXMuYXR0cmlidXRlcy5oaXRhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGhpdFZhbHVlID0gdGhpcy5nZXREYW1hZ2VSZWR1Y3Rpb24oX3ZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC09IGhpdFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IFVJLkRhbWFnZVVJKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24sIE1hdGgucm91bmQoaGl0VmFsdWUpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVVSSh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBNYXRoLnJvdW5kKGhpdFZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA8PSAwKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucmVtb3ZlRW5lbXkodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZGllKCkge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBnZXREYW1hZ2VSZWR1Y3Rpb24oX3ZhbHVlOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gX3ZhbHVlICogKDEgLSAodGhpcy5hdHRyaWJ1dGVzLmFybW9yIC8gMTAwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vI3JlZ2lvbiBrbm9ja2JhY2tcclxuICAgICAgICBwdWJsaWMgZG9Lbm9ja2JhY2soX2JvZHk6IEVudGl0eS5FbnRpdHkpIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMucGVyZm9ybUtub2NrYmFjaykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wZXJmb3JtS25vY2tiYWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBfcG9zaXRpb24udG9WZWN0b3IyKCkpLnRvVmVjdG9yMygwKTtcclxuICAgICAgICAgICAgICAgIGxldCBrbm9ja0JhY2tTY2FsaW5nOiBudW1iZXIgPSBHYW1lLmRlbHRhVGltZSAqIHRoaXMuYXR0cmlidXRlcy5zY2FsZTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKF9rbm9ja2JhY2tGb3JjZSAqIGtub2NrQmFja1NjYWxpbmcpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEtub2NrYmFjay5hZGQoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHJlZHVjZUtub2NrYmFjaygpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50S25vY2tiYWNrLnNjYWxlKDAuNSk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuY3VycmVudEtub2NrYmFjay5tYWduaXR1ZGUpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50S25vY2tiYWNrLm1hZ25pdHVkZSA8IDAuMDAwMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50S25vY2tiYWNrID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMucGVyZm9ybUtub2NrYmFjayA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICBwdWJsaWMgc3dpdGNoQW5pbWF0aW9uKF9uYW1lOiBBTklNQVRJT05TVEFURVMpIHtcclxuICAgICAgICAgICAgbGV0IG5hbWU6IHN0cmluZyA9IEFOSU1BVElPTlNUQVRFU1tfbmFtZV0udG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYW5pbWF0aW9uQ29udGFpbmVyICE9IG51bGwgJiYgPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbbmFtZV0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlICE9IF9uYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChfbmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEFOSU1BVElPTlNUQVRFUy5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbbmFtZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QW5pbWF0aW9uU3RhdGUgPSBBTklNQVRJT05TVEFURVMuSURMRTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEFOSU1BVElPTlNUQVRFUy5XQUxLOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbbmFtZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QW5pbWF0aW9uU3RhdGUgPSBBTklNQVRJT05TVEFURVMuV0FMSztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEFOSU1BVElPTlNUQVRFUy5TVU1NT046XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25Db250YWluZXIuYW5pbWF0aW9uc1tuYW1lXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBbmltYXRpb25TdGF0ZSA9IEFOSU1BVElPTlNUQVRFUy5TVU1NT047XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuQVRUQUNLOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbbmFtZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QW5pbWF0aW9uU3RhdGUgPSBBTklNQVRJT05TVEFURVMuQVRUQUNLO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmZyYW1lcmF0ZSA9IHRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmZyYW1lUmF0ZS5maW5kKG9iaiA9PiBvYmpbMF0gPT0gbmFtZSlbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRGcmFtZURpcmVjdGlvbigxKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUFuaW1hdGlvblN0YXRlKHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUud2FybihcIm5vIGFuaW1hdGlvbkNvbnRhaW5lciBvciBhbmltYXRpb24gd2l0aCBuYW1lOiBcIiArIG5hbWUgKyBcIiBhdCBFbnRpdHk6IFwiICsgdGhpcy5uYW1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGVudW0gQU5JTUFUSU9OU1RBVEVTIHtcclxuICAgICAgICBJRExFLCBXQUxLLCBTVU1NT04sIEFUVEFDS1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBlbnVtIEJFSEFWSU9VUiB7XHJcbiAgICAgICAgSURMRSwgRk9MTE9XLCBGTEVFLCBTVU1NT04sIEFUVEFDS1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBlbnVtIElEIHtcclxuICAgICAgICBSQU5HRUQsXHJcbiAgICAgICAgTUVMRUUsXHJcbiAgICAgICAgTUVSQ0hBTlQsXHJcbiAgICAgICAgQkFULFxyXG4gICAgICAgIFJFRFRJQ0ssXHJcbiAgICAgICAgU01BTExUSUNLLFxyXG4gICAgICAgIFNLRUxFVE9OLFxyXG4gICAgICAgIE9HRVIsXHJcbiAgICAgICAgU1VNTU9OT1JcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0TmFtZUJ5SWQoX2lkOiBFbnRpdHkuSUQpOiBzdHJpbmcge1xyXG4gICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgIGNhc2UgSUQuUkFOR0VEOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwicmFuZ2VkXCI7XHJcbiAgICAgICAgICAgIGNhc2UgSUQuTUVMRUU6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ0YW5rXCI7XHJcbiAgICAgICAgICAgIGNhc2UgSUQuQkFUOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiYmF0XCI7XHJcbiAgICAgICAgICAgIGNhc2UgSUQuUkVEVElDSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInJlZFRpY2tcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5TTUFMTFRJQ0s6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJzbWFsbFRpY2tcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5TS0VMRVRPTjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInNrZWxldG9uXCI7XHJcbiAgICAgICAgICAgIGNhc2UgSUQuT0dFUjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIm9nZXJcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5TS0VMRVRPTjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInN1bW1vbm9yXCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEVuZW15IHtcclxuXHJcbiAgICBleHBvcnQgZW51bSBFTkVNWUNMQVNTIHtcclxuICAgICAgICBFTkVNWURVTUIsXHJcbiAgICAgICAgRU5FTVlEQVNILFxyXG4gICAgICAgIEVORU1ZU01BU0gsXHJcbiAgICAgICAgRU5FTVlQQVRST0wsXHJcbiAgICAgICAgRU5FTVlTSE9PVCxcclxuICAgICAgICBTVU1NT05PUixcclxuICAgICAgICBTVU1NT05PUkFERFNcclxuICAgIH1cclxuXHJcbiAgICBpbXBvcnQgxpJBaWQgPSBGdWRnZUFpZDtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXkgZXh0ZW5kcyBFbnRpdHkuRW50aXR5IGltcGxlbWVudHMgSW50ZXJmYWNlcy5JS25vY2tiYWNrYWJsZSB7XHJcbiAgICAgICAgY3VycmVudEJlaGF2aW91cjogRW50aXR5LkJFSEFWSU9VUjtcclxuICAgICAgICB0YXJnZXQ6IMaSLlZlY3RvcjI7XHJcbiAgICAgICAgbW92ZURpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICBmbG9ja2luZzogRmxvY2tpbmdCZWhhdmlvdXI7XHJcbiAgICAgICAgaXNBZ2dyZXNzaXZlOiBib29sZWFuO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy50YWcgPSBUYWcuVEFHLkVORU1ZO1xyXG4gICAgICAgICAgICB0aGlzLmlzQWdncmVzc2l2ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBsZXQgcmVmID0gR2FtZS5lbmVtaWVzSlNPTi5maW5kKGVuZW15ID0+IGVuZW15Lm5hbWUgPT0gRW50aXR5LklEW19pZF0udG9Mb3dlckNhc2UoKSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2cocmVmKTtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0gbmV3IEVudGl0eS5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCwgcmVmLmF0dHJpYnV0ZXMuc2NhbGUsIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCByZWYuYXR0cmlidXRlcy5hcm1vciwgcmVmLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24sIHJlZi5hdHRyaWJ1dGVzLmFjY3VyYWN5KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW1wiaWRsZVwiXSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoX3Bvc2l0aW9uLngsIF9wb3NpdGlvbi55LCAwLjEpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgxpIuVmVjdG9yMyh0aGlzLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy5hdHRyaWJ1dGVzLnNjYWxlKTtcclxuICAgICAgICAgICAgdGhpcy5vZmZzZXRDb2xsaWRlclggPSByZWYub2Zmc2V0Q29sbGlkZXJYO1xyXG4gICAgICAgICAgICB0aGlzLm9mZnNldENvbGxpZGVyWSA9IHJlZi5vZmZzZXRDb2xsaWRlclk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXJTY2FsZUZha3RvciA9IHJlZi5jb2xsaWRlclNjYWxlRmFrdG9yO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKG5ldyDGki5WZWN0b3IyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueCArIChyZWYub2Zmc2V0Q29sbGlkZXJYICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLngpLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKyAocmVmLm9mZnNldENvbGxpZGVyWSAqIHRoaXMubXR4TG9jYWwuc2NhbGluZy55KSksICgodGhpcy5tdHhMb2NhbC5zY2FsaW5nLnggKiB0aGlzLmlkbGVTY2FsZSkgLyAyKSAqIHRoaXMuY29sbGlkZXJTY2FsZUZha3RvciwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBzdXBlci51cGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZUJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlKHRoaXMubW92ZURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVuZW15UG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHVibGljIGdldERhbWFnZShfdmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5nZXREYW1hZ2UoX3ZhbHVlKTtcclxuICAgICAgICAgICAgdGhpcy5pc0FnZ3Jlc3NpdmUgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRvS25vY2tiYWNrKF9ib2R5OiBFbnRpdHkuRW50aXR5KTogdm9pZCB7XHJcbiAgICAgICAgICAgIC8vICg8UGxheWVyLlBsYXllcj5fYm9keSkuZ2V0S25vY2tiYWNrKHRoaXMuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZSwgX3Bvc2l0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIC8vIHRoaXMubW92ZURpcmVjdGlvbi5hZGQoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzQWdncmVzc2l2ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyB0aGlzLm1vdmVEaXJlY3Rpb24uc3VidHJhY3QoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCkge1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIG1vdmVTaW1wbGUoX3RhcmdldDogxpIuVmVjdG9yMik6IMaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IF90YXJnZXQ7XHJcbiAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZUF3YXkoX3RhcmdldDogxpIuVmVjdG9yMik6IMaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBsZXQgbW92ZVNpbXBsZSA9IHRoaXMubW92ZVNpbXBsZShfdGFyZ2V0KTtcclxuICAgICAgICAgICAgbW92ZVNpbXBsZS54ICo9IC0xO1xyXG4gICAgICAgICAgICBtb3ZlU2ltcGxlLnkgKj0gLTE7XHJcbiAgICAgICAgICAgIHJldHVybiBtb3ZlU2ltcGxlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGRpZSgpIHtcclxuICAgICAgICAgICAgR2FtZS5jdXJyZW50Um9vbS5lbmVteUNvdW50TWFuYWdlci5vbkVuZW15RGVhdGgoKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgbGV0IGtub2NrYmFjayA9IHRoaXMuY3VycmVudEtub2NrYmFjay5jbG9uZTtcclxuICAgICAgICAgICAgaWYgKGtub2NrYmFjay5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImRpcmVjdGlvbjogXCIgKyBrbm9ja2JhY2subWFnbml0dWRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5hZGQoa25vY2tiYWNrKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5zY2FsZSgoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuICAgICAgICAgICAgICAgIGtub2NrYmFjay5zY2FsZSgoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgc3VwZXIuY29sbGlkZShfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgYXZhdGFyOiBQbGF5ZXIuUGxheWVyW10gPSAoPFBsYXllci5QbGF5ZXJbXT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlBMQVlFUikpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGF2YXRhckNvbGxpZGVyczogQ29sbGlkZXIuQ29sbGlkZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgYXZhdGFyLmZvckVhY2goKGVsZW0pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBhdmF0YXJDb2xsaWRlcnMucHVzaCgoPFBsYXllci5QbGF5ZXI+ZWxlbSkuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVDb2xsaXNpb24oYXZhdGFyQ29sbGlkZXJzLCBfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jYW5Nb3ZlWCAmJiB0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNhbk1vdmVYICYmICF0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9kaXJlY3Rpb24ueCwgMCwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuY2FuTW92ZVggJiYgdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMygwLCBfZGlyZWN0aW9uLnksIF9kaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnN1YnRyYWN0KGtub2NrYmFjayk7XHJcbiAgICAgICAgICAgICAgICBpZiAoa25vY2tiYWNrLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImtub2NrYmFjazogXCIgKyBrbm9ja2JhY2subWFnbml0dWRlKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImRpcmVjdGlvbjogXCIgKyBfZGlyZWN0aW9uLm1hZ25pdHVkZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMucmVkdWNlS25vY2tiYWNrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlEdW1iIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIHB1YmxpYyBmbG9ja2luZzogRmxvY2tpbmdCZWhhdmlvdXIgPSBuZXcgRmxvY2tpbmdCZWhhdmlvdXIodGhpcywgMiwgMiwgMC4xLCAxLCAxLCAxLCAwLCAxKTtcclxuICAgICAgICBwcml2YXRlIGFnZ3Jlc3NpdmVEaXN0YW5jZTogbnVtYmVyID0gMyAqIDM7XHJcbiAgICAgICAgcHJpdmF0ZSBzdGFtaW5hOiBBYmlsaXR5LkNvb2xkb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oMTgwKTtcclxuICAgICAgICBwcml2YXRlIHJlY292ZXI6IEFiaWxpdHkuQ29vbGRvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93big2MCk7XHJcbiAgICAgICAgYmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlU3F1YXJlZDtcclxuICAgICAgICAgICAgdGhpcy5mbG9ja2luZy51cGRhdGUoKTtcclxuICAgICAgICAgICAgLy9UT0RPOiBzZXQgdG8gMyBhZnRlciB0ZXN0aW5nXHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZSA8IHRoaXMuYWdncmVzc2l2ZURpc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzQWdncmVzc2l2ZSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBZ2dyZXNzaXZlICYmICF0aGlzLnJlY292ZXIuaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuRk9MTE9XO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLklETEU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuc3RhbWluYS5oYXNDb29sRG93biAmJiAhdGhpcy5yZWNvdmVyLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhbWluYS5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0YW1pbmEuaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5mbG9ja2luZy5nZXRNb3ZlVmVjdG9yKCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0YW1pbmEuZ2V0Q3VycmVudENvb2xkb3duID09IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVjb3Zlci5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLklETEU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteVNtYXNoIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIGNvb2xEb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oNSk7XHJcbiAgICAgICAgYXZhdGFyczogUGxheWVyLlBsYXllcltdID0gW107XHJcbiAgICAgICAgcmFuZG9tUGxheWVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKTtcclxuICAgICAgICBjdXJyZW50QmVoYXZpb3VyOiBFbnRpdHkuQkVIQVZJT1VSID0gRW50aXR5LkJFSEFWSU9VUi5JRExFO1xyXG5cclxuXHJcbiAgICAgICAgYmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhcnMgPSBbR2FtZS5hdmF0YXIxLCBHYW1lLmF2YXRhcjJdO1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9ICg8UGxheWVyLlBsYXllcj50aGlzLmF2YXRhcnNbdGhpcy5yYW5kb21QbGF5ZXJdKS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEJlaGF2aW91ciA9PSBFbnRpdHkuQkVIQVZJT1VSLkFUVEFDSyAmJiB0aGlzLmdldEN1cnJlbnRGcmFtZSA+PSAoPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbXCJhdHRhY2tcIl0pLmZyYW1lcy5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLklETEU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgNCAmJiAhdGhpcy5jb29sRG93bi5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb29sRG93bi5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLkFUVEFDSztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5jb29sRG93bi5oYXNDb29sRG93biAmJiB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgIT0gRW50aXR5LkJFSEFWSU9VUi5JRExFKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLklETEU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEJlaGF2aW91ciAhPSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5iZWhhdmlvdXIoKTtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVTaW1wbGUodGhpcy50YXJnZXQpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkFUVEFDSzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLkFUVEFDSyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteURhc2ggZXh0ZW5kcyBFbmVteSB7XHJcbiAgICAgICAgcHJvdGVjdGVkIGRhc2ggPSBuZXcgQWJpbGl0eS5EYXNoKHRoaXMubmV0SWQsIDEyLCAxLCA1ICogNjAsIDMpO1xyXG4gICAgICAgIGxhc3RNb3ZlRGlyZWNpdG9uOiBHYW1lLsaSLlZlY3RvcjM7XHJcbiAgICAgICAgZGFzaENvdW50OiBudW1iZXIgPSAxO1xyXG4gICAgICAgIGF2YXRhcnM6IFBsYXllci5QbGF5ZXJbXSA9IFtdO1xyXG4gICAgICAgIHJhbmRvbVBsYXllciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSk7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9wb3NpdGlvbiwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5mbG9ja2luZyA9IG5ldyBGbG9ja2luZ0JlaGF2aW91cih0aGlzLCAzLCAwLjgsIDEuNSwgMSwgMSwgMC4xLCAwKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIGJlaGF2aW91cigpIHtcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXJzID0gW0dhbWUuYXZhdGFyMSwgR2FtZS5hdmF0YXIyXVxyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9ICg8UGxheWVyLlBsYXllcj50aGlzLmF2YXRhcnNbdGhpcy5yYW5kb21QbGF5ZXJdKS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlU3F1YXJlZDtcclxuICAgICAgICAgICAgdGhpcy5mbG9ja2luZy51cGRhdGUoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghdGhpcy5kYXNoLmhhc0Nvb2xkb3duKCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuRk9MTE9XO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChNYXRoLnJhbmRvbSgpICogMTAwIDwgMC4xKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRhc2guZG9BYmlsaXR5KCk7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMubW92ZURpcmVjdGlvbi5tYWduaXR1ZGVTcXVhcmVkID4gMC4wMDA1KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYmVoYXZpb3VyKCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jdXJyZW50QmVoYXZpb3VyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRk9MTE9XOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5kYXNoLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMuZmxvY2tpbmcuZ2V0TW92ZVZlY3RvcigpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RNb3ZlRGlyZWNpdG9uID0gdGhpcy5tb3ZlRGlyZWN0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZMRUU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVBd2F5KHRoaXMudGFyZ2V0KS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlQYXRyb2wgZXh0ZW5kcyBFbmVteSB7XHJcbiAgICAgICAgcGF0cm9sUG9pbnRzOiDGki5WZWN0b3IyW10gPSBbbmV3IMaSLlZlY3RvcjIoMCwgNCksIG5ldyDGki5WZWN0b3IyKDUsIDApXTtcclxuICAgICAgICB3YWl0VGltZTogbnVtYmVyID0gMTAwMDtcclxuICAgICAgICBjdXJyZW5Qb2ludEluZGV4OiBudW1iZXIgPSAwO1xyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnBhdHJvbCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGF0cm9sKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZSjGki5WZWN0b3IzLlNVTSh0aGlzLnBhdHJvbFBvaW50c1t0aGlzLmN1cnJlblBvaW50SW5kZXhdLnRvVmVjdG9yMygpLCBHYW1lLmN1cnJlbnRSb29tLm10eExvY2FsLnRyYW5zbGF0aW9uKSkgPiAwLjMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZVNpbXBsZSgoxpIuVmVjdG9yMi5TVU0odGhpcy5wYXRyb2xQb2ludHNbdGhpcy5jdXJyZW5Qb2ludEluZGV4XSwgR2FtZS5jdXJyZW50Um9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSkpKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlblBvaW50SW5kZXggKyAxIDwgdGhpcy5wYXRyb2xQb2ludHMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVuUG9pbnRJbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW5Qb2ludEluZGV4ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LCB0aGlzLndhaXRUaW1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15U2hvb3QgZXh0ZW5kcyBFbmVteSB7XHJcbiAgICAgICAgdmlld1JhZGl1czogbnVtYmVyID0gMztcclxuICAgICAgICBnb3RSZWNvZ25pemVkOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9wb3NpdGlvbiwgX25ldElkKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMud2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKDYwLCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuU1RBTkRBUkQsIDIsIHRoaXMubmV0SWQsIFdlYXBvbnMuQUlNLk5PUk1BTCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGU7XHJcblxyXG4gICAgICAgICAgICBpZiAoZGlzdGFuY2UgPCA1KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVBd2F5KHRoaXMudGFyZ2V0KS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ290UmVjb2duaXplZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zaG9vdCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldERhbWFnZShfdmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5nZXREYW1hZ2UoX3ZhbHVlKTtcclxuICAgICAgICAgICAgdGhpcy5nb3RSZWNvZ25pemVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzaG9vdChfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKS50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgbGV0IF9kaXJlY3Rpb24gPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKDApLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLm1hZ25pdHVkZSA8IDMgfHwgdGhpcy5nb3RSZWNvZ25pemVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndlYXBvbi5zaG9vdCh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBfZGlyZWN0aW9uLCBfbmV0SWQsIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgLy8gaWYgKHRoaXMud2VhcG9uLmN1cnJlbnRBdHRhY2tDb3VudCA+IDAgJiYgX2RpcmVjdGlvbi5tYWduaXR1ZGUgPCB0aGlzLnZpZXdSYWRpdXMpIHtcclxuICAgICAgICAgICAgLy8gICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIC8vICAgICAvLyBsZXQgYnVsbGV0OiBCdWxsZXRzLkJ1bGxldCA9IG5ldyBCdWxsZXRzLkhvbWluZ0J1bGxldChuZXcgxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KSwgX2RpcmVjdGlvbiwgQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiksIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIC8vICAgICBidWxsZXQub3duZXIgPSB0aGlzLnRhZztcclxuICAgICAgICAgICAgLy8gICAgIGJ1bGxldC5mbHlEaXJlY3Rpb24uc2NhbGUoMSAvIEdhbWUuZnJhbWVSYXRlICogYnVsbGV0LnNwZWVkKTtcclxuICAgICAgICAgICAgLy8gICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoYnVsbGV0KTtcclxuICAgICAgICAgICAgLy8gICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgLy8gICAgICAgICBOZXR3b3JraW5nLnNwYXduQnVsbGV0QXRFbmVteShidWxsZXQubmV0SWQsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIHRoaXMud2VhcG9uLmN1cnJlbnRBdHRhY2tDb3VudC0tO1xyXG4gICAgICAgICAgICAvLyAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgU3VtbW9ub3JBZGRzIGV4dGVuZHMgRW5lbXlEYXNoIHtcclxuICAgICAgICBhdmF0YXI6IFBsYXllci5QbGF5ZXI7XHJcbiAgICAgICAgcmFuZG9tUGxheWVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX3RhcmdldDogUGxheWVyLlBsYXllciwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhciA9IF90YXJnZXQ7XHJcbiAgICAgICAgICAgIHRoaXMuZmxvY2tpbmcgPSBuZXcgRmxvY2tpbmdCZWhhdmlvdXIodGhpcywgMywgMC44LCAxLjUsIDEsIDEsIDAuMSwgMCk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IHRoaXMuYXZhdGFyLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlID4gNSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGRpc3RhbmNlIDwgMykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kYXNoLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuZmxvY2tpbmcudXBkYXRlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5kYXNoLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdE1vdmVEaXJlY2l0b24gPSB0aGlzLm1vdmVEaXJlY3Rpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMuZmxvY2tpbmcuZ2V0TW92ZVZlY3RvcigpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRkxFRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZUF3YXkodGhpcy50YXJnZXQpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgLy8gZXhwb3J0IGNsYXNzIEVuZW15Q2lyY2xlIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgLy8gICAgIGRpc3RhbmNlOiBudW1iZXIgPSA1O1xyXG5cclxuICAgIC8vICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3RlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyKSB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyKF9uYW1lLCBfcHJvcGVydGllcywgX3Bvc2l0aW9uKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIG1vdmUoKTogdm9pZCB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyLm1vdmUoKTtcclxuICAgIC8vICAgICAgICAgdGhpcy5tb3ZlQ2lyY2xlKCk7XHJcbiAgICAvLyAgICAgfVxyXG5cclxuICAgIC8vICAgICBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpOiB2b2lkIHtcclxuICAgIC8vICAgICAgICAgc3VwZXIubGlmZXNwYW4oX2dyYXBoKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIGFzeW5jIG1vdmVDaXJjbGUoKSB7XHJcbiAgICAvLyAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnRhcmdldCk7XHJcbiAgICAvLyAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjEgPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgIC8vICAgICAgICAgLy8gbGV0IGRpc3RhbmNlUGxheWVyMiA9IHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKEdhbWUucGxheWVyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICBpZiAoZGlzdGFuY2VQbGF5ZXIxID4gdGhpcy5kaXN0YW5jZSkge1xyXG4gICAgLy8gICAgICAgICAgICAgdGhpcy5tb3ZlU2ltcGxlKCk7XHJcbiAgICAvLyAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgZWxzZSB7XHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgZGVncmVlID0gQ2FsY3VsYXRpb24uY2FsY0RlZ3JlZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy50YXJnZXQpXHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgYWRkID0gMDtcclxuXHJcbiAgICAvLyAgICAgICAgICAgICAvLyB3aGlsZSAoZGlzdGFuY2VQbGF5ZXIxIDw9IHRoaXMuZGlzdGFuY2UpIHtcclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgSW5wdXRTeXN0ZW0uY2FsY1Bvc2l0aW9uRnJvbURlZ3JlZShkZWdyZWUgKyBhZGQsIHRoaXMuZGlzdGFuY2UpLnRvVmVjdG9yMygwKSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBkaXJlY3Rpb24uc2NhbGUoKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKGRpcmVjdGlvbiwgdHJ1ZSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgYWRkICs9IDU7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyB9XHJcblxyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgfVxyXG4gICAgLy8gfVxyXG59IiwibmFtZXNwYWNlIEludGVyZmFjZXMge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJU3Bhd25hYmxlIHtcclxuICAgICAgICBsaWZldGltZT86IG51bWJlcjtcclxuICAgICAgICBkZXNwYXduKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJS25vY2tiYWNrYWJsZSB7XHJcbiAgICAgICAgZG9Lbm9ja2JhY2soX2JvZHk6IEVudGl0eS5FbnRpdHkpOiB2b2lkO1xyXG4gICAgICAgIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUtpbGxhYmxlIHtcclxuICAgICAgICBvbkRlYXRoKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRGFtYWdlYWJsZSB7XHJcbiAgICAgICAgZ2V0RGFtYWdlKCk6IHZvaWQ7XHJcbiAgICB9XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElBdHRyaWJ1dGVWYWx1ZVBheWxvYWQge1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXIgfCBib29sZWFuO1xyXG4gICAgICAgIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU5ldHdvcmthYmxlIHtcclxuICAgICAgICBuZXRJZDogbnVtYmVyO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU5ldHdvcmtPYmplY3RzIHtcclxuICAgICAgICBuZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIG5ldE9iamVjdE5vZGU6IEdhbWUuxpIuTm9kZTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElJbnB1dEJ1bGxldFBheWxvYWQge1xyXG4gICAgICAgIHRpY2s6IG51bWJlcjtcclxuICAgICAgICBpbnB1dFZlY3RvcjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElJbnB1dEF2YXRhclBheWxvYWQge1xyXG4gICAgICAgIHRpY2s6IG51bWJlcjtcclxuICAgICAgICBpbnB1dFZlY3RvcjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgICAgIGRvZXNBYmlsaXR5OiBib29sZWFuO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSVN0YXRlUGF5bG9hZCB7XHJcbiAgICAgICAgdGljazogbnVtYmVyO1xyXG4gICAgICAgIHBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjM7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZXhwb3J0IGludGVyZmFjZSBCdWxsZXRJbmZvcm1hdGlvbiB7XHJcbiAgICAvLyAgICAgc3BlZWQ6IG51bWJlcjtcclxuICAgIC8vICAgICBoaXRQb2ludDogbnVtYmVyO1xyXG4gICAgLy8gICAgIGxpZmVUaW1lOiBudW1iZXI7XHJcbiAgICAvLyAgICAga25vY2tiYWNrRm9yY2U6IG51bWJlcjtcclxuICAgIC8vICAgICBwYXNzdGhyb3VnaEVuZW15OiBudW1iZXI7XHJcbiAgICAvLyAgICAgcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgIC8vICAgICBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgIC8vICAgICByb3RhdGlvbkRlZzogbnVtYmVyO1xyXG4gICAgLy8gICAgIGhvbWluZ1RhcmdldD86IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgIC8vIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElSb29tRXhpdHMge1xyXG4gICAgICAgIG5vcnRoOiBib29sZWFuO1xyXG4gICAgICAgIGVhc3Q6IGJvb2xlYW47XHJcbiAgICAgICAgc291dGg6IGJvb2xlYW47XHJcbiAgICAgICAgd2VzdDogYm9vbGVhbjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElSb29tIHtcclxuICAgICAgICBjb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHJvb21TaXplOiBudW1iZXI7XHJcbiAgICAgICAgZXhpdHM6IElSb29tRXhpdHM7XHJcbiAgICAgICAgcm9vbVR5cGU6IEdlbmVyYXRpb24uUk9PTVRZUEU7XHJcbiAgICAgICAgdHJhbnNsYXRpb246IEdhbWUuxpIuVmVjdG9yMztcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElNaW5pbWFwSW5mb3Mge1xyXG4gICAgICAgIGNvb3JkczogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHJvb21UeXBlOiBHZW5lcmF0aW9uLlJPT01UWVBFO1xyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEl0ZW1zIHtcclxuICAgIGV4cG9ydCBlbnVtIElURU1JRCB7XHJcbiAgICAgICAgSUNFQlVDS0VUQ0hBTExFTkdFLFxyXG4gICAgICAgIERNR1VQLFxyXG4gICAgICAgIFNQRUVEVVAsXHJcbiAgICAgICAgUFJPSkVDVElMRVNVUCxcclxuICAgICAgICBIRUFMVEhVUCxcclxuICAgICAgICBTQ0FMRVVQLFxyXG4gICAgICAgIFNDQUxFRE9XTixcclxuICAgICAgICBBUk1PUlVQLFxyXG4gICAgICAgIEhPTUVDT01JTkcsXHJcbiAgICAgICAgVE9YSUNSRUxBVElPTlNISVAsXHJcbiAgICAgICAgVkFNUFksXHJcbiAgICAgICAgU0xPV1lTTE9XLFxyXG4gICAgICAgIFRIT1JTSEFNTUVSXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRJY2VCdWNrZXQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0RG1nVXA6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0SGVhbHRoVXA6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VG94aWNSZWxhdGlvbnNoaXA6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U3BlZWRVcDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuXHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgSXRlbSBleHRlbmRzIEdhbWUuxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuSVRFTTtcclxuICAgICAgICBpZDogSVRFTUlEO1xyXG4gICAgICAgIHB1YmxpYyByYXJpdHk6IFJBUklUWTtcclxuICAgICAgICBwdWJsaWMgbmV0SWQ6IG51bWJlciA9IE5ldHdvcmtpbmcuaWRHZW5lcmF0b3IoKTtcclxuICAgICAgICBwdWJsaWMgZGVzY3JpcHRpb246IHN0cmluZztcclxuICAgICAgICBwdWJsaWMgaW1nU3JjOiBzdHJpbmc7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcjtcclxuICAgICAgICB0cmFuc2Zvcm06IMaSLkNvbXBvbmVudFRyYW5zZm9ybSA9IG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKTtcclxuICAgICAgICBwcml2YXRlIHBvc2l0aW9uOiDGki5WZWN0b3IyOyBnZXQgZ2V0UG9zaXRpb24oKTogxpIuVmVjdG9yMiB7IHJldHVybiB0aGlzLnBvc2l0aW9uIH1cclxuICAgICAgICBidWZmOiBCdWZmLkJ1ZmZbXSA9IFtdO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IElURU1JRCwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKElURU1JRFtfaWRdKTtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgaWYgKF9uZXRJZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucG9wSUQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLmN1cnJlbnRJRHMucHVzaChfbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IMaSLk1lc2hRdWFkKCkpKTtcclxuICAgICAgICAgICAgbGV0IG1hdGVyaWFsOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIndoaXRlXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChtYXRlcmlhbCkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5idWZmLnB1c2godGhpcy5nZXRCdWZmQnlJZCgpKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRUZXh0dXJlQnlJZCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNsb25lKCk6IEl0ZW0ge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGFkZFJhcml0eUJ1ZmYoKSB7XHJcbiAgICAgICAgICAgIGxldCBidWZmID0gbmV3IEJ1ZmYuUmFyaXR5QnVmZih0aGlzLnJhcml0eSk7XHJcbiAgICAgICAgICAgIGJ1ZmYuYWRkVG9JdGVtKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEJ1ZmZCeUlkKCk6IEJ1ZmYuQnVmZiB7XHJcbiAgICAgICAgICAgIGxldCB0ZW1wOiBJdGVtcy5CdWZmSXRlbSA9IGdldEJ1ZmZJdGVtQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5UT1hJQ1JFTEFUSU9OU0hJUDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJ1ZmYuRGFtYWdlQnVmZihCdWZmLkJVRkZJRC5QT0lTT04sIHRlbXAuZHVyYXRpb24sIHRlbXAudGlja1JhdGUsIHRlbXAudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVkFNUFk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCdWZmLkRhbWFnZUJ1ZmYoQnVmZi5CVUZGSUQuQkxFRURJTkcsIHRlbXAuZHVyYXRpb24sIHRlbXAudGlja1JhdGUsIHRlbXAudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0xPV1lTTE9XOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQnVmZi5BdHRyaWJ1dGVzQnVmZihCdWZmLkJVRkZJRC5TTE9XLCB0ZW1wLmR1cmF0aW9uLCB0ZW1wLnRpY2tSYXRlLCB0ZW1wLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBsb2FkVGV4dHVyZShfdGV4dHVyZTogxpIuVGV4dHVyZUltYWdlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGxldCBuZXdUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgICAgICAgICAgbmV3VHh0ID0gX3RleHR1cmU7XHJcbiAgICAgICAgICAgIGxldCBuZXdDb2F0OiDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQgPSBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKCk7XHJcbiAgICAgICAgICAgIG5ld0NvYXQudGV4dHVyZSA9IG5ld1R4dDtcclxuICAgICAgICAgICAgbGV0IG5ld010cjogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtdHJcIiwgxpIuU2hhZGVyRmxhdFRleHR1cmVkLCBuZXdDb2F0KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50TWF0ZXJpYWwpLm1hdGVyaWFsID0gbmV3TXRyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgc2V0VGV4dHVyZUJ5SWQoKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSUNFQlVDS0VUQ0hBTExFTkdFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUodHh0SWNlQnVja2V0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkRNR1VQOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUodHh0RG1nVXApO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU1BFRURVUDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dFNwZWVkVXApO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5QUk9KRUNUSUxFU1VQOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5IRUFMVEhVUDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dEhlYWx0aFVwKTtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0NBTEVVUDpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0NBTEVET1dOOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkFSTU9SVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSE9NRUNPTUlORzpcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlRPWElDUkVMQVRJT05TSElQOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUodHh0VG94aWNSZWxhdGlvbnNoaXApO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVkFNUFk6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVEhPUlNIQU1NRVI6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0UG9zaXRpb24oX3Bvc2l0aW9uOiDGki5WZWN0b3IyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBfcG9zaXRpb247XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfcG9zaXRpb24udG9WZWN0b3IzKDAuMDEpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnNldFBvc2l0aW9uKF9wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBzcGF3bigpOiB2b2lkIHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkl0ZW0odGhpcy5pZCwgdGhpcy5wb3NpdGlvbiwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBkZXNwYXduKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnJlbW92ZUl0ZW0odGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkb1lvdXJUaGluZyhfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEludGVybmFsSXRlbSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXI7XHJcbiAgICAgICAgY2hvb3Nlbk9uZU5ldElkOiBudW1iZXI7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBJVEVNSUQsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRJbnRlcm5hbEl0ZW1CeUlkKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICBpZiAoaXRlbSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubmFtZSA9IGl0ZW0ubmFtZTtcclxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgPSBpdGVtLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kZXNjcmlwdGlvbiA9IGl0ZW0uZGVzY3JpcHRpb247XHJcbiAgICAgICAgICAgICAgICB0aGlzLmltZ1NyYyA9IGl0ZW0uaW1nU3JjO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yYXJpdHkgPSBpdGVtLnJhcml0eTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRSYXJpdHlCdWZmKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRDaG9vc2VuT25lTmV0SWQoX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5jaG9vc2VuT25lTmV0SWQgPSBfbmV0SWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkb1lvdXJUaGluZyhfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlc0J5SWQoX2F2YXRhcik7XHJcbiAgICAgICAgICAgIHRoaXMuZGVzcGF3bigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNsb25lKCk6IEl0ZW0ge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEludGVybmFsSXRlbSh0aGlzLmlkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldEF0dHJpYnV0ZXNCeUlkKF9hdmF0YXI6IFBsYXllci5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5JQ0VCVUNLRVRDSEFMTEVOR0U6XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uID0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24sIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLkNPT0xET1dOUkVEVUNUSU9OIH0sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuRE1HVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cyArPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLkFUVEFDS1BPSU5UUyB9LCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNQRUVEVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkID0gQ2FsY3VsYXRpb24uYWRkUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQsIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLlNQRUVEIH0sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuUFJPSkVDVElMRVNVUDpcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLndlYXBvbi5wcm9qZWN0aWxlQW1vdW50ICs9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJXZWFwb24oX2F2YXRhci53ZWFwb24sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSEVBTFRIVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRNYXhQb2ludHMgPSBfYXZhdGFyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYW1vdW50ID0gX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAtIGN1cnJlbnRNYXhQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyArPSBhbW91bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cywgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuTUFYSEVBTFRIUE9JTlRTIH0sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0NBTEVVUDpcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIudXBkYXRlU2NhbGUoKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLlNDQUxFIH0sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0NBTEVET1dOOlxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSA9IENhbGN1bGF0aW9uLnN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuU0NBTEUgfSwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5BUk1PUlVQOlxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5hcm1vciArPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5hcm1vciwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuQVJNT1IgfSwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5IT01FQ09NSU5HOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYXZhdGFyIGluc3RhbmNlb2YgUGxheWVyLlJhbmdlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLndlYXBvbi5haW1UeXBlID0gV2VhcG9ucy5BSU0uSE9NSU5HO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhcldlYXBvbihfYXZhdGFyLndlYXBvbiwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogdGFsayB3aXRoIHRvYmlcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlRIT1JTSEFNTUVSOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYXZhdGFyIGluc3RhbmNlb2YgUGxheWVyLlJhbmdlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImNvb2xkb3duVGltZVwiLCBfYXZhdGFyLndlYXBvbi5nZXRDb29sRG93bi5nZXRNYXhDb29sRG93bi50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJhaW1UeXBlXCIsIFdlYXBvbnMuQUlNW19hdmF0YXIud2VhcG9uLmFpbVR5cGVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJidWxsZXRUeXBlXCIsIEJ1bGxldHMuQlVMTEVUVFlQRVtfYXZhdGFyLndlYXBvbi5idWxsZXRUeXBlXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicHJvamVjdGlsZUFtb3VudFwiLCBfYXZhdGFyLndlYXBvbi5wcm9qZWN0aWxlQW1vdW50LnRvU3RyaW5nKCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24uZ2V0Q29vbERvd24uc2V0TWF4Q29vbERvd24gPSAxMDAgKiA2MDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24uYWltVHlwZSA9IFdlYXBvbnMuQUlNLk5PUk1BTDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24uYnVsbGV0VHlwZSA9IEJ1bGxldHMuQlVMTEVUVFlQRS5USE9SU0hBTU1FUjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24ucHJvamVjdGlsZUFtb3VudCA9IDE7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhcldlYXBvbihfYXZhdGFyLndlYXBvbiwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCdWZmSXRlbSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXI7XHJcbiAgICAgICAgdGlja1JhdGU6IG51bWJlcjtcclxuICAgICAgICBkdXJhdGlvbjogbnVtYmVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IElURU1JRCwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX25ldElkKTtcclxuICAgICAgICAgICAgbGV0IHRlbXAgPSBnZXRCdWZmSXRlbUJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IHRlbXAubmFtZTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHRlbXAudmFsdWU7XHJcbiAgICAgICAgICAgIHRoaXMudGlja1JhdGUgPSB0ZW1wLnRpY2tSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLmR1cmF0aW9uID0gdGVtcC5kdXJhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5pbWdTcmMgPSB0ZW1wLmltZ1NyYztcclxuICAgICAgICAgICAgdGhpcy5yYXJpdHkgPSB0ZW1wLnJhcml0eTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkUmFyaXR5QnVmZigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZG9Zb3VyVGhpbmcoX2F2YXRhcjogUGxheWVyLlBsYXllcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnNldEJ1ZmZCeUlkKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICB0aGlzLmRlc3Bhd24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjbG9uZSgpOiBCdWZmSXRlbSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgQnVmZkl0ZW0odGhpcy5pZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRCdWZmQnlJZChfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVE9YSUNSRUxBVElPTlNISVA6XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0J1ZmYgPSB0aGlzLmJ1ZmYuZmluZChidWZmID0+IGJ1ZmYuaWQgPT0gQnVmZi5CVUZGSUQuUE9JU09OKS5jbG9uZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0J1ZmYuZHVyYXRpb24gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgKDxCdWZmLkRhbWFnZUJ1ZmY+bmV3QnVmZikudmFsdWUgPSAwLjU7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3QnVmZi5hZGRUb0VudGl0eShfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRJbnRlcm5hbEl0ZW1CeUlkKF9pZDogSVRFTUlEKTogSXRlbXMuSW50ZXJuYWxJdGVtIHtcclxuICAgICAgICByZXR1cm4gR2FtZS5pbnRlcm5hbEl0ZW1KU09OLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IF9pZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldEJ1ZmZJdGVtQnlJZChfaWQ6IElURU1JRCk6IEl0ZW1zLkJ1ZmZJdGVtIHtcclxuICAgICAgICByZXR1cm4gR2FtZS5idWZmSXRlbUpTT04uZmluZChpdGVtID0+IGl0ZW0uaWQgPT0gX2lkKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIEl0ZW1HZW5lcmF0b3Ige1xyXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGl0ZW1Qb29sOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZmlsbFBvb2woKSB7XHJcbiAgICAgICAgICAgIEdhbWUuaW50ZXJuYWxJdGVtSlNPTi5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtUG9vbC5wdXNoKG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oaXRlbS5pZCkpXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBHYW1lLmJ1ZmZJdGVtSlNPTi5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtUG9vbC5wdXNoKG5ldyBCdWZmSXRlbShpdGVtLmlkKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXRSYW5kb21JdGVtKCk6IEl0ZW1zLkl0ZW0ge1xyXG4gICAgICAgICAgICBsZXQgcG9zc2libGVJdGVtczogSXRlbXMuSXRlbVtdID0gW107XHJcbiAgICAgICAgICAgIHBvc3NpYmxlSXRlbXMgPSB0aGlzLmdldFBvc3NpYmxlSXRlbXMoKTtcclxuICAgICAgICAgICAgbGV0IHJhbmRvbUluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKHBvc3NpYmxlSXRlbXMubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICBsZXQgcmV0dXJuSXRlbSA9IHBvc3NpYmxlSXRlbXNbcmFuZG9tSW5kZXhdO1xyXG4gICAgICAgICAgICAvLyB0aGlzLml0ZW1Qb29sLnNwbGljZSh0aGlzLml0ZW1Qb29sLmluZGV4T2YocmV0dXJuSXRlbSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuSXRlbS5jbG9uZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXRSYW5kb21JdGVtQnlSYXJpdHkoX3Jhcml0eTogUkFSSVRZKTogSXRlbXMuSXRlbSB7XHJcbiAgICAgICAgICAgIGxldCBwb3NzaWJsZUl0ZW1zID0gdGhpcy5pdGVtUG9vbC5maWx0ZXIoaXRlbSA9PiBpdGVtLnJhcml0eSA9PSBfcmFyaXR5KTtcclxuICAgICAgICAgICAgbGV0IHJhbmRvbUluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKHBvc3NpYmxlSXRlbXMubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICBsZXQgcmV0dXJuSXRlbSA9IHBvc3NpYmxlSXRlbXNbcmFuZG9tSW5kZXhdO1xyXG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuSXRlbS5jbG9uZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgZ2V0UG9zc2libGVJdGVtcygpOiBJdGVtcy5JdGVtW10ge1xyXG4gICAgICAgICAgICBsZXQgY2hvc2VuUmFyaXR5OiBSQVJJVFkgPSB0aGlzLmdldFJhcml0eSgpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKGNob3NlblJhcml0eSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBSQVJJVFkuQ09NTU9OOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1Qb29sLmZpbHRlcihpdGVtID0+IGl0ZW0ucmFyaXR5ID09IFJBUklUWS5DT01NT04pO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBSQVJJVFkuUkFSRTpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtUG9vbC5maWx0ZXIoaXRlbSA9PiBpdGVtLnJhcml0eSA9PSBSQVJJVFkuUkFSRSlcclxuICAgICAgICAgICAgICAgIGNhc2UgUkFSSVRZLkVQSUM6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbVBvb2wuZmlsdGVyKGl0ZW0gPT4gaXRlbS5yYXJpdHkgPT0gUkFSSVRZLkVQSUMpXHJcbiAgICAgICAgICAgICAgICBjYXNlIFJBUklUWS5MRUdFTkRBUlk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbVBvb2wuZmlsdGVyKGl0ZW0gPT4gaXRlbS5yYXJpdHkgPT0gUkFSSVRZLkxFR0VOREFSWSlcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbVBvb2wuZmlsdGVyKGl0ZW0gPT4gaXRlbS5yYXJpdHkgPSBSQVJJVFkuQ09NTU9OKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgZ2V0UmFyaXR5KCk6IFJBUklUWSB7XHJcbiAgICAgICAgICAgIGxldCByYXJpdHlOdW1iZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMDApO1xyXG4gICAgICAgICAgICBpZiAocmFyaXR5TnVtYmVyID49IDUwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUkFSSVRZLkNPTU1PTjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmFyaXR5TnVtYmVyID49IDIwICYmIHJhcml0eU51bWJlciA8IDUwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUkFSSVRZLlJBUkU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJhcml0eU51bWJlciA+PSA1ICYmIHJhcml0eU51bWJlciA8IDIwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUkFSSVRZLkVQSUM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJhcml0eU51bWJlciA8IDUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBSQVJJVFkuTEVHRU5EQVJZO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBSQVJJVFkuQ09NTU9OO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBSQVJJVFkge1xyXG4gICAgICAgIENPTU1PTixcclxuICAgICAgICBSQVJFLFxyXG4gICAgICAgIEVQSUMsXHJcbiAgICAgICAgTEVHRU5EQVJZXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQW5pbWF0aW9uR2VuZXJhdGlvbiB7XHJcbiAgICBleHBvcnQgbGV0IHR4dFJlZFRpY2tJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFJlZFRpY2tXYWxrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRTbWFsbFRpY2tJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNtYWxsVGlja1dhbGs6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dEJhdElkbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dFNrZWxldG9uSWRsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTa2VsZXRvbldhbGs6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dE9nZXJJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE9nZXJXYWxrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE9nZXJBdHRhY2s6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRTdW1tb25lcklkbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U3VtbW9uZXJTdW1tb246IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U3VtbW9uZXJUZWxlcG9ydDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuXHJcbiAgICBleHBvcnQgaW1wb3J0IMaSQWlkID0gRnVkZ2VBaWQ7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEFuaW1hdGlvbkNvbnRhaW5lciB7XHJcbiAgICAgICAgaWQ6IEVudGl0eS5JRDtcclxuICAgICAgICBhbmltYXRpb25zOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbnMgPSB7fTtcclxuICAgICAgICBzY2FsZTogW3N0cmluZywgbnVtYmVyXVtdID0gW107XHJcbiAgICAgICAgZnJhbWVSYXRlOiBbc3RyaW5nLCBudW1iZXJdW10gPSBbXTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCkge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gX2lkO1xyXG4gICAgICAgICAgICB0aGlzLmdldEFuaW1hdGlvbkJ5SWQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYWRkQW5pbWF0aW9uKF9hbmk6IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uLCBfc2NhbGU6IG51bWJlciwgX2ZyYW1lUmF0ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uc1tfYW5pLm5hbWVdID0gX2FuaTtcclxuICAgICAgICAgICAgdGhpcy5zY2FsZS5wdXNoKFtfYW5pLm5hbWUsIF9zY2FsZV0pO1xyXG4gICAgICAgICAgICB0aGlzLmZyYW1lUmF0ZS5wdXNoKFtfYW5pLm5hbWUsIF9mcmFtZVJhdGVdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEFuaW1hdGlvbkJ5SWQoKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuQkFUOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKGJhdElkbGUuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBiYXRJZGxlLmFuaW1hdGlvblNjYWxlLCBiYXRJZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5SRURUSUNLOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHJlZFRpY2tJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgcmVkVGlja0lkbGUuYW5pbWF0aW9uU2NhbGUsIHJlZFRpY2tJZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24ocmVkVGlja1dhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCByZWRUaWNrV2Fsay5hbmltYXRpb25TY2FsZSwgcmVkVGlja1dhbGsuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlNNQUxMVElDSzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihzbWFsbFRpY2tJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc21hbGxUaWNrSWRsZS5hbmltYXRpb25TY2FsZSwgc21hbGxUaWNrSWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHNtYWxsVGlja1dhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBzbWFsbFRpY2tXYWxrLmFuaW1hdGlvblNjYWxlLCBzbWFsbFRpY2tXYWxrLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5TS0VMRVRPTjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihza2VsZXRvbklkbGUuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBza2VsZXRvbklkbGUuYW5pbWF0aW9uU2NhbGUsIHNrZWxldG9uSWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHNrZWxldG9uV2Fsay5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHNrZWxldG9uV2Fsay5hbmltYXRpb25TY2FsZSwgc2tlbGV0b25XYWxrLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5PR0VSOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKG9nZXJJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgb2dlcklkbGUuYW5pbWF0aW9uU2NhbGUsIG9nZXJJZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24ob2dlcldhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBvZ2VyV2Fsay5hbmltYXRpb25TY2FsZSwgb2dlcldhbGsuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihvZ2VyQXR0YWNrLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgb2dlckF0dGFjay5hbmltYXRpb25TY2FsZSwgb2dlckF0dGFjay5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU1VNTU9OT1I6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oc3VtbW9uZXJJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc3VtbW9uZXJJZGxlLmFuaW1hdGlvblNjYWxlLCBzdW1tb25lcklkbGUuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihzdW1tb25lcldhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBzdW1tb25lcldhbGsuYW5pbWF0aW9uU2NhbGUsIHN1bW1vbmVyV2Fsay5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHN1bW1vbmVyU3VtbW9uLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc3VtbW9uZXJTdW1tb24uYW5pbWF0aW9uU2NhbGUsIHN1bW1vbmVyU3VtbW9uLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oc3VtbW9uZXJUZWxlcG9ydC5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHN1bW1vbmVyVGVsZXBvcnQuYW5pbWF0aW9uU2NhbGUsIHN1bW1vbmVyVGVsZXBvcnQuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xhc3MgTXlBbmltYXRpb25DbGFzcyB7XHJcbiAgICAgICAgcHVibGljIGlkOiBFbnRpdHkuSUQ7XHJcbiAgICAgICAgYW5pbWF0aW9uTmFtZTogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBzcHJpdGVTaGVldDogxpIuVGV4dHVyZUltYWdlO1xyXG4gICAgICAgIGFtb3VudE9mRnJhbWVzOiBudW1iZXI7XHJcbiAgICAgICAgZnJhbWVSYXRlOiBudW1iZXI7XHJcbiAgICAgICAgZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbjtcclxuICAgICAgICBhbmltYXRpb25TY2FsZTogbnVtYmVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX2FuaW1hdGlvbk5hbWU6IHN0cmluZywgX3RleHR1cmU6IMaSLlRleHR1cmVJbWFnZSwgX2Ftb3VudE9mRnJhbWVzOiBudW1iZXIsIF9mcmFtZVJhdGU6IG51bWJlciwpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25OYW1lID0gX2FuaW1hdGlvbk5hbWU7XHJcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlU2hlZXQgPSBfdGV4dHVyZTtcclxuICAgICAgICAgICAgdGhpcy5mcmFtZVJhdGUgPSBfZnJhbWVSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLmFtb3VudE9mRnJhbWVzID0gX2Ftb3VudE9mRnJhbWVzO1xyXG4gICAgICAgICAgICBnZW5lcmF0ZUFuaW1hdGlvbkZyb21HcmlkKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UT0RPOiBnZXQgYW5pbWF0aW9uIHNjYWxlXHJcbiAgICB9XHJcblxyXG4gICAgLy8jcmVnaW9uIHNwcml0ZVNoZWV0XHJcbiAgICBsZXQgYmF0SWRsZTogTXlBbmltYXRpb25DbGFzcztcclxuXHJcbiAgICBsZXQgcmVkVGlja0lkbGU6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgcmVkVGlja1dhbGs6IE15QW5pbWF0aW9uQ2xhc3M7XHJcblxyXG4gICAgbGV0IHNtYWxsVGlja0lkbGU6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgc21hbGxUaWNrV2FsazogTXlBbmltYXRpb25DbGFzcztcclxuXHJcbiAgICBsZXQgc2tlbGV0b25JZGxlOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IHNrZWxldG9uV2FsazogTXlBbmltYXRpb25DbGFzcztcclxuXHJcbiAgICBsZXQgb2dlcklkbGU6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgb2dlcldhbGs6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgb2dlckF0dGFjazogTXlBbmltYXRpb25DbGFzcztcclxuXHJcbiAgICBsZXQgc3VtbW9uZXJJZGxlOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IHN1bW1vbmVyV2FsazogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBzdW1tb25lclN1bW1vbjogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBzdW1tb25lclRlbGVwb3J0OiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBBbmltYXRpb25Db250YWluZXJcclxuICAgIGxldCBiYXRBbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIGxldCByZWRUaWNrQW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICBsZXQgc21hbGxUaWNrQW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICBsZXQgc2tlbGV0b25BbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIGxldCBvZ2VyQW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICBsZXQgc3VtbW9uZXJBbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUFuaW1hdGlvbk9iamVjdHMoKSB7XHJcblxyXG4gICAgICAgIGJhdElkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuQkFULCBcImlkbGVcIiwgdHh0QmF0SWRsZSwgNCwgMTIpO1xyXG5cclxuICAgICAgICByZWRUaWNrSWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5SRURUSUNLLCBcImlkbGVcIiwgdHh0UmVkVGlja0lkbGUsIDYsIDEyKTtcclxuICAgICAgICByZWRUaWNrV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5SRURUSUNLLCBcIndhbGtcIiwgdHh0UmVkVGlja1dhbGssIDQsIDE2KTtcclxuXHJcbiAgICAgICAgc21hbGxUaWNrSWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TTUFMTFRJQ0ssIFwiaWRsZVwiLCB0eHRTbWFsbFRpY2tJZGxlLCA2LCAxMik7XHJcbiAgICAgICAgc21hbGxUaWNrV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TTUFMTFRJQ0ssIFwid2Fsa1wiLCB0eHRTbWFsbFRpY2tXYWxrLCA0LCAxMik7XHJcblxyXG4gICAgICAgIHNrZWxldG9uSWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TS0VMRVRPTiwgXCJpZGxlXCIsIHR4dFNrZWxldG9uSWRsZSwgNSwgMTIpO1xyXG4gICAgICAgIHNrZWxldG9uV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TS0VMRVRPTiwgXCJ3YWxrXCIsIHR4dFNrZWxldG9uV2FsaywgNywgMTIpO1xyXG5cclxuICAgICAgICBvZ2VySWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5PR0VSLCBcImlkbGVcIiwgdHh0T2dlcklkbGUsIDUsIDYpO1xyXG4gICAgICAgIG9nZXJXYWxrID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELk9HRVIsIFwid2Fsa1wiLCB0eHRPZ2VyV2FsaywgNiwgNik7XHJcbiAgICAgICAgb2dlckF0dGFjayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5PR0VSLCBcImF0dGFja1wiLCB0eHRPZ2VyQXR0YWNrLCAxMCwgMTIpO1xyXG5cclxuICAgICAgICBzdW1tb25lcklkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU1VNTU9OT1IsIFwiaWRsZVwiLCB0eHRTdW1tb25lcklkbGUsIDYsIDEyKTtcclxuICAgICAgICBzdW1tb25lcldhbGsgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU1VNTU9OT1IsIFwid2Fsa1wiLCB0eHRTdW1tb25lcklkbGUsIDYsIDEyKTtcclxuICAgICAgICBzdW1tb25lclN1bW1vbiA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TVU1NT05PUiwgXCJzdW1tb25cIiwgdHh0U3VtbW9uZXJTdW1tb24sIDEzLCAxMik7XHJcbiAgICAgICAgc3VtbW9uZXJUZWxlcG9ydCA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TVU1NT05PUiwgXCJ0ZWxlcG9ydFwiLCB0eHRTdW1tb25lclRlbGVwb3J0LCA2LCAxMik7XHJcblxyXG5cclxuXHJcbiAgICAgICAgYmF0QW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuQkFUKTtcclxuICAgICAgICByZWRUaWNrQW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuUkVEVElDSyk7XHJcbiAgICAgICAgc21hbGxUaWNrQW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuU01BTExUSUNLKTtcclxuICAgICAgICBza2VsZXRvbkFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb25Db250YWluZXIoRW50aXR5LklELlNLRUxFVE9OKTtcclxuICAgICAgICBvZ2VyQW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuT0dFUik7XHJcbiAgICAgICAgc3VtbW9uZXJBbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uQ29udGFpbmVyKEVudGl0eS5JRC5TVU1NT05PUik7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldEFuaW1hdGlvbkJ5SWQoX2lkOiBFbnRpdHkuSUQpOiBBbmltYXRpb25Db250YWluZXIge1xyXG4gICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELkJBVDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBiYXRBbmltYXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlJFRFRJQ0s6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVkVGlja0FuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU01BTExUSUNLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNtYWxsVGlja0FuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU0tFTEVUT046XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2tlbGV0b25BbmltYXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELk9HRVI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2dlckFuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU1VNTU9OT1I6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc3VtbW9uZXJBbmltYXRpb247XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRQaXhlbFJhdGlvKF93aWR0aDogbnVtYmVyLCBfaGVpZ2h0OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBtYXggPSBNYXRoLm1heChfd2lkdGgsIF9oZWlnaHQpO1xyXG4gICAgICAgIGxldCBtaW4gPSBNYXRoLm1pbihfd2lkdGgsIF9oZWlnaHQpO1xyXG5cclxuICAgICAgICBsZXQgc2NhbGUgPSAxIC8gbWF4ICogbWluO1xyXG4gICAgICAgIHJldHVybiBzY2FsZTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVBbmltYXRpb25Gcm9tR3JpZChfY2xhc3M6IE15QW5pbWF0aW9uQ2xhc3MpIHtcclxuICAgICAgICBsZXQgY2xyV2hpdGU6IMaSLkNvbG9yID0gxpIuQ29sb3IuQ1NTKFwid2hpdGVcIik7XHJcbiAgICAgICAgbGV0IGNvYXRlZFNwcml0ZVNoZWV0OiDGki5Db2F0VGV4dHVyZWQgPSBuZXcgxpIuQ29hdFRleHR1cmVkKGNscldoaXRlLCBfY2xhc3Muc3ByaXRlU2hlZXQpO1xyXG4gICAgICAgIGxldCB3aWR0aDogbnVtYmVyID0gX2NsYXNzLnNwcml0ZVNoZWV0LnRleEltYWdlU291cmNlLndpZHRoIC8gX2NsYXNzLmFtb3VudE9mRnJhbWVzO1xyXG4gICAgICAgIGxldCBoZWlnaHQ6IG51bWJlciA9IF9jbGFzcy5zcHJpdGVTaGVldC50ZXhJbWFnZVNvdXJjZS5oZWlnaHQ7XHJcbiAgICAgICAgbGV0IGNyZWF0ZWRBbmltYXRpb246IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uID0gbmV3IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uKF9jbGFzcy5hbmltYXRpb25OYW1lLCBjb2F0ZWRTcHJpdGVTaGVldCk7XHJcbiAgICAgICAgY3JlYXRlZEFuaW1hdGlvbi5nZW5lcmF0ZUJ5R3JpZCjGki5SZWN0YW5nbGUuR0VUKDAsIDAsIHdpZHRoLCBoZWlnaHQpLCBfY2xhc3MuYW1vdW50T2ZGcmFtZXMsIDMyLCDGki5PUklHSU4yRC5DRU5URVIsIMaSLlZlY3RvcjIuWCh3aWR0aCkpO1xyXG4gICAgICAgIF9jbGFzcy5hbmltYXRpb25TY2FsZSA9IGdldFBpeGVsUmF0aW8od2lkdGgsIGhlaWdodCk7XHJcbiAgICAgICAgX2NsYXNzLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiA9IGNyZWF0ZWRBbmltYXRpb247XHJcbiAgICB9XHJcblxyXG5cclxufVxyXG5cclxuIiwibmFtZXNwYWNlIE5ldHdvcmtpbmcge1xyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFByZWRpY3Rpb24ge1xyXG4gICAgICAgIHByb3RlY3RlZCB0aW1lcjogbnVtYmVyID0gMDtcclxuICAgICAgICBwcm90ZWN0ZWQgY3VycmVudFRpY2s6IG51bWJlciA9IDA7XHJcbiAgICAgICAgcHVibGljIG1pblRpbWVCZXR3ZWVuVGlja3M6IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgZ2FtZVRpY2tSYXRlOiBudW1iZXIgPSA2Mi41O1xyXG4gICAgICAgIHByb3RlY3RlZCBidWZmZXJTaXplOiBudW1iZXIgPSAxMDI0O1xyXG4gICAgICAgIHByb3RlY3RlZCBvd25lck5ldElkOiBudW1iZXI7IGdldCBvd25lcigpOiBHYW1lLsaSLk5vZGUgeyByZXR1cm4gR2FtZS5jdXJyZW50TmV0T2JqLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IHRoaXMub3duZXJOZXRJZCkubmV0T2JqZWN0Tm9kZSB9O1xyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGVCdWZmZXI6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZFtdO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWluVGltZUJldHdlZW5UaWNrcyA9IDEgLyB0aGlzLmdhbWVUaWNrUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlciA9IG5ldyBBcnJheTxJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQ+KHRoaXMuYnVmZmVyU2l6ZSk7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9vd25lck5ldElkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGhhbmRsZVRpY2soKSB7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgcHJvY2Vzc01vdmVtZW50KF9pbnB1dDogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkKTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9Ly8jcmVnaW9uICBidWxsZXQgUHJlZGljdGlvblxyXG4gICAgYWJzdHJhY3QgY2xhc3MgQnVsbGV0UHJlZGljdGlvbiBleHRlbmRzIFByZWRpY3Rpb24ge1xyXG4gICAgICAgIHByb3RlY3RlZCBwcm9jZXNzTW92ZW1lbnQoaW5wdXQ6IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCk6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCB7XHJcbiAgICAgICAgICAgIGxldCBjbG9uZUlucHV0VmVjdG9yID0gaW5wdXQuaW5wdXRWZWN0b3IuY2xvbmU7XHJcbiAgICAgICAgICAgIGxldCBidWxsZXQ6IEJ1bGxldHMuQnVsbGV0ID0gPEJ1bGxldHMuQnVsbGV0PnRoaXMub3duZXI7XHJcbiAgICAgICAgICAgIGJ1bGxldC5tb3ZlKGNsb25lSW5wdXRWZWN0b3IpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG5ld1N0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkID0geyB0aWNrOiBpbnB1dC50aWNrLCBwb3NpdGlvbjogYnVsbGV0Lm10eExvY2FsLnRyYW5zbGF0aW9uIH1cclxuICAgICAgICAgICAgcmV0dXJuIG5ld1N0YXRlUGF5bG9hZDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFNlcnZlckJ1bGxldFByZWRpY3Rpb24gZXh0ZW5kcyBCdWxsZXRQcmVkaWN0aW9uIHtcclxuICAgICAgICBwcml2YXRlIGlucHV0UXVldWU6IFF1ZXVlID0gbmV3IFF1ZXVlKCk7XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVFbnRpdHlUb0NoZWNrKF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGltZXIgKz0gR2FtZS5kZWx0YVRpbWU7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRpbWVyID49IHRoaXMubWluVGltZUJldHdlZW5UaWNrcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3M7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVRpY2soKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpY2srKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaGFuZGxlVGljaygpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IC0xO1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5pbnB1dFF1ZXVlLmdldFF1ZXVlTGVuZ3RoKCkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWQgPSA8SW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkPnRoaXMuaW5wdXRRdWV1ZS5kZXF1ZXVlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgYnVmZmVySW5kZXggPSBpbnB1dFBheWxvYWQudGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCA9IHRoaXMucHJvY2Vzc01vdmVtZW50KGlucHV0UGF5bG9hZClcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gc3RhdGVQYXlsb2FkO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYnVmZmVySW5kZXggIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIC8vU2VuZCB0byBjbGllbnQgbmV3IHBvc2l0aW9uXHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNlbmRTZXJ2ZXJCdWZmZXIodGhpcy5vd25lck5ldElkLCB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkNsaWVudElucHV0KGlucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRRdWV1ZS5lbnF1ZXVlKGlucHV0UGF5bG9hZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBDbGllbnRCdWxsZXRQcmVkaWN0aW9uIGV4dGVuZHMgQnVsbGV0UHJlZGljdGlvbiB7XHJcbiAgICAgICAgcHJpdmF0ZSBpbnB1dEJ1ZmZlcjogSW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkW107XHJcbiAgICAgICAgcHJpdmF0ZSBsYXRlc3RTZXJ2ZXJTdGF0ZTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkO1xyXG4gICAgICAgIHByaXZhdGUgbGFzdFByb2Nlc3NlZFN0YXRlOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgcHJpdmF0ZSBmbHlEaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMztcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBBc3luY1RvbGVyYW5jZTogbnVtYmVyID0gMC4yO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX293bmVyTmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfb3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRCdWZmZXIgPSBuZXcgQXJyYXk8SW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkPih0aGlzLmJ1ZmZlclNpemUpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZseURpcmVjdGlvbiA9ICg8QnVsbGV0cy5CdWxsZXQ+dGhpcy5vd25lcikuZmx5RGlyZWN0aW9uO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJjYW50IGZpbmQgb3duZXJcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy50aW1lciArPSBHYW1lLmRlbHRhVGltZTtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMudGltZXIgPj0gdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVyIC09IHRoaXMubWluVGltZUJldHdlZW5UaWNrcztcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVGljaygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VGljaysrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgaGFuZGxlVGljaygpIHtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxhdGVzdFNlcnZlclN0YXRlICE9IHRoaXMubGFzdFByb2Nlc3NlZFN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNlcnZlclJlY29uY2lsaWF0aW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IHRoaXMuY3VycmVudFRpY2sgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgIGxldCBpbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCA9IHsgdGljazogdGhpcy5jdXJyZW50VGljaywgaW5wdXRWZWN0b3I6IHRoaXMuZmx5RGlyZWN0aW9uIH07XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRCdWZmZXJbYnVmZmVySW5kZXhdID0gaW5wdXRQYXlsb2FkO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhpbnB1dFBheWxvYWQudGljayArIFwiX19fXCIgKyBpbnB1dFBheWxvYWQuaW5wdXRWZWN0b3IpO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSA9IHRoaXMucHJvY2Vzc01vdmVtZW50KGlucHV0UGF5bG9hZCk7XHJcblxyXG4gICAgICAgICAgICAvL3NlbmQgaW5wdXRQYXlsb2FkIHRvIGhvc3RcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zZW5kQnVsbGV0SW5wdXQodGhpcy5vd25lck5ldElkLCBpbnB1dFBheWxvYWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uU2VydmVyTW92ZW1lbnRTdGF0ZShfc2VydmVyU3RhdGU6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCkge1xyXG4gICAgICAgICAgICB0aGlzLmxhdGVzdFNlcnZlclN0YXRlID0gX3NlcnZlclN0YXRlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoYW5kbGVTZXJ2ZXJSZWNvbmNpbGlhdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5sYXN0UHJvY2Vzc2VkU3RhdGUgPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlO1xyXG5cclxuICAgICAgICAgICAgbGV0IHNlcnZlclN0YXRlQnVmZmVySW5kZXggPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnRpY2sgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgIGxldCBwb3NpdGlvbkVycm9yOiBudW1iZXIgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uLCB0aGlzLnN0YXRlQnVmZmVyW3NlcnZlclN0YXRlQnVmZmVySW5kZXhdLnBvc2l0aW9uKS5tYWduaXR1ZGU7XHJcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbkVycm9yID4gdGhpcy5Bc3luY1RvbGVyYW5jZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKHRoaXMub3duZXIubmFtZSArIFwiIG5lZWQgdG8gYmUgdXBkYXRlZCB0bzogWDpcIiArIHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb24ueCArIFwiIFk6IFwiICsgdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbi55KTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3duZXIubXR4TG9jYWwudHJhbnNsYXRpb24gPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbc2VydmVyU3RhdGVCdWZmZXJJbmRleF0gPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCB0aWNrVG9Qcm9jZXNzID0gKHRoaXMubGF0ZXN0U2VydmVyU3RhdGUudGljayArIDEpO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoaWxlICh0aWNrVG9Qcm9jZXNzIDwgdGhpcy5jdXJyZW50VGljaykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCA9IHRoaXMucHJvY2Vzc01vdmVtZW50KHRoaXMuaW5wdXRCdWZmZXJbdGlja1RvUHJvY2VzcyAlIHRoaXMuYnVmZmVyU2l6ZV0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgYnVmZmVySW5kZXggPSB0aWNrVG9Qcm9jZXNzICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gc3RhdGVQYXlsb2FkO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aWNrVG9Qcm9jZXNzKys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuICAgIC8vI3JlZ2lvbiAgYXZhdGFyIFByZWNkaWN0aW9uXHJcbiAgICBhYnN0cmFjdCBjbGFzcyBBdmF0YXJQcmVkaWN0aW9uIGV4dGVuZHMgUHJlZGljdGlvbiB7XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBwcm9jZXNzTW92ZW1lbnQoaW5wdXQ6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCk6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCB7XHJcbiAgICAgICAgICAgIGxldCBjbG9uZUlucHV0VmVjdG9yID0gaW5wdXQuaW5wdXRWZWN0b3IuY2xvbmU7XHJcbiAgICAgICAgICAgIGlmIChjbG9uZUlucHV0VmVjdG9yLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNsb25lSW5wdXRWZWN0b3Iubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgJiYgaW5wdXQuZG9lc0FiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj50aGlzLm93bmVyKS5kb0FiaWxpdHkoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPnRoaXMub3duZXIpLm1vdmUoY2xvbmVJbnB1dFZlY3Rvcik7XHJcblxyXG5cclxuICAgICAgICAgICAgbGV0IG5ld1N0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkID0geyB0aWNrOiBpbnB1dC50aWNrLCBwb3NpdGlvbjogdGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbiB9XHJcbiAgICAgICAgICAgIHJldHVybiBuZXdTdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBDbGllbnRQcmVkaWN0aW9uIGV4dGVuZHMgQXZhdGFyUHJlZGljdGlvbiB7XHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5wdXRCdWZmZXI6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZFtdO1xyXG4gICAgICAgIHByaXZhdGUgbGF0ZXN0U2VydmVyU3RhdGU6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZDtcclxuICAgICAgICBwcml2YXRlIGxhc3RQcm9jZXNzZWRTdGF0ZTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkO1xyXG4gICAgICAgIHByaXZhdGUgaG9yaXpvbnRhbElucHV0OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSB2ZXJ0aWNhbElucHV0OiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGRvZXNBYmlsaXR5OiBib29sZWFuO1xyXG5cclxuICAgICAgICBwcml2YXRlIEFzeW5jVG9sZXJhbmNlOiBudW1iZXIgPSAwLjE7XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9vd25lck5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dEJ1ZmZlciA9IG5ldyBBcnJheTxJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQ+KHRoaXMuYnVmZmVyU2l6ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5ob3Jpem9udGFsSW5wdXQgPSBJbnB1dFN5c3RlbS5tb3ZlKCkueDtcclxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNhbElucHV0ID0gSW5wdXRTeXN0ZW0ubW92ZSgpLnk7XHJcbiAgICAgICAgICAgIHRoaXMudGltZXIgKz0gR2FtZS5kZWx0YVRpbWU7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRpbWVyID49IHRoaXMubWluVGltZUJldHdlZW5UaWNrcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3M7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVRpY2soKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpY2srKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGhhbmRsZVRpY2soKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZSAhPSB0aGlzLmxhc3RQcm9jZXNzZWRTdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTZXJ2ZXJSZWNvbmNpbGlhdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IHRoaXMuY3VycmVudFRpY2sgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgIHRoaXMuc3dpdGNoQXZhdGFyQWJpbGl0eVN0YXRlKCk7XHJcbiAgICAgICAgICAgIGxldCBpbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCA9IHsgdGljazogdGhpcy5jdXJyZW50VGljaywgaW5wdXRWZWN0b3I6IG5ldyDGki5WZWN0b3IzKHRoaXMuaG9yaXpvbnRhbElucHV0LCB0aGlzLnZlcnRpY2FsSW5wdXQsIDApLCBkb2VzQWJpbGl0eTogdGhpcy5kb2VzQWJpbGl0eSB9O1xyXG4gICAgICAgICAgICB0aGlzLmlucHV0QnVmZmVyW2J1ZmZlckluZGV4XSA9IGlucHV0UGF5bG9hZDtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coaW5wdXRQYXlsb2FkLnRpY2sgKyBcIl9fX1wiICsgaW5wdXRQYXlsb2FkLmlucHV0VmVjdG9yLmNsb25lKTtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0gPSB0aGlzLnByb2Nlc3NNb3ZlbWVudChpbnB1dFBheWxvYWQpO1xyXG5cclxuICAgICAgICAgICAgLy9zZW5kIGlucHV0UGF5bG9hZCB0byBob3N0XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc2VuZENsaWVudElucHV0KHRoaXMub3duZXJOZXRJZCwgaW5wdXRQYXlsb2FkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN3aXRjaEF2YXRhckFiaWxpdHlTdGF0ZSgpIHtcclxuICAgICAgICAgICAgaWYgKCg8RW50aXR5LkVudGl0eT50aGlzLm93bmVyKS5pZCA9PSBFbnRpdHkuSUQuUkFOR0VEKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvZXNBYmlsaXR5ID0gKDxQbGF5ZXIuUmFuZ2VkPnRoaXMub3duZXIpLmRhc2guZG9lc0FiaWxpdHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvZXNBYmlsaXR5ID0gKDxQbGF5ZXIuTWVsZWU+dGhpcy5vd25lcikuYmxvY2suZG9lc0FiaWxpdHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgb25TZXJ2ZXJNb3ZlbWVudFN0YXRlKF9zZXJ2ZXJTdGF0ZTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U2VydmVyU3RhdGUgPSBfc2VydmVyU3RhdGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhhbmRsZVNlcnZlclJlY29uY2lsaWF0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLmxhc3RQcm9jZXNzZWRTdGF0ZSA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGU7XHJcblxyXG4gICAgICAgICAgICBsZXQgc2VydmVyU3RhdGVCdWZmZXJJbmRleCA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGUudGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgbGV0IHBvc2l0aW9uRXJyb3I6IG51bWJlciA9IEdhbWUuxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb24sIHRoaXMuc3RhdGVCdWZmZXJbc2VydmVyU3RhdGVCdWZmZXJJbmRleF0ucG9zaXRpb24pLm1hZ25pdHVkZTtcclxuICAgICAgICAgICAgaWYgKHBvc2l0aW9uRXJyb3IgPiB0aGlzLkFzeW5jVG9sZXJhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJ5b3UgbmVlZCB0byBiZSB1cGRhdGVkIHRvOiBYOlwiICsgdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbi54ICsgXCIgWTogXCIgKyB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltzZXJ2ZXJTdGF0ZUJ1ZmZlckluZGV4XSA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGU7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHRpY2tUb1Byb2Nlc3MgPSAodGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS50aWNrICsgMSk7XHJcblxyXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRpY2tUb1Byb2Nlc3MgPCB0aGlzLmN1cnJlbnRUaWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkID0gdGhpcy5wcm9jZXNzTW92ZW1lbnQodGhpcy5pbnB1dEJ1ZmZlclt0aWNrVG9Qcm9jZXNzICUgdGhpcy5idWZmZXJTaXplXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IHRpY2tUb1Byb2Nlc3MgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0gPSBzdGF0ZVBheWxvYWQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRpY2tUb1Byb2Nlc3MrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgU2VydmVyUHJlZGljdGlvbiBleHRlbmRzIEF2YXRhclByZWRpY3Rpb24ge1xyXG5cclxuICAgICAgICBwcml2YXRlIGlucHV0UXVldWU6IFF1ZXVlID0gbmV3IFF1ZXVlKCk7XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVFbnRpdHlUb0NoZWNrKF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGltZXIgKz0gR2FtZS5kZWx0YVRpbWU7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRpbWVyID49IHRoaXMubWluVGltZUJldHdlZW5UaWNrcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3M7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVRpY2soKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpY2srKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaGFuZGxlVGljaygpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IC0xO1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5pbnB1dFF1ZXVlLmdldFF1ZXVlTGVuZ3RoKCkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQgPSA8SW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkPnRoaXMuaW5wdXRRdWV1ZS5kZXF1ZXVlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgYnVmZmVySW5kZXggPSBpbnB1dFBheWxvYWQudGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCA9IHRoaXMucHJvY2Vzc01vdmVtZW50KGlucHV0UGF5bG9hZClcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gc3RhdGVQYXlsb2FkO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYnVmZmVySW5kZXggIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIC8vU2VuZCB0byBjbGllbnQgbmV3IHBvc2l0aW9uXHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNlbmRTZXJ2ZXJCdWZmZXIodGhpcy5vd25lck5ldElkLCB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkNsaWVudElucHV0KGlucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRRdWV1ZS5lbnF1ZXVlKGlucHV0UGF5bG9hZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuICAgIGNsYXNzIFF1ZXVlIHtcclxuICAgICAgICBwcml2YXRlIGl0ZW1zOiBhbnlbXTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMgPSBbXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGVucXVldWUoX2l0ZW06IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCB8IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCkge1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zLnB1c2goX2l0ZW0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGVxdWV1ZSgpOiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQgfCBJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWQge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtcy5zaGlmdCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0UXVldWVMZW5ndGgoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zLmxlbmd0aDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEl0ZW1zKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59IiwibmFtZXNwYWNlIEFiaWxpdHkge1xyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFiaWxpdHkge1xyXG4gICAgICAgIHByb3RlY3RlZCBvd25lck5ldElkOiBudW1iZXI7IGdldCBvd25lcigpOiBFbnRpdHkuRW50aXR5IHsgcmV0dXJuIEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gdGhpcy5vd25lck5ldElkKSB9O1xyXG4gICAgICAgIHByb3RlY3RlZCBjb29sZG93bjogQ29vbGRvd247XHJcbiAgICAgICAgcHJvdGVjdGVkIGFiaWxpdHlDb3VudDogbnVtYmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBjdXJyZW50YWJpbGl0eUNvdW50OiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGR1cmF0aW9uOiBDb29sZG93bjtcclxuICAgICAgICBwdWJsaWMgZG9lc0FiaWxpdHk6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX293bmVyTmV0SWQ6IG51bWJlciwgX2R1cmF0aW9uOiBudW1iZXIsIF9hYmlsaXR5Q291bnQ6IG51bWJlciwgX2Nvb2xkb3duVGltZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9vd25lck5ldElkO1xyXG4gICAgICAgICAgICB0aGlzLmFiaWxpdHlDb3VudCA9IF9hYmlsaXR5Q291bnQ7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA9IHRoaXMuYWJpbGl0eUNvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmR1cmF0aW9uID0gbmV3IENvb2xkb3duKF9kdXJhdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuY29vbGRvd24gPSBuZXcgQ29vbGRvd24oX2Nvb2xkb3duVGltZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUFiaWxpdHkoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIHVwZGF0ZUFiaWxpdHkoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmRvZXNBYmlsaXR5ICYmICF0aGlzLmR1cmF0aW9uLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvZXNBYmlsaXR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy9kbyBzdHVmZlxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24gJiYgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA9IHRoaXMuYWJpbGl0eUNvdW50O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb29sZG93bi5oYXNDb29sRG93biAmJiB0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvZXNBYmlsaXR5ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWN0aXZhdGVBYmlsaXR5KClcclxuICAgICAgICAgICAgICAgIHRoaXMuZHVyYXRpb24uc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50LS07XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50YWJpbGl0eUNvdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvb2xkb3duLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgaGFzQ29vbGRvd24oKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvb2xkb3duLmhhc0Nvb2xEb3duO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGFjdGl2YXRlQWJpbGl0eSgpIHtcclxuICAgICAgICAgICAgR2FtZS7Gki5Mb29wLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5MT09QX0ZSQU1FLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb3RlY3RlZCBkZWFjdGl2YXRlQWJpbGl0eSgpIHtcclxuICAgICAgICAgICAgR2FtZS7Gki5Mb29wLnJlbW92ZUV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5MT09QX0ZSQU1FLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQmxvY2sgZXh0ZW5kcyBBYmlsaXR5IHtcclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGFjdGl2YXRlQWJpbGl0eSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5oaXRhYmxlID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZGVhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmRlYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5oaXRhYmxlID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERhc2ggZXh0ZW5kcyBBYmlsaXR5IHtcclxuICAgICAgICBzcGVlZDogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9vd25lck5ldElkOiBudW1iZXIsIF9kdXJhdGlvbjogbnVtYmVyLCBfYWJpbGl0eUNvdW50OiBudW1iZXIsIF9jb29sZG93blRpbWU6IG51bWJlciwgX3NwZWVkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX293bmVyTmV0SWQsIF9kdXJhdGlvbiwgX2FiaWxpdHlDb3VudCwgX2Nvb2xkb3duVGltZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSBfc3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb3RlY3RlZCBhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmFjdGl2YXRlQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFjdGl2YXRlXCIpO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuc3BlZWQgKj0gdGhpcy5zcGVlZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIGRlYWN0aXZhdGVBYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5kZWFjdGl2YXRlQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImRlYWN0aXZhdGVcIik7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5oaXRhYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5vd25lci5hdHRyaWJ1dGVzLnNwZWVkIC89IHRoaXMuc3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTcGF3blN1bW1vbmVycyBleHRlbmRzIEFiaWxpdHkge1xyXG4gICAgICAgIHByaXZhdGUgc3Bhd25SYWRpdXM6IG51bWJlciA9IDE7XHJcbiAgICAgICAgcHJvdGVjdGVkIGFjdGl2YXRlQWJpbGl0eSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyID0gbmV3IMaSLlZlY3RvcjIodGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgTWF0aC5yYW5kb20oKSAqIHRoaXMuc3Bhd25SYWRpdXMsIHRoaXMub3duZXIubXR4TG9jYWwudHJhbnNsYXRpb24ueSArIDIpXHJcbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKSA+IDAuNSkge1xyXG4gICAgICAgICAgICAgICAgICAgIEVuZW15U3Bhd25lci5zcGF3bkJ5SUQoRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUkFERFMsIEVudGl0eS5JRC5CQVQsIHBvc2l0aW9uLCBHYW1lLmF2YXRhcjEsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBFbmVteVNwYXduZXIuc3Bhd25CeUlEKEVuZW15LkVORU1ZQ0xBU1MuU1VNTU9OT1JBRERTLCBFbnRpdHkuSUQuQkFULCBwb3NpdGlvbiwgR2FtZS5hdmF0YXIyLCBudWxsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgY2lyY2xlU2hvb3QgZXh0ZW5kcyBBYmlsaXR5IHtcclxuICAgICAgICBwdWJsaWMgYnVsbGV0QW1vdW50OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBidWxsZXRzOiBCdWxsZXRzLkJ1bGxldFtdID0gW107XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmFjdGl2YXRlQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICB0aGlzLmJ1bGxldHMgPSBbXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmJ1bGxldEFtb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1bGxldHMucHVzaChuZXcgQnVsbGV0cy5CdWxsZXQoQnVsbGV0cy5CVUxMRVRUWVBFLlNUQU5EQVJELCB0aGlzLm93bmVyLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBHYW1lLsaSLlZlY3RvcjMuWkVSTygpLCB0aGlzLm93bmVyTmV0SWQpKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVsbGV0c1tpXS5tdHhMb2NhbC5yb3RhdGVaKCgzNjAgLyB0aGlzLmJ1bGxldEFtb3VudCAqIGkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnVsbGV0QW1vdW50OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQodGhpcy5idWxsZXRzW2ldKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25CdWxsZXQoV2VhcG9ucy5BSU0uTk9STUFMLCB0aGlzLmJ1bGxldHNbaV0uZGlyZWN0aW9uLCB0aGlzLmJ1bGxldHNbaV0ubmV0SWQsIHRoaXMub3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIENvb2xkb3duIHtcclxuICAgICAgICBwdWJsaWMgaGFzQ29vbERvd246IGJvb2xlYW5cclxuICAgICAgICBwcml2YXRlIGNvb2xEb3duOiBudW1iZXI7IGdldCBnZXRNYXhDb29sRG93bigpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5jb29sRG93biB9OyBzZXQgc2V0TWF4Q29vbERvd24oX3BhcmFtOiBudW1iZXIpIHsgdGhpcy5oYXNDb29sRG93biA9IGZhbHNlOyB0aGlzLmNvb2xEb3duID0gX3BhcmFtOyB0aGlzLmN1cnJlbnRDb29sZG93biA9IHRoaXMuY29vbERvd247IH1cclxuICAgICAgICBwcml2YXRlIGN1cnJlbnRDb29sZG93bjogbnVtYmVyOyBnZXQgZ2V0Q3VycmVudENvb2xkb3duKCk6IG51bWJlciB7IHJldHVybiB0aGlzLmN1cnJlbnRDb29sZG93biB9O1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9udW1iZXI6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvb2xEb3duID0gX251bWJlcjtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29vbGRvd24gPSBfbnVtYmVyO1xyXG4gICAgICAgICAgICB0aGlzLmhhc0Nvb2xEb3duID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc3RhcnRDb29sRG93bigpIHtcclxuICAgICAgICAgICAgdGhpcy5oYXNDb29sRG93biA9IHRydWVcclxuICAgICAgICAgICAgR2FtZS7Gki5Mb29wLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5MT09QX0ZSQU1FLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgZW5kQ29vbERvd24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFzQ29vbERvd24gPSBmYWxzZTtcclxuICAgICAgICAgICAgR2FtZS7Gki5Mb29wLnJlbW92ZUV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5MT09QX0ZSQU1FLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBldmVudFVwZGF0ZSA9IChfZXZlbnQ6IEV2ZW50KTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ29vbERvd24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVDb29sRG93bigpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaGFzQ29vbERvd24gJiYgdGhpcy5jdXJyZW50Q29vbGRvd24gPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDb29sZG93bi0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRDb29sZG93biA8PSAwICYmIHRoaXMuaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZW5kQ29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudENvb2xkb3duID0gdGhpcy5jb29sRG93bjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuIiwibmFtZXNwYWNlIEVudGl0eSB7XHJcblxyXG4gICAgZXhwb3J0IGVudW0gQVRUUklCVVRFVFlQRSB7XHJcbiAgICAgICAgSEVBTFRIUE9JTlRTLFxyXG4gICAgICAgIE1BWEhFQUxUSFBPSU5UUyxcclxuICAgICAgICBLTk9DS0JBQ0tGT1JDRSxcclxuICAgICAgICBISVRBQkxFLFxyXG4gICAgICAgIEFSTU9SLFxyXG4gICAgICAgIFNQRUVELFxyXG4gICAgICAgIEFUVEFDS1BPSU5UUyxcclxuICAgICAgICBDT09MRE9XTlJFRFVDVElPTixcclxuICAgICAgICBTQ0FMRVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIEF0dHJpYnV0ZXMge1xyXG5cclxuICAgICAgICBoZWFsdGhQb2ludHM6IG51bWJlcjtcclxuICAgICAgICBtYXhIZWFsdGhQb2ludHM6IG51bWJlcjtcclxuICAgICAgICBrbm9ja2JhY2tGb3JjZTogbnVtYmVyO1xyXG4gICAgICAgIGhpdGFibGU6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgICAgIGFybW9yOiBudW1iZXI7XHJcbiAgICAgICAgc3BlZWQ6IG51bWJlcjtcclxuICAgICAgICBhdHRhY2tQb2ludHM6IG51bWJlcjtcclxuICAgICAgICBjb29sRG93blJlZHVjdGlvbjogbnVtYmVyID0gMTtcclxuICAgICAgICBzY2FsZTogbnVtYmVyO1xyXG4gICAgICAgIGFjY3VyYWN5OiBudW1iZXIgPSA4MDtcclxuXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9oZWFsdGhQb2ludHM6IG51bWJlciwgX2F0dGFja1BvaW50czogbnVtYmVyLCBfc3BlZWQ6IG51bWJlciwgX3NjYWxlOiBudW1iZXIsIF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfYXJtb3I6IG51bWJlciwgX2Nvb2xkb3duUmVkdWN0aW9uOiBudW1iZXIsIF9hY2N1cmFjeTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2NhbGUgPSBfc2NhbGU7XHJcbiAgICAgICAgICAgIHRoaXMuYXJtb3IgPSBfYXJtb3I7XHJcbiAgICAgICAgICAgIHRoaXMuaGVhbHRoUG9pbnRzID0gX2hlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgdGhpcy5tYXhIZWFsdGhQb2ludHMgPSB0aGlzLmhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgdGhpcy5hdHRhY2tQb2ludHMgPSBfYXR0YWNrUG9pbnRzO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gX3NwZWVkO1xyXG4gICAgICAgICAgICB0aGlzLmtub2NrYmFja0ZvcmNlID0gX2tub2NrYmFja0ZvcmNlXHJcbiAgICAgICAgICAgIHRoaXMuY29vbERvd25SZWR1Y3Rpb24gPSBfY29vbGRvd25SZWR1Y3Rpb247XHJcbiAgICAgICAgICAgIHRoaXMuYWNjdXJhY3kgPSBfYWNjdXJhY3k7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlU2NhbGVEZXBlbmRlbmNpZXMoKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWF4SGVhbHRoUG9pbnRzID0gTWF0aC5yb3VuZCh0aGlzLm1heEhlYWx0aFBvaW50cyAqICgxMDAgKyAoMTAgKiB0aGlzLnNjYWxlKSkgLyAxMDApO1xyXG4gICAgICAgICAgICB0aGlzLmhlYWx0aFBvaW50cyA9IE1hdGgucm91bmQodGhpcy5oZWFsdGhQb2ludHMgKiAoMTAwICsgKDEwICogdGhpcy5zY2FsZSkpIC8gMTAwKTtcclxuICAgICAgICAgICAgdGhpcy5hdHRhY2tQb2ludHMgPSBNYXRoLnJvdW5kKHRoaXMuYXR0YWNrUG9pbnRzICogdGhpcy5zY2FsZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSBNYXRoLmZyb3VuZCh0aGlzLnNwZWVkIC8gdGhpcy5zY2FsZSk7XHJcbiAgICAgICAgICAgIHRoaXMua25vY2tiYWNrRm9yY2UgPSB0aGlzLmtub2NrYmFja0ZvcmNlICogKDEwMCArICgxMCAqIHRoaXMuc2NhbGUpKSAvIDEwMDtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJpbSBiZWVpbmcgY2FsbGVkXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBFbmVteSB7XHJcbiAgICBleHBvcnQgY2xhc3MgU3VtbW9ub3IgZXh0ZW5kcyBFbmVteVNob290IHtcclxuICAgICAgICBkYW1hZ2VUYWtlbjogbnVtYmVyID0gMDtcclxuXHJcbiAgICAgICAgYXR0YWNrUGhhc2VDZDogQWJpbGl0eS5Db29sZG93biA9IG5ldyBBYmlsaXR5LkNvb2xkb3duKDU4MCk7XHJcbiAgICAgICAgZGVmZW5jZVBoYXNlQ2Q6IEFiaWxpdHkuQ29vbGRvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93big3MjApO1xyXG4gICAgICAgIGJlZ2luU2hvb3Rpbmc6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBzaG9vdGluZ0NvdW50OiBudW1iZXIgPSAzO1xyXG4gICAgICAgIGN1cnJlbnRTaG9vdGluZ0NvdW50OiBudW1iZXIgPSAwO1xyXG5cclxuICAgICAgICBwcml2YXRlIHN1bW1vbjogQWJpbGl0eS5TcGF3blN1bW1vbmVycyA9IG5ldyBBYmlsaXR5LlNwYXduU3VtbW9uZXJzKHRoaXMubmV0SWQsIDAsIDEsIDQ1KTtcclxuICAgICAgICBwcml2YXRlIGRhc2g6IEFiaWxpdHkuRGFzaCA9IG5ldyBBYmlsaXR5LkRhc2godGhpcy5uZXRJZCwgNDUsIDEsIDEzICogNjAsIDUpO1xyXG4gICAgICAgIHByaXZhdGUgc2hvb3QzNjA6IEFiaWxpdHkuY2lyY2xlU2hvb3QgPSBuZXcgQWJpbGl0eS5jaXJjbGVTaG9vdCh0aGlzLm5ldElkLCAwLCAzLCA1ICogNjApO1xyXG4gICAgICAgIHByaXZhdGUgZGFzaFdlYXBvbjogV2VhcG9ucy5XZWFwb24gPSBuZXcgV2VhcG9ucy5XZWFwb24oMTIsIDEsIEJ1bGxldHMuQlVMTEVUVFlQRS5TVU1NT05FUiwgMSwgdGhpcy5uZXRJZCwgV2VhcG9ucy5BSU0uTk9STUFMKTtcclxuICAgICAgICBwcml2YXRlIGZsb2NrOiBGbG9ja2luZ0JlaGF2aW91ciA9IG5ldyBGbG9ja2luZ0JlaGF2aW91cih0aGlzLCA0LCA0LCAwLCAwLCAxLCAxLCAxLCAyKTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMudGFnID0gVGFnLlRBRy5FTkVNWTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGJlaGF2aW91cigpIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBHYW1lLmF2YXRhcjEubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZSA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRShDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKS50b1ZlY3RvcjIoKS50b1ZlY3RvcjMoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLm1hZ25pdHVkZTtcclxuICAgICAgICAgICAgdGhpcy5mbG9jay51cGRhdGUoKTtcclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5mbG9jay5nZXRNb3ZlVmVjdG9yKCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZSA8IDUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ290UmVjb2duaXplZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZsb2NrLmF2b2lkV2VpZ2h0ID0gNTtcclxuICAgICAgICAgICAgICAgIC8vVE9ETzogSW50cm8gYW5pbWF0aW9uIGhlcmUgYW5kIHdoZW4gaXQgaXMgZG9uZSB0aGVuIGZpZ2h0Li4uXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZsb2NrLmF2b2lkV2VpZ2h0ID0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuZGFtYWdlVGFrZW4gPj0gMjUpIHtcclxuICAgICAgICAgICAgICAgIG5ldyBCdWZmLkF0dHJpYnV0ZXNCdWZmKEJ1ZmYuQlVGRklELklNTVVORSwgbnVsbCwgMSwgMCkuYWRkVG9FbnRpdHkodGhpcyk7XHJcbiAgICAgICAgICAgICAgICAvLyBuZXcgQnVmZi5EYW1hZ2VCdWZmKEJ1ZmYuQlVGRklELlBPSVNPTiwgMTIwLCAzMCwgMykuYWRkVG9FbnRpdHkodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLlNVTU1PTjtcclxuICAgICAgICAgICAgICAgIC8vIHRoaXMuZGFtYWdlVGFrZW4gPSAwO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GTEVFO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0RGFtYWdlKF92YWx1ZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmdldERhbWFnZShfdmFsdWUpO1xyXG4gICAgICAgICAgICB0aGlzLmRhbWFnZVRha2VuICs9IF92YWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmVoYXZpb3VyKCk7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLklETEU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GTEVFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuV0FMSyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdHRhY2tpbmdQaGFzZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLlNVTU1PTjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLlNVTU1PTik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlbmNlUGhhc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uc1tcImlkbGVcIl0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhdHRhY2tpbmdQaGFzZSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmF0dGFja1BoYXNlQ2QuaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNrUGhhc2VDZC5zZXRNYXhDb29sRG93biA9IE1hdGgucm91bmQodGhpcy5hdHRhY2tQaGFzZUNkLmdldE1heENvb2xEb3duICsgTWF0aC5yYW5kb20oKSAqIDUgKyBNYXRoLnJhbmRvbSgpICogLTUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hdHRhY2tQaGFzZUNkLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5hdHRhY2tQaGFzZUNkLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UoQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbikudG9WZWN0b3IyKCkudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGU7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGRpc3RhbmNlID4gMTAgfHwgdGhpcy5kYXNoLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gQ2FsY3VsYXRpb24uZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRCh0aGlzLm1vdmVEaXJlY3Rpb24sIDkwKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTAwKSA+PSAxMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRhc2guZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVBd2F5KENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS50b1ZlY3RvcjIoKSkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGFzaC5kb2VzQWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGFzaFdlYXBvbi5zaG9vdCh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnRhcmdldCwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSkudG9WZWN0b3IzKCksIG51bGwsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGFzaFdlYXBvbi5nZXRDb29sRG93bi5zZXRNYXhDb29sRG93biA9IENhbGN1bGF0aW9uLmNsYW1wTnVtYmVyKE1hdGgucmFuZG9tKCkgKiAzMCwgOCwgMzApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IChuZXcgxpIuVmVjdG9yMigwLCAwKSkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob290aW5nMzYwKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlZmVuY2VQaGFzZSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5zdW1tb24uZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIC8vVE9ETzogbWFrZSBpZiBkZXBlbmRlbnQgZnJvbSB0ZWxlcG9ydCBhbmltYXRpb24gZnJhbWVcclxuICAgICAgICAgICAgLy8gaWYgKCF0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLmVxdWFscyhuZXcgxpIuVmVjdG9yMigwLCAtMTMpLnRvVmVjdG9yMygpLCAxKSkge1xyXG4gICAgICAgICAgICAvLyBsZXQgc3VtbW9uUG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMiA9IG5ldyDGki5WZWN0b3IyKDAsIC0xMCk7XHJcbiAgICAgICAgICAgIC8vIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBzdW1tb25Qb3NpdGlvbi50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgLy8gLy8gfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gaWYgKCF0aGlzLmRlZmVuY2VQaGFzZUNkLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgIC8vICAgICB0aGlzLmRlZmVuY2VQaGFzZUNkLnNldE1heENvb2xEb3duID0gTWF0aC5yb3VuZCh0aGlzLmRlZmVuY2VQaGFzZUNkLmdldE1heENvb2xEb3duICsgTWF0aC5yYW5kb20oKSAqIDUgKyBNYXRoLnJhbmRvbSgpICogLTUpO1xyXG4gICAgICAgICAgICAvLyAgICAgdGhpcy5kZWZlbmNlUGhhc2VDZC5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgLy8gaWYgKHRoaXMuZGVmZW5jZVBoYXNlQ2QuaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgLy8gICAgIGlmICh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLmVxdWFscyhzdW1tb25Qb3NpdGlvbi50b1ZlY3RvcjMoKSwgMSkgJiYgdGhpcy5nZXRDdXJyZW50RnJhbWUgPT0gOSkge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKFwic3Bhd25pbmdcIik7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgLy8gdGhpcy5zdW1tb24uZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgIC8vIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vICAgICAvLyAoPEJ1ZmYuQXR0cmlidXRlc0J1ZmY+dGhpcy5idWZmcy5maW5kKGJ1ZmYgPT4gYnVmZi5pZCA9PSBCdWZmLkJVRkZJRC5JTU1VTkUpKS5kdXJhdGlvbiA9IDA7XHJcbiAgICAgICAgICAgIC8vICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gKG5ldyDGki5WZWN0b3IyKDAsIDApKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgLy8gICAgIHRoaXMuc2hvb3RpbmczNjAoKTtcclxuICAgICAgICAgICAgLy8gICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuRkxFRTtcclxuICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzaG9vdGluZzM2MCgpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmJlZ2luU2hvb3RpbmcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFNob290aW5nQ291bnQgPSBNYXRoLnJvdW5kKHRoaXMuc2hvb3RpbmdDb3VudCArIE1hdGgucmFuZG9tKCkgKiAyKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYmVnaW5TaG9vdGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50U2hvb3RpbmdDb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNob290MzYwLmJ1bGxldEFtb3VudCA9IE1hdGgucm91bmQoOCArIE1hdGgucmFuZG9tKCkgKiA4KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNob290MzYwLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNob290MzYwLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFNob290aW5nQ291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYmVnaW5TaG9vdGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEJ1ZmYge1xyXG5cclxuICAgIGV4cG9ydCBlbnVtIEJVRkZJRCB7XHJcbiAgICAgICAgQkxFRURJTkcsXHJcbiAgICAgICAgUE9JU09OLFxyXG4gICAgICAgIEhFQUwsXHJcbiAgICAgICAgU0xPVyxcclxuICAgICAgICBJTU1VTkVcclxuICAgIH1cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCdWZmIHtcclxuICAgICAgICBkdXJhdGlvbjogbnVtYmVyO1xyXG4gICAgICAgIHRpY2tSYXRlOiBudW1iZXJcclxuICAgICAgICBpZDogQlVGRklEO1xyXG4gICAgICAgIHByb3RlY3RlZCBub0R1cmF0aW9uOiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGNvb2xEb3duOiBBYmlsaXR5LkNvb2xkb3duO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEJVRkZJRCwgX2R1cmF0aW9uOiBudW1iZXIsIF90aWNrUmF0ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMuZHVyYXRpb24gPSBfZHVyYXRpb247XHJcbiAgICAgICAgICAgIHRoaXMudGlja1JhdGUgPSBfdGlja1JhdGU7XHJcbiAgICAgICAgICAgIHRoaXMubm9EdXJhdGlvbiA9IDA7XHJcbiAgICAgICAgICAgIGlmIChfZHVyYXRpb24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvb2xEb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oX2R1cmF0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29vbERvd24gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBnZXRQYXJ0aWNsZUJ5SWQoX2lkOiBCVUZGSUQpOiBVSS5QYXJ0aWNsZXMge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKF9pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuUE9JU09OOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVUkuUGFydGljbGVzKEJVRkZJRC5QT0lTT04sIFVJLnBvaXNvblBhcnRpY2xlLCA2LCAxMik7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5JTU1VTkU6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoQlVGRklELklNTVVORSwgVUkuaW1tdW5lUGFydGljbGUsIDEsIDYpO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNsb25lKCk6IEJ1ZmYge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBhcHBseUJ1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEJ1ZmZCeUlkKHRoaXMuaWQsIF9hdmF0YXIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVCdWZmTGlzdChfYXZhdGFyLmJ1ZmZzLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiByZW1vdmVzIHRoZSBidWZmIGZyb20gdGhlIGJ1ZmYgbGlzdCwgcmVtb3ZlcyB0aGUgcGFydGljbGUgYW5kIHNlbmRzIHRoZSBuZXcgbGlzdCB0byB0aGUgY2xpZW50XHJcbiAgICAgICAgICogQHBhcmFtIF9hdmF0YXIgZW50aXR5IHRoZSBidWZmIHNob3VsZCBiZSByZW1vdmVkXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIHJlbW92ZUJ1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICBfYXZhdGFyLnJlbW92ZUNoaWxkKF9hdmF0YXIuZ2V0Q2hpbGRyZW4oKS5maW5kKGNoaWxkID0+ICg8VUkuUGFydGljbGVzPmNoaWxkKS5pZCA9PSB0aGlzLmlkKSk7XHJcbiAgICAgICAgICAgIF9hdmF0YXIuYnVmZnMuc3BsaWNlKF9hdmF0YXIuYnVmZnMuaW5kZXhPZih0aGlzKSk7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0QnVmZkJ5SWQodGhpcy5pZCwgX2F2YXRhciwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVCdWZmTGlzdChfYXZhdGFyLmJ1ZmZzLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBvbmx5IHVzZSB0aGlzIGZ1bmN0aW9uIHRvIGFkZCBidWZmcyB0byBlbnRpdGllc1xyXG4gICAgICAgICAqIEBwYXJhbSBfYXZhdGFyIGVudGl0eSBpdCBzaG91bGQgYmUgYWRkIHRvXHJcbiAgICAgICAgICogQHJldHVybnMgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGFkZFRvRW50aXR5KF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgaWYgKF9hdmF0YXIuYnVmZnMuZmlsdGVyKGJ1ZmYgPT4gYnVmZi5pZCA9PSB0aGlzLmlkKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBfYXZhdGFyLmJ1ZmZzLnB1c2godGhpcyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZFBhcnRpY2xlKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29vbERvd24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb29sRG93bi5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1ZmZMaXN0KF9hdmF0YXIuYnVmZnMsIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBidWZmIGFwcGxpZXMgaXRzIGJ1ZmYgc3RhdHMgdG8gdGhlIGVudGl0eSBhbmQgZGVsZXRlcyBpdHNlbGYgd2hlbiBpdHMgZHVyYXRpb24gaXMgb3ZlclxyXG4gICAgICAgICAqIEBwYXJhbSBfYXZhdGFyIGVudGl0eSBpdCBzaG91bGQgYmUgYWRkIHRvXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGRvQnVmZlN0dWZmKF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZ2V0QnVmZkJ5SWQoX2lkOiBCdWZmLkJVRkZJRCwgX2F2YXRhcjogRW50aXR5LkVudGl0eSwgX2FkZDogYm9vbGVhbikge1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBhZGRQYXJ0aWNsZShfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIGlmIChfYXZhdGFyLmdldENoaWxkcmVuKCkuZmluZChjaGlsZCA9PiAoPFVJLlBhcnRpY2xlcz5jaGlsZCkuaWQgPT0gdGhpcy5pZCkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcGFydGljbGUgPSB0aGlzLmdldFBhcnRpY2xlQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgICAgIGlmIChwYXJ0aWNsZSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmFkZENoaWxkKHBhcnRpY2xlKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJ0aWNsZS5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMyhfYXZhdGFyLm10eExvY2FsLnNjYWxpbmcueCwgX2F2YXRhci5tdHhMb2NhbC5zY2FsaW5nLnksIDEpKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJ0aWNsZS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IyKF9hdmF0YXIub2Zmc2V0Q29sbGlkZXJYLCBfYXZhdGFyLm9mZnNldENvbGxpZGVyWSkudG9WZWN0b3IzKDAuMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFydGljbGUuYWN0aXZhdGUodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFJhcml0eUJ1ZmYge1xyXG4gICAgICAgIGlkOiBJdGVtcy5SQVJJVFk7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBJdGVtcy5SQVJJVFkpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBhZGRUb0l0ZW0oX2l0ZW06IEl0ZW1zLkl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5hZGRQYXJ0aWNsZVRvSXRlbShfaXRlbSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGdldFBhcnRpY2xlQnlJZChfaWQ6IEl0ZW1zLlJBUklUWSk6IFVJLlBhcnRpY2xlcyB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEl0ZW1zLlJBUklUWS5DT01NT046XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoX2lkLCBVSS5jb21tb25QYXJ0aWNsZSwgMSwgMTIpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5SQVJJVFkuUkFSRTpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVJLlBhcnRpY2xlcyhfaWQsIFVJLnJhcmVQYXJ0aWNsZSwgMSwgMTIpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5SQVJJVFkuRVBJQzpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVJLlBhcnRpY2xlcyhfaWQsIFVJLmVwaWNQYXJ0aWNsZSwgMSwgMTIpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5SQVJJVFkuTEVHRU5EQVJZOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVUkuUGFydGljbGVzKF9pZCwgVUkubGVnZW5kYXJ5UGFydGljbGUsIDEsIDEyKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoX2lkLCBVSS5jb21tb25QYXJ0aWNsZSwgMSwgMTIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGFkZFBhcnRpY2xlVG9JdGVtKF9pdGVtOiBJdGVtcy5JdGVtKSB7XHJcbiAgICAgICAgICAgIGlmIChfaXRlbS5nZXRDaGlsZHJlbigpLmZpbmQoY2hpbGQgPT4gKDxVSS5QYXJ0aWNsZXM+Y2hpbGQpLmlkID09IHRoaXMuaWQpID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHBhcnRpY2xlID0gdGhpcy5nZXRQYXJ0aWNsZUJ5SWQodGhpcy5pZClcclxuICAgICAgICAgICAgICAgIGlmIChwYXJ0aWNsZSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBfaXRlbS5hZGRDaGlsZChwYXJ0aWNsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFydGljbGUubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjMoX2l0ZW0ubXR4TG9jYWwuc2NhbGluZy54LCBfaXRlbS5tdHhMb2NhbC5zY2FsaW5nLnksIDEpKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJ0aWNsZS5tdHhMb2NhbC50cmFuc2xhdGVaKDAuMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFydGljbGUuYWN0aXZhdGUodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERhbWFnZUJ1ZmYgZXh0ZW5kcyBCdWZmIHtcclxuICAgICAgICB2YWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogQlVGRklELCBfZHVyYXRpb246IG51bWJlciwgX3RpY2tSYXRlOiBudW1iZXIsIF92YWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2R1cmF0aW9uLCBfdGlja1JhdGUpXHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBfdmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2xvbmUoKTogRGFtYWdlQnVmZiB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGFtYWdlQnVmZih0aGlzLmlkLCB0aGlzLmR1cmF0aW9uLCB0aGlzLnRpY2tSYXRlLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkb0J1ZmZTdHVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvb2xEb3duICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNvb2xEb3duLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuY29vbERvd24uZ2V0Q3VycmVudENvb2xkb3duICUgdGhpcy50aWNrUmF0ZSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseUJ1ZmYoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5ub0R1cmF0aW9uICUgdGhpcy50aWNrUmF0ZSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseUJ1ZmYoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRHVyYXRpb24rKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGdldEJ1ZmZCeUlkKF9pZDogQlVGRklELCBfYXZhdGFyOiBFbnRpdHkuRW50aXR5LCBfYWRkOiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKF9pZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELkJMRUVESU5HOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmdldERhbWFnZSh0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuUE9JU09OOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IGRvIGRhbWFnZSB0byBwbGF5ZXIgdW50aWwgaGUgaGFzIDIwJSBoZWFsdGhcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9hdmF0YXIgaW5zdGFuY2VvZiBQbGF5ZXIuUGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2F2YXRhci5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA+IF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgKiAwLjIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmdldERhbWFnZSh0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuZ2V0RGFtYWdlKHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgeyByZXR1cm47IH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEF0dHJpYnV0ZXNCdWZmIGV4dGVuZHMgQnVmZiB7XHJcbiAgICAgICAgaXNCdWZmQXBwbGllZDogYm9vbGVhbjtcclxuICAgICAgICB2YWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIHJlbW92ZWRWYWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogQlVGRklELCBfZHVyYXRpb246IG51bWJlciwgX3RpY2tSYXRlOiBudW1iZXIsIF92YWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2R1cmF0aW9uLCBfdGlja1JhdGUpO1xyXG4gICAgICAgICAgICB0aGlzLmlzQnVmZkFwcGxpZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IF92YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIGNsb25lKCk6IEF0dHJpYnV0ZXNCdWZmIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBBdHRyaWJ1dGVzQnVmZih0aGlzLmlkLCB0aGlzLmR1cmF0aW9uLCB0aGlzLnRpY2tSYXRlLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIGRvQnVmZlN0dWZmKF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZHVyYXRpb24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoIXRoaXMuaXNCdWZmQXBwbGllZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNCdWZmQXBwbGllZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmR1cmF0aW9uLS07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNCdWZmQXBwbGllZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNCdWZmQXBwbGllZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZFBhcnRpY2xlKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZ2V0QnVmZkJ5SWQoX2lkOiBCVUZGSUQsIF9hdmF0YXI6IEVudGl0eS5FbnRpdHksIF9hZGQ6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELlNMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVkVmFsdWUgPSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQsIDUwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkIC09IHRoaXMucmVtb3ZlZFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCArPSB0aGlzLnJlbW92ZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5JTU1VTkU6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmhpdGFibGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBsZXQgcGF5bG9hZDogSW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkID0gPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuaGl0YWJsZSwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuSElUQUJMRSB9XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKHBheWxvYWQsIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEJ1bGxldHMge1xyXG5cclxuICAgIGV4cG9ydCBlbnVtIEJVTExFVFRZUEUge1xyXG4gICAgICAgIFNUQU5EQVJELFxyXG4gICAgICAgIEhJR0hTUEVFRCxcclxuICAgICAgICBTTE9XLFxyXG4gICAgICAgIE1FTEVFLFxyXG4gICAgICAgIFNVTU1PTkVSLFxyXG4gICAgICAgIC8vIFRPRE86IHNwZWFrIHdpdGggbWF1cmljZVxyXG4gICAgICAgIFRIT1JTSEFNTUVSXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCBidWxsZXRUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgd2F0ZXJCYWxsVHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCdWxsZXQgZXh0ZW5kcyBHYW1lLsaSLk5vZGUgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklTcGF3bmFibGUsIEludGVyZmFjZXMuSUtub2NrYmFja2FibGUsIEludGVyZmFjZXMuSU5ldHdvcmthYmxlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5CVUxMRVQ7XHJcbiAgICAgICAgb3duZXJOZXRJZDogbnVtYmVyOyBnZXQgb3duZXIoKTogRW50aXR5LkVudGl0eSB7IHJldHVybiBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IHRoaXMub3duZXJOZXRJZCkgfTtcclxuICAgICAgICBwdWJsaWMgbmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgY2xpZW50UHJlZGljdGlvbjogTmV0d29ya2luZy5DbGllbnRCdWxsZXRQcmVkaWN0aW9uO1xyXG4gICAgICAgIHB1YmxpYyBzZXJ2ZXJQcmVkaWN0aW9uOiBOZXR3b3JraW5nLlNlcnZlckJ1bGxldFByZWRpY3Rpb247XHJcbiAgICAgICAgcHVibGljIGZseURpcmVjdGlvbjogxpIuVmVjdG9yMztcclxuICAgICAgICBkaXJlY3Rpb246IMaSLlZlY3RvcjM7XHJcblxyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7XHJcblxyXG4gICAgICAgIHB1YmxpYyBoaXRQb2ludHNTY2FsZTogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBzcGVlZDogbnVtYmVyID0gMjA7XHJcbiAgICAgICAgbGlmZXRpbWU6IG51bWJlciA9IDEgKiA2MDtcclxuICAgICAgICBrbm9ja2JhY2tGb3JjZTogbnVtYmVyID0gNDtcclxuICAgICAgICB0eXBlOiBCVUxMRVRUWVBFO1xyXG5cclxuICAgICAgICB0aW1lOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIGtpbGxjb3VudDogbnVtYmVyID0gMTtcclxuXHJcbiAgICAgICAgdGV4dHVyZVBhdGg6IHN0cmluZztcclxuXHJcbiAgICAgICAgcHVibGljIGRlc3Bhd24oKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lID49IDAgJiYgdGhpcy5saWZldGltZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lLS07XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucmVtb3ZlQnVsbGV0KHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnR5cGUgPT0gQlVMTEVUVFlQRS5USE9SU0hBTU1FUikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNwYXduVGhvcnNIYW1tZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9idWxsZXRUeXBlOiBCVUxMRVRUWVBFLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9vd25lcklkOiBudW1iZXIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihCVUxMRVRUWVBFW19idWxsZXRUeXBlXSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnR5cGUgPSBfYnVsbGV0VHlwZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfbmV0SWQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5jdXJyZW50SURzLnB1c2goX25ldElkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV0SWQgPSBfbmV0SWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5ldElkID0gTmV0d29ya2luZy5pZEdlbmVyYXRvcigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgcmVmID0gR2FtZS5idWxsZXRzSlNPTi5maW5kKGJ1bGxldCA9PiBidWxsZXQubmFtZSA9PSBCVUxMRVRUWVBFW19idWxsZXRUeXBlXS50b0xvd2VyQ2FzZSgpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSByZWYuc3BlZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0UG9pbnRzU2NhbGUgPSByZWYuaGl0UG9pbnRzU2NhbGU7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSByZWYubGlmZXRpbWU7XHJcbiAgICAgICAgICAgIHRoaXMua25vY2tiYWNrRm9yY2UgPSByZWYua25vY2tiYWNrRm9yY2U7XHJcbiAgICAgICAgICAgIHRoaXMua2lsbGNvdW50ID0gcmVmLmtpbGxjb3VudDtcclxuICAgICAgICAgICAgdGhpcy50ZXh0dXJlUGF0aCA9IHJlZi50ZXh0dXJlUGF0aDtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRMaWdodChuZXcgxpIuTGlnaHRQb2ludCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDApO1xyXG4gICAgICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWVzaCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlclBvc2l0aW9uID0gbmV3IMaSLlZlY3RvcjIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCArIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKGNvbGxpZGVyUG9zaXRpb24sIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSAvIDEuNSwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUm90YXRpb24oX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUoKTtcclxuICAgICAgICAgICAgdGhpcy5mbHlEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlgoKTtcclxuICAgICAgICAgICAgdGhpcy5kaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyTmV0SWQgPSBfb3duZXJJZDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2VydmVyUHJlZGljdGlvbiA9IG5ldyBOZXR3b3JraW5nLlNlcnZlckJ1bGxldFByZWRpY3Rpb24odGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuY2xpZW50UHJlZGljdGlvbiA9IG5ldyBOZXR3b3JraW5nLkNsaWVudEJ1bGxldFByZWRpY3Rpb24odGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHYW1lLsaSLkVWRU5ULlJFTkRFUl9QUkVQQVJFLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBldmVudFVwZGF0ZSA9IChfZXZlbnQ6IEV2ZW50KTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5wcmVkaWN0KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgcHJlZGljdCgpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAhPSBOZXR3b3JraW5nLmNsaWVudC5pZCAmJiB0aGlzLm93bmVyID09IEdhbWUuYXZhdGFyMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbGllbnRQcmVkaWN0aW9uLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3duZXIgPT0gR2FtZS5hdmF0YXIyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJ2ZXJQcmVkaWN0aW9uLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmUodGhpcy5mbHlEaXJlY3Rpb24uY2xvbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQnVsbGV0KHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMubXR4TG9jYWwucm90YXRpb24sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGVzcGF3bigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBtb3ZlKF9kaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkICYmIHRoaXMub3duZXIgPT0gR2FtZS5hdmF0YXIyKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKHRoaXMuY2xpZW50UHJlZGljdGlvbi5taW5UaW1lQmV0d2VlblRpY2tzICogdGhpcy5zcGVlZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKEdhbWUuZGVsdGFUaW1lICogdGhpcy5zcGVlZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpc2lvbkRldGVjdGlvbigpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBkb0tub2NrYmFjayhfYm9keTogxpJBaWQuTm9kZVNwcml0ZSk6IHZvaWQge1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IzKTogdm9pZCB7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgdXBkYXRlUm90YXRpb24oX2RpcmVjdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnJvdGF0ZVooQ2FsY3VsYXRpb24uY2FsY0RlZ3JlZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgxpIuVmVjdG9yMy5TVU0oX2RpcmVjdGlvbiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pKSArIDkwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBzcGF3blRob3JzSGFtbWVyKCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmVtb3ZlSXRlbSA9IHRoaXMub3duZXIuaXRlbXMuZmluZChpdGVtID0+ICg8SXRlbXMuSW50ZXJuYWxJdGVtPml0ZW0pLmlkID09IEl0ZW1zLklURU1JRC5USE9SU0hBTU1FUik7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeShmYWxzZSwgcmVtb3ZlSXRlbS5pZCwgcmVtb3ZlSXRlbS5uZXRJZCwgdGhpcy5vd25lck5ldElkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3duZXIuaXRlbXMuc3BsaWNlKHRoaXMub3duZXIuaXRlbXMuaW5kZXhPZihyZW1vdmVJdGVtKSwgMSk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKEl0ZW1zLklURU1JRC5USE9SU0hBTU1FUik7XHJcbiAgICAgICAgICAgICAgICBpdGVtLnNldFBvc2l0aW9uKHRoaXMubXR4V29ybGQudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3duZXIgPT0gR2FtZS5hdmF0YXIxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5zZXRDaG9vc2VuT25lTmV0SWQoR2FtZS5hdmF0YXIyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5zZXRDaG9vc2VuT25lTmV0SWQoR2FtZS5hdmF0YXIxLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGl0ZW0uc3Bhd24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLm93bmVyLndlYXBvbi5nZXRDb29sRG93bi5zZXRNYXhDb29sRG93biA9ICtsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImNvb2xkb3duVGltZVwiKTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3duZXIud2VhcG9uLmFpbVR5cGUgPSAoPGFueT5XZWFwb25zLkFJTSlbbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJhaW1UeXBlXCIpXTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3duZXIud2VhcG9uLmJ1bGxldFR5cGUgPSAoPGFueT5CVUxMRVRUWVBFKVtsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImJ1bGxldFR5cGVcIildO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vd25lci53ZWFwb24ucHJvamVjdGlsZUFtb3VudCA9ICtsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInByb2plY3RpbGVBbW91bnRcIik7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhcldlYXBvbih0aGlzLm93bmVyLndlYXBvbiwgdGhpcy5vd25lck5ldElkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGxvYWRUZXh0dXJlKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy50ZXh0dXJlUGF0aCAhPSBcIlwiIHx8IHRoaXMudGV4dHVyZVBhdGggIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld1R4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld0NvYXQ6IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCA9IG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoKTtcclxuICAgICAgICAgICAgICAgIGxldCBuZXdNdHI6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibXRyXCIsIMaSLlNoYWRlckZsYXRUZXh0dXJlZCwgbmV3Q29hdCk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG9sZENvbUNvYXQ6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgb2xkQ29tQ29hdCA9IHRoaXMuZ2V0Q29tcG9uZW50KMaSLkNvbXBvbmVudE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMudGV4dHVyZVBhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIGJ1bGxldFR4dC51cmw6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IGJ1bGxldFR4dDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB3YXRlckJhbGxUeHQudXJsOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB3YXRlckJhbGxUeHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIG5ld0NvYXQuY29sb3IgPSDGki5Db2xvci5DU1MoXCJXSElURVwiKTtcclxuICAgICAgICAgICAgICAgIG5ld0NvYXQudGV4dHVyZSA9IG5ld1R4dDtcclxuICAgICAgICAgICAgICAgIG9sZENvbUNvYXQubWF0ZXJpYWwgPSBuZXdNdHI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldEJ1ZmYoX3RhcmdldDogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLml0ZW1zLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLmJ1ZmYuZm9yRWFjaChidWZmID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYnVmZiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZi5jbG9uZSgpLmFkZFRvRW50aXR5KF90YXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY29sbGlzaW9uRGV0ZWN0aW9uKCkge1xyXG4gICAgICAgICAgICBsZXQgbmV3UG9zaXRpb24gPSBuZXcgxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBuZXdQb3NpdGlvbjtcclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyczogxpIuTm9kZVtdID0gW107XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm93bmVyLnRhZyA9PSBUYWcuVEFHLlBMQVlFUikge1xyXG4gICAgICAgICAgICAgICAgY29sbGlkZXJzID0gR2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuRU5FTVkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChfZWxlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnQ6IEVuZW15LkVuZW15ID0gKDxFbmVteS5FbmVteT5fZWxlbSk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50LmNvbGxpZGVyKSAmJiBlbGVtZW50LmF0dHJpYnV0ZXMgIT0gdW5kZWZpbmVkICYmIHRoaXMua2lsbGNvdW50ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgoPEVuZW15LkVuZW15PmVsZW1lbnQpLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEVuZW15LlN1bW1vbm9yQWRkcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCg8RW5lbXkuU3VtbW9ub3JBZGRzPmVsZW1lbnQpLmF2YXRhciA9PSB0aGlzLm93bmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5raWxsY291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxFbmVteS5FbmVteT5lbGVtZW50KS5nZXREYW1hZ2UodGhpcy5vd25lci5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cyAqIHRoaXMuaGl0UG9pbnRzU2NhbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEJ1ZmYoKDxFbmVteS5FbmVteT5lbGVtZW50KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkuZ2V0S25vY2tiYWNrKHRoaXMua25vY2tiYWNrRm9yY2UsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5raWxsY291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm93bmVyLnRhZyA9PSBUYWcuVEFHLkVORU1ZKSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRlcnMgPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlBMQVlFUik7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoX2VsZW0pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZWxlbWVudDogUGxheWVyLlBsYXllciA9ICg8UGxheWVyLlBsYXllcj5fZWxlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5hdHRyaWJ1dGVzICE9IHVuZGVmaW5lZCAmJiB0aGlzLmtpbGxjb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA+IDAgJiYgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmF0dHJpYnV0ZXMuaGl0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmdldERhbWFnZSh0aGlzLmhpdFBvaW50c1NjYWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5nZXRLbm9ja2JhY2sodGhpcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBVSS5EYW1hZ2VVSSgoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLmhpdFBvaW50c1NjYWxlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMua2lsbGNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb2xsaWRlcnMgPSBbXTtcclxuICAgICAgICAgICAgY29sbGlkZXJzID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbWVudCA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5ST09NKSkud2FsbHM7XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChfZWxlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnQ6IEdlbmVyYXRpb24uV2FsbCA9ICg8R2VuZXJhdGlvbi5XYWxsPl9lbGVtKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzUmVjdChlbGVtZW50LmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgSG9taW5nQnVsbGV0IGV4dGVuZHMgQnVsbGV0IHtcclxuICAgICAgICB0YXJnZXQ6IMaSLlZlY3RvcjM7XHJcbiAgICAgICAgcm90YXRlU3BlZWQ6IG51bWJlciA9IDI7XHJcbiAgICAgICAgdGFyZ2V0RGlyZWN0aW9uOiDGki5WZWN0b3IzO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfYnVsbGV0dHlwZTogQlVMTEVUVFlQRSwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfb3duZXJJZDogbnVtYmVyLCBfdGFyZ2V0PzogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9idWxsZXR0eXBlLCBfcG9zaXRpb24sIF9kaXJlY3Rpb24sIF9vd25lcklkLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gMjA7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0UG9pbnRzU2NhbGUgPSAxO1xyXG4gICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMSAqIDYwO1xyXG4gICAgICAgICAgICB0aGlzLmtpbGxjb3VudCA9IDE7XHJcbiAgICAgICAgICAgIGlmIChfdGFyZ2V0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gX3RhcmdldDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBlbHNlIHtcclxuICAgICAgICAgICAgLy8gICAgIHRoaXMudGFyZ2V0ID0gxpIuVmVjdG9yMy5TVU0odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiwgX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgdGhpcy50YXJnZXREaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFRhcmdldChHYW1lLmF2YXRhcjIubmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci51cGRhdGUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBtb3ZlKF9kaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBzdXBlci5tb3ZlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZUhvbWluZygpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3duZXIgPT0gR2FtZS5hdmF0YXIxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVIb21pbmcoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0VGFyZ2V0KF9uZXRJRDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGlmIChHYW1lLmVudGl0aWVzLmZpbmQoZW50ID0+IGVudC5uZXRJZCA9PSBfbmV0SUQpICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBHYW1lLmVudGl0aWVzLmZpbmQoZW50ID0+IGVudC5uZXRJZCA9PSBfbmV0SUQpLm10eExvY2FsLnRyYW5zbGF0aW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGNhbGN1bGF0ZUhvbWluZygpIHtcclxuICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldCwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGlmIChuZXdEaXJlY3Rpb24ueCAhPSAwICYmIG5ld0RpcmVjdGlvbi55ICE9IDApIHtcclxuICAgICAgICAgICAgICAgIG5ld0RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgcm90YXRlQW1vdW50MjogbnVtYmVyID0gxpIuVmVjdG9yMy5DUk9TUyhuZXdEaXJlY3Rpb24sIHRoaXMubXR4TG9jYWwuZ2V0WCgpKS56O1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnJvdGF0ZVooLXJvdGF0ZUFtb3VudDIgKiB0aGlzLnJvdGF0ZVNwZWVkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQ29sbGlkZXIge1xyXG4gICAgZXhwb3J0IGNsYXNzIENvbGxpZGVyIHtcclxuICAgICAgICBwdWJsaWMgb3duZXJOZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgcmFkaXVzOiBudW1iZXI7IGdldCBnZXRSYWRpdXMoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMucmFkaXVzIH07XHJcbiAgICAgICAgcHVibGljIHBvc2l0aW9uOiDGki5WZWN0b3IyO1xyXG5cclxuICAgICAgICBnZXQgdG9wKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi55IC0gdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgbGVmdCgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueCAtIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IHJpZ2h0KCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi54ICsgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgYm90dG9tKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi55ICsgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfcmFkaXVzOiBudW1iZXIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBfcG9zaXRpb247XHJcbiAgICAgICAgICAgIHRoaXMucmFkaXVzID0gX3JhZGl1cztcclxuICAgICAgICAgICAgdGhpcy5vd25lck5ldElkID0gX25ldElkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldFBvc2l0aW9uKF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBfcG9zaXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0U2NhbGUoX3NjYWxlQW1vdW50OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5yYWRpdXMgPSBfc2NhbGVBbW91bnQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb2xsaWRlcyhfY29sbGlkZXI6IENvbGxpZGVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZTogxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvc2l0aW9uLCBfY29sbGlkZXIucG9zaXRpb24pO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5yYWRpdXMgKyBfY29sbGlkZXIucmFkaXVzID4gZGlzdGFuY2UubWFnbml0dWRlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb2xsaWRlc1JlY3QoX2NvbGxpZGVyOiBHYW1lLsaSLlJlY3RhbmdsZSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5sZWZ0ID4gX2NvbGxpZGVyLnJpZ2h0KSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnJpZ2h0IDwgX2NvbGxpZGVyLmxlZnQpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMudG9wID4gX2NvbGxpZGVyLmJvdHRvbSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5ib3R0b20gPCBfY29sbGlkZXIudG9wKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0SW50ZXJzZWN0aW9uKF9jb2xsaWRlcjogQ29sbGlkZXIpOiBudW1iZXIge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29sbGlkZXMoX2NvbGxpZGVyKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlOiDGki5WZWN0b3IyID0gxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMucG9zaXRpb24sIF9jb2xsaWRlci5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb24gPSB0aGlzLnJhZGl1cyArIF9jb2xsaWRlci5yYWRpdXMgLSBkaXN0YW5jZS5tYWduaXR1ZGU7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaW50ZXJzZWN0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0SW50ZXJzZWN0aW9uUmVjdChfY29sbGlkZXI6IMaSLlJlY3RhbmdsZSk6IMaSLlJlY3RhbmdsZSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb2xsaWRlc1JlY3QoX2NvbGxpZGVyKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbjogxpIuUmVjdGFuZ2xlID0gbmV3IMaSLlJlY3RhbmdsZSgpO1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24ueCA9IE1hdGgubWF4KHRoaXMubGVmdCwgX2NvbGxpZGVyLmxlZnQpO1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24ueSA9IE1hdGgubWF4KHRoaXMudG9wLCBfY29sbGlkZXIudG9wKTtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLndpZHRoID0gTWF0aC5taW4odGhpcy5yaWdodCwgX2NvbGxpZGVyLnJpZ2h0KSAtIGludGVyc2VjdGlvbi54O1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24uaGVpZ2h0ID0gTWF0aC5taW4odGhpcy5ib3R0b20sIF9jb2xsaWRlci5ib3R0b20pIC0gaW50ZXJzZWN0aW9uLnk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaW50ZXJzZWN0aW9uO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBFbmVteVNwYXduZXIge1xyXG4gICAgbGV0IHNwYXduVGltZTogbnVtYmVyID0gMCAqIDYwO1xyXG4gICAgbGV0IGN1cnJlbnRUaW1lOiBudW1iZXIgPSBzcGF3blRpbWU7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduTXVsdGlwbGVFbmVtaWVzQXRSb29tKF9tYXhFbmVtaWVzOiBudW1iZXIsIF9yb29tUG9zOiBHYW1lLsaSLlZlY3RvcjIpOiB2b2lkIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIC8vVE9ETzogZGVwZW5kaW5nIG9uIGN1cnJlbnRyb29tLmVuZW15Q291bnQgYW5kIGRlY3JlYXNlIGl0IFxyXG4gICAgICAgICAgICBsZXQgc3Bhd25lZEVuZW1pZXM6IG51bWJlciA9IDA7XHJcbiAgICAgICAgICAgIHdoaWxlIChzcGF3bmVkRW5lbWllcyA8IF9tYXhFbmVtaWVzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPT0gc3Bhd25UaW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uID0gbmV3IMaSLlZlY3RvcjIoKChNYXRoLnJhbmRvbSgpICogR2FtZS5jdXJyZW50Um9vbS5yb29tU2l6ZSAvIDIpIC0gKChNYXRoLnJhbmRvbSgpICogR2FtZS5jdXJyZW50Um9vbS5yb29tU2l6ZSAvIDIpKSksICgoTWF0aC5yYW5kb20oKSAqIEdhbWUuY3VycmVudFJvb20ucm9vbVNpemUgLyAyKSAtICgoTWF0aC5yYW5kb20oKSAqIEdhbWUuY3VycmVudFJvb20ucm9vbVNpemUgLyAyKSkpKTtcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbi5hZGQoX3Jvb21Qb3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogdXNlIElEIHRvIGdldCByYW5kb20gZW5lbWllc1xyXG4gICAgICAgICAgICAgICAgICAgIHNwYXduQnlJRChFbmVteS5FTkVNWUNMQVNTLkVORU1ZRFVNQiwgRW50aXR5LklELlNNQUxMVElDSywgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHNwYXduZWRFbmVtaWVzKys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50VGltZS0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRUaW1lIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50VGltZSA9IHNwYXduVGltZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRSYW5kb21FbmVteUlkKCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IHJhbmRvbSA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIE9iamVjdC5rZXlzKEVudGl0eS5JRCkubGVuZ3RoIC8gMik7XHJcbiAgICAgICAgaWYgKHJhbmRvbSA8PSAyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21FbmVteUlkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyYW5kb20pO1xyXG4gICAgICAgICAgICByZXR1cm4gcmFuZG9tO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25CeUlEKF9lbmVteUNsYXNzOiBFbmVteS5FTkVNWUNMQVNTLCBfaWQ6IEVudGl0eS5JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfdGFyZ2V0PzogUGxheWVyLlBsYXllciwgX25ldElEPzogbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IGVuZW15OiBFbmVteS5FbmVteTtcclxuICAgICAgICBzd2l0Y2ggKF9lbmVteUNsYXNzKSB7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlDTEFTUy5FTkVNWURBU0g6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteURhc2goX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RGFzaChfaWQsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEVuZW15LkVORU1ZQ0xBU1MuRU5FTVlEVU1COlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEdW1iKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteUR1bWIoX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWUNMQVNTLkVORU1ZUEFUUk9MOlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlQYXRyb2woX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15UGF0cm9sKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIC8vIGNhc2UgRW5lbXkuRTpcclxuICAgICAgICAgICAgLy8gICAgIGlmIChfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15U2hvb3QoX2lkLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCByZWYuYXR0cmlidXRlcy5zY2FsZSwgTWF0aC5yYW5kb20oKSAqIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlICsgMC41LCByZWYuYXR0cmlidXRlcy5hcm1vciksIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgLy8gICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlTaG9vdChfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgIC8vICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWUNMQVNTLkVORU1ZU01BU0g6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVNtYXNoKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVNtYXNoKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUkFERFM6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5TdW1tb25vckFkZHMoX2lkLCBfcG9zaXRpb24sIF90YXJnZXQsIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LlN1bW1vbm9yQWRkcyhfaWQsIF9wb3NpdGlvbiwgX3RhcmdldCwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEVuZW15LkVORU1ZQ0xBU1MuU1VNTU9OT1I6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5TdW1tb25vcihfaWQsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuU3VtbW9ub3IoX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZW5lbXkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGVuZW15KTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkVuZW15KF9lbmVteUNsYXNzLCBlbmVteSwgZW5lbXkubmV0SWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbmV0d29ya1NwYXduQnlJZChfZW5lbXlDbGFzczogRW5lbXkuRU5FTVlDTEFTUywgX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElEOiBudW1iZXIsIF90YXJnZXQ/OiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoX3RhcmdldCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGlmIChHYW1lLmF2YXRhcjEubmV0SWQgPT0gX3RhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgc3Bhd25CeUlEKF9lbmVteUNsYXNzLCBfaWQsIF9wb3NpdGlvbiwgR2FtZS5hdmF0YXIxLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3Bhd25CeUlEKF9lbmVteUNsYXNzLCBfaWQsIF9wb3NpdGlvbiwgR2FtZS5hdmF0YXIyLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc3Bhd25CeUlEKF9lbmVteUNsYXNzLCBfaWQsIF9wb3NpdGlvbiwgbnVsbCwgX25ldElEKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59IiwibmFtZXNwYWNlIEVuZW15IHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRmxvY2tpbmdCZWhhdmlvdXIge1xyXG4gICAgICAgIHByaXZhdGUgY3VycmVudE5laWdoYm91cnM6IEVuZW15W107XHJcbiAgICAgICAgcHVibGljIHNpZ2h0UmFkaXVzOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGF2b2lkUmFkaXVzOiBudW1iZXJcclxuICAgICAgICBwcml2YXRlIGVuZW1pZXM6IEVuZW15W10gPSBbXTtcclxuICAgICAgICBwcml2YXRlIHBvczogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHByaXZhdGUgbXlFbmVteTogRW5lbXk7XHJcbiAgICAgICAgcHVibGljIGNvaGVzaW9uV2VpZ2h0OiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGFsbGlnbldlaWdodDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBhdm9pZFdlaWdodDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyB0b1RhcmdldFdlaWdodDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBub3RUb1RhcmdldFdlaWdodDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBvYnN0aWNhbEF2b2lkV2VpZ2h0OiBudW1iZXIgPSAxLjU7XHJcblxyXG4gICAgICAgIHByaXZhdGUgb2JzdGljYWxDb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9lbmVteTogRW5lbXksIF9zaWdodFJhZGl1czogbnVtYmVyLCBfYXZvaWRSYWRpdXM6IG51bWJlciwgX2NvaGVzaW9uV2VpZ2h0OiBudW1iZXIsIF9hbGxpZ25XZWlnaHQ6IG51bWJlciwgX2F2b2lkV2VpZ2h0OiBudW1iZXIsIF90b1RhcmdldFdlaWdodDogbnVtYmVyLCBfbm90VG9UYXJnZXRXZWlnaHQ6IG51bWJlciwgX29ic3RpY2FsQXZvaWRXZWlnaHQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5wb3MgPSBfZW5lbXkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIHRoaXMubXlFbmVteSA9IF9lbmVteTtcclxuICAgICAgICAgICAgdGhpcy5zaWdodFJhZGl1cyA9IF9zaWdodFJhZGl1cztcclxuICAgICAgICAgICAgdGhpcy5hdm9pZFJhZGl1cyA9IF9hdm9pZFJhZGl1cztcclxuICAgICAgICAgICAgdGhpcy5jb2hlc2lvbldlaWdodCA9IF9jb2hlc2lvbldlaWdodDtcclxuICAgICAgICAgICAgdGhpcy5hbGxpZ25XZWlnaHQgPSBfYWxsaWduV2VpZ2h0O1xyXG4gICAgICAgICAgICB0aGlzLmF2b2lkV2VpZ2h0ID0gX2F2b2lkV2VpZ2h0O1xyXG4gICAgICAgICAgICB0aGlzLnRvVGFyZ2V0V2VpZ2h0ID0gX3RvVGFyZ2V0V2VpZ2h0O1xyXG4gICAgICAgICAgICB0aGlzLm5vdFRvVGFyZ2V0V2VpZ2h0ID0gX25vdFRvVGFyZ2V0V2VpZ2h0O1xyXG4gICAgICAgICAgICBpZiAoX29ic3RpY2FsQXZvaWRXZWlnaHQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vYnN0aWNhbEF2b2lkV2VpZ2h0ID0gX29ic3RpY2FsQXZvaWRXZWlnaHQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMub2JzdGljYWxDb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLnBvcywgdGhpcy5teUVuZW15LmNvbGxpZGVyLmdldFJhZGl1cyAqIDEuNzUsIHRoaXMubXlFbmVteS5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW5lbWllcyA9IEdhbWUuZW5lbWllcztcclxuICAgICAgICAgICAgdGhpcy5wb3MgPSB0aGlzLm15RW5lbXkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIHRoaXMub2JzdGljYWxDb2xsaWRlci5wb3NpdGlvbiA9IHRoaXMucG9zO1xyXG4gICAgICAgICAgICB0aGlzLmZpbmROZWlnaGJvdXJzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBmaW5kTmVpZ2hib3VycygpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50TmVpZ2hib3VycyA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLmVuZW1pZXMuZm9yRWFjaChlbmVtID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm15RW5lbXkubmV0SWQgIT0gZW5lbS5uZXRJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmVtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKHRoaXMucG9zLnRvVmVjdG9yMygpKSA8IHRoaXMuc2lnaHRSYWRpdXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmVpZ2hib3Vycy5wdXNoKGVuZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjYWxjdWxhdGVDb2hlc2lvbk1vdmUoKTogR2FtZS7Gki5WZWN0b3IyIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudE5laWdoYm91cnMubGVuZ3RoIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiDGki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxldCBjb2hlc2lvbk1vdmU6IEdhbWUuxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmVpZ2hib3Vycy5mb3JFYWNoKGVuZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvaGVzaW9uTW92ZSA9IEdhbWUuxpIuVmVjdG9yMi5TVU0oY29oZXNpb25Nb3ZlLCBlbmVtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICBjb2hlc2lvbk1vdmUuc2NhbGUoMSAvIHRoaXMuY3VycmVudE5laWdoYm91cnMubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIGNvaGVzaW9uTW92ZS5zdWJ0cmFjdCh0aGlzLnBvcyk7XHJcbiAgICAgICAgICAgICAgICBjb2hlc2lvbk1vdmUgPSBDYWxjdWxhdGlvbi5nZXRSb3RhdGVkVmVjdG9yQnlBbmdsZTJEKHRoaXMubXlFbmVteS5tb3ZlRGlyZWN0aW9uLCBDYWxjdWxhdGlvbi5jYWxjRGVncmVlKHRoaXMubXlFbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgY29oZXNpb25Nb3ZlLnRvVmVjdG9yMygpKSAvIDEwKS50b1ZlY3RvcjIoKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvaGVzaW9uTW92ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNhbGN1bGF0ZUFsbGlnbm1lbnRNb3ZlKCk6IEdhbWUuxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnROZWlnaGJvdXJzLmxlbmd0aCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5teUVuZW15Lm1vdmVEaXJlY3Rpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYWxsaWdubWVudE1vdmU6IEdhbWUuxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmVpZ2hib3Vycy5mb3JFYWNoKGVuZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGFsbGlnbm1lbnRNb3ZlID0gR2FtZS7Gki5WZWN0b3IyLlNVTShhbGxpZ25tZW50TW92ZSwgZW5lbS5tb3ZlRGlyZWN0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICBhbGxpZ25tZW50TW92ZS5zY2FsZSgxIC8gdGhpcy5jdXJyZW50TmVpZ2hib3Vycy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFsbGlnbm1lbnRNb3ZlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2FsY3VsYXRlQXZvaWRhbmNlTW92ZSgpOiBHYW1lLsaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50TmVpZ2hib3Vycy5sZW5ndGggPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGV0IGF2b2lkYW5jZU1vdmU6IEdhbWUuxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG5Bdm9pZDogbnVtYmVyID0gMDtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE5laWdoYm91cnMuZm9yRWFjaChlbmVtID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZW5lbS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZSh0aGlzLnBvcy50b1ZlY3RvcjMoKSkgPCB0aGlzLmF2b2lkUmFkaXVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5Bdm9pZCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdm9pZGFuY2VNb3ZlID0gR2FtZS7Gki5WZWN0b3IyLlNVTShhdm9pZGFuY2VNb3ZlLCBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvcywgZW5lbS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICBpZiAobkF2b2lkID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF2b2lkYW5jZU1vdmUuc2NhbGUoMSAvIG5Bdm9pZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXZvaWRhbmNlTW92ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNhbGN1bGF0ZU9ic3RpY2FsQXZvaWRhbmNlTW92ZSgpOiBHYW1lLsaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBsZXQgb2JzdGljYWxzOiBHYW1lLsaSLk5vZGVbXSA9IFtdO1xyXG4gICAgICAgICAgICBHYW1lLmN1cnJlbnRSb29tLndhbGxzLmZvckVhY2goZWxlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBvYnN0aWNhbHMucHVzaChlbGVtKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIEdhbWUuY3VycmVudFJvb20ub2JzdGljYWxzLmZvckVhY2goZWxlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBvYnN0aWNhbHMucHVzaChlbGVtKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGxldCByZXR1cm5WZWN0b3I6IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgICAgIGxldCBuQXZvaWQ6IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgICAgICBvYnN0aWNhbHMuZm9yRWFjaChvYnN0aWNhbCA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoKDxhbnk+b2JzdGljYWwpLmNvbGxpZGVyIGluc3RhbmNlb2YgR2FtZS7Gki5SZWN0YW5nbGUgJiYgdGhpcy5vYnN0aWNhbENvbGxpZGVyLmNvbGxpZGVzUmVjdCgoPGFueT5vYnN0aWNhbCkuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1vdmU6IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMucG9zLCBvYnN0aWNhbC5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbW92ZS5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbjogR2FtZS7Gki5SZWN0YW5nbGUgPSB0aGlzLm9ic3RpY2FsQ29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdCgoPGFueT5vYnN0aWNhbCkuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQmVmb3JlTW92ZTogbnVtYmVyID0gaW50ZXJzZWN0aW9uLndpZHRoICogaW50ZXJzZWN0aW9uLmhlaWdodDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vYnN0aWNhbENvbGxpZGVyLnBvc2l0aW9uLmFkZChuZXcgR2FtZS7Gki5WZWN0b3IyKG1vdmUueCwgMCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9ic3RpY2FsQ29sbGlkZXIuY29sbGlkZXNSZWN0KCg8YW55Pm9ic3RpY2FsKS5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJzZWN0aW9uID0gdGhpcy5vYnN0aWNhbENvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoKDxhbnk+b2JzdGljYWwpLmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFmdGVyQmVmb3JlTW92ZTogbnVtYmVyID0gaW50ZXJzZWN0aW9uLndpZHRoICogaW50ZXJzZWN0aW9uLmhlaWdodDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8PSBhZnRlckJlZm9yZU1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZlY3Rvci5hZGQobmV3IEdhbWUuxpIuVmVjdG9yMigwLCBtb3ZlLnkpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZlY3Rvci5hZGQobmV3IEdhbWUuxpIuVmVjdG9yMihtb3ZlLngsIDApKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZlY3Rvci5hZGQobmV3IEdhbWUuxpIuVmVjdG9yMihtb3ZlLngsIDApKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2JzdGljYWxDb2xsaWRlci5wb3NpdGlvbi5zdWJ0cmFjdChuZXcgR2FtZS7Gki5WZWN0b3IyKG1vdmUueCwgMCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBuQXZvaWQrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICgoPGFueT5vYnN0aWNhbCkuY29sbGlkZXIgaW5zdGFuY2VvZiBDb2xsaWRlci5Db2xsaWRlciAmJiB0aGlzLm9ic3RpY2FsQ29sbGlkZXIuY29sbGlkZXMoKDxhbnk+b2JzdGljYWwpLmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBtb3ZlOiBHYW1lLsaSLlZlY3RvcjIgPSBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvcywgb2JzdGljYWwubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBsb2NhbEF3YXk6IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5TVU0obW92ZSwgdGhpcy5teUVuZW15Lm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRpc3RhbmNlUG9zID0gKEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMubXlFbmVteS50YXJnZXQsIEdhbWUuxpIuVmVjdG9yMi5TVU0oQ2FsY3VsYXRpb24uZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRChsb2NhbEF3YXkuY2xvbmUudG9WZWN0b3IzKCksIDEzNSkudG9WZWN0b3IyKCksIHRoaXMubXlFbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSkpKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZGlzdGFuY2VOZWcgPSAoR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5teUVuZW15LnRhcmdldCwgR2FtZS7Gki5WZWN0b3IyLlNVTShDYWxjdWxhdGlvbi5nZXRSb3RhdGVkVmVjdG9yQnlBbmdsZTJEKGxvY2FsQXdheS5jbG9uZS50b1ZlY3RvcjMoKSwgLTEzNSkudG9WZWN0b3IyKCksIHRoaXMubXlFbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSkpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpc3RhbmNlTmVnLm1hZ25pdHVkZVNxdWFyZWQgPiBkaXN0YW5jZVBvcy5tYWduaXR1ZGVTcXVhcmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vdmUuYWRkKENhbGN1bGF0aW9uLmdldFJvdGF0ZWRWZWN0b3JCeUFuZ2xlMkQobW92ZS5jbG9uZS50b1ZlY3RvcjMoKSwgMTM1KS50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW92ZS5hZGQoQ2FsY3VsYXRpb24uZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRChtb3ZlLmNsb25lLnRvVmVjdG9yMygpLCAtMTM1KS50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm5WZWN0b3IuYWRkKG1vdmUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBuQXZvaWQrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIGlmIChuQXZvaWQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm5WZWN0b3Iuc2NhbGUoMSAvIG5Bdm9pZCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiByZXR1cm5WZWN0b3I7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0TW92ZVZlY3RvcigpOiBHYW1lLsaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBsZXQgY29oZXNpb246IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgICAgIGxldCBhdm9pZDogR2FtZS7Gki5WZWN0b3IyID0gR2FtZS7Gki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgbGV0IGFsbGlnbjogR2FtZS7Gki5WZWN0b3IyID0gR2FtZS7Gki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgbGV0IG9ic3RpY2FsQXZvaWQ6IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5aRVJPKCk7XHJcblxyXG5cclxuICAgICAgICAgICAgbGV0IHRhcmdldCA9IHRoaXMubXlFbmVteS5tb3ZlU2ltcGxlKHRoaXMubXlFbmVteS50YXJnZXQpO1xyXG4gICAgICAgICAgICBpZiAodGFyZ2V0Lm1hZ25pdHVkZVNxdWFyZWQgPiB0aGlzLnRvVGFyZ2V0V2VpZ2h0ICogdGhpcy50b1RhcmdldFdlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0Lm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIHRhcmdldC5zY2FsZSh0aGlzLnRvVGFyZ2V0V2VpZ2h0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IG5vdFRvVGFyZ2V0ID0gdGhpcy5teUVuZW15Lm1vdmVBd2F5KHRoaXMubXlFbmVteS50YXJnZXQpXHJcbiAgICAgICAgICAgIGlmIChub3RUb1RhcmdldC5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5ub3RUb1RhcmdldFdlaWdodCAqIHRoaXMubm90VG9UYXJnZXRXZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIG5vdFRvVGFyZ2V0Lm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIG5vdFRvVGFyZ2V0LnNjYWxlKHRoaXMubm90VG9UYXJnZXRXZWlnaHQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb2hlc2lvbiA9IHRoaXMuY2FsY3VsYXRlQ29oZXNpb25Nb3ZlKCk7XHJcbiAgICAgICAgICAgIGlmIChjb2hlc2lvbi5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5jb2hlc2lvbldlaWdodCAqIHRoaXMuY29oZXNpb25XZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIGNvaGVzaW9uLm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIGNvaGVzaW9uLnNjYWxlKHRoaXMuY29oZXNpb25XZWlnaHQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGF2b2lkID0gdGhpcy5jYWxjdWxhdGVBdm9pZGFuY2VNb3ZlKCk7XHJcbiAgICAgICAgICAgIGlmIChhdm9pZC5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5hdm9pZFdlaWdodCAqIHRoaXMuYXZvaWRXZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIGF2b2lkLm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIGF2b2lkLnNjYWxlKHRoaXMuYXZvaWRXZWlnaHQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGFsbGlnbiA9IHRoaXMuY2FsY3VsYXRlQWxsaWdubWVudE1vdmUoKTtcclxuICAgICAgICAgICAgaWYgKGFsbGlnbi5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5hbGxpZ25XZWlnaHQgKiB0aGlzLmFsbGlnbldlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgYWxsaWduLm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIGFsbGlnbi5zY2FsZSh0aGlzLmFsbGlnbldlaWdodCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG9ic3RpY2FsQXZvaWQgPSB0aGlzLmNhbGN1bGF0ZU9ic3RpY2FsQXZvaWRhbmNlTW92ZSgpO1xyXG4gICAgICAgICAgICBpZiAob2JzdGljYWxBdm9pZC5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5vYnN0aWNhbEF2b2lkV2VpZ2h0ICogdGhpcy5vYnN0aWNhbEF2b2lkV2VpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICBvYnN0aWNhbEF2b2lkLm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIG9ic3RpY2FsQXZvaWQuc2NhbGUodGhpcy5vYnN0aWNhbEF2b2lkV2VpZ2h0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IG1vdmUgPSBHYW1lLsaSLlZlY3RvcjIuU1VNKG5vdFRvVGFyZ2V0LCB0YXJnZXQsIGNvaGVzaW9uLCBhdm9pZCwgYWxsaWduLCBvYnN0aWNhbEF2b2lkKTtcclxuICAgICAgICAgICAgcmV0dXJuIG1vdmU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuIiwibmFtZXNwYWNlIEVudGl0eSB7IFxyXG4gICAgZXhwb3J0IGNsYXNzIE1lcmNoYW50IGV4dGVuZHMgRW50aXR5e1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogbnVtYmVyLCBfbmV0SWQ/Om51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9uZXRJZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIENhbGN1bGF0aW9uIHtcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRDbG9zZXJBdmF0YXJQb3NpdGlvbihfc3RhcnRQb2ludDogxpIuVmVjdG9yMyk6IMaSLlZlY3RvcjMge1xyXG4gICAgICAgIGxldCB0YXJnZXQgPSBHYW1lLmF2YXRhcjE7XHJcblxyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2VQbGF5ZXIxID0gX3N0YXJ0UG9pbnQuZ2V0RGlzdGFuY2UoR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjIgPSBfc3RhcnRQb2ludC5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZVBsYXllcjEgPCBkaXN0YW5jZVBsYXllcjIpIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldCA9IEdhbWUuYXZhdGFyMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldCA9IEdhbWUuYXZhdGFyMjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRhcmdldC5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb247XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjYWxjRGVncmVlKF9jZW50ZXI6IMaSLlZlY3RvcjMsIF90YXJnZXQ6IMaSLlZlY3RvcjMpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCB4RGlzdGFuY2U6IG51bWJlciA9IF90YXJnZXQueCAtIF9jZW50ZXIueDtcclxuICAgICAgICBsZXQgeURpc3RhbmNlOiBudW1iZXIgPSBfdGFyZ2V0LnkgLSBfY2VudGVyLnk7XHJcbiAgICAgICAgbGV0IGRlZ3JlZXM6IG51bWJlciA9IE1hdGguYXRhbjIoeURpc3RhbmNlLCB4RGlzdGFuY2UpICogKDE4MCAvIE1hdGguUEkpIC0gOTA7XHJcbiAgICAgICAgcmV0dXJuIGRlZ3JlZXM7XHJcblxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldFJvdGF0ZWRWZWN0b3JCeUFuZ2xlMkQoX3ZlY3RvclRvUm90YXRlOiDGki5WZWN0b3IzLCBfYW5nbGU6IG51bWJlcik6IMaSLlZlY3RvcjMge1xyXG4gICAgICAgIGxldCBhbmdsZVRvUmFkaWFuOiBudW1iZXIgPSBfYW5nbGUgKiAoTWF0aC5QSSAvIDE4MCk7XHJcblxyXG4gICAgICAgIGxldCBuZXdYID0gX3ZlY3RvclRvUm90YXRlLnggKiBNYXRoLmNvcyhhbmdsZVRvUmFkaWFuKSAtIF92ZWN0b3JUb1JvdGF0ZS55ICogTWF0aC5zaW4oYW5nbGVUb1JhZGlhbik7XHJcbiAgICAgICAgbGV0IG5ld1kgPSBfdmVjdG9yVG9Sb3RhdGUueCAqIE1hdGguc2luKGFuZ2xlVG9SYWRpYW4pICsgX3ZlY3RvclRvUm90YXRlLnkgKiBNYXRoLmNvcyhhbmdsZVRvUmFkaWFuKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyDGki5WZWN0b3IzKG5ld1gsIG5ld1ksIF92ZWN0b3JUb1JvdGF0ZS56KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gYWRkUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2Jhc2VWYWx1ZTogbnVtYmVyLCBfcGVyY2VudGFnZUFtb3VudDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gX2Jhc2VWYWx1ZSAqICgoMTAwICsgX3BlcmNlbnRhZ2VBbW91bnQpIC8gMTAwKTtcclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYmFzZVZhbHVlOiBudW1iZXIsIF9wZXJjZW50YWdlQW1vdW50OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBfYmFzZVZhbHVlICogKDEwMCAvICgxMDAgKyBfcGVyY2VudGFnZUFtb3VudCkpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjbGFtcE51bWJlcihfbnVtYmVyOiBudW1iZXIsIF9taW46IG51bWJlciwgX21heDogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KF9taW4sIE1hdGgubWluKF9udW1iZXIsIF9tYXgpKTtcclxuICAgIH1cclxuXHJcblxyXG59IiwibmFtZXNwYWNlIElucHV0U3lzdGVtIHtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBrZXlib2FyZERvd25FdmVudCk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwga2V5Ym9hcmRVcEV2ZW50KTtcclxuICAgIEdhbWUuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgYXR0YWNrKTtcclxuICAgIEdhbWUuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgcm90YXRlVG9Nb3VzZSk7XHJcblxyXG4gICAgLy8jcmVnaW9uIHJvdGF0ZVxyXG4gICAgbGV0IG1vdXNlUG9zaXRpb246IMaSLlZlY3RvcjM7XHJcblxyXG4gICAgZnVuY3Rpb24gcm90YXRlVG9Nb3VzZShfbW91c2VFdmVudDogTW91c2VFdmVudCk6IHZvaWQge1xyXG4gICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBsZXQgcmF5OiDGki5SYXkgPSBHYW1lLnZpZXdwb3J0LmdldFJheUZyb21DbGllbnQobmV3IMaSLlZlY3RvcjIoX21vdXNlRXZlbnQub2Zmc2V0WCwgX21vdXNlRXZlbnQub2Zmc2V0WSkpO1xyXG4gICAgICAgICAgICBtb3VzZVBvc2l0aW9uID0gcmF5LmludGVyc2VjdFBsYW5lKG5ldyDGki5WZWN0b3IzKDAsIDAsIDApLCBuZXcgxpIuVmVjdG9yMygwLCAwLCAxKSk7XHJcbiAgICAgICAgICAgIC8vIEdhbWUuYXZhdGFyMS5tdHhMb2NhbC5yb3RhdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIDAsIENhbGN1bGF0aW9uLmNhbGNEZWdyZWUoR2FtZS5hdmF0YXIxLm10eExvY2FsLnRyYW5zbGF0aW9uLCBtb3VzZVBvc2l0aW9uKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2FsY1Bvc2l0aW9uRnJvbURlZ3JlZShfZGVncmVlczogbnVtYmVyLCBfZGlzdGFuY2U6IG51bWJlcik6IMaSLlZlY3RvcjIge1xyXG4gICAgICAgIGxldCBkaXN0YW5jZSA9IDU7XHJcbiAgICAgICAgbGV0IG5ld0RlZyA9IChfZGVncmVlcyAqIE1hdGguUEkpIC8gMTgwO1xyXG4gICAgICAgIGxldCB5ID0gTWF0aC5jb3MobmV3RGVnKTtcclxuICAgICAgICBsZXQgeCA9IE1hdGguc2luKG5ld0RlZykgKiAtMTtcclxuICAgICAgICBsZXQgY29vcmQgPSBuZXcgxpIuVmVjdG9yMih4LCB5KTtcclxuICAgICAgICBjb29yZC5zY2FsZShkaXN0YW5jZSk7XHJcbiAgICAgICAgcmV0dXJuIGNvb3JkO1xyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIG1vdmUgYW5kIGFiaWxpdHlcclxuICAgIGxldCBjb250cm9sbGVyID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KFtcclxuICAgICAgICBbXCJXXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJBXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJTXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJEXCIsIGZhbHNlXVxyXG4gICAgXSk7XHJcblxyXG4gICAgZnVuY3Rpb24ga2V5Ym9hcmREb3duRXZlbnQoX2U6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgaWYgKF9lLmNvZGUudG9VcHBlckNhc2UoKSAhPSBcIlNQQUNFXCIpIHtcclxuICAgICAgICAgICAgICAgIGxldCBrZXk6IHN0cmluZyA9IF9lLmNvZGUudG9VcHBlckNhc2UoKS5zdWJzdHJpbmcoMyk7XHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyLnNldChrZXksIHRydWUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy9EbyBhYmlsdHkgZnJvbSBwbGF5ZXJcclxuICAgICAgICAgICAgICAgIGFiaWxpdHkoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKF9lLmNvZGUudG9VcHBlckNhc2UoKSA9PSBcIkVTQ0FQRVwiKSB7XHJcbiAgICAgICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICAgICAgR2FtZS5wYXVzZSh0cnVlLCB0cnVlKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIEdhbWUucGxheWluZyh0cnVlLCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBrZXlib2FyZFVwRXZlbnQoX2U6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgbGV0IGtleTogc3RyaW5nID0gX2UuY29kZS50b1VwcGVyQ2FzZSgpLnN1YnN0cmluZygzKTtcclxuICAgICAgICAgICAgY29udHJvbGxlci5zZXQoa2V5LCBmYWxzZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBtb3ZlKCk6IEdhbWUuxpIuVmVjdG9yMyB7XHJcbiAgICAgICAgbGV0IG1vdmVWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5aRVJPKCk7XHJcblxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIldcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci55ICs9IDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIkFcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci54IC09IDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIlNcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci55IC09IDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIkRcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci54ICs9IDE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBHYW1lLmF2YXRhcjEubW92ZShtb3ZlVmVjdG9yKTtcclxuICAgICAgICByZXR1cm4gbW92ZVZlY3RvcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhYmlsaXR5KCkge1xyXG4gICAgICAgIEdhbWUuYXZhdGFyMS5kb0FiaWxpdHkoKTtcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBhdHRhY2tcclxuICAgIGZ1bmN0aW9uIGF0dGFjayhlXzogTW91c2VFdmVudCkge1xyXG4gICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBsZXQgbW91c2VCdXR0b24gPSBlXy5idXR0b247XHJcbiAgICAgICAgICAgIHN3aXRjaCAobW91c2VCdXR0b24pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgICAgICAgICAvL2xlZnQgbW91c2UgYnV0dG9uIHBsYXllci5hdHRhY2tcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UobW91c2VQb3NpdGlvbiwgR2FtZS5hdmF0YXIxLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVUb01vdXNlKGVfKTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEuYXR0YWNrKGRpcmVjdGlvbiwgbnVsbCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiByaWdodCBtb3VzZSBidXR0b24gcGxheWVyLmhlYXZ5QXR0YWNrIG9yIHNvbWV0aGluZyBsaWtlIHRoYXRcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG59IiwibmFtZXNwYWNlIExldmVsIHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgTGFuZHNjYXBlIGV4dGVuZHMgxpIuTm9kZXtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMuZ2V0Q2hpbGRyZW4oKVswXS5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0pLm10eExvY2FsLnRyYW5zbGF0ZVooLTIpXHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCJuYW1lc3BhY2UgVUkge1xyXG4gICAgZXhwb3J0IGNsYXNzIE1pbmltYXAgZXh0ZW5kcyBHYW1lLsaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLlVJO1xyXG4gICAgICAgIHByaXZhdGUgbWlubWFwSW5mbzogSW50ZXJmYWNlcy5JTWluaW1hcEluZm9zW107XHJcbiAgICAgICAgcHJpdmF0ZSByb29tTWluaW1hcHNpemU6IG51bWJlciA9IDAuODtcclxuICAgICAgICBwcml2YXRlIG1pbmlSb29tczogTWluaVJvb21bXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBvZmZzZXRYOiBudW1iZXIgPSAxMTtcclxuICAgICAgICBwdWJsaWMgb2Zmc2V0WTogbnVtYmVyID0gNjtcclxuICAgICAgICBwcml2YXRlIGN1cnJlbnRSb29tOiBHZW5lcmF0aW9uLlJvb207XHJcbiAgICAgICAgcHJpdmF0ZSBwb2ludGVyOiBHYW1lLsaSLk5vZGU7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9taW5pbWFwSW5mbzogSW50ZXJmYWNlcy5JTWluaW1hcEluZm9zW10pIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJNaW5pbWFwXCIpO1xyXG4gICAgICAgICAgICB0aGlzLm1pbm1hcEluZm8gPSBfbWluaW1hcEluZm87XHJcblxyXG5cclxuICAgICAgICAgICAgdGhpcy5wb2ludGVyID0gbmV3IEdhbWUuxpIuTm9kZShcInBvaW50ZXJcIik7XHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRlci5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IEdhbWUuxpIuTWVzaFF1YWQpKTtcclxuICAgICAgICAgICAgdGhpcy5wb2ludGVyLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobmV3IMaSLk1hdGVyaWFsKFwiY2hhbGxlbmdlUm9vbU1hdFwiLCDGki5TaGFkZXJMaXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImJsdWVcIikpKSkpO1xyXG4gICAgICAgICAgICB0aGlzLnBvaW50ZXIuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRlci5tdHhMb2NhbC5zY2FsZShHYW1lLsaSLlZlY3RvcjMuT05FKHRoaXMucm9vbU1pbmltYXBzaXplIC8gMikpO1xyXG4gICAgICAgICAgICB0aGlzLnBvaW50ZXIubXR4TG9jYWwudHJhbnNsYXRlWigxMCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMucG9pbnRlcik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwuc2NhbGUobmV3IEdhbWUuxpIuVmVjdG9yMyh0aGlzLnJvb21NaW5pbWFwc2l6ZSwgdGhpcy5yb29tTWluaW1hcHNpemUsIHRoaXMucm9vbU1pbmltYXBzaXplKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHYW1lLsaSLkVWRU5ULlJFTkRFUl9QUkVQQVJFLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLmNyZWF0ZU1pbmlSb29tcygpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXRDdXJyZW50Um9vbShHYW1lLmN1cnJlbnRSb29tKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25NaW5pbWFwKHRoaXMubWlubWFwSW5mbyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNyZWF0ZU1pbmlSb29tcygpIHtcclxuICAgICAgICAgICAgdGhpcy5taW5tYXBJbmZvLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1pbmlSb29tcy5wdXNoKG5ldyBNaW5pUm9vbShlbGVtZW50LmNvb3JkcywgZWxlbWVudC5yb29tVHlwZSkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5taW5pUm9vbXMuZm9yRWFjaChyb29tID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQocm9vbSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBldmVudFVwZGF0ZSA9IChfZXZlbnQ6IEV2ZW50KTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzZXRDdXJyZW50Um9vbShfcm9vbTogR2VuZXJhdGlvbi5Sb29tKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWluaVJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzLmVxdWFscyhfcm9vbS5jb29yZGluYXRlcykpLmlzRGlzY292ZXJlZCgpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50Um9vbSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBzdWJYID0gdGhpcy5jdXJyZW50Um9vbS5jb29yZGluYXRlcy54IC0gX3Jvb20uY29vcmRpbmF0ZXMueDtcclxuICAgICAgICAgICAgICAgIGxldCBzdWJZID0gdGhpcy5jdXJyZW50Um9vbS5jb29yZGluYXRlcy55IC0gX3Jvb20uY29vcmRpbmF0ZXMueTtcclxuICAgICAgICAgICAgICAgIHRoaXMub2Zmc2V0WCArPSBzdWJYICogdGhpcy5yb29tTWluaW1hcHNpemU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9mZnNldFkgKz0gc3ViWSAqIHRoaXMucm9vbU1pbmltYXBzaXplO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRSb29tID0gX3Jvb207XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRSb29tICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFJvb20gIT0gR2FtZS5jdXJyZW50Um9vbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0Q3VycmVudFJvb20oR2FtZS5jdXJyZW50Um9vbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wb2ludGVyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gdGhpcy5taW5pUm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMpKS5tdHhMb2NhbC50cmFuc2xhdGlvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbGV0IG5vcm1hbFJvb206IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTs7XHJcbiAgICBleHBvcnQgbGV0IGNoYWxsZW5nZVJvb206IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTs7XHJcbiAgICBleHBvcnQgbGV0IG1lcmNoYW50Um9vbTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpOztcclxuICAgIGV4cG9ydCBsZXQgdHJlYXN1cmVSb29tOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7O1xyXG4gICAgZXhwb3J0IGxldCBib3NzUm9vbTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpOztcclxuXHJcbiAgICBjbGFzcyBNaW5pUm9vbSBleHRlbmRzIEdhbWUuxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIGRpc2NvdmVyZWQ6IGJvb2xlYW47XHJcbiAgICAgICAgcHVibGljIGNvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAgICAgcHVibGljIHJvb21UeXBlOiBHZW5lcmF0aW9uLlJPT01UWVBFO1xyXG4gICAgICAgIHB1YmxpYyBvcGFjaXR5OiBudW1iZXIgPSAwLjc1O1xyXG5cclxuICAgICAgICBwcml2YXRlIHJvb21NYXQ6IMaSLk1hdGVyaWFsO1xyXG5cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBtZXNoOiDGki5NZXNoUXVhZCA9IG5ldyDGki5NZXNoUXVhZDtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tVHlwZTogR2VuZXJhdGlvbi5ST09NVFlQRSkge1xyXG4gICAgICAgICAgICBzdXBlcihcIk1pbmltYXBSb29tXCIpO1xyXG4gICAgICAgICAgICB0aGlzLmNvb3JkaW5hdGVzID0gX2Nvb3JkaW5hdGVzO1xyXG4gICAgICAgICAgICB0aGlzLnJvb21UeXBlID0gX3Jvb21UeXBlO1xyXG4gICAgICAgICAgICB0aGlzLmRpc2NvdmVyZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyBHYW1lLsaSLkNvbXBvbmVudE1lc2godGhpcy5tZXNoKSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLnJvb21UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuU1RBUlQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb29tTWF0ID0gbmV3IMaSLk1hdGVyaWFsKFwicm9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiLCB0aGlzLm9wYWNpdHkpLCBub3JtYWxSb29tKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuTk9STUFMOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucm9vbU1hdCA9IG5ldyDGki5NYXRlcmlhbChcInJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiwgdGhpcy5vcGFjaXR5KSwgbm9ybWFsUm9vbSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLk1FUkNIQU5UOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucm9vbU1hdCA9IG5ldyDGki5NYXRlcmlhbChcInJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiwgdGhpcy5vcGFjaXR5KSwgbWVyY2hhbnRSb29tKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuVFJFQVNVUkU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb29tTWF0ID0gbmV3IMaSLk1hdGVyaWFsKFwicm9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiLCB0aGlzLm9wYWNpdHkpLCB0cmVhc3VyZVJvb20pKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5DSEFMTEVOR0U6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb29tTWF0ID0gbmV3IMaSLk1hdGVyaWFsKFwicm9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiLCB0aGlzLm9wYWNpdHkpLCBjaGFsbGVuZ2VSb29tKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuQk9TUzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb21NYXQgPSBuZXcgxpIuTWF0ZXJpYWwoXCJyb29tTWF0XCIsIMaSLlNoYWRlckxpdFRleHR1cmVkLCBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIsIHRoaXMub3BhY2l0eSksIGJvc3NSb29tKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY21wTWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwodGhpcy5yb29tTWF0KTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWF0ZXJpYWwpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyh0aGlzLmNvb3JkaW5hdGVzLngsIHRoaXMuY29vcmRpbmF0ZXMueSwgMSk7XHJcbiAgICAgICAgICAgIC8vIHRoaXMuYWN0aXZhdGUoZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGlzRGlzY292ZXJlZCgpIHtcclxuICAgICAgICAgICAgdGhpcy5kaXNjb3ZlcmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZSh0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCIvLy88cmVmZXJlbmNlIHBhdGg9XCIuLi9GVURHRS9OZXQvQnVpbGQvQ2xpZW50L0Z1ZGdlQ2xpZW50LmQudHNcIi8+XHJcblxyXG5uYW1lc3BhY2UgTmV0d29ya2luZyB7XHJcbiAgICBleHBvcnQgZW51bSBGVU5DVElPTiB7XHJcbiAgICAgICAgQ09OTkVDVEVELFxyXG4gICAgICAgIFNFVEdBTUVTVEFURSxcclxuICAgICAgICBMT0FERUQsXHJcbiAgICAgICAgU0VUUkVBRFksXHJcbiAgICAgICAgU1BBV04sXHJcbiAgICAgICAgVFJBTlNGT1JNLFxyXG4gICAgICAgIENMSUVOVE1PVkVNRU5ULFxyXG4gICAgICAgIFNFUlZFUkJVRkZFUixcclxuICAgICAgICBVUERBVEVJTlZFTlRPUlksXHJcbiAgICAgICAgS05PQ0tCQUNLUkVRVUVTVCxcclxuICAgICAgICBLTk9DS0JBQ0tQVVNILFxyXG4gICAgICAgIFNQQVdOQlVMTEVULFxyXG4gICAgICAgIEJVTExFVFBSRURJQ1QsXHJcbiAgICAgICAgQlVMTEVUVFJBTlNGT1JNLFxyXG4gICAgICAgIEJVTExFVERJRSxcclxuICAgICAgICBTUEFXTkVORU1ZLFxyXG4gICAgICAgIEVORU1ZVFJBTlNGT1JNLFxyXG4gICAgICAgIEVOVElUWUFOSU1BVElPTlNUQVRFLFxyXG4gICAgICAgIEVORU1ZRElFLFxyXG4gICAgICAgIFNQQVdOSU5URVJOQUxJVEVNLFxyXG4gICAgICAgIFVQREFURUFUVFJJQlVURVMsXHJcbiAgICAgICAgVVBEQVRFV0VBUE9OLFxyXG4gICAgICAgIElURU1ESUUsXHJcbiAgICAgICAgU0VORFJPT00sXHJcbiAgICAgICAgU1dJVENIUk9PTVJFUVVFU1QsXHJcbiAgICAgICAgVVBEQVRFQlVGRixcclxuICAgICAgICBVUERBVEVVSSxcclxuICAgICAgICBTUFdBTk1JTklNQVBcclxuICAgIH1cclxuXHJcbiAgICBpbXBvcnQgxpJDbGllbnQgPSBGdWRnZU5ldC5GdWRnZUNsaWVudDtcclxuXHJcbiAgICBleHBvcnQgbGV0IGNsaWVudDogxpJDbGllbnQ7XHJcbiAgICBleHBvcnQgbGV0IGNyZWF0ZWRSb29tOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IGNsaWVudHM6IEFycmF5PHsgaWQ6IHN0cmluZywgcmVhZHk6IGJvb2xlYW4gfT4gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgcG9zVXBkYXRlOiDGki5WZWN0b3IzO1xyXG4gICAgZXhwb3J0IGxldCBzb21lb25lSXNIb3N0OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IGVuZW15OiBFbmVteS5FbmVteTtcclxuICAgIGV4cG9ydCBsZXQgY3VycmVudElEczogbnVtYmVyW10gPSBbXTtcclxuXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RTcGF3blwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4geyBzcGF3blBsYXllcigpIH0sIHRydWUpO1xyXG4gICAgbGV0IElQQ29ubmVjdGlvbiA9IDxIVE1MSW5wdXRFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSVBDb25uZWN0aW9uXCIpO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDb25uZWN0aW5nXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjb25uZWN0aW5nLCB0cnVlKTtcclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNvbm5lY3RpbmcoKSB7XHJcbiAgICAgICAgY2xpZW50ID0gbmV3IMaSQ2xpZW50KCk7XHJcbiAgICAgICAgY2xpZW50LmFkZEV2ZW50TGlzdGVuZXIoRnVkZ2VOZXQuRVZFTlQuTUVTU0FHRV9SRUNFSVZFRCwgcmVjZWl2ZU1lc3NhZ2UpO1xyXG4gICAgICAgIGNsaWVudC5jb25uZWN0VG9TZXJ2ZXIoSVBDb25uZWN0aW9uLnZhbHVlKTtcclxuXHJcbiAgICAgICAgYWRkQ2xpZW50SUQoKVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBhZGRDbGllbnRJRCgpIHtcclxuICAgICAgICAgICAgaWYgKGNsaWVudC5pZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBvYmo6IHsgaWQ6IHN0cmluZywgcmVhZHk6IGJvb2xlYW4gfSA9IHsgaWQ6IGNsaWVudC5pZCwgcmVhZHk6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICBjbGllbnRzLnB1c2gob2JqKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoYWRkQ2xpZW50SUQsIDMwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiByZWNlaXZlTWVzc2FnZShfZXZlbnQ6IEN1c3RvbUV2ZW50IHwgTWVzc2FnZUV2ZW50IHwgRXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBpZiAoX2V2ZW50IGluc3RhbmNlb2YgTWVzc2FnZUV2ZW50KSB7XHJcbiAgICAgICAgICAgIGxldCBtZXNzYWdlOiBGdWRnZU5ldC5NZXNzYWdlID0gSlNPTi5wYXJzZShfZXZlbnQuZGF0YSk7XHJcblxyXG4gICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5MT0FERUQudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgR2FtZS5sb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pZFNvdXJjZSAhPSBjbGllbnQuaWQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kID09IEZ1ZGdlTmV0LkNPTU1BTkQuUk9PTV9DUkVBVEUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlLmNvbnRlbnQucm9vbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGh0bWw6IEhUTUxFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJSb29tSWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgaHRtbC5wYXJlbnRFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgICAgICAgICBodG1sLnRleHRDb250ZW50ID0gbWVzc2FnZS5jb250ZW50LnJvb207XHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlZFJvb20gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGpvaW5Sb29tKG1lc3NhZ2UuY29udGVudC5yb29tKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kID09IEZ1ZGdlTmV0LkNPTU1BTkQuUk9PTV9FTlRFUikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjcmVhdGVkUm9vbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGllbnQuYmVjb21lSG9zdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kICE9IEZ1ZGdlTmV0LkNPTU1BTkQuU0VSVkVSX0hFQVJUQkVBVCAmJiBtZXNzYWdlLmNvbW1hbmQgIT0gRnVkZ2VOZXQuQ09NTUFORC5DTElFTlRfSEVBUlRCRUFUKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9BZGQgbmV3IGNsaWVudCB0byBhcnJheSBjbGllbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQ09OTkVDVEVELnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudC52YWx1ZSAhPSBjbGllbnQuaWQgJiYgY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudCA9PSBtZXNzYWdlLmNvbnRlbnQudmFsdWUpID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgPT0gbWVzc2FnZS5jb250ZW50LnZhbHVlKSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpZW50cy5wdXNoKHsgaWQ6IG1lc3NhZ2UuY29udGVudC52YWx1ZSwgcmVhZHk6IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TRVRHQU1FU1RBVEUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50LnBsYXlpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUucGxheWluZyhmYWxzZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIW1lc3NhZ2UuY29udGVudC5wbGF5aW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBhdXNlKGZhbHNlLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9TUEFXTiBNSU5JTUFQIEJZIENMSUVOVFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQV0FOTUlOSU1BUC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvbGRNaW5pTWFwSW5mbyA9IG1lc3NhZ2UuY29udGVudC5taW5pTWFwSW5mb3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdNaW5pTWFwSW5mbzogSW50ZXJmYWNlcy5JTWluaW1hcEluZm9zW10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvbGRNaW5pTWFwSW5mby5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0Nvb3JkczogR2FtZS7Gki5WZWN0b3IyID0gbmV3IEdhbWUuxpIuVmVjdG9yMihvbGRNaW5pTWFwSW5mb1tpXS5jb29yZHMuZGF0YVswXSwgb2xkTWluaU1hcEluZm9baV0uY29vcmRzLmRhdGFbMV0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdNaW5pTWFwSW5mby5wdXNoKDxJbnRlcmZhY2VzLklNaW5pbWFwSW5mb3M+eyBjb29yZHM6IG5ld0Nvb3Jkcywgcm9vbVR5cGU6IG9sZE1pbmlNYXBJbmZvW2ldLnJvb21UeXBlIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUubWluaU1hcCA9IG5ldyBVSS5NaW5pbWFwKG5ld01pbmlNYXBJbmZvKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChHYW1lLm1pbmlNYXApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9GUk9NIENMSUVOVCBJTlBVVCBWRUNUT1JTIEZST00gQVZBVEFSXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQ0xJRU5UTU9WRU1FTlQudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXRWZWN0b3IgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5pbnB1dC5pbnB1dFZlY3Rvci5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuaW5wdXQuaW5wdXRWZWN0b3IuZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LmlucHV0LmlucHV0VmVjdG9yLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXQ6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCA9IHsgdGljazogbWVzc2FnZS5jb250ZW50LmlucHV0LnRpY2ssIGlucHV0VmVjdG9yOiBpbnB1dFZlY3RvciwgZG9lc0FiaWxpdHk6IG1lc3NhZ2UuY29udGVudC5pbnB1dC5kb2VzQWJpbGl0eSB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuc2VydmVyUHJlZGljdGlvbkF2YXRhci51cGRhdGVFbnRpdHlUb0NoZWNrKG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuc2VydmVyUHJlZGljdGlvbkF2YXRhci5vbkNsaWVudElucHV0KGlucHV0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPIENMSUVOVCBDQUxDVUxBVEVEIFBPU0lUSU9OIEZPUiBBVkFUQVJcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TRVJWRVJCVUZGRVIudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV0T2JqOiBJbnRlcmZhY2VzLklOZXR3b3JrT2JqZWN0cyA9IEdhbWUuY3VycmVudE5ldE9iai5maW5kKGVudGl0eSA9PiBlbnRpdHkubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQuYnVmZmVyLnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5idWZmZXIucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LmJ1ZmZlci5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXRlOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQgPSB7IHRpY2s6IG1lc3NhZ2UuY29udGVudC5idWZmZXIudGljaywgcG9zaXRpb246IHBvc2l0aW9uIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXRPYmogIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgb2JqID0gbmV0T2JqLm5ldE9iamVjdE5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2JqIGluc3RhbmNlb2YgUGxheWVyLlBsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5vYmopLmNsaWVudC5vblNlcnZlck1vdmVtZW50U3RhdGUoc3RhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPEJ1bGxldHMuQnVsbGV0Pm9iaikuY2xpZW50UHJlZGljdGlvbi5vblNlcnZlck1vdmVtZW50U3RhdGUoc3RhdGUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvL0ZST00gQ0xJRU5UIEJVTExFVCBWRUNUT1JTXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQlVMTEVUUFJFRElDVC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnB1dFZlY3RvciA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmlucHV0LmlucHV0VmVjdG9yLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5pbnB1dC5pbnB1dFZlY3Rvci5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQuaW5wdXQuaW5wdXRWZWN0b3IuZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnB1dDogSW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkID0geyB0aWNrOiBtZXNzYWdlLmNvbnRlbnQuaW5wdXQudGljaywgaW5wdXRWZWN0b3I6IGlucHV0VmVjdG9yIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ldE9iajogSW50ZXJmYWNlcy5JTmV0d29ya09iamVjdHMgPSBHYW1lLmN1cnJlbnROZXRPYmouZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ1bGxldDogQnVsbGV0cy5CdWxsZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXRPYmogIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQgPSA8QnVsbGV0cy5CdWxsZXQ+bmV0T2JqLm5ldE9iamVjdE5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhidWxsZXQgKyBcIlwiICsgbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldC5zZXJ2ZXJQcmVkaWN0aW9uLnVwZGF0ZUVudGl0eVRvQ2hlY2sobWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldC5zZXJ2ZXJQcmVkaWN0aW9uLm9uQ2xpZW50SW5wdXQoaW5wdXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9TZXQgY2xpZW50IHJlYWR5XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU0VUUkVBRFkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5pZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQuaWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5yZWFkeSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gYXZhdGFyMiBhcyByYW5nZWQgb3IgbWVsZWUgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV04udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV0SWQ6IG51bWJlciA9IG1lc3NhZ2UuY29udGVudC5uZXRJZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXR0cmlidXRlczogRW50aXR5LkF0dHJpYnV0ZXMgPSBuZXcgRW50aXR5LkF0dHJpYnV0ZXMobWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLnNwZWVkLCBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5zY2FsZSwgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UsIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmFybW9yLCBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiwgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuYWNjdXJhY3kpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50LnR5cGUgPT0gRW50aXR5LklELk1FTEVFKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIgPSBuZXcgUGxheWVyLk1lbGVlKEVudGl0eS5JRC5NRUxFRSwgYXR0cmlidXRlcywgbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChHYW1lLmF2YXRhcjIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuY29udGVudC50eXBlID09IEVudGl0eS5JRC5SQU5HRUQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMiA9IG5ldyBQbGF5ZXIuUmFuZ2VkKEVudGl0eS5JRC5SQU5HRUQsIGF0dHJpYnV0ZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChHYW1lLmF2YXRhcjIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1J1bnRpbWUgdXBkYXRlcyBhbmQgY29tbXVuaWNhdGlvblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TeW5jIGF2YXRhcjIgcG9zaXRpb24gYW5kIHJvdGF0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQgdGVzdDogR2FtZS7Gki5WZWN0b3IzID0gbWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAvLyBjb25zb2xlLmxvZyh0ZXN0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBtb3ZlVmVjdG9yOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJvdGF0ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzJdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5hdmF0YXIyICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG1vdmVWZWN0b3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnJvdGF0aW9uID0gcm90YXRlVmVjdG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5jb2xsaWRlci5wb3NpdGlvbiA9IG1vdmVWZWN0b3IudG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHYW1lLmF2YXRhcjIuYXZhdGFyUHJlZGljdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9VcGRhdGUgaW52ZW50b3J5XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlVQREFURUlOVkVOVE9SWS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbTogSXRlbXMuSXRlbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChJdGVtcy5nZXRCdWZmSXRlbUJ5SWQobWVzc2FnZS5jb250ZW50Lml0ZW1JZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0gPSBuZXcgSXRlbXMuQnVmZkl0ZW0obWVzc2FnZS5jb250ZW50Lml0ZW1JZCwgbWVzc2FnZS5jb250ZW50Lml0ZW1OZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEl0ZW1zLmdldEludGVybmFsSXRlbUJ5SWQobWVzc2FnZS5jb250ZW50Lml0ZW1JZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0gPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKG1lc3NhZ2UuY29udGVudC5pdGVtSWQsIG1lc3NhZ2UuY29udGVudC5pdGVtTmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbnRpdHkgPSBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiAoPFBsYXllci5QbGF5ZXI+ZWxlbSkubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50LmFkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5pdGVtcy5wdXNoKG5ld0l0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuaXRlbXMuc3BsaWNlKGVudGl0eS5pdGVtcy5pbmRleE9mKGVudGl0eS5pdGVtcy5maW5kKGl0ZW0gPT4gaXRlbS5pZCA9PSBuZXdJdGVtLmlkKSksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0NsaWVudCByZXF1ZXN0IGZvciBtb3ZlIGtub2NrYmFja1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5LTk9DS0JBQ0tSRVFVRVNULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmVteTogRW5lbXkuRW5lbXkgPSBHYW1lLmVuZW1pZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS5nZXRLbm9ja2JhY2sobWVzc2FnZS5jb250ZW50Lmtub2NrYmFja0ZvcmNlLCBwb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vSG9zdCBwdXNoIG1vdmUga25vY2tiYWNrIGZyb20gZW5lbXlcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uS05PQ0tCQUNLUFVTSC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5nZXRLbm9ja2JhY2sobWVzc2FnZS5jb250ZW50Lmtub2NrYmFja0ZvcmNlLCBwb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gYnVsbGV0IGZyb20gaG9zdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUEFXTkJVTExFVC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnVsbGV0OiBCdWxsZXRzLkJ1bGxldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbnRpdHk6IEVudGl0eS5FbnRpdHkgPSBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5vd25lck5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW50aXR5ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgd2VhcG9uOiBXZWFwb25zLldlYXBvbiA9IGVudGl0eS53ZWFwb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRpcmVjaXRvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQuZGlyZWN0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKDxXZWFwb25zLkFJTT5tZXNzYWdlLmNvbnRlbnQuYWltVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFdlYXBvbnMuQUlNLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldCA9IG5ldyBCdWxsZXRzLkJ1bGxldCh3ZWFwb24uYnVsbGV0VHlwZSwgZW50aXR5Lm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBkaXJlY2l0b24sIGVudGl0eS5uZXRJZCwgbWVzc2FnZS5jb250ZW50LmJ1bGxldE5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFdlYXBvbnMuQUlNLkhPTUlORzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWxsZXRUYXJnZXQ6IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmJ1bGxldFRhcmdldC5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuYnVsbGV0VGFyZ2V0LmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5idWxsZXRUYXJnZXQuZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQgPSBuZXcgQnVsbGV0cy5Ib21pbmdCdWxsZXQod2VhcG9uLmJ1bGxldFR5cGUsIGVudGl0eS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgZGlyZWNpdG9uLCBlbnRpdHkubmV0SWQsIGJ1bGxldFRhcmdldCwgbWVzc2FnZS5jb250ZW50LmJ1bGxldE5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChidWxsZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1N5bmMgYnVsbGV0IHRyYW5zZm9ybSBmcm9tIGhvc3QgdG8gY2xpZW50XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkJVTExFVFRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5idWxsZXRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdQb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3Um90YXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5idWxsZXRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXdQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmJ1bGxldHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5tdHhMb2NhbC5yb3RhdGlvbiA9IG5ld1JvdGF0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9LaWxsIGJ1bGxldCBhdCB0aGUgY2xpZW50IGZyb20gaG9zdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5CVUxMRVRESUUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaWVudC5pZCAhPSBjbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ1bGxldCA9IEdhbWUuYnVsbGV0cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYnVsbGV0ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQubGlmZXRpbWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQuZGVzcGF3bigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TcGF3biBlbmVteSBhdCB0aGUgY2xpZW50IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUEFXTkVORU1ZLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vVE9ETzogY2hhbmdlIGF0dHJpYnV0ZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVuZW15U3Bhd25lci5uZXR3b3JrU3Bhd25CeUlkKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5lbmVteUNsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgxpIuVmVjdG9yMihcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmNvbnRlbnQubmV0SWQsIG1lc3NhZ2UuY29udGVudC50YXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1N5bmMgZW5lbXkgdHJhbnNmb3JtIGZyb20gaG9zdCB0byBjbGllbnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5FTVlUUkFOU0ZPUk0udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuZW15ID0gR2FtZS5lbmVtaWVzLmZpbmQoZW5lbSA9PiBlbmVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW5lbXkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuc2V0Q29sbGlkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1N5bmMgYW5pbWF0aW9uIHN0YXRlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkVOVElUWUFOSU1BVElPTlNUQVRFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbnRpdHkgPSBHYW1lLmVudGl0aWVzLmZpbmQoZW5lbSA9PiBlbmVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW50aXR5ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5zd2l0Y2hBbmltYXRpb24obWVzc2FnZS5jb250ZW50LnN0YXRlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9LaWxsIGVuZW15IGF0IHRoZSBjbGllbnQgZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkVORU1ZRElFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmVteSA9IEdhbWUuZW5lbWllcy5maW5kKGVuZW0gPT4gZW5lbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZChlbmVteSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3BJRChtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3VwZGF0ZSBFbnRpdHkgYnVmZiBMaXN0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlVQREFURUJVRkYudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ1ZmZMaXN0OiBCdWZmLkJ1ZmZbXSA9IDxCdWZmLkJ1ZmZbXT5tZXNzYWdlLmNvbnRlbnQuYnVmZkxpc3Q7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW50aXR5ID0gR2FtZS5lbnRpdGllcy5maW5kKGVudCA9PiBlbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCBuZXdCdWZmczogQnVmZi5CdWZmW10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5idWZmcy5mb3JFYWNoKG9sZEJ1ZmYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWZmVG9DaGVjayA9IGJ1ZmZMaXN0LmZpbmQoYnVmZiA9PiBidWZmLmlkID09IG9sZEJ1ZmYuaWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJ1ZmZUb0NoZWNrID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRCdWZmLnJlbW92ZUJ1ZmYoZW50aXR5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVmZkxpc3QuZm9yRWFjaChidWZmID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGJ1ZmYuaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBCdWZmLkJVRkZJRC5QT0lTT04gfCBCdWZmLkJVRkZJRC5CTEVFRElORzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBCdWZmLkRhbWFnZUJ1ZmYoYnVmZi5pZCwgYnVmZi5kdXJhdGlvbiwgYnVmZi50aWNrUmF0ZSwgKDxCdWZmLkRhbWFnZUJ1ZmY+YnVmZikudmFsdWUpLmFkZFRvRW50aXR5KGVudGl0eSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBCdWZmLkJVRkZJRC5JTU1VTkU6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgQnVmZi5BdHRyaWJ1dGVzQnVmZihidWZmLmlkLCBidWZmLmR1cmF0aW9uLCBidWZmLnRpY2tSYXRlLCAoPEJ1ZmYuQXR0cmlidXRlc0J1ZmY+YnVmZikudmFsdWUpLmFkZFRvRW50aXR5KGVudGl0eSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVudGl0eS5idWZmcy5mb3JFYWNoKGJ1ZmYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIGxldCBmbGFnOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgYnVmZkxpc3QuZm9yRWFjaChuZXdCdWZmID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgaWYgKGJ1ZmYuaWQgPT0gbmV3QnVmZi5pZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICAgICAgZmxhZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIGlmICghZmxhZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICBlbnRpdHkucmVtb3ZlQ2hpbGQoZW50aXR5LmdldENoaWxkcmVuKCkuZmluZChjaGlsZCA9PiAoPFVJLlBhcnRpY2xlcz5jaGlsZCkuaWQgPT0gYnVmZi5pZCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZW50aXR5LmJ1ZmZzID0gbmV3QnVmZnM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy91cGRhdGUgVUlcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVVBEQVRFVUkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uOiDGki5WZWN0b3IyID0gbmV3IMaSLlZlY3RvcjIobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IFVJLkRhbWFnZVVJKHBvc2l0aW9uLnRvVmVjdG9yMygpLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TcGF3biBpdGVtIGZyb20gaG9zdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUEFXTklOVEVSTkFMSVRFTS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoSXRlbXMuZ2V0QnVmZkl0ZW1CeUlkKG1lc3NhZ2UuY29udGVudC5pZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbSA9IG5ldyBJdGVtcy5CdWZmSXRlbShtZXNzYWdlLmNvbnRlbnQuaWQsIG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc2V0UG9zaXRpb24obmV3IMaSLlZlY3RvcjIobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXdJdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEl0ZW1zLmdldEludGVybmFsSXRlbUJ5SWQobWVzc2FnZS5jb250ZW50LmlkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJdGVtID0gbmV3IEl0ZW1zLkludGVybmFsSXRlbShtZXNzYWdlLmNvbnRlbnQuaWQsIG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc2V0UG9zaXRpb24obmV3IMaSLlZlY3RvcjIobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3SXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2FwcGx5IGl0ZW0gYXR0cmlidXRlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5VUERBVEVBVFRSSUJVVEVTLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbnRpdHkgPSBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5BVFRSSUJVVEVUWVBFLkhFQUxUSFBPSU5UUzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuTUFYSEVBTFRIUE9JTlRTOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgPSBtZXNzYWdlLmNvbnRlbnQucGF5bG9hZC52YWx1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5BVFRSSUJVVEVUWVBFLktOT0NLQkFDS0ZPUkNFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuSElUQUJMRTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMuaGl0YWJsZSA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuQVJNT1I6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzLmFybW9yID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQVRUUklCVVRFVFlQRS5TUEVFRDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMuc3BlZWQgPSBtZXNzYWdlLmNvbnRlbnQucGF5bG9hZC52YWx1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5BVFRSSUJVVEVUWVBFLkFUVEFDS1BPSU5UUzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQVRUUklCVVRFVFlQRS5DT09MRE9XTlJFRFVDVElPTjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24gPSBtZXNzYWdlLmNvbnRlbnQucGF5bG9hZC52YWx1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5BVFRSSUJVVEVUWVBFLlNDQUxFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5zY2FsZSA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9hcHBseSB3ZWFwb25cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVVBEQVRFV0VBUE9OLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZWZXZWFwb246IFdlYXBvbnMuV2VhcG9uID0gPFdlYXBvbnMuV2VhcG9uPm1lc3NhZ2UuY29udGVudC53ZWFwb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlLmNvbnRlbnQud2VhcG9uLmNvb2xkb3duLmNvb2xEb3duKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBXZWFwb246IFdlYXBvbnMuV2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKG1lc3NhZ2UuY29udGVudC53ZWFwb24uY29vbGRvd24uY29vbERvd24sIG1lc3NhZ2UuY29udGVudC53ZWFwb24uYXR0YWNrQ291bnQsIHJlZldlYXBvbi5idWxsZXRUeXBlLCByZWZXZWFwb24ucHJvamVjdGlsZUFtb3VudCwgcmVmV2VhcG9uLm93bmVyTmV0SWQsIHJlZldlYXBvbi5haW1UeXBlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5HYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkpLndlYXBvbiA9IHRlbXBXZWFwb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vS2lsbCBpdGVtIGZyb20gaG9zdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5JVEVNRElFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpdGVtID0gR2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZW5lbSA9PiAoPEl0ZW1zLkl0ZW0+ZW5lbSkubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQoaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3BJRChtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vc2VuZCByb29tIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TRU5EUk9PTS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29vcmRpYW50ZXM6IEdhbWUuxpIuVmVjdG9yMiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIobWVzc2FnZS5jb250ZW50LnJvb20uY29vcmRpbmF0ZXMuZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnJvb20uY29vcmRpbmF0ZXMuZGF0YVsxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGFuc2xhdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucm9vbS50cmFuc2xhdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucm9vbS50cmFuc2xhdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucm9vbS50cmFuc2xhdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb29tSW5mbzogSW50ZXJmYWNlcy5JUm9vbSA9IHsgY29vcmRpbmF0ZXM6IGNvb3JkaWFudGVzLCByb29tU2l6ZTogbWVzc2FnZS5jb250ZW50LnJvb20ucm9vbVNpemUsIGV4aXRzOiBtZXNzYWdlLmNvbnRlbnQucm9vbS5leGl0cywgcm9vbVR5cGU6IG1lc3NhZ2UuY29udGVudC5yb29tLnJvb21UeXBlLCB0cmFuc2xhdGlvbjogdGFuc2xhdGlvbiB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld1Jvb206IEdlbmVyYXRpb24uUm9vbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAocm9vbUluZm8ucm9vbVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuU1RBUlQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgR2VuZXJhdGlvbi5TdGFydFJvb20ocm9vbUluZm8uY29vcmRpbmF0ZXMsIHJvb21JbmZvLnJvb21TaXplKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBHZW5lcmF0aW9uLk5vcm1hbFJvb20ocm9vbUluZm8uY29vcmRpbmF0ZXMsIHJvb21JbmZvLnJvb21TaXplKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLkJPU1M6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgR2VuZXJhdGlvbi5Cb3NzUm9vbShyb29tSW5mby5jb29yZGluYXRlcywgcm9vbUluZm8ucm9vbVNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuVFJFQVNVUkU6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgR2VuZXJhdGlvbi5UcmVhc3VyZVJvb20ocm9vbUluZm8uY29vcmRpbmF0ZXMsIHJvb21JbmZvLnJvb21TaXplKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLk1FUkNIQU5UOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IEdlbmVyYXRpb24uTWVyY2hhbnRSb29tKHJvb21JbmZvLmNvb3JkaW5hdGVzLCByb29tSW5mby5yb29tU2l6ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbS5leGl0cyA9IHJvb21JbmZvLmV4aXRzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHJvb21JbmZvLnRyYW5zbGF0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbS5zZXRTcGF3blBvaW50cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbS5vcGVuRG9vcnMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdlbmVyYXRpb24uYWRkUm9vbVRvR3JhcGgobmV3Um9vbSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vc2VuZCByZXF1ZXN0IHRvIHN3aXRjaCByb29tc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TV0lUQ0hST09NUkVRVUVTVC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLnN3aXRjaFJvb20obWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZXRDbGllbnRSZWFkeSgpIHtcclxuICAgICAgICBjbGllbnRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50LmlkID09IGNsaWVudC5pZCkucmVhZHkgPSB0cnVlO1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFVFJFQURZLCBuZXRJZDogY2xpZW50LmlkIH0gfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNldEdhbWVzdGF0ZShfcGxheWluZzogYm9vbGVhbikge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU0VUR0FNRVNUQVRFLCBwbGF5aW5nOiBfcGxheWluZyB9IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSb29tKCkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb21tYW5kOiBGdWRnZU5ldC5DT01NQU5ELlJPT01fQ1JFQVRFIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBqb2luUm9vbShfcm9vbUlkOiBzdHJpbmcpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29tbWFuZDogRnVkZ2VOZXQuQ09NTUFORC5ST09NX0VOVEVSLCBjb250ZW50OiB7IHJvb206IF9yb29tSWQgfSB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyNyZWdpb24gcGxheWVyXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbG9hZGVkKCkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkxPQURFRCB9IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3blBsYXllcigpIHtcclxuICAgICAgICBpZiAoR2FtZS5hdmF0YXIxLmlkID09IEVudGl0eS5JRC5NRUxFRSkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTiwgdHlwZTogRW50aXR5LklELk1FTEVFLCBhdHRyaWJ1dGVzOiBHYW1lLmF2YXRhcjEuYXR0cmlidXRlcywgcG9zaXRpb246IEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIG5ldElkOiBHYW1lLmF2YXRhcjEubmV0SWQgfSB9KVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOLCB0eXBlOiBFbnRpdHkuSUQuUkFOR0VELCBhdHRyaWJ1dGVzOiBHYW1lLmF2YXRhcjEuYXR0cmlidXRlcywgcG9zaXRpb246IEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIG5ldElkOiBHYW1lLmF2YXRhcjEubmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNldENsaWVudCgpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBOZXR3b3JraW5nLkZVTkNUSU9OLkNPTk5FQ1RFRCwgdmFsdWU6IE5ldHdvcmtpbmcuY2xpZW50LmlkIH0gfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUF2YXRhclBvc2l0aW9uKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX3JvdGF0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkKS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5UUkFOU0ZPUk0sIHZhbHVlOiBfcG9zaXRpb24sIHJvdGF0aW9uOiBfcm90YXRpb24gfSB9KVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2VuZENsaWVudElucHV0KF9uZXRJZDogbnVtYmVyLCBfaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuSE9TVCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5DTElFTlRNT1ZFTUVOVCwgbmV0SWQ6IF9uZXRJZCwgaW5wdXQ6IF9pbnB1dFBheWxvYWQgfSB9KVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZW5kU2VydmVyQnVmZmVyKF9uZXRJZDogbnVtYmVyLCBfYnVmZmVyOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQpIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU0VSVkVSQlVGRkVSLCBuZXRJZDogX25ldElkLCBidWZmZXI6IF9idWZmZXIgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24ga25vY2tiYWNrUmVxdWVzdChfbmV0SWQ6IG51bWJlciwgX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudC5pZEhvc3QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uS05PQ0tCQUNLUkVRVUVTVCwgbmV0SWQ6IF9uZXRJZCwga25vY2tiYWNrRm9yY2U6IF9rbm9ja2JhY2tGb3JjZSwgcG9zaXRpb246IF9wb3NpdGlvbiB9IH0pXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGtub2NrYmFja1B1c2goX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uS05PQ0tCQUNLUFVTSCwga25vY2tiYWNrRm9yY2U6IF9rbm9ja2JhY2tGb3JjZSwgcG9zaXRpb246IF9wb3NpdGlvbiB9IH0pXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUludmVudG9yeShfYWRkOiBib29sZWFuLCBfaXRlbUlkOiBJdGVtcy5JVEVNSUQsIF9pdGVtTmV0SWQ6IG51bWJlciwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkID09IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkKS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVJTlZFTlRPUlksIGFkZDogX2FkZCwgaXRlbUlkOiBfaXRlbUlkLCBpdGVtTmV0SWQ6IF9pdGVtTmV0SWQsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25NaW5pbWFwKF9taW5pTWFwSW5mb3M6IEludGVyZmFjZXMuSU1pbmltYXBJbmZvc1tdKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BXQU5NSU5JTUFQLCBtaW5pTWFwSW5mb3M6IF9taW5pTWFwSW5mb3MgfSB9KVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIGJ1bGxldFxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduQnVsbGV0KF9haW1UeXBlOiBXZWFwb25zLkFJTSwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX2J1bGxldE5ldElkOiBudW1iZXIsIF9vd25lck5ldElkOiBudW1iZXIsIF9idWxsZXRUYXJnZXQ/OiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05CVUxMRVQsIGFpbVR5cGU6IF9haW1UeXBlLCBkaXJlY3Rpb246IF9kaXJlY3Rpb24sIG93bmVyTmV0SWQ6IF9vd25lck5ldElkLCBidWxsZXROZXRJZDogX2J1bGxldE5ldElkLCBidWxsZXRUYXJnZXQ6IF9idWxsZXRUYXJnZXQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZW5kQnVsbGV0SW5wdXQoX25ldElkOiBudW1iZXIsIF9pbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5IT1NULCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkJVTExFVFBSRURJQ1QsIG5ldElkOiBfbmV0SWQsIGlucHV0OiBfaW5wdXRQYXlsb2FkIH0gfSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQnVsbGV0KF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX3JvdGF0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5CVUxMRVRUUkFOU0ZPUk0sIHBvc2l0aW9uOiBfcG9zaXRpb24sIHJvdGF0aW9uOiBfcm90YXRpb24sIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZW1vdmVCdWxsZXQoX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQlVMTEVURElFLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBlbmVteVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduRW5lbXkoX2VuZW15Q2xhc3M6IEVuZW15LkVORU1ZQ0xBU1MsIF9lbmVteTogRW5lbXkuRW5lbXksIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdORU5FTVksIGVuZW15Q2xhc3M6IF9lbmVteUNsYXNzLCBpZDogX2VuZW15LmlkLCBhdHRyaWJ1dGVzOiBfZW5lbXkuYXR0cmlidXRlcywgcG9zaXRpb246IF9lbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgbmV0SWQ6IF9uZXRJZCwgdGFyZ2V0OiBfZW5lbXkudGFyZ2V0IH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlRW5lbXlQb3NpdGlvbihfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5FTVlUUkFOU0ZPUk0sIHBvc2l0aW9uOiBfcG9zaXRpb24sIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUVudGl0eUFuaW1hdGlvblN0YXRlKF9zdGF0ZTogRW50aXR5LkFOSU1BVElPTlNUQVRFUywgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkVOVElUWUFOSU1BVElPTlNUQVRFLCBzdGF0ZTogX3N0YXRlLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gZWxzZSB7XHJcbiAgICAgICAgLy8gICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkID09IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkVOVElUWUFOSU1BVElPTlNUQVRFLCBzdGF0ZTogX3N0YXRlLCBuZXRJZDogX25ldElkIH0gfSlcclxuXHJcbiAgICAgICAgLy8gfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUVuZW15KF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5FTVlESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gaXRlbXNcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkl0ZW0oX2lkOiBudW1iZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05JTlRFUk5BTElURU0sIGlkOiBfaWQsIHBvc2l0aW9uOiBfcG9zaXRpb24sIG5ldElkOiBfbmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlRW50aXR5QXR0cmlidXRlcyhfYXR0cmlidXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChjbGllbnQuaWRIb3N0ICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuSE9TVCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVBVFRSSUJVVEVTLCBwYXlsb2FkOiBfYXR0cmlidXRlUGF5bG9hZCwgbmV0SWQ6IF9uZXRJZCB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFQVRUUklCVVRFUywgcGF5bG9hZDogX2F0dHJpYnV0ZVBheWxvYWQsIG5ldElkOiBfbmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQXZhdGFyV2VhcG9uKF93ZWFwb246IFdlYXBvbnMuV2VhcG9uLCBfdGFyZ2V0TmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChjbGllbnQuaWRIb3N0ICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuSE9TVCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVXRUFQT04sIHdlYXBvbjogX3dlYXBvbiwgbmV0SWQ6IF90YXJnZXROZXRJZCB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFV0VBUE9OLCB3ZWFwb246IF93ZWFwb24sIG5ldElkOiBfdGFyZ2V0TmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUl0ZW0oX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCAhPSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLkhPU1QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uSVRFTURJRSwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5JVEVNRElFLCBuZXRJZDogX25ldElkIH0gfSlcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcbiAgICAvLyNyZWdpb24gYnVmZnNcclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVCdWZmTGlzdChfYnVmZkxpc3Q6IEJ1ZmYuQnVmZltdLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVCVUZGLCBidWZmTGlzdDogX2J1ZmZMaXN0LCBuZXRJZDogX25ldElkIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIFVJXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlVUkoX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjIsIF92YWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURVVJLCBwb3NpdGlvbjogX3Bvc2l0aW9uLCB2YWx1ZTogX3ZhbHVlIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiByb29tXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2VuZFJvb20oX3Jvb206IEludGVyZmFjZXMuSVJvb20pIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU0VORFJPT00sIHJvb206IF9yb29tIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3dpdGNoUm9vbVJlcXVlc3QoX2RpcmVjdGlvbjogSW50ZXJmYWNlcy5JUm9vbUV4aXRzKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgIT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnQuaWRIb3N0LCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNXSVRDSFJPT01SRVFVRVNULCBkaXJlY3Rpb246IF9kaXJlY3Rpb24gfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBpZEdlbmVyYXRvcigpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBpZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDApO1xyXG4gICAgICAgIGlmIChjdXJyZW50SURzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50ID09IGlkKSkge1xyXG4gICAgICAgICAgICBpZEdlbmVyYXRvcigpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY3VycmVudElEcy5wdXNoKGlkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpZDtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcG9wSUQoX2lkOiBudW1iZXIpIHtcclxuICAgICAgICBjdXJyZW50SURzID0gY3VycmVudElEcy5maWx0ZXIoZWxlbSA9PiBlbGVtICE9IF9pZClcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gaXNOZXR3b3JrT2JqZWN0KF9vYmplY3Q6IGFueSk6IF9vYmplY3QgaXMgSW50ZXJmYWNlcy5JTmV0d29ya2FibGUge1xyXG4gICAgICAgIHJldHVybiBcIm5ldElkXCIgaW4gX29iamVjdDtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0TmV0SWQoX29iamVjdDogR2FtZS7Gki5Ob2RlKTogbnVtYmVyIHtcclxuICAgICAgICBpZiAoaXNOZXR3b3JrT2JqZWN0KF9vYmplY3QpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBfb2JqZWN0Lm5ldElkO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXVubG9hZFwiLCBvblVubG9hZCwgZmFsc2UpO1xyXG5cclxuICAgIGZ1bmN0aW9uIG9uVW5sb2FkKCkge1xyXG4gICAgICAgIC8vVE9ETzogVGhpbmdzIHdlIGRvIGFmdGVyIHRoZSBwbGF5ZXIgbGVmdCB0aGUgZ2FtZVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFBsYXllciB7XHJcblxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFBsYXllciBleHRlbmRzIEVudGl0eS5FbnRpdHkge1xyXG4gICAgICAgIHB1YmxpYyB3ZWFwb246IFdlYXBvbnMuV2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKDI1LCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuU1RBTkRBUkQsIDEsIHRoaXMubmV0SWQsIFdlYXBvbnMuQUlNLk5PUk1BTCk7XHJcblxyXG4gICAgICAgIHB1YmxpYyBjbGllbnQ6IE5ldHdvcmtpbmcuQ2xpZW50UHJlZGljdGlvbjtcclxuICAgICAgICByZWFkb25seSBhYmlsaXR5Q291bnQ6IG51bWJlciA9IDE7XHJcbiAgICAgICAgY3VycmVudGFiaWxpdHlDb3VudDogbnVtYmVyID0gdGhpcy5hYmlsaXR5Q291bnQ7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfYXR0cmlidXRlczogRW50aXR5LkF0dHJpYnV0ZXMsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IF9hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuUExBWUVSO1xyXG4gICAgICAgICAgICB0aGlzLmNsaWVudCA9IG5ldyBOZXR3b3JraW5nLkNsaWVudFByZWRpY3Rpb24odGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChfZGlyZWN0aW9uLm1hZ25pdHVkZSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNldENvbGxpZGVyKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNjYWxlTW92ZVZlY3RvcihfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbi5hZGQoX2RpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGUodGhpcy5tb3ZlRGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbi5zdWJ0cmFjdChfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGxldCB3YWxsczogR2VuZXJhdGlvbi5XYWxsW10gPSAoPEdlbmVyYXRpb24uV2FsbFtdPkdhbWUuY3VycmVudFJvb20uZ2V0Q2hpbGRyZW4oKSk7XHJcbiAgICAgICAgICAgIHdhbGxzLmZvckVhY2goKHdhbGwpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh3YWxsLmRvb3IgIT0gdW5kZWZpbmVkICYmIHdhbGwuZG9vci5pc0FjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzUmVjdCh3YWxsLmRvb3IuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8R2VuZXJhdGlvbi5Eb29yPndhbGwuZG9vcikuY2hhbmdlUm9vbSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgc2NhbGVNb3ZlVmVjdG9yKF9kaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICYmIHRoaXMgPT0gR2FtZS5hdmF0YXIxKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKChHYW1lLmRlbHRhVGltZSAqIHRoaXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5zY2FsZSgodGhpcy5jbGllbnQubWluVGltZUJldHdlZW5UaWNrcyAqIHRoaXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgcHJlZGljdCgpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAhPSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbGllbnQudXBkYXRlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmUoSW5wdXRTeXN0ZW0ubW92ZSgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNvbGxpZGUoX2RpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmNvbGxpZGUoX2RpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEl0ZW1Db2xsaXNpb24oKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IGVuZW1pZXM6IEVuZW15LkVuZW15W10gPSBHYW1lLmVuZW1pZXM7XHJcbiAgICAgICAgICAgIGxldCBlbmVtaWVzQ29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyW10gPSBbXTtcclxuICAgICAgICAgICAgZW5lbWllcy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgZW5lbWllc0NvbGxpZGVyLnB1c2goZWxlbWVudC5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICAvL1RPRE86IHVuY29tbWVudFxyXG4gICAgICAgICAgICAvLyB0aGlzLmNhbGN1bGF0ZUNvbGxpZGVyKGVuZW1pZXNDb2xsaWRlciwgX2RpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5jYW5Nb3ZlWCAmJiB0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5jYW5Nb3ZlWCAmJiAhdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9kaXJlY3Rpb24ueCwgMCwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLmNhbk1vdmVYICYmIHRoaXMuY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMygwLCBfZGlyZWN0aW9uLnksIF9kaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0SXRlbUNvbGxpc2lvbigpIHtcclxuICAgICAgICAgICAgbGV0IGl0ZW1Db2xsaWRlcjogSXRlbXMuSXRlbVtdID0gR2FtZS5pdGVtcztcclxuICAgICAgICAgICAgaXRlbUNvbGxpZGVyLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhpdGVtLmNvbGxpZGVyKSkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIEl0ZW1zLkludGVybmFsSXRlbSAmJiAoPEl0ZW1zLkludGVybmFsSXRlbT5pdGVtKS5jaG9vc2VuT25lTmV0SWQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoPEl0ZW1zLkludGVybmFsSXRlbT5pdGVtKS5jaG9vc2VuT25lTmV0SWQgIT0gdGhpcy5uZXRJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5jdXJyZW50Um9vbS5yb29tVHlwZSA9PSBHZW5lcmF0aW9uLlJPT01UWVBFLlRSRUFTVVJFKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8R2VuZXJhdGlvbi5UcmVhc3VyZVJvb20+R2FtZS5jdXJyZW50Um9vbSkub25JdGVtQ29sbGVjdChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmN1cnJlbnRSb29tLnJvb21UeXBlID09IEdlbmVyYXRpb24uUk9PTVRZUEUuTUVSQ0hBTlQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEoPEdlbmVyYXRpb24uTWVyY2hhbnRSb29tPkdhbWUuY3VycmVudFJvb20pLm9uSXRlbUNvbGxlY3QoaXRlbSwgdGhpcykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVJbnZlbnRvcnkodHJ1ZSwgaXRlbS5pZCwgaXRlbS5uZXRJZCwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5kb1lvdXJUaGluZyh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLml0ZW1zLnB1c2goaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgdGhhdCBkZWxldGV0IG91dCBvZiByb29tIGlmIGNvbGxlY3RlZFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgSXRlbXMuSW50ZXJuYWxJdGVtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGl0ZW0ubmFtZSArIFwiOiBcIiArIGl0ZW0uZGVzY3JpcHRpb24gKyBcIiBzbXRoIGNoYW5nZWQgdG86IFwiICsgKDxJdGVtcy5JbnRlcm5hbEl0ZW0+aXRlbSkudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIEl0ZW1zLkJ1ZmZJdGVtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGl0ZW0ubmFtZSArIFwiOiBcIiArIGl0ZW0uZGVzY3JpcHRpb24gKyBcIiBzbXRoIGNoYW5nZWQgdG86IFwiICsgQnVmZi5CVUZGSURbKDxJdGVtcy5CdWZmSXRlbT5pdGVtKS5idWZmWzBdLmlkXS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIGF0dGFjayhfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ/OiBudW1iZXIsIF9zeW5jPzogYm9vbGVhbikge1xyXG4gICAgICAgICAgICB0aGlzLndlYXBvbi5zaG9vdCh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBfZGlyZWN0aW9uLCBfbmV0SWQsIF9zeW5jKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkb0tub2NrYmFjayhfYm9keTogRW50aXR5LkVudGl0eSk6IHZvaWQge1xyXG4gICAgICAgICAgICAvLyAoPEVuZW15LkVuZW15Pl9ib2R5KS5nZXRLbm9ja2JhY2sodGhpcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IzKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2UsIF9wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZG9BYmlsaXR5KCkge1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIE1lbGVlIGV4dGVuZHMgUGxheWVyIHtcclxuICAgICAgICBwdWJsaWMgYmxvY2s6IEFiaWxpdHkuQmxvY2sgPSBuZXcgQWJpbGl0eS5CbG9jayh0aGlzLm5ldElkLCA2MDAsIDEsIDUgKiA2MCk7XHJcbiAgICAgICAgcmVhZG9ubHkgYWJpbGl0eUNvb2xkb3duVGltZTogbnVtYmVyID0gNDA7XHJcbiAgICAgICAgY3VycmVudGFiaWxpdHlDb29sZG93blRpbWU6IG51bWJlciA9IHRoaXMuYWJpbGl0eUNvb2xkb3duVGltZTtcclxuXHJcbiAgICAgICAgcHVibGljIHdlYXBvbjogV2VhcG9ucy5XZWFwb24gPSBuZXcgV2VhcG9ucy5XZWFwb24oMTIsIDEsIEJ1bGxldHMuQlVMTEVUVFlQRS5NRUxFRSwgMSwgdGhpcy5uZXRJZCwgV2VhcG9ucy5BSU0uTk9STUFMKTtcclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBhdHRhY2soX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyLCBfc3luYz86IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgdGhpcy53ZWFwb24uc2hvb3QodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgX2RpcmVjdGlvbiwgX25ldElkLCBfc3luYyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL0Jsb2NrXHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIFJhbmdlZCBleHRlbmRzIFBsYXllciB7XHJcblxyXG4gICAgICAgIHB1YmxpYyBkYXNoOiBBYmlsaXR5LkRhc2ggPSBuZXcgQWJpbGl0eS5EYXNoKHRoaXMubmV0SWQsIDgsIDEsIDYwLCA1KTtcclxuICAgICAgICBwZXJmb3JtQWJpbGl0eTogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxhc3RNb3ZlRGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjM7XHJcblxyXG4gICAgICAgIHB1YmxpYyBtb3ZlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZGFzaC5kb2VzQWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgc3VwZXIubW92ZSh0aGlzLmxhc3RNb3ZlRGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHN1cGVyLm1vdmUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXN0TW92ZURpcmVjdGlvbiA9IF9kaXJlY3Rpb247XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vRGFzaFxyXG4gICAgICAgIHB1YmxpYyBkb0FiaWxpdHkoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZGFzaC5kb0FiaWxpdHkoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgR2VuZXJhdGlvbiB7XHJcbiAgICBleHBvcnQgZW51bSBST09NVFlQRSB7XHJcbiAgICAgICAgU1RBUlQsXHJcbiAgICAgICAgTk9STUFMLFxyXG4gICAgICAgIE1FUkNIQU5ULFxyXG4gICAgICAgIFRSRUFTVVJFLFxyXG4gICAgICAgIENIQUxMRU5HRSxcclxuICAgICAgICBCT1NTXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15Q291bnRNYW5hZ2VyIHtcclxuICAgICAgICBwcml2YXRlIG1heEVuZW15Q291bnQ6IG51bWJlcjsgZ2V0IGdldE1heEVuZW15Q291bnQoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMubWF4RW5lbXlDb3VudCB9O1xyXG4gICAgICAgIHByaXZhdGUgY3VycmVudEVuZW15Q29vdW50OiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGZpbmlzaGVkOiBib29sZWFuO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9lbmVteUNvdW50OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5tYXhFbmVteUNvdW50ID0gX2VuZW15Q291bnQ7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEVuZW15Q29vdW50ID0gX2VuZW15Q291bnQ7XHJcbiAgICAgICAgICAgIHRoaXMuZmluaXNoZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKF9lbmVteUNvdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZmluaXNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb25FbmVteURlYXRoKCkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRFbmVteUNvb3VudC0tO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50RW5lbXlDb291bnQgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5maW5pc2hlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgbGV0IHR4dFN0YXJ0Um9vbTogR2FtZS7Gki5UZXh0dXJlSW1hZ2UgPSBuZXcgR2FtZS7Gki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgUm9vbSBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUc7XHJcbiAgICAgICAgcHVibGljIHJvb21UeXBlOiBST09NVFlQRTtcclxuICAgICAgICBwdWJsaWMgY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgICAgICBwdWJsaWMgd2FsbHM6IFdhbGxbXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBvYnN0aWNhbHM6IE9ic2l0Y2FsW10gPSBbXTtcclxuICAgICAgICBwdWJsaWMgZW5lbXlDb3VudE1hbmFnZXI6IEVuZW15Q291bnRNYW5hZ2VyO1xyXG4gICAgICAgIHB1YmxpYyBwb3NpdGlvblVwZGF0ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICByb29tU2l6ZTogbnVtYmVyID0gMzA7XHJcbiAgICAgICAgZXhpdHM6IEludGVyZmFjZXMuSVJvb21FeGl0czsgLy8gTiBFIFMgV1xyXG4gICAgICAgIG1lc2g6IMaSLk1lc2hRdWFkID0gbmV3IMaSLk1lc2hRdWFkO1xyXG4gICAgICAgIGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaCh0aGlzLm1lc2gpO1xyXG4gICAgICAgIHByb3RlY3RlZCBhdmF0YXJTcGF3blBvaW50TjogR2FtZS7Gki5WZWN0b3IyOyBnZXQgZ2V0U3Bhd25Qb2ludE4oKTogR2FtZS7Gki5WZWN0b3IyIHsgcmV0dXJuIHRoaXMuYXZhdGFyU3Bhd25Qb2ludE4gfTtcclxuICAgICAgICBwcm90ZWN0ZWQgYXZhdGFyU3Bhd25Qb2ludEU6IEdhbWUuxpIuVmVjdG9yMjsgZ2V0IGdldFNwYXduUG9pbnRFKCk6IEdhbWUuxpIuVmVjdG9yMiB7IHJldHVybiB0aGlzLmF2YXRhclNwYXduUG9pbnRFIH07XHJcbiAgICAgICAgcHJvdGVjdGVkIGF2YXRhclNwYXduUG9pbnRTOiBHYW1lLsaSLlZlY3RvcjI7IGdldCBnZXRTcGF3blBvaW50UygpOiBHYW1lLsaSLlZlY3RvcjIgeyByZXR1cm4gdGhpcy5hdmF0YXJTcGF3blBvaW50UyB9O1xyXG4gICAgICAgIHByb3RlY3RlZCBhdmF0YXJTcGF3blBvaW50VzogR2FtZS7Gki5WZWN0b3IyOyBnZXQgZ2V0U3Bhd25Qb2ludFcoKTogR2FtZS7Gki5WZWN0b3IyIHsgcmV0dXJuIHRoaXMuYXZhdGFyU3Bhd25Qb2ludFcgfTtcclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGNtcE1hdGVyaWFsOiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCgpO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vcmRpYW50ZXM6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb21TaXplOiBudW1iZXIsIF9yb29tVHlwZTogUk9PTVRZUEUpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJyb29tXCIpO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuUk9PTTtcclxuICAgICAgICAgICAgdGhpcy5jb29yZGluYXRlcyA9IF9jb29yZGlhbnRlcztcclxuICAgICAgICAgICAgdGhpcy5lbmVteUNvdW50TWFuYWdlciA9IG5ldyBFbmVteUNvdW50TWFuYWdlcigwKTtcclxuICAgICAgICAgICAgaWYgKF9yb29tU2l6ZSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucm9vbVNpemUgPSBfcm9vbVNpemU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9yb29tVHlwZSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucm9vbVR5cGUgPSBfcm9vbVR5cGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5leGl0cyA9IDxJbnRlcmZhY2VzLklSb29tRXhpdHM+eyBub3J0aDogZmFsc2UsIGVhc3Q6IGZhbHNlLCBzb3V0aDogZmFsc2UsIHdlc3Q6IGZhbHNlIH1cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyDGki5WZWN0b3IzKHRoaXMucm9vbVNpemUsIHRoaXMucm9vbVNpemUsIDEpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudCh0aGlzLmNtcE1lc2gpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudCh0aGlzLmNtcE1hdGVyaWFsKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMygwLCAwLCAtMC4wMSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZFdhbGxzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHYW1lLsaSLkVWRU5ULlJFTkRFUl9QUkVQQVJFLCB0aGlzLmV2ZW50VXBkYXRlKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGV2ZW50VXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIG9uQWRkVG9HcmFwaCgpIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKTogdm9pZCB7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBhZGRXYWxscygpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5hZGRDaGlsZCgobmV3IFdhbGwobmV3IMaSLlZlY3RvcjIoMC41LCAwKSwgbmV3IMaSLlZlY3RvcjIoMSAvIHRoaXMucm9vbVNpemUsIDEgKyAxIC8gdGhpcy5yb29tU2l6ZSksIHRoaXMpKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQoKG5ldyBXYWxsKG5ldyDGki5WZWN0b3IyKDAsIDAuNSksIG5ldyDGki5WZWN0b3IyKDEsIDEgLyB0aGlzLnJvb21TaXplKSwgdGhpcykpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDaGlsZCgobmV3IFdhbGwobmV3IMaSLlZlY3RvcjIoLTAuNSwgMCksIG5ldyDGki5WZWN0b3IyKDEgLyB0aGlzLnJvb21TaXplLCAxICsgMSAvIHRoaXMucm9vbVNpemUpLCB0aGlzKSkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENoaWxkKChuZXcgV2FsbChuZXcgxpIuVmVjdG9yMigwLCAtMC41KSwgbmV3IMaSLlZlY3RvcjIoMSwgMSAvIHRoaXMucm9vbVNpemUpLCB0aGlzKSkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtID0+ICg8V2FsbD5lbGVtKS50YWcgPT0gVGFnLlRBRy5XQUxMKS5mb3JFYWNoKHdhbGwgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53YWxscy5wdXNoKCg8V2FsbD53YWxsKSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0U3Bhd25Qb2ludHMoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyU3Bhd25Qb2ludEUgPSBuZXcgxpIuVmVjdG9yMih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKyAoKHRoaXMucm9vbVNpemUgLyAyKSAtIDIpLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpO1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhclNwYXduUG9pbnRXID0gbmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54IC0gKCh0aGlzLnJvb21TaXplIC8gMikgLSAyKSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi55KTtcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXJTcGF3blBvaW50TiA9IG5ldyDGki5WZWN0b3IyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi55ICsgKCh0aGlzLnJvb21TaXplIC8gMikgLSAyKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyU3Bhd25Qb2ludFMgPSBuZXcgxpIuVmVjdG9yMih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueSAtICgodGhpcy5yb29tU2l6ZSAvIDIpIC0gMikpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldFJvb21TaXplKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJvb21TaXplO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldFJvb21FeGl0KF9uZWlnaGJvdXI6IFJvb20pIHtcclxuICAgICAgICAgICAgbGV0IGRpZiA9IEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKF9uZWlnaGJvdXIuY29vcmRpbmF0ZXMsIHRoaXMuY29vcmRpbmF0ZXMpXHJcbiAgICAgICAgICAgIGlmIChkaWYuZXF1YWxzKGNvbXBhcmVOb3J0aCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdHMubm9ydGggPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChkaWYuZXF1YWxzKGNvbXBhcmVFYXN0KSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGl0cy5lYXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZGlmLmVxdWFscyhjb21wYXJlU291dGgpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRzLnNvdXRoID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZGlmLmVxdWFscyhjb21wYXJlV2VzdCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdHMud2VzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvcGVuRG9vcnMoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4aXRzLm5vcnRoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndhbGxzLmZpbmQod2FsbCA9PiB3YWxsLmRvb3IuZGlyZWN0aW9uLm5vcnRoID09IHRydWUpLmRvb3Iub3BlbkRvb3IoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5leGl0cy5lYXN0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndhbGxzLmZpbmQod2FsbCA9PiB3YWxsLmRvb3IuZGlyZWN0aW9uLmVhc3QgPT0gdHJ1ZSkuZG9vci5vcGVuRG9vcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4aXRzLnNvdXRoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndhbGxzLmZpbmQod2FsbCA9PiB3YWxsLmRvb3IuZGlyZWN0aW9uLnNvdXRoID09IHRydWUpLmRvb3Iub3BlbkRvb3IoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5leGl0cy53ZXN0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndhbGxzLmZpbmQod2FsbCA9PiB3YWxsLmRvb3IuZGlyZWN0aW9uLndlc3QgPT0gdHJ1ZSkuZG9vci5vcGVuRG9vcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgU3RhcnRSb29tIGV4dGVuZHMgUm9vbSB7XHJcbiAgICAgICAgcHJpdmF0ZSBzdGFydFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwic3RhcnRSb29tTWF0XCIsIMaSLlNoYWRlckxpdFRleHR1cmVkLCBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpLCB0eHRTdGFydFJvb20pKTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb21TaXplOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2Nvb3JkaW5hdGVzLCBfcm9vbVNpemUsIFJPT01UWVBFLlNUQVJUKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50TWF0ZXJpYWwpLm1hdGVyaWFsID0gdGhpcy5zdGFydFJvb21NYXQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBOb3JtYWxSb29tIGV4dGVuZHMgUm9vbSB7XHJcbiAgICAgICAgbm9ybWFsUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJub3JtYWxSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tU2l6ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9jb29yZGluYXRlcywgX3Jvb21TaXplLCBST09NVFlQRS5OT1JNQUwpO1xyXG4gICAgICAgICAgICB0aGlzLmVuZW15Q291bnRNYW5hZ2VyID0gbmV3IEVuZW15Q291bnRNYW5hZ2VyKDUpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRNYXRlcmlhbCkubWF0ZXJpYWwgPSB0aGlzLm5vcm1hbFJvb21NYXQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCb3NzUm9vbSBleHRlbmRzIFJvb20ge1xyXG4gICAgICAgIGJvc3NSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcImJvc3NSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImJsYWNrXCIpKSk7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tU2l6ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9jb29yZGluYXRlcywgX3Jvb21TaXplLCBST09NVFlQRS5CT1NTKTtcclxuICAgICAgICAgICAgdGhpcy5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRNYXRlcmlhbCkubWF0ZXJpYWwgPSB0aGlzLmJvc3NSb29tTWF0O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgVHJlYXN1cmVSb29tIGV4dGVuZHMgUm9vbSB7XHJcbiAgICAgICAgcHJpdmF0ZSB0cmVhc3VyZVJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwidHJlYXN1cmVSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInllbGxvd1wiKSkpO1xyXG4gICAgICAgIHByaXZhdGUgc3Bhd25DaGFuY2U6IG51bWJlciA9IDI1OyBnZXQgZ2V0U3Bhd25DaGFuY2UoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMuc3Bhd25DaGFuY2UgfTtcclxuICAgICAgICBwcml2YXRlIHRyZWFzdXJlQ291bnQ6IG51bWJlciA9IDI7XHJcbiAgICAgICAgcHJpdmF0ZSB0cmVhc3VyZXM6IEl0ZW1zLkl0ZW1bXSA9IFtdO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyLCBfcm9vbVNpemU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfY29vcmRpbmF0ZXMsIF9yb29tU2l6ZSwgUk9PTVRZUEUuVFJFQVNVUkUpO1xyXG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudE1hdGVyaWFsKS5tYXRlcmlhbCA9IHRoaXMudHJlYXN1cmVSb29tTWF0O1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZVRyZWFzdXJlcygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGNyZWF0ZVRyZWFzdXJlcygpIHtcclxuICAgICAgICAgICAgbGV0IHRyZWFzdXJlczogSXRlbXMuSXRlbVtdID0gW107XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy50cmVhc3VyZUNvdW50OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRyZWFzdXJlcy5wdXNoKEl0ZW1zLkl0ZW1HZW5lcmF0b3IuZ2V0UmFuZG9tSXRlbSgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnRyZWFzdXJlcyA9IHRyZWFzdXJlcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkFkZFRvR3JhcGgoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGxldCBpOiBudW1iZXIgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLnRyZWFzdXJlcy5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgaXRlbS5zZXRQb3NpdGlvbihuZXcgxpIuVmVjdG9yMih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKyBpLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpKVxyXG4gICAgICAgICAgICAgICAgaXRlbS5zcGF3bigpO1xyXG4gICAgICAgICAgICAgICAgaSsrO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uSXRlbUNvbGxlY3QoX2l0ZW06IEl0ZW1zLkl0ZW0pIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudHJlYXN1cmVzLmZpbmQoaXRlbSA9PiBpdGVtID09IF9pdGVtKSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudHJlYXN1cmVzLnNwbGljZSh0aGlzLnRyZWFzdXJlcy5pbmRleE9mKF9pdGVtKSwgMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBNZXJjaGFudFJvb20gZXh0ZW5kcyBSb29tIHtcclxuICAgICAgICBwcml2YXRlIG1lcmNoYW50Um9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtZXJjaGFudFJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiZ3JlZW5cIikpKTtcclxuICAgICAgICBwcml2YXRlIG1lcmNoYW50OiBFbnRpdHkuTWVyY2hhbnQgPSBuZXcgRW50aXR5Lk1lcmNoYW50KEVudGl0eS5JRC5NRVJDSEFOVCk7XHJcbiAgICAgICAgcHJpdmF0ZSBpdGVtczogSXRlbXMuSXRlbVtdID0gW107XHJcbiAgICAgICAgcHJpdmF0ZSBpdGVtc1NwYXduUG9pbnRzOiDGki5WZWN0b3IyW10gPSBbXTtcclxuICAgICAgICBwcml2YXRlIGl0ZW1Db3VudDogbnVtYmVyID0gNTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb21TaXplOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2Nvb3JkaW5hdGVzLCBfcm9vbVNpemUsIFJPT01UWVBFLk1FUkNIQU5UKTtcclxuICAgICAgICAgICAgdGhpcy5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRNYXRlcmlhbCkubWF0ZXJpYWwgPSB0aGlzLm1lcmNoYW50Um9vbU1hdDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubWVyY2hhbnQubXR4TG9jYWwudHJhbnNsYXRlWigwLjAxKTtcclxuICAgICAgICAgICAgdGhpcy5tZXJjaGFudC5tdHhMb2NhbC50cmFuc2xhdGVZKDUgLyB0aGlzLnJvb21TaXplKTtcclxuICAgICAgICAgICAgdGhpcy5tZXJjaGFudC5tdHhMb2NhbC5zY2FsZShHYW1lLsaSLlZlY3RvcjMuT05FKDEgLyB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5tZXJjaGFudCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZVNob3AoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBjcmVhdGVTaG9wKCkge1xyXG4gICAgICAgICAgICBsZXQgaXRlbXM6IEl0ZW1zLkl0ZW1bXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuaXRlbUNvdW50OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goSXRlbXMuSXRlbUdlbmVyYXRvci5nZXRSYW5kb21JdGVtKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMgPSBpdGVtcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkFkZFRvR3JhcGgoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlU3Bhd25Qb2ludHMoKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBpID0gMDtcclxuICAgICAgICAgICAgdGhpcy5pdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0uZ2V0UG9zaXRpb24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXRlbXNTcGF3blBvaW50cy5maW5kKHBvcyA9PiBwb3MuZXF1YWxzKGl0ZW0uZ2V0UG9zaXRpb24pKSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5zZXRQb3NpdGlvbih0aGlzLml0ZW1zU3Bhd25Qb2ludHNbaV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5zZXRQb3NpdGlvbih0aGlzLml0ZW1zU3Bhd25Qb2ludHNbaV0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaXRlbS5zcGF3bigpO1xyXG4gICAgICAgICAgICAgICAgaSsrO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBjcmVhdGVTcGF3blBvaW50cygpIHtcclxuICAgICAgICAgICAgdGhpcy5pdGVtc1NwYXduUG9pbnRzID0gW107XHJcblxyXG4gICAgICAgICAgICBsZXQgbWlkZGxlID0gdGhpcy5tdHhXb3JsZC5jbG9uZS50cmFuc2xhdGlvbjtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNTcGF3blBvaW50cy5wdXNoKG5ldyDGki5WZWN0b3IyKG1pZGRsZS54LCBtaWRkbGUueSArIDMpKTtcclxuICAgICAgICAgICAgdGhpcy5pdGVtc1NwYXduUG9pbnRzLnB1c2gobmV3IMaSLlZlY3RvcjIobWlkZGxlLnggKyAzLCBtaWRkbGUueSArIDMpKTtcclxuICAgICAgICAgICAgdGhpcy5pdGVtc1NwYXduUG9pbnRzLnB1c2gobmV3IMaSLlZlY3RvcjIobWlkZGxlLnggLSAzLCBtaWRkbGUueSArIDMpKTtcclxuICAgICAgICAgICAgdGhpcy5pdGVtc1NwYXduUG9pbnRzLnB1c2gobmV3IMaSLlZlY3RvcjIobWlkZGxlLnggKyAyLCBtaWRkbGUueSArIDEpKTtcclxuICAgICAgICAgICAgdGhpcy5pdGVtc1NwYXduUG9pbnRzLnB1c2gobmV3IMaSLlZlY3RvcjIobWlkZGxlLnggLSAyLCBtaWRkbGUueSArIDEpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkl0ZW1Db2xsZWN0KF9pdGVtOiBJdGVtcy5JdGVtLCBfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLml0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtID09IF9pdGVtKSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNob3BpbmcoX2l0ZW0sIF9hdmF0YXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgc2hvcGluZyhfaXRlbTogSXRlbXMuSXRlbSwgX2F2YXRhcjogUGxheWVyLlBsYXllcik6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBsZXQgc2FtZVJhcml0eTogSXRlbXMuSXRlbVtdID0gX2F2YXRhci5pdGVtcy5maWx0ZXIoaXRlbSA9PiBpdGVtLnJhcml0eSA9PSBfaXRlbS5yYXJpdHkpO1xyXG4gICAgICAgICAgICBsZXQgbG93ZXJSYXJpdHk6IEl0ZW1zLkl0ZW1bXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgaWYgKF9pdGVtLnJhcml0eSAhPSBJdGVtcy5SQVJJVFkuQ09NTU9OKSB7XHJcbiAgICAgICAgICAgICAgICBsb3dlclJhcml0eSA9IF9hdmF0YXIuaXRlbXMuZmlsdGVyKGl0ZW0gPT4gaXRlbS5yYXJpdHkgPT0gKF9pdGVtLnJhcml0eSAtIDEpKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHNhbWVSYXJpdHkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGluZGV4OiBudW1iZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAoc2FtZVJhcml0eS5sZW5ndGggLSAxKSk7XHJcbiAgICAgICAgICAgICAgICBfYXZhdGFyLml0ZW1zID0gX2F2YXRhci5pdGVtcy5maWx0ZXIoaXRlbSA9PiBpdGVtICE9IHNhbWVSYXJpdHlbaW5kZXhdKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXRlbXMuc3BsaWNlKHRoaXMuaXRlbXMuaW5kZXhPZihfaXRlbSksIDEpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKGxvd2VyUmFyaXR5Lmxlbmd0aCA+PSAzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZGV4MTogbnVtYmVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKGxvd2VyUmFyaXR5Lmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLml0ZW1zID0gX2F2YXRhci5pdGVtcy5maWx0ZXIoaXRlbSA9PiBpdGVtICE9IGxvd2VyUmFyaXR5W2luZGV4MV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5LnNwbGljZShsb3dlclJhcml0eS5pbmRleE9mKGxvd2VyUmFyaXR5W2luZGV4MV0pLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eS5zbGljZShpbmRleDEsIDEpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW5kZXgyOiBudW1iZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAobG93ZXJSYXJpdHkubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuaXRlbXMgPSBfYXZhdGFyLml0ZW1zLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbG93ZXJSYXJpdHlbaW5kZXgyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkuc3BsaWNlKGxvd2VyUmFyaXR5LmluZGV4T2YobG93ZXJSYXJpdHlbaW5kZXgyXSksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5LnNsaWNlKGluZGV4MiwgMSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbmRleDM6IG51bWJlciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChsb3dlclJhcml0eS5sZW5ndGggLSAxKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5pdGVtcyA9IF9hdmF0YXIuaXRlbXMuZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPSBsb3dlclJhcml0eVtpbmRleDNdKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eS5zcGxpY2UobG93ZXJSYXJpdHkuaW5kZXhPZihsb3dlclJhcml0eVtpbmRleDNdKSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkuc2xpY2UoaW5kZXgzLCAxKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pdGVtcy5zcGxpY2UodGhpcy5pdGVtcy5pbmRleE9mKF9pdGVtKSwgMSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIENoYWxsZW5nZVJvb20gZXh0ZW5kcyBSb29tIHtcclxuICAgICAgICBjaGFsbGVuZ2VSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcImNoYWxsZW5nZVJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiYmx1ZVwiKSkpO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb21TaXplOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2Nvb3JkaW5hdGVzLCBfcm9vbVNpemUsIFJPT01UWVBFLkNIQUxMRU5HRSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBXYWxsIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuV0FMTDtcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlO1xyXG4gICAgICAgIHB1YmxpYyBkb29yOiBEb29yO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfcG9zOiBHYW1lLsaSLlZlY3RvcjIsIF9zY2FsaW5nOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tOiBSb29tKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiV2FsbFwiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyDGki5NZXNoUXVhZCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobmV3IMaSLk1hdGVyaWFsKFwicmVkXCIsIMaSLlNoYWRlckxpdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwicmVkXCIpKSkpKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBuZXdQb3MgPSBfcG9zLnRvVmVjdG9yMygwLjAxKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ld1BvcztcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5zY2FsaW5nID0gX3NjYWxpbmcudG9WZWN0b3IzKDEpO1xyXG5cclxuXHJcbiAgICAgICAgICAgIGlmIChfcG9zLnggIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKF9wb3MueCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZERvb3IoX3BvcywgX3NjYWxpbmcpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfcG9zLnggPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGREb29yKF9wb3MsIF9zY2FsaW5nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChfcG9zLnkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGREb29yKF9wb3MsIF9zY2FsaW5nKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoX3Bvcy55IDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkRG9vcihfcG9zLCBfc2NhbGluZyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFkZERvb3IoX3BvczogR2FtZS7Gki5WZWN0b3IyLCBfc2NhbGluZzogR2FtZS7Gki5WZWN0b3IyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZG9vciA9IG5ldyBEb29yKCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5kb29yKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhfcG9zLngpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb29yLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKDEsIF9zY2FsaW5nLnggLyBfc2NhbGluZy55ICogMywgMSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3Bvcy54ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9vci5kaXJlY3Rpb24gPSAoPEludGVyZmFjZXMuSVJvb21FeGl0cz57IG5vcnRoOiBmYWxzZSwgZWFzdDogdHJ1ZSwgc291dGg6IGZhbHNlLCB3ZXN0OiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvb3IubXR4TG9jYWwudHJhbnNsYXRlWCgtMC41KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb29yLmRpcmVjdGlvbiA9ICg8SW50ZXJmYWNlcy5JUm9vbUV4aXRzPnsgbm9ydGg6IGZhbHNlLCBlYXN0OiBmYWxzZSwgc291dGg6IGZhbHNlLCB3ZXN0OiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9vci5tdHhMb2NhbC50cmFuc2xhdGVYKDAuNSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvb3IubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMoX3NjYWxpbmcueSAvIF9zY2FsaW5nLnggKiAzLCAxLCAxKTtcclxuICAgICAgICAgICAgICAgIGlmIChfcG9zLnkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb29yLmRpcmVjdGlvbiA9ICg8SW50ZXJmYWNlcy5JUm9vbUV4aXRzPnsgbm9ydGg6IHRydWUsIGVhc3Q6IGZhbHNlLCBzb3V0aDogZmFsc2UsIHdlc3Q6IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9vci5tdHhMb2NhbC50cmFuc2xhdGVZKC0wLjUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvb3IuZGlyZWN0aW9uID0gKDxJbnRlcmZhY2VzLklSb29tRXhpdHM+eyBub3J0aDogZmFsc2UsIGVhc3Q6IGZhbHNlLCBzb3V0aDogdHJ1ZSwgd2VzdDogZmFsc2UgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb29yLm10eExvY2FsLnRyYW5zbGF0ZVkoMC41KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0Q29sbGlkZXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5tdHhXb3JsZC50cmFuc2xhdGlvbi54LCB0aGlzLm10eFdvcmxkLnRyYW5zbGF0aW9uLnksIHRoaXMubXR4V29ybGQuc2NhbGluZy54LCB0aGlzLm10eFdvcmxkLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRG9vciBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLkRPT1I7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBHYW1lLsaSLlJlY3RhbmdsZTtcclxuXHJcbiAgICAgICAgcHVibGljIGRpcmVjdGlvbjogSW50ZXJmYWNlcy5JUm9vbUV4aXRzO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJEb29yXCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IMaSLk1lc2hRdWFkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChuZXcgxpIuTWF0ZXJpYWwoXCJncmVlblwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJncmVlblwiKSkpKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0ZVooMC4xKTtcclxuICAgICAgICAgICAgdGhpcy5jbG9zZURvb3IoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldENvbGxpZGVyKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLm10eFdvcmxkLnRyYW5zbGF0aW9uLngsIHRoaXMubXR4V29ybGQudHJhbnNsYXRpb24ueSwgdGhpcy5tdHhXb3JsZC5zY2FsaW5nLngsIHRoaXMubXR4V29ybGQuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjaGFuZ2VSb29tKCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLnN3aXRjaFJvb20odGhpcy5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zd2l0Y2hSb29tUmVxdWVzdCh0aGlzLmRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvcGVuRG9vcigpIHtcclxuICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZSh0cnVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjbG9zZURvb3IoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGUoZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBPYnNpdGNhbCBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLk9CU1RJQ0FMO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7XHJcbiAgICAgICAgcHVibGljIHBhcmVudFJvb206IFJvb207XHJcblxyXG4gICAgICAgIGRpcmVjdGlvbjogSW50ZXJmYWNlcy5JUm9vbUV4aXRzO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfcGFyZW50OiBSb29tLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMiwgX3NjYWxlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJPYnN0aWNhbFwiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucGFyZW50Um9vbSA9IF9wYXJlbnQ7XHJcbiAgICAgICAgICAgIHRoaXMucGFyZW50Um9vbS5vYnN0aWNhbHMucHVzaCh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyDGki5NZXNoUXVhZCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobmV3IMaSLk1hdGVyaWFsKFwiYmxhY2tcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiYmxhY2tcIikpKSkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IF9wb3NpdGlvbi50b1ZlY3RvcjMoMC4wMSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwuc2NhbGUoR2FtZS7Gki5WZWN0b3IzLk9ORShfc2NhbGUpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCBudWxsKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgR2VuZXJhdGlvbiB7XHJcblxyXG4gICAgbGV0IG51bWJlck9mUm9vbXM6IG51bWJlciA9IDU7XHJcbiAgICBleHBvcnQgbGV0IGdlbmVyYXRpb25GYWlsZWQgPSBmYWxzZTtcclxuICAgIGV4cG9ydCBsZXQgcm9vbXM6IFJvb21bXSA9IFtdO1xyXG5cclxuICAgIGV4cG9ydCBjb25zdCBjb21wYXJlTm9ydGg6IEdhbWUuxpIuVmVjdG9yMiA9IG5ldyDGki5WZWN0b3IyKDAsIDEpO1xyXG4gICAgZXhwb3J0IGNvbnN0IGNvbXBhcmVFYXN0OiBHYW1lLsaSLlZlY3RvcjIgPSBuZXcgxpIuVmVjdG9yMigxLCAwKTtcclxuICAgIGV4cG9ydCBjb25zdCBjb21wYXJlU291dGg6IEdhbWUuxpIuVmVjdG9yMiA9IG5ldyDGki5WZWN0b3IyKDAsIC0xKTtcclxuICAgIGV4cG9ydCBjb25zdCBjb21wYXJlV2VzdDogR2FtZS7Gki5WZWN0b3IyID0gbmV3IMaSLlZlY3RvcjIoLTEsIDApO1xyXG5cclxuICAgIC8vc3Bhd24gY2hhbmNlc1xyXG4gICAgbGV0IGNoYWxsZW5nZVJvb21TcGF3bkNoYW5jZTogbnVtYmVyID0gMzA7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHByb2NlZHVhbFJvb21HZW5lcmF0aW9uKCkge1xyXG4gICAgICAgIHJvb21zID0gW107XHJcbiAgICAgICAgZ2VuZXJhdGlvbkZhaWxlZCA9IGZhbHNlO1xyXG4gICAgICAgIHJvb21zLnB1c2goZ2VuZXJhdGVTdGFydFJvb20oKSk7XHJcbiAgICAgICAgcm9vbXMucHVzaC5hcHBseShyb29tcywgZ2VuZXJhdGVOb3JtYWxSb29tcygpKTtcclxuICAgICAgICBhZGRCb3NzUm9vbSgpO1xyXG4gICAgICAgIHJvb21zLnB1c2guYXBwbHkocm9vbXMsIGdlbmVyYXRlVHJlYXN1cmVSb29tKCkpO1xyXG4gICAgICAgIHJvb21zLnB1c2goZ2VuZXJhdGVNZXJjaGFudFJvb20oKSk7XHJcbiAgICAgICAgc2V0RXhpdHMoKTtcclxuICAgICAgICByb29tcy5mb3JFYWNoKHJvb20gPT4geyBjb25zb2xlLmxvZyhyb29tLm10eExvY2FsLnRyYW5zbGF0aW9uLmNsb25lLnRvU3RyaW5nKCkpIH0pO1xyXG4gICAgICAgIG1vdmVSb29tVG9Xb3JsZENvb3Jkcyhyb29tc1swXSk7XHJcblxyXG5cclxuICAgICAgICBzZXRFeGl0cygpO1xyXG4gICAgICAgIGFkZFJvb21Ub0dyYXBoKHJvb21zWzBdKTtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogZ2VuZXJhdGVzIGEgZ3JpZCB0aGF0cyBjb25uZWN0ZWQgdG9nZ2V0aGVyIGZyb20gYSBnaXZlbiBzdGFydGluZyBwb2ludFxyXG4gICAgICogQHBhcmFtIF9zdGFydENvb3JkIHRoZSBzdGFydGluZyBwb2ludFxyXG4gICAgICogQHJldHVybnMgdmVjdG9yMiBhcnJheSBvZiBhIGNvbm5lY3RpbmcgZ3JpZCB3aXRob3V0IG92ZXJsYXBzXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlU25ha2VHcmlkKF9zdGFydENvb3JkOiBHYW1lLsaSLlZlY3RvcjIpOiBHYW1lLsaSLlZlY3RvcjJbXSB7XHJcbiAgICAgICAgbGV0IGdyaWQ6IEdhbWUuxpIuVmVjdG9yMltdID0gW107XHJcbiAgICAgICAgZ3JpZC5wdXNoKF9zdGFydENvb3JkKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bWJlck9mUm9vbXM7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgbmV4dENvb3JkID0gZ2V0TmV4dFBvc3NpYmxlQ29vcmRGcm9tU3BlY2lmaWNDb29yZChncmlkLCBncmlkW2dyaWQubGVuZ3RoIC0gMV0pO1xyXG4gICAgICAgICAgICBpZiAobmV4dENvb3JkID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBncmlkLnB1c2gobmV4dENvb3JkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZ3JpZDtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogZnVuY3Rpb24gdG8gZ2V0IGEgcmFuZG9tIG5laWdpaGJvdXIgdGFraW5nIGNhcmUgb2YgYW4gYWN1dGFsIGdyaWRcclxuICAgICAqIEBwYXJhbSBfZ3JpZCBleGlzdGluZyBncmlkIHRoZSBmdW5jdGlvbiBzaG91bGQgY2FyZSBhYm91dFxyXG4gICAgICogQHBhcmFtIF9zcGVjaWZpY0Nvb3JkIHRoZSBjb29yZCB5b3Ugd2FudCB0aGUgbmV4dCBwb3NzaWJsZSBjb29yZCBcclxuICAgICAqIEByZXR1cm5zIGEgdmVjdG9yMiBjb29yZCB0aGF0cyBub3QgaW5zaWRlIG9mIF9ncmlkIGFuZCBhcm91bmQgIF9zcGVjaWZpY0Nvb3JkXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGdldE5leHRQb3NzaWJsZUNvb3JkRnJvbVNwZWNpZmljQ29vcmQoX2dyaWQ6IEdhbWUuxpIuVmVjdG9yMltdLCBfc3BlY2lmaWNDb29yZDogR2FtZS7Gki5WZWN0b3IyKTogR2FtZS7Gki5WZWN0b3IyIHtcclxuICAgICAgICBsZXQgY29vcmROZWlnaGJvdXJzOiBHYW1lLsaSLlZlY3RvcjJbXSA9IGdldE5laWdoYm91ckNvb3JkaW5hdGUoX3NwZWNpZmljQ29vcmQpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29vcmROZWlnaGJvdXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGxldCByYW5kb21JbmRleCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChjb29yZE5laWdoYm91cnMubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICBsZXQgbmV4dENvb3JkID0gY29vcmROZWlnaGJvdXJzW3JhbmRvbUluZGV4XTtcclxuICAgICAgICAgICAgaWYgKF9ncmlkLmZpbmQoY29vcmQgPT4gY29vcmQuZXF1YWxzKG5leHRDb29yZCkpKSB7XHJcbiAgICAgICAgICAgICAgICBjb29yZE5laWdoYm91cnMgPSBjb29yZE5laWdoYm91cnMuZmlsdGVyKGNvb3JkID0+ICFjb29yZC5lcXVhbHMobmV4dENvb3JkKSk7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXh0Q29vcmQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIGZ1bmN0aW9uIHRvIGdldCBhbGwgbmVpZ2hib3VycyBpZ25vcmluZyB0aGUgY3VycmVudCBncmlkXHJcbiAgICAgKiBAcGFyYW0gX2Nvb3JkIGNvb3JkaWFudGUgeW91IHdhbnQgdGhlIG5laWdoYm91ciBmcm9tXHJcbiAgICAgKiBAcmV0dXJucyA0IG5laWdoYm91cnMgaW4gZGlyZWN0aW9uIE4gRSBTIGFuZCBXXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGdldE5laWdoYm91ckNvb3JkaW5hdGUoX2Nvb3JkOiBHYW1lLsaSLlZlY3RvcjIpOiBHYW1lLsaSLlZlY3RvcjJbXSB7XHJcbiAgICAgICAgbGV0IG5laWdoYm91cnM6IEdhbWUuxpIuVmVjdG9yMltdID0gW107XHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKG5ldyDGki5WZWN0b3IyKF9jb29yZC54ICsgMSwgX2Nvb3JkLnkpKTtcclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2gobmV3IMaSLlZlY3RvcjIoX2Nvb3JkLnggLSAxLCBfY29vcmQueSkpO1xyXG5cclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2gobmV3IMaSLlZlY3RvcjIoX2Nvb3JkLngsIF9jb29yZC55ICsgMSkpO1xyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChuZXcgxpIuVmVjdG9yMihfY29vcmQueCwgX2Nvb3JkLnkgLSAxKSk7XHJcbiAgICAgICAgcmV0dXJuIG5laWdoYm91cnM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVTdGFydFJvb20oKTogU3RhcnRSb29tIHtcclxuICAgICAgICBsZXQgc3RhcnRSb29tOiBTdGFydFJvb20gPSBuZXcgU3RhcnRSb29tKG5ldyDGki5WZWN0b3IyKDAsIDApLCAyMCk7XHJcbiAgICAgICAgcmV0dXJuIHN0YXJ0Um9vbTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZU5vcm1hbFJvb21zKCk6IE5vcm1hbFJvb21bXSB7XHJcbiAgICAgICAgbGV0IGdyaWRDb29yZHM6IEdhbWUuxpIuVmVjdG9yMltdO1xyXG4gICAgICAgIGxldCBub3JtYWxSb29tczogTm9ybWFsUm9vbVtdID0gW107XHJcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgZ3JpZENvb3JkcyA9IGdlbmVyYXRlU25ha2VHcmlkKHJvb21zWzBdLmNvb3JkaW5hdGVzKTtcclxuICAgICAgICAgICAgaWYgKChncmlkQ29vcmRzLmxlbmd0aCAtIDEpID09IG51bWJlck9mUm9vbXMpIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdyaWRDb29yZHMuZm9yRWFjaChjb29yZCA9PiB7XHJcbiAgICAgICAgICAgIG5vcm1hbFJvb21zLnB1c2gobmV3IE5vcm1hbFJvb20oY29vcmQsIDIwKSk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICByZXR1cm4gbm9ybWFsUm9vbXM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkQm9zc1Jvb20oKSB7XHJcbiAgICAgICAgbGV0IGJpZ2dlc3REaXN0YW5jZTogR2FtZS7Gki5WZWN0b3IyID0gxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgcm9vbXMuZm9yRWFjaChyb29tID0+IHtcclxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHJvb20uY29vcmRpbmF0ZXMueCkgPiBiaWdnZXN0RGlzdGFuY2UueCAmJiBNYXRoLmFicyhyb29tLmNvb3JkaW5hdGVzLnkpID4gYmlnZ2VzdERpc3RhbmNlLnkpIHtcclxuICAgICAgICAgICAgICAgIGJpZ2dlc3REaXN0YW5jZSA9IHJvb20uY29vcmRpbmF0ZXM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICAgIGxldCByb29tQ29vcmQ6IEdhbWUuxpIuVmVjdG9yMltdID0gZ2V0Q29vcmRzRnJvbVJvb21zKCk7XHJcbiAgICAgICAgbGV0IG5leHRDb29yZCA9IGdldE5leHRQb3NzaWJsZUNvb3JkRnJvbVNwZWNpZmljQ29vcmQocm9vbUNvb3JkLCByb29tQ29vcmRbcm9vbUNvb3JkLmxlbmd0aCAtIDFdKTtcclxuICAgICAgICBpZiAobmV4dENvb3JkID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAvLyBuZXh0Q29vcmQgPSBnZXROZXh0UG9zc2libGVDb29yZEZyb21TcGVjaWZpY0Nvb3JkKHJvb21Db29yZCwgcm9vbUNvb3JkW3Jvb21Db29yZC5sZW5ndGggLSAyXSk7XHJcbiAgICAgICAgICAgIGdlbmVyYXRpb25GYWlsZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcm9vbXMucHVzaChuZXcgQm9zc1Jvb20obmV4dENvb3JkLCAzMCkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZVRyZWFzdXJlUm9vbSgpOiBUcmVhc3VyZVJvb21bXSB7XHJcbiAgICAgICAgbGV0IHJvb21Db29yZHM6IEdhbWUuxpIuVmVjdG9yMltdID0gZ2V0Q29vcmRzRnJvbVJvb21zKCk7XHJcbiAgICAgICAgbGV0IG5ld1RyZWFzdXJlUm9vbXM6IFRyZWFzdXJlUm9vbVtdID0gW11cclxuICAgICAgICByb29tcy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICBpZiAocm9vbS5yb29tVHlwZSA9PSBST09NVFlQRS5OT1JNQUwpIHtcclxuICAgICAgICAgICAgICAgIGxldCBuZXh0Q29vcmQgPSBnZXROZXh0UG9zc2libGVDb29yZEZyb21TcGVjaWZpY0Nvb3JkKHJvb21Db29yZHMsIHJvb20uY29vcmRpbmF0ZXMpXHJcbiAgICAgICAgICAgICAgICBpZiAobmV4dENvb3JkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0clJvb20gPSBuZXcgVHJlYXN1cmVSb29tKG5leHRDb29yZCwgMTApO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1NwYXduaW5nKHRyUm9vbS5nZXRTcGF3bkNoYW5jZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VHJlYXN1cmVSb29tcy5wdXNoKHRyUm9vbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICByZXR1cm4gbmV3VHJlYXN1cmVSb29tcztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZU1lcmNoYW50Um9vbSgpOiBNZXJjaGFudFJvb20ge1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcm9vbXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV4dENvb3JkID0gZ2V0TmV4dFBvc3NpYmxlQ29vcmRGcm9tU3BlY2lmaWNDb29yZChnZXRDb29yZHNGcm9tUm9vbXMoKSwgcm9vbXNbaV0uY29vcmRpbmF0ZXMpXHJcbiAgICAgICAgICAgICAgICBpZiAobmV4dENvb3JkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgTWVyY2hhbnRSb29tKG5leHRDb29yZCwgMjApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdlbmVyYXRpb25GYWlsZWQgPSB0cnVlO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBmdW5jdGlvbiB0byBnZXQgY29vcmRpYW50ZXMgZnJvbSBhbGwgZXhpc3Rpbmcgcm9vbXNcclxuICAgICAqIEByZXR1cm5zIFZlY3RvcjIgYXJyYXkgd2l0aCBjb29yZGluYXRlcyBvZiBhbGwgY3VycmVudCBleGlzdGluZyByb29tcyBpbiBSb29tR2VuZXJhdGlvbi5yb29tc1xyXG4gICAgICovXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0Q29vcmRzRnJvbVJvb21zKCk6IEdhbWUuxpIuVmVjdG9yMltdIHtcclxuICAgICAgICBsZXQgY29vcmRzOiBHYW1lLsaSLlZlY3RvcjJbXSA9IFtdO1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIGNvb3Jkcy5wdXNoKHJvb20uY29vcmRpbmF0ZXMpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgcmV0dXJuIGNvb3Jkc1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNldEV4aXRzKCkge1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBuZWlnaGJvdXJzID0gcm9vbXMuZmlsdGVyKGVsZW1lbnQgPT4gZWxlbWVudCAhPSByb29tKTtcclxuICAgICAgICAgICAgbmVpZ2hib3Vycy5mb3JFYWNoKG5laWdoYm91ciA9PiB7XHJcbiAgICAgICAgICAgICAgICByb29tLnNldFJvb21FeGl0KG5laWdoYm91cik7XHJcbiAgICAgICAgICAgICAgICByb29tLnNldFNwYXduUG9pbnRzKCk7XHJcbiAgICAgICAgICAgICAgICByb29tLm9wZW5Eb29ycygpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaXNTcGF3bmluZyhfc3Bhd25DaGFuY2U6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCB4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTAwKTtcclxuICAgICAgICBpZiAoeCA8IF9zcGF3bkNoYW5jZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG1vdmVSb29tVG9Xb3JsZENvb3JkcyhfZmlyc3RSb29tOiBSb29tKSB7XHJcbiAgICAgICAgbGV0IG5laWdoYm91ck46IFJvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IEdhbWUuxpIuVmVjdG9yMihfZmlyc3RSb29tLmNvb3JkaW5hdGVzLmNsb25lLngsIChfZmlyc3RSb29tLmNvb3JkaW5hdGVzLmNsb25lLnkgKyAxKSkpKTtcclxuICAgICAgICBsZXQgbmVpZ2hib3VyRTogUm9vbSA9IHJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzLmVxdWFscyhuZXcgR2FtZS7Gki5WZWN0b3IyKChfZmlyc3RSb29tLmNvb3JkaW5hdGVzLmNsb25lLnggKyAxKSwgX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS55KSkpO1xyXG4gICAgICAgIGxldCBuZWlnaGJvdXJTOiBSb29tID0gcm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKG5ldyBHYW1lLsaSLlZlY3RvcjIoX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS54LCAoX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS55IC0gMSkpKSk7XHJcbiAgICAgICAgbGV0IG5laWdoYm91clc6IFJvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IEdhbWUuxpIuVmVjdG9yMigoX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS54IC0gMSksIF9maXJzdFJvb20uY29vcmRpbmF0ZXMuY2xvbmUueSkpKTtcclxuICAgICAgICBpZiAobmVpZ2hib3VyTiAhPSB1bmRlZmluZWQgJiYgIW5laWdoYm91ck4ucG9zaXRpb25VcGRhdGVkKSB7XHJcbiAgICAgICAgICAgIG5laWdoYm91ck4ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhuZWlnaGJvdXJOLmNvb3JkaW5hdGVzLnggKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBuZWlnaGJvdXJOLnJvb21TaXplIC8gMiksIG5laWdoYm91ck4uY29vcmRpbmF0ZXMueSAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIG5laWdoYm91ck4ucm9vbVNpemUgLyAyKSwgLTAuMDEpO1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJOLnBvc2l0aW9uVXBkYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIG1vdmVSb29tVG9Xb3JsZENvb3JkcyhuZWlnaGJvdXJOKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5laWdoYm91ckUgIT0gdW5kZWZpbmVkICYmICFuZWlnaGJvdXJFLnBvc2l0aW9uVXBkYXRlZCkge1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJFLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMobmVpZ2hib3VyRS5jb29yZGluYXRlcy54ICogKF9maXJzdFJvb20ucm9vbVNpemUgLyAyICsgbmVpZ2hib3VyRS5yb29tU2l6ZSAvIDIpLCBuZWlnaGJvdXJFLmNvb3JkaW5hdGVzLnkgKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBuZWlnaGJvdXJFLnJvb21TaXplIC8gMiksIC0wLjAxKTtcclxuICAgICAgICAgICAgbmVpZ2hib3VyRS5wb3NpdGlvblVwZGF0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBtb3ZlUm9vbVRvV29ybGRDb29yZHMobmVpZ2hib3VyRSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChuZWlnaGJvdXJTICE9IHVuZGVmaW5lZCAmJiAhbmVpZ2hib3VyUy5wb3NpdGlvblVwZGF0ZWQpIHtcclxuICAgICAgICAgICAgbmVpZ2hib3VyUy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKG5laWdoYm91clMuY29vcmRpbmF0ZXMueCAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIG5laWdoYm91clMucm9vbVNpemUgLyAyKSwgbmVpZ2hib3VyUy5jb29yZGluYXRlcy55ICogKF9maXJzdFJvb20ucm9vbVNpemUgLyAyICsgbmVpZ2hib3VyUy5yb29tU2l6ZSAvIDIpLCAtMC4wMSk7XHJcbiAgICAgICAgICAgIG5laWdoYm91clMucG9zaXRpb25VcGRhdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgbW92ZVJvb21Ub1dvcmxkQ29vcmRzKG5laWdoYm91clMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobmVpZ2hib3VyVyAhPSB1bmRlZmluZWQgJiYgIW5laWdoYm91clcucG9zaXRpb25VcGRhdGVkKSB7XHJcbiAgICAgICAgICAgIG5laWdoYm91clcubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhuZWlnaGJvdXJXLmNvb3JkaW5hdGVzLnggKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBuZWlnaGJvdXJXLnJvb21TaXplIC8gMiksIG5laWdoYm91clcuY29vcmRpbmF0ZXMueSAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIG5laWdoYm91clcucm9vbVNpemUgLyAyKSwgLTAuMDEpO1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJXLnBvc2l0aW9uVXBkYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIG1vdmVSb29tVG9Xb3JsZENvb3JkcyhuZWlnaGJvdXJXKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHN3aXRjaFJvb20oX2RpcmVjdGlvbjogSW50ZXJmYWNlcy5JUm9vbUV4aXRzKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY3VycmVudFJvb20uZW5lbXlDb3VudE1hbmFnZXIuZmluaXNoZWQpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1Jvb206IFJvb207XHJcbiAgICAgICAgICAgIGxldCBuZXdQb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyXHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLm5vcnRoKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gcm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKG5ldyDGki5WZWN0b3IyKEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueCwgR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy55ICsgMSkpKTtcclxuICAgICAgICAgICAgICAgIG5ld1Bvc2l0aW9uID0gbmV3Um9vbS5nZXRTcGF3blBvaW50UztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5lYXN0KSB7XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gcm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKG5ldyDGki5WZWN0b3IyKEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueCArIDEsIEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueSkpKTtcclxuICAgICAgICAgICAgICAgIG5ld1Bvc2l0aW9uID0gbmV3Um9vbS5nZXRTcGF3blBvaW50VztcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24uc291dGgpIHtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IMaSLlZlY3RvcjIoR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy54LCBHYW1lLmN1cnJlbnRSb29tLmNvb3JkaW5hdGVzLnkgLSAxKSkpO1xyXG4gICAgICAgICAgICAgICAgbmV3UG9zaXRpb24gPSBuZXdSb29tLmdldFNwYXduUG9pbnROO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLndlc3QpIHtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IMaSLlZlY3RvcjIoR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy54IC0gMSwgR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy55KSkpO1xyXG4gICAgICAgICAgICAgICAgbmV3UG9zaXRpb24gPSBuZXdSb29tLmdldFNwYXduUG9pbnRFO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChuZXdSb29tID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIm5vIHJvb20gZm91bmRcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIC8vIEdhbWUuY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uID0gbmV3UG9zaXRpb24udG9WZWN0b3IzKEdhbWUuY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uLnopO1xyXG5cclxuICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXdQb3NpdGlvbi50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXdQb3NpdGlvbi50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgYWRkUm9vbVRvR3JhcGgobmV3Um9vbSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiByZW1vdmVzIGVyeXRoaW5nIHVucmVsaWFibGUgZnJvbSB0aGUgZ3JwYWggYW5kIGFkZHMgdGhlIG5ldyByb29tIHRvIHRoZSBncmFwaCAsIHNlbmRpbmcgaXQgdG8gdGhlIGNsaWVudCAmIHNwYXducyBlbmVtaWVzIGlmIGV4aXN0aW5nIGluIHJvb21cclxuICAgICAqIEBwYXJhbSBfcm9vbSB0aGUgcm9vbSBpdCBzaG91bGQgc3Bhd25cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGFkZFJvb21Ub0dyYXBoKF9yb29tOiBSb29tKSB7XHJcbiAgICAgICAgTmV0d29ya2luZy5zZW5kUm9vbSg8SW50ZXJmYWNlcy5JUm9vbT57IGNvb3JkaW5hdGVzOiBfcm9vbS5jb29yZGluYXRlcywgcm9vbVNpemU6IF9yb29tLnJvb21TaXplLCBleGl0czogX3Jvb20uZXhpdHMsIHJvb21UeXBlOiBfcm9vbS5yb29tVHlwZSwgdHJhbnNsYXRpb246IF9yb29tLm10eExvY2FsLnRyYW5zbGF0aW9uIH0pO1xyXG5cclxuICAgICAgICBsZXQgb2xkT2JqZWN0czogR2FtZS7Gki5Ob2RlW10gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW0gPT4gKCg8YW55PmVsZW0pLnRhZyAhPSBUYWcuVEFHLlBMQVlFUikpO1xyXG4gICAgICAgIG9sZE9iamVjdHMgPSBvbGRPYmplY3RzLmZpbHRlcihlbGVtID0+ICgoPGFueT5lbGVtKS50YWcgIT0gVGFnLlRBRy5VSSkpO1xyXG5cclxuICAgICAgICBvbGRPYmplY3RzLmZvckVhY2goKGVsZW0pID0+IHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZChlbGVtKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfcm9vbSk7XHJcbiAgICAgICAgR2FtZS52aWV3cG9ydC5jYWxjdWxhdGVUcmFuc2Zvcm1zKCk7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICBfcm9vbS5vbkFkZFRvR3JhcGgoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIF9yb29tLndhbGxzLmZvckVhY2god2FsbCA9PiB7XHJcbiAgICAgICAgICAgIHdhbGwuc2V0Q29sbGlkZXIoKTtcclxuICAgICAgICAgICAgaWYgKHdhbGwuZG9vciAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHdhbGwuZG9vci5zZXRDb2xsaWRlcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgR2FtZS5jdXJyZW50Um9vbSA9IF9yb29tO1xyXG4gICAgICAgIEVuZW15U3Bhd25lci5zcGF3bk11bHRpcGxlRW5lbWllc0F0Um9vbShHYW1lLmN1cnJlbnRSb29tLmVuZW15Q291bnRNYW5hZ2VyLmdldE1heEVuZW15Q291bnQsIEdhbWUuY3VycmVudFJvb20ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEVudGl0eSB7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNoYWRvdzogR2FtZS7Gki5UZXh0dXJlSW1hZ2UgPSBuZXcgR2FtZS7Gki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBjbGFzcyBTaGFkb3cgZXh0ZW5kcyBHYW1lLsaSLk5vZGUge1xyXG4gICAgICAgIHByaXZhdGUgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQ7XHJcbiAgICAgICAgcHJpdmF0ZSBzaGFkb3dNYXR0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcInN0YXJ0Um9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSwgdHh0U2hhZG93KSk7XHJcbiAgICAgICAgc2hhZG93UGFyZW50OiBHYW1lLsaSLk5vZGU7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX3BhcmVudDogR2FtZS7Gki5Ob2RlKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwic2hhZG93XCIpO1xyXG4gICAgICAgICAgICB0aGlzLnNoYWRvd1BhcmVudCA9IF9wYXJlbnQ7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyBHYW1lLsaSLkNvbXBvbmVudE1lc2godGhpcy5tZXNoKSk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwodGhpcy5zaGFkb3dNYXR0KTs7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChjbXBNYXRlcmlhbCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyBHYW1lLsaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhXb3JsZC50cmFuc2xhdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjMoX3BhcmVudC5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCBfcGFyZW50Lm10eExvY2FsLnRyYW5zbGF0aW9uLnksIC0wLjAxKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMygyLCAyLCAyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwZGF0ZVNoYWRvd1BvcygpIHtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIDAsIHRoaXMuc2hhZG93UGFyZW50Lm10eExvY2FsLnRyYW5zbGF0aW9uLnoqLTEpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBXZWFwb25zIHtcclxuICAgIGV4cG9ydCBjbGFzcyBXZWFwb24ge1xyXG4gICAgICAgIG93bmVyTmV0SWQ6IG51bWJlcjsgZ2V0IG93bmVyKCk6IEVudGl0eS5FbnRpdHkgeyByZXR1cm4gR2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSB0aGlzLm93bmVyTmV0SWQpIH07XHJcbiAgICAgICAgcHJvdGVjdGVkIGNvb2xkb3duOiBBYmlsaXR5LkNvb2xkb3duOyBnZXQgZ2V0Q29vbERvd24oKSB7IHJldHVybiB0aGlzLmNvb2xkb3duIH07XHJcbiAgICAgICAgcHJvdGVjdGVkIGF0dGFja0NvdW50OiBudW1iZXI7IGdldCBnZXRBdHRhY2tDb3VudCgpIHsgcmV0dXJuIHRoaXMuYXR0YWNrQ291bnQgfTtcclxuICAgICAgICBwdWJsaWMgY3VycmVudEF0dGFja0NvdW50OiBudW1iZXI7XHJcbiAgICAgICAgYWltVHlwZTogQUlNO1xyXG4gICAgICAgIGJ1bGxldFR5cGU6IEJ1bGxldHMuQlVMTEVUVFlQRSA9IEJ1bGxldHMuQlVMTEVUVFlQRS5TVEFOREFSRDtcclxuICAgICAgICBwcm9qZWN0aWxlQW1vdW50OiBudW1iZXIgPSAxO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vbGRvd25UaW1lOiBudW1iZXIsIF9hdHRhY2tDb3VudDogbnVtYmVyLCBfYnVsbGV0VHlwZTogQnVsbGV0cy5CVUxMRVRUWVBFLCBfcHJvamVjdGlsZUFtb3VudDogbnVtYmVyLCBfb3duZXJOZXRJZDogbnVtYmVyLCBfYWltVHlwZTogQUlNKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0YWNrQ291bnQgPSBfYXR0YWNrQ291bnQ7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dGFja0NvdW50ID0gX2F0dGFja0NvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmJ1bGxldFR5cGUgPSBfYnVsbGV0VHlwZTtcclxuICAgICAgICAgICAgdGhpcy5wcm9qZWN0aWxlQW1vdW50ID0gX3Byb2plY3RpbGVBbW91bnQ7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9vd25lck5ldElkO1xyXG4gICAgICAgICAgICB0aGlzLmFpbVR5cGUgPSBfYWltVHlwZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29vbGRvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93bihfY29vbGRvd25UaW1lKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzaG9vdChfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY2l0b246IMaSLlZlY3RvcjMsIF9idWxsZXROZXRJZD86IG51bWJlciwgX3N5bmM/OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIGlmIChfc3luYykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEF0dGFja0NvdW50IDw9IDAgJiYgIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRhY2tDb3VudCA9IHRoaXMuYXR0YWNrQ291bnQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QXR0YWNrQ291bnQgPiAwICYmICF0aGlzLmNvb2xkb3duLmhhc0Nvb2xEb3duKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYWNjdXJhY3kgPCAxMDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmFjY3VyYWN5KF9kaXJlY2l0b24pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgX2RpcmVjaXRvbi5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdID0gdGhpcy5sb2FkTWFnYXppbmUoX3Bvc2l0aW9uLCBfZGlyZWNpdG9uLCB0aGlzLmJ1bGxldFR5cGUsIF9idWxsZXROZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCdWxsZXREaXJlY3Rpb24obWFnYXppbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmlyZShtYWdhemluZSwgX3N5bmMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dGFja0NvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEF0dGFja0NvdW50IDw9IDAgJiYgIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb29sZG93bi5zZXRNYXhDb29sRG93biA9IHRoaXMuY29vbGRvd24uZ2V0TWF4Q29vbERvd24gKiB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29vbGRvd24uc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY2l0b24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWFnYXppbmU6IEJ1bGxldHMuQnVsbGV0W10gPSB0aGlzLmxvYWRNYWdhemluZShfcG9zaXRpb24sIF9kaXJlY2l0b24sIHRoaXMuYnVsbGV0VHlwZSwgX2J1bGxldE5ldElkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0QnVsbGV0RGlyZWN0aW9uKG1hZ2F6aW5lKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZmlyZShtYWdhemluZSwgX3N5bmMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpbmFjY3VyYWN5KF9kaXJlY2l0b246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgX2RpcmVjaXRvbi54ID0gX2RpcmVjaXRvbi54ICsgTWF0aC5yYW5kb20oKSAqIDEwIC8gdGhpcy5vd25lci5hdHRyaWJ1dGVzLmFjY3VyYWN5IC0gTWF0aC5yYW5kb20oKSAqIDEwIC8gdGhpcy5vd25lci5hdHRyaWJ1dGVzLmFjY3VyYWN5O1xyXG4gICAgICAgICAgICBfZGlyZWNpdG9uLnkgPSBfZGlyZWNpdG9uLnkgKyBNYXRoLnJhbmRvbSgpICogMTAgLyB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYWNjdXJhY3kgLSBNYXRoLnJhbmRvbSgpICogMTAgLyB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYWNjdXJhY3k7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmaXJlKF9tYWdhemluZTogQnVsbGV0cy5CdWxsZXRbXSwgX3N5bmM/OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIF9tYWdhemluZS5mb3JFYWNoKGJ1bGxldCA9PiB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGJ1bGxldCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYnVsbGV0IGluc3RhbmNlb2YgQnVsbGV0cy5Ib21pbmdCdWxsZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkJ1bGxldCh0aGlzLmFpbVR5cGUsIGJ1bGxldC5kaXJlY3Rpb24sIGJ1bGxldC5uZXRJZCwgdGhpcy5vd25lck5ldElkLCAoPEJ1bGxldHMuSG9taW5nQnVsbGV0PmJ1bGxldCkudGFyZ2V0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkJ1bGxldCh0aGlzLmFpbVR5cGUsIGJ1bGxldC5kaXJlY3Rpb24sIGJ1bGxldC5uZXRJZCwgdGhpcy5vd25lck5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRCdWxsZXREaXJlY3Rpb24oX21hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX21hZ2F6aW5lLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfbWFnYXppbmU7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgX21hZ2F6aW5lWzBdLm10eExvY2FsLnJvdGF0ZVooNDUgLyAyKTtcclxuICAgICAgICAgICAgICAgICAgICBfbWFnYXppbmVbMV0ubXR4TG9jYWwucm90YXRlWig0NSAvIDIgKiAtMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9tYWdhemluZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgICAgICBfbWFnYXppbmVbMF0ubXR4TG9jYWwucm90YXRlWig0NSAvIDIpO1xyXG4gICAgICAgICAgICAgICAgICAgIF9tYWdhemluZVsxXS5tdHhMb2NhbC5yb3RhdGVaKDQ1IC8gMiAqIC0xKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9tYWdhemluZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZE1hZ2F6aW5lKF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX2J1bGxldFR5cGU6IEJ1bGxldHMuQlVMTEVUVFlQRSwgX25ldElkPzogbnVtYmVyKTogQnVsbGV0cy5CdWxsZXRbXSB7XHJcbiAgICAgICAgICAgIGxldCBtYWdhemluZTogQnVsbGV0cy5CdWxsZXRbXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMucHJvamVjdGlsZUFtb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMuYWltVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQUlNLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFnYXppbmUucHVzaChuZXcgQnVsbGV0cy5CdWxsZXQodGhpcy5idWxsZXRUeXBlLCBfcG9zaXRpb24sIF9kaXJlY3Rpb24sIHRoaXMub3duZXJOZXRJZCwgX25ldElkKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBBSU0uSE9NSU5HOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWdhemluZS5wdXNoKG5ldyBCdWxsZXRzLkhvbWluZ0J1bGxldCh0aGlzLmJ1bGxldFR5cGUsIF9wb3NpdGlvbiwgX2RpcmVjdGlvbiwgdGhpcy5vd25lck5ldElkLCBudWxsLCBfbmV0SWQpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG1hZ2F6aW5lO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBBSU0ge1xyXG4gICAgICAgIE5PUk1BTCxcclxuICAgICAgICBIT01JTkdcclxuICAgIH1cclxuXHJcbn0iXX0=