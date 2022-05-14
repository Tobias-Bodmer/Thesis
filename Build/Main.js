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
                        let item2 = new Items.InternalItem(Items.ITEMID.THORSHAMMER);
                        item2.setPosition(new Game.ƒ.Vector2(-5, 0));
                        // let item3 = new Items.InternalItem(Items.ITEMID.SCALEUP, new ƒ.Vector2(-2, 0), null);
                        let zipzap = new Items.InternalItem(Items.ITEMID.ZIPZAP);
                        zipzap.setPosition(new Game.ƒ.Vector2(5, 0));
                        zipzap.spawn();
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
        constructor(_position, _damage) {
            super("damageUI");
            this.tag = Tag.TAG.UI;
            this.up = 0.15;
            this.lifetime = 0.5 * 60;
            this.randomX = Math.random() * 0.05 - Math.random() * 0.05;
            this.update = (_event) => {
                this.move();
                this.lifespan();
            };
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
        async lifespan() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    Game.graph.removeChild(this);
                }
            }
        }
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
        constructor(_id, _netId) {
            super(getNameById(_id));
            this.performKnockback = false;
            this.netObjectNode = this;
            this.items = [];
            this.buffs = [];
            this.canMoveX = true;
            this.canMoveY = true;
            this.moveDirection = Game.ƒ.Vector3.ZERO();
            this.currentKnockback = ƒ.Vector3.ZERO();
            this.eventUpdate = (_event) => {
                this.update();
            };
            this.netId = Networking.IdManager(_netId);
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
            if (AnimationGeneration.getAnimationById(this.id) != null) {
                let ani = AnimationGeneration.getAnimationById(this.id);
                this.animationContainer = ani;
                this.idleScale = ani.scale.find(animation => animation[0] == "idle")[1];
            }
            this.shadow = new Entity_1.Shadow(this);
            // this.addChild(this.shadow);
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
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
                    Networking.updateEntityAttributes({ value: this.attributes.healthPoints, type: Entity_1.ATTRIBUTETYPE.HEALTHPOINTS }, this.netId);
                }
                if (this.attributes.healthPoints <= 0) {
                    Networking.removeEnemy(this.netId);
                    this.die();
                }
            }
        }
        die() {
            Networking.popID(this.netId);
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
        constructor(_id, _position, _netId) {
            super(_id, _netId);
            this.moveDirection = Game.ƒ.Vector3.ZERO();
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
            super.die();
            Game.currentRoom.enemyCountManager.onEnemyDeath();
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
        constructor() {
            super(...arguments);
            this.flocking = new Enemy_1.FlockingBehaviour(this, 2, 2, 0.1, 1, 1, 1, 0, 1);
            this.aggressiveDistance = 3 * 3;
            this.stamina = new Ability.Cooldown(180);
            this.recover = new Ability.Cooldown(60);
        }
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
        constructor() {
            super(...arguments);
            this.coolDown = new Ability.Cooldown(5);
            this.avatars = [];
            this.randomPlayer = Math.round(Math.random());
            this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
        }
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
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.dash = new Ability.Dash(this.netId, 12, 1, 5 * 60, 3);
            this.dashCount = 1;
            this.avatars = [];
            this.randomPlayer = Math.round(Math.random());
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
        constructor() {
            super(...arguments);
            this.patrolPoints = [new ƒ.Vector2(0, 4), new ƒ.Vector2(5, 0)];
            this.waitTime = 1000;
            this.currenPointIndex = 0;
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
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.viewRadius = 3;
            this.gotRecognized = false;
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
        constructor(_id, _position, _target, _netId) {
            super(_id, _position, _netId);
            this.randomPlayer = Math.round(Math.random());
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
        ITEMID[ITEMID["GETSTRONKO"] = 13] = "GETSTRONKO";
        ITEMID[ITEMID["GETWEAKO"] = 14] = "GETWEAKO";
        ITEMID[ITEMID["ZIPZAP"] = 15] = "ZIPZAP";
    })(ITEMID = Items.ITEMID || (Items.ITEMID = {}));
    Items.txtIceBucket = new ƒ.TextureImage();
    Items.txtDmgUp = new ƒ.TextureImage();
    Items.txtHealthUp = new ƒ.TextureImage();
    Items.txtToxicRelationship = new ƒ.TextureImage();
    Items.txtSpeedUp = new ƒ.TextureImage();
    class Item extends Game.ƒ.Node {
        constructor(_id, _netId) {
            super(ITEMID[_id]);
            this.tag = Tag.TAG.ITEM;
            this.transform = new ƒ.ComponentTransform();
            this.buff = [];
            this.id = _id;
            this.netId = Networking.IdManager(_netId);
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad()));
            let material = new ƒ.Material("white", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            this.addComponent(new ƒ.ComponentMaterial(material));
            this.addComponent(new ƒ.ComponentTransform());
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2, this.netId);
            this.buff.push(this.getBuffById());
            this.setTextureById();
        }
        get getPosition() { return this.position; }
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
                case ITEMID.GETSTRONKO:
                    return new Buff.AttributesBuff(Buff.BUFFID.SCALEUP, temp.duration, temp.tickRate, temp.value);
                case ITEMID.GETWEAKO:
                    return new Buff.AttributesBuff(Buff.BUFFID.SCALEDOWN, temp.duration, temp.tickRate, temp.value);
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
        addItemToEntity(_avatar) {
            _avatar.items.push(this);
        }
        removeItemToEntity(_avatar) {
        }
    }
    Items.Item = Item;
    class InternalItem extends Item {
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
        addItemToEntity(_avatar) {
            super.addItemToEntity(_avatar);
            this.setAttributesById(_avatar, true);
            this.despawn();
        }
        removeItemToEntity(_avatar) {
            this.setAttributesById(_avatar, false);
            _avatar.items.splice(_avatar.items.indexOf(_avatar.items.find(item => item.id == this.id)), 1);
        }
        clone() {
            return new InternalItem(this.id);
        }
        setAttributesById(_avatar, _add) {
            switch (this.id) {
                case ITEMID.ICEBUCKETCHALLENGE:
                    if (_add) {
                        this.changedValue = _avatar.attributes.coolDownReduction - Calculation.subPercentageAmountToValue(_avatar.attributes.coolDownReduction, this.value);
                        _avatar.attributes.coolDownReduction = Calculation.subPercentageAmountToValue(_avatar.attributes.coolDownReduction, this.value);
                    }
                    else {
                        _avatar.attributes.coolDownReduction += this.changedValue;
                    }
                    Networking.updateEntityAttributes({ value: _avatar.attributes.coolDownReduction, type: Entity.ATTRIBUTETYPE.COOLDOWNREDUCTION }, _avatar.netId);
                    break;
                case ITEMID.DMGUP:
                    if (_add) {
                        _avatar.attributes.attackPoints += this.value;
                    }
                    else {
                        _avatar.attributes.attackPoints -= this.value;
                    }
                    Networking.updateEntityAttributes({ value: _avatar.attributes.attackPoints, type: Entity.ATTRIBUTETYPE.ATTACKPOINTS }, _avatar.netId);
                    break;
                case ITEMID.SPEEDUP:
                    if (_add) {
                        this.changedValue = Calculation.addPercentageAmountToValue(_avatar.attributes.speed, this.value) - _avatar.attributes.speed;
                        _avatar.attributes.speed = Calculation.addPercentageAmountToValue(_avatar.attributes.speed, this.value);
                    }
                    else {
                        _avatar.attributes.speed -= this.changedValue;
                    }
                    Networking.updateEntityAttributes({ value: _avatar.attributes.speed, type: Entity.ATTRIBUTETYPE.SPEED }, _avatar.netId);
                    break;
                case ITEMID.PROJECTILESUP:
                    if (_add) {
                        _avatar.weapon.projectileAmount += this.value;
                    }
                    else {
                        _avatar.weapon.projectileAmount -= this.value;
                    }
                    Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    break;
                case ITEMID.HEALTHUP:
                    if (_add) {
                        this.changedValue = Calculation.addPercentageAmountToValue(_avatar.attributes.maxHealthPoints, this.value) - _avatar.attributes.maxHealthPoints;
                        let currentMaxPoints = _avatar.attributes.maxHealthPoints;
                        _avatar.attributes.maxHealthPoints = Calculation.addPercentageAmountToValue(_avatar.attributes.maxHealthPoints, this.value);
                        let amount = _avatar.attributes.maxHealthPoints - currentMaxPoints;
                        _avatar.attributes.healthPoints += amount;
                    }
                    else {
                        _avatar.attributes.maxHealthPoints -= this.changedValue;
                        let currentMaxPoints = _avatar.attributes.maxHealthPoints;
                        let amount = _avatar.attributes.maxHealthPoints - currentMaxPoints;
                        _avatar.attributes.healthPoints -= amount;
                    }
                    Networking.updateEntityAttributes({ value: _avatar.attributes.healthPoints, type: Entity.ATTRIBUTETYPE.HEALTHPOINTS }, _avatar.netId);
                    Networking.updateEntityAttributes({ value: _avatar.attributes.maxHealthPoints, type: Entity.ATTRIBUTETYPE.MAXHEALTHPOINTS }, _avatar.netId);
                    break;
                case ITEMID.SCALEUP:
                    if (_add) {
                        this.changedValue = Calculation.addPercentageAmountToValue(_avatar.attributes.scale, this.value) - _avatar.attributes.scale;
                        _avatar.attributes.scale = Calculation.addPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    }
                    else {
                        _avatar.attributes.scale -= this.changedValue;
                    }
                    _avatar.updateScale();
                    Networking.updateEntityAttributes({ value: _avatar.attributes.scale, type: Entity.ATTRIBUTETYPE.SCALE }, _avatar.netId);
                    break;
                case ITEMID.SCALEDOWN:
                    if (_add) {
                        this.changedValue = Calculation.subPercentageAmountToValue(_avatar.attributes.scale, this.value) - _avatar.attributes.scale;
                        _avatar.attributes.scale = Calculation.subPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    }
                    else {
                        _avatar.attributes.scale -= this.changedValue;
                    }
                    _avatar.updateScale();
                    Networking.updateEntityAttributes({ value: _avatar.attributes.scale, type: Entity.ATTRIBUTETYPE.SCALE }, _avatar.netId);
                    break;
                case ITEMID.ARMORUP:
                    if (_add) {
                        _avatar.attributes.armor += this.value;
                    }
                    else {
                        _avatar.attributes.armor -= this.value;
                    }
                    Networking.updateEntityAttributes({ value: _avatar.attributes.armor, type: Entity.ATTRIBUTETYPE.ARMOR }, _avatar.netId);
                    break;
                case ITEMID.HOMECOMING:
                    if (_avatar instanceof Player.Ranged) {
                        if (_add) {
                            _avatar.weapon.aimType = Weapons.AIM.HOMING;
                        }
                        else {
                            _avatar.weapon.aimType = Weapons.AIM.NORMAL;
                        }
                        Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    }
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
                        _avatar.weapon.canShoot = true;
                        Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    }
                    break;
                case ITEMID.ZIPZAP:
                    if (_add) {
                        let newItem = new Bullets.ZipZapObject(_avatar.netId, null);
                        newItem.spawn();
                    }
                    else {
                        let zipzap = Game.graph.getChildren().find(item => item.type == Bullets.BULLETTYPE.ZIPZAP);
                        zipzap.despawn();
                    }
                    break;
            }
        }
    }
    Items.InternalItem = InternalItem;
    class BuffItem extends Item {
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
        addItemToEntity(_avatar) {
            super.addItemToEntity(_avatar);
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
    ItemGenerator.itemPool = [];
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
        constructor(_id) {
            this.animations = {};
            this.scale = [];
            this.frameRate = [];
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
        constructor(_ownerNetId) {
            this.timer = 0;
            this.currentTick = 0;
            this.gameTickRate = 62.5;
            this.bufferSize = 1024;
            this.minTimeBetweenTicks = 1 / this.gameTickRate;
            this.stateBuffer = new Array(this.bufferSize);
            this.ownerNetId = _ownerNetId;
        }
        get owner() { return Game.currentNetObj.find(elem => elem.netId == this.ownerNetId).netObjectNode; }
        ;
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
        constructor() {
            super(...arguments);
            this.inputQueue = new Queue();
        }
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
        constructor(_ownerNetId) {
            super(_ownerNetId);
            this.AsyncTolerance = 0.2;
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
        constructor(_ownerNetId) {
            super(_ownerNetId);
            this.AsyncTolerance = 0.1;
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
        constructor() {
            super(...arguments);
            this.inputQueue = new Queue();
        }
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
        constructor(_ownerNetId, _duration, _abilityCount, _cooldownTime) {
            this.doesAbility = false;
            this.eventUpdate = (_event) => {
                this.updateAbility();
            };
            this.ownerNetId = _ownerNetId;
            this.abilityCount = _abilityCount;
            this.currentabilityCount = this.abilityCount;
            this.duration = new Cooldown(_duration);
            this.cooldown = new Cooldown(_cooldownTime);
        }
        get owner() { return Game.entities.find(elem => elem.netId == this.ownerNetId); }
        ;
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
        constructor() {
            super(...arguments);
            this.spawnRadius = 1;
        }
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
        constructor() {
            super(...arguments);
            this.bullets = [];
        }
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
        constructor(_number) {
            this.eventUpdate = (_event) => {
                this.updateCoolDown();
            };
            this.coolDown = _number;
            this.currentCooldown = _number;
            this.hasCoolDown = false;
        }
        get getMaxCoolDown() { return this.coolDown; }
        ;
        set setMaxCoolDown(_param) { this.hasCoolDown = false; this.coolDown = _param; this.currentCooldown = this.coolDown; }
        get getCurrentCooldown() { return this.currentCooldown; }
        ;
        startCoolDown() {
            this.hasCoolDown = true;
            Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
        endCoolDown() {
            this.hasCoolDown = false;
            Game.ƒ.Loop.removeEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
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
var Ability;
(function (Ability) {
    let AOETYPE;
    (function (AOETYPE) {
        AOETYPE[AOETYPE["HEALTHUP"] = 0] = "HEALTHUP";
    })(AOETYPE || (AOETYPE = {}));
    class AreaOfEffect extends Game.ƒ.Node {
        constructor(_id, _netId) {
            super(AOETYPE[_id].toLowerCase());
        }
        get getPosition() { return this.position; }
        ;
        set setPosition(_pos) { this.position = _pos; }
        ;
        get getCollider() { return this.collider; }
        ;
        get getBuffList() { return this.buffList; }
        ;
    }
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
        constructor(_healthPoints, _attackPoints, _speed, _scale, _knockbackForce, _armor, _cooldownReduction, _accuracy) {
            this.hitable = true;
            this.coolDownReduction = 1;
            this.accuracy = 80;
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
        }
    }
    Entity.Attributes = Attributes;
})(Entity || (Entity = {}));
var Enemy;
(function (Enemy) {
    class Summonor extends Enemy.EnemyShoot {
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.damageTaken = 0;
            this.attackPhaseCd = new Ability.Cooldown(580);
            this.defencePhaseCd = new Ability.Cooldown(720);
            this.beginShooting = false;
            this.shootingCount = 3;
            this.currentShootingCount = 0;
            this.summon = new Ability.SpawnSummoners(this.netId, 0, 1, 45);
            this.dash = new Ability.Dash(this.netId, 45, 1, 13 * 60, 5);
            this.shoot360 = new Ability.circleShoot(this.netId, 0, 3, 5 * 60);
            this.dashWeapon = new Weapons.Weapon(12, 1, Bullets.BULLETTYPE.SUMMONER, 1, this.netId, Weapons.AIM.NORMAL);
            this.flock = new Enemy.FlockingBehaviour(this, 4, 4, 0, 0, 1, 1, 1, 2);
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
        BUFFID[BUFFID["SCALEUP"] = 5] = "SCALEUP";
        BUFFID[BUFFID["SCALEDOWN"] = 6] = "SCALEDOWN";
    })(BUFFID = Buff_1.BUFFID || (Buff_1.BUFFID = {}));
    class Buff {
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
    /**
     * creates a new Buff that does Damage to an Entity;
     */
    class DamageBuff extends Buff {
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
    /**
     * creates a new Buff that changes an attribute of an Entity for the duration of the buff
     */
    class AttributesBuff extends Buff {
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
            let payload;
            switch (_id) {
                case BUFFID.SLOW:
                    if (_add) {
                        this.removedValue = _avatar.attributes.speed - Calculation.subPercentageAmountToValue(_avatar.attributes.speed, this.value);
                        _avatar.attributes.speed -= Calculation.subPercentageAmountToValue(_avatar.attributes.speed, this.value);
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
                        _avatar.attributes.hitable = true;
                    }
                    payload = { value: _avatar.attributes.hitable, type: Entity.ATTRIBUTETYPE.HITABLE };
                    break;
                case BUFFID.SCALEUP:
                    if (_add) {
                        this.removedValue = Calculation.addPercentageAmountToValue(_avatar.attributes.scale, this.value) - _avatar.attributes.scale;
                        _avatar.attributes.scale = Calculation.addPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    }
                    else {
                        _avatar.attributes.scale -= this.removedValue;
                    }
                    _avatar.updateScale();
                    payload = { value: _avatar.attributes.scale, type: Entity.ATTRIBUTETYPE.SCALE };
                    break;
                case BUFFID.SCALEDOWN:
                    if (_add) {
                        this.removedValue = _avatar.attributes.scale - Calculation.subPercentageAmountToValue(_avatar.attributes.scale, this.value);
                        _avatar.attributes.scale = Calculation.subPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    }
                    else {
                        _avatar.attributes.scale += this.removedValue;
                    }
                    _avatar.updateScale();
                    payload = { value: _avatar.attributes.scale, type: Entity.ATTRIBUTETYPE.SCALE };
                    break;
            }
            Networking.updateEntityAttributes(payload, _avatar.netId);
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
        BULLETTYPE[BULLETTYPE["THORSHAMMER"] = 5] = "THORSHAMMER";
        BULLETTYPE[BULLETTYPE["ZIPZAP"] = 6] = "ZIPZAP";
    })(BULLETTYPE = Bullets.BULLETTYPE || (Bullets.BULLETTYPE = {}));
    Bullets.bulletTxt = new ƒ.TextureImage();
    Bullets.waterBallTxt = new ƒ.TextureImage();
    class Bullet extends Game.ƒ.Node {
        constructor(_bulletType, _position, _direction, _ownerNetId, _netId) {
            super(BULLETTYPE[_bulletType]);
            this.tag = Tag.TAG.BULLET;
            this.speed = 20;
            this.lifetime = 1 * 60;
            this.knockbackForce = 4;
            this.time = 0;
            this.killcount = 1;
            this.eventUpdate = (_event) => {
                this.update();
            };
            this.type = _bulletType;
            this.netId = Networking.IdManager(_netId);
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
            this.ownerNetId = _ownerNetId;
            this.serverPrediction = new Networking.ServerBulletPrediction(this.netId);
            this.clientPrediction = new Networking.ClientBulletPrediction(this.netId);
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        get owner() { return Game.entities.find(elem => elem.netId == this.ownerNetId); }
        ;
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
            this.offsetCollider();
            this.collisionDetection();
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
                this.owner.weapon.canShoot = false;
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
        setBuffToTarget(_target) {
            this.owner.items.forEach(item => {
                item.buff.forEach(buff => {
                    if (buff != undefined) {
                        buff.clone().addToEntity(_target);
                    }
                });
            });
        }
        offsetCollider() {
            let newPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider.position = newPosition;
        }
        collisionDetection() {
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
                                this.killcount--;
                                return;
                            }
                        }
                        element.getDamage(this.owner.attributes.attackPoints * this.hitPointsScale);
                        this.setBuffToTarget(element);
                        element.getKnockback(this.knockbackForce, this.mtxLocal.translation);
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
                            this.killcount--;
                        }
                    }
                });
            }
            if (this.killcount <= 0) {
                this.lifetime = 0;
            }
            colliders = [];
            colliders = Game.graph.getChildren().find(element => element.tag == Tag.TAG.ROOM).walls;
            colliders.forEach((_elem) => {
                let element = _elem;
                if (element.collider != undefined && this.collider.collidesRect(element.collider)) {
                    this.lifetime = 0;
                }
            });
        }
    }
    Bullets.Bullet = Bullet;
    class HomingBullet extends Bullet {
        constructor(_bullettype, _position, _direction, _ownerId, _target, _netId) {
            super(_bullettype, _position, _direction, _ownerId, _netId);
            this.rotateSpeed = 2;
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
    class ZipZapObject extends Bullet {
        constructor(_ownerNetId, _netId) {
            super(BULLETTYPE.ZIPZAP, new ƒ.Vector2(0, 0), new ƒ.Vector2(0, 0).toVector3(), _ownerNetId, _netId);
            this.eventUpdate = (_event) => {
                this.update();
            };
            this.avatars = undefined;
            this.counter = 0;
            this.tag = Tag.TAG.UI;
            this.tickHit = new Ability.Cooldown(12);
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
        }
        update() {
            if (Networking.client.idHost == Networking.client.id) {
                if (Game.avatar1 != undefined && Game.avatar2 != undefined) {
                    if (this.avatars == undefined) {
                        this.avatars = [Game.avatar1, Game.avatar2];
                        this.playerSize = this.avatars.length;
                        this.nextTarget = this.avatars[0 % this.playerSize].mtxLocal.translation.toVector2();
                        this.mtxLocal.translation = this.nextTarget.toVector3();
                    }
                    this.avatars = [Game.avatar1, Game.avatar2];
                    this.move();
                    this.collider.position = this.mtxLocal.translation.toVector2();
                    if (!this.tickHit.hasCoolDown) {
                        this.collisionDetection();
                        this.tickHit.startCoolDown();
                    }
                    Networking.updateBullet(this.mtxLocal.translation, this.mtxLocal.rotation, this.netId);
                    this.killcount = 50;
                }
            }
        }
        spawn() {
            Game.graph.addChild(this);
            Networking.spawnZipZap(this.ownerNetId, this.netId);
        }
        despawn() {
            Game.graph.removeChild(this);
            Networking.removeBullet(this.netId);
        }
        move() {
            let direction = Game.ƒ.Vector2.DIFFERENCE(this.nextTarget, this.mtxLocal.translation.toVector2());
            let distance = direction.magnitudeSquared;
            if (direction.magnitudeSquared > 0) {
                direction.normalize();
            }
            direction.scale(Game.deltaTime * this.speed);
            this.mtxLocal.translate(direction.toVector3());
            if (distance < 1) {
                this.counter = (this.counter + 1) % this.playerSize;
            }
            this.nextTarget = this.avatars[this.counter].mtxLocal.translation.toVector2();
        }
    }
    Bullets.ZipZapObject = ZipZapObject;
})(Bullets || (Bullets = {}));
var Collider;
(function (Collider_1) {
    class Collider {
        constructor(_position, _radius, _netId) {
            this.position = _position;
            this.radius = _radius;
            this.ownerNetId = _netId;
        }
        get getRadius() { return this.radius; }
        ;
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
        constructor(_enemy, _sightRadius, _avoidRadius, _cohesionWeight, _allignWeight, _avoidWeight, _toTargetWeight, _notToTargetWeight, _obsticalAvoidWeight) {
            this.enemies = [];
            this.obsticalAvoidWeight = 1.5;
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
            if (_e.code.toUpperCase() == "KEYE") {
                Game.avatar1.openDoor();
            }
            if (_e.code.toUpperCase() != "SPACE") {
                let key = _e.code.toUpperCase().substring(3);
                controller.set(key, true);
            }
            if (_e.code.toUpperCase() == "SPACE") {
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
        constructor(_minimapInfo) {
            super("Minimap");
            this.tag = Tag.TAG.UI;
            this.roomMinimapsize = 0.8;
            this.miniRooms = [];
            this.offsetX = 11;
            this.offsetY = 6;
            this.eventUpdate = (_event) => {
                this.update();
            };
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
        constructor(_coordinates, _roomType) {
            super("MinimapRoom");
            this.opacity = 0.75;
            this.mesh = new ƒ.MeshQuad;
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
        FUNCTION[FUNCTION["SPAWNZIPZAP"] = 28] = "SPAWNZIPZAP";
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
                            // console.log(bullet + "" + message.content.netId);
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
                            if (Game.currentNetObj.find(element => element.netId == message.content.netId) != undefined) {
                                if (Game.currentNetObj.find(element => element.netId == message.content.netId).netObjectNode != null) {
                                    let newPosition = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                    let newRotation = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);
                                    Game.currentNetObj.find(element => element.netId == message.content.netId).netObjectNode.mtxLocal.translation = newPosition;
                                    Game.currentNetObj.find(element => element.netId == message.content.netId).netObjectNode.mtxLocal.rotation = newRotation;
                                }
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
                            if (enemy != undefined) {
                                enemy.die();
                            }
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
                        //spawn special items
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNZIPZAP.toString()) {
                            if (Networking.client.id != Networking.client.idHost) {
                                let item = new Bullets.ZipZapObject(message.content.ownerNetId, message.content.netId);
                                item.spawn();
                            }
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
                            tempWeapon.canShoot = refWeapon.canShoot;
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
                                case Generation.ROOMTYPE.CHALLENGE:
                                    newRoom = new Generation.ChallengeRoom(roomInfo.coordinates, roomInfo.roomSize);
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
    //#region specialItems
    function spawnZipZap(_ownerNetId, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNZIPZAP, ownerNetId: _ownerNetId, netId: _netId } });
        }
    }
    Networking.spawnZipZap = spawnZipZap;
    //#endregion
    //#region enemy
    function spawnEnemy(_enemyClass, _enemy, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNENEMY, enemyClass: _enemyClass, id: _enemy.id, attributes: _enemy.attributes, position: _enemy.mtxLocal.translation, netId: _netId, target: _enemy.target } });
        }
    }
    Networking.spawnEnemy = spawnEnemy;
    function updateEnemyPosition(_position, _netId) {
        if (Networking.client.id == Networking.client.idHost) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENEMYTRANSFORM, position: _position, netId: _netId } });
        }
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
    /**
     * generates individual IDs on Host without duplicates returns the given NetId
     * @param _netId if undefined generates a new NetId -> only undefined on Host
     * @returns a new netId or the netId provided by the host
     */
    function IdManager(_netId) {
        if (_netId != undefined) {
            Networking.currentIDs.push(_netId);
            return _netId;
        }
        else {
            return generateNewId();
        }
    }
    Networking.IdManager = IdManager;
    function generateNewId() {
        let newId;
        while (true) {
            newId = idGenerator();
            if (Networking.currentIDs.find(id => id == newId) == undefined) {
                break;
            }
        }
        Networking.currentIDs.push(newId);
        return newId;
    }
    function idGenerator() {
        let id = Math.floor(Math.random() * 1000);
        return id;
    }
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
        constructor(_id, _attributes, _netId) {
            super(_id, _netId);
            this.weapon = new Weapons.Weapon(25, 1, Bullets.BULLETTYPE.STANDARD, 1, this.netId, Weapons.AIM.NORMAL);
            this.abilityCount = 1;
            this.currentabilityCount = this.abilityCount;
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
        }
        openDoor() {
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
                    item.addItemToEntity(this);
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
        constructor() {
            super(...arguments);
            this.block = new Ability.Block(this.netId, 600, 1, 5 * 60);
            this.abilityCooldownTime = 40;
            this.currentabilityCooldownTime = this.abilityCooldownTime;
            this.weapon = new Weapons.Weapon(12, 1, Bullets.BULLETTYPE.MELEE, 1, this.netId, Weapons.AIM.NORMAL);
        }
        attack(_direction, _netId, _sync) {
            this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, _sync);
        }
        //Block
        doAbility() {
        }
    }
    Player_1.Melee = Melee;
    class Ranged extends Player {
        constructor() {
            super(...arguments);
            this.dash = new Ability.Dash(this.netId, 8, 1, 60, 5);
            this.performAbility = false;
        }
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
        constructor(_enemyCount) {
            this.maxEnemyCount = _enemyCount;
            this.currentEnemyCoount = _enemyCount;
            this.finished = false;
            if (_enemyCount <= 0) {
                this.finished = true;
            }
        }
        get getMaxEnemyCount() { return this.maxEnemyCount; }
        ;
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
        constructor(_coordiantes, _roomSize, _roomType) {
            super("room");
            this.walls = [];
            this.obsticals = [];
            this.positionUpdated = false;
            this.roomSize = 30;
            this.mesh = new ƒ.MeshQuad;
            this.cmpMesh = new ƒ.ComponentMesh(this.mesh);
            this.cmpMaterial = new ƒ.ComponentMaterial();
            this.eventUpdate = (_event) => {
                this.update();
            };
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
        get getSpawnPointN() { return this.avatarSpawnPointN; }
        ;
        get getSpawnPointE() { return this.avatarSpawnPointE; }
        ;
        get getSpawnPointS() { return this.avatarSpawnPointS; }
        ;
        get getSpawnPointW() { return this.avatarSpawnPointW; }
        ;
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
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.START);
            this.startRoomMat = new ƒ.Material("startRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtStartRoom));
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.startRoomMat;
        }
    }
    Generation.StartRoom = StartRoom;
    class NormalRoom extends Room {
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.NORMAL);
            this.normalRoomMat = new ƒ.Material("normalRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            this.enemyCountManager = new EnemyCountManager(5);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.normalRoomMat;
        }
    }
    Generation.NormalRoom = NormalRoom;
    class BossRoom extends Room {
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.BOSS);
            this.bossRoomMat = new ƒ.Material("bossRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black")));
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.bossRoomMat;
        }
    }
    Generation.BossRoom = BossRoom;
    class TreasureRoom extends Room {
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.TREASURE);
            this.treasureRoomMat = new ƒ.Material("treasureRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("yellow")));
            this.spawnChance = 25;
            this.treasureCount = 2;
            this.treasures = [];
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.treasureRoomMat;
            if (Networking.client.id == Networking.client.idHost) {
                this.createTreasures();
            }
        }
        get getSpawnChance() { return this.spawnChance; }
        ;
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
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.MERCHANT);
            this.merchantRoomMat = new ƒ.Material("merchantRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")));
            this.merchant = new Entity.Merchant(Entity.ID.MERCHANT);
            this.items = [];
            this.itemsSpawnPoints = [];
            this.itemCount = 5;
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
                sameRarity[index].removeItemToEntity(_avatar);
                this.items.splice(this.items.indexOf(_item), 1);
                Networking.updateInventory(false, sameRarity[index].id, sameRarity[index].netId, _avatar.netId);
            }
            else {
                if (lowerRarity.length >= 3) {
                    let index1 = Math.round(Math.random() * (lowerRarity.length - 1));
                    lowerRarity[index1].removeItemToEntity(_avatar);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index1]), 1);
                    lowerRarity.slice(index1, 1);
                    lowerRarity.splice(index1, 1);
                    Networking.updateInventory(false, lowerRarity[index1].id, lowerRarity[index1].netId, _avatar.netId);
                    let index2 = Math.round(Math.random() * (lowerRarity.length - 1));
                    lowerRarity[index2].removeItemToEntity(_avatar);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index2]), 1);
                    lowerRarity.slice(index2, 1);
                    lowerRarity.splice(index2, 1);
                    Networking.updateInventory(false, lowerRarity[index2].id, lowerRarity[index2].netId, _avatar.netId);
                    let index3 = Math.round(Math.random() * (lowerRarity.length - 1));
                    lowerRarity[index3].removeItemToEntity(_avatar);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index3]), 1);
                    lowerRarity.slice(index3, 1);
                    lowerRarity.splice(index3, 1);
                    Networking.updateInventory(false, lowerRarity[index3].id, lowerRarity[index3].netId, _avatar.netId);
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
    let CHALLENGE;
    (function (CHALLENGE) {
        CHALLENGE[CHALLENGE["THORSHAMMER"] = 0] = "THORSHAMMER";
    })(CHALLENGE || (CHALLENGE = {}));
    class ChallengeRoom extends Room {
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.CHALLENGE);
            this.challengeRoomMat = new ƒ.Material("challengeRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")));
            this.enemyCountManager = new EnemyCountManager(10);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.challengeRoomMat;
            this.challenge = this.randomChallenge();
        }
        randomChallenge() {
            let index = Math.round(Math.random() * (Object.keys(CHALLENGE).length / 2 - 1));
            return CHALLENGE[CHALLENGE[index]];
        }
        update() {
            if (this.enemyCountManager.finished) {
                if (Networking.client.id == Networking.client.idHost) {
                    switch (this.challenge) {
                        case CHALLENGE.THORSHAMMER:
                            this.stopThorsHammerChallenge();
                            break;
                        default:
                            break;
                    }
                }
            }
        }
        onAddToGraph() {
            switch (this.challenge) {
                case CHALLENGE.THORSHAMMER:
                    this.startThorsHammerChallenge();
                    break;
                default:
                    break;
            }
        }
        startThorsHammerChallenge() {
            //TODO: activate
            // if (this.enemyCountManager.finished) {
            //     return;
            // }
            Game.avatar1.weapon.canShoot = false;
            Game.avatar2.weapon.canShoot = false;
            let thorshammer = new Items.InternalItem(Items.ITEMID.THORSHAMMER);
            let choosenOne;
            if (Math.round(Math.random()) > 0) {
                choosenOne = Game.avatar1;
            }
            else {
                choosenOne = Game.avatar2;
            }
            thorshammer.addItemToEntity(choosenOne);
            choosenOne.items.push(thorshammer);
            Networking.updateInventory(true, thorshammer.id, thorshammer.netId, choosenOne.netId);
            Networking.updateAvatarWeapon(Game.avatar1.weapon, Game.avatar1.netId);
            Networking.updateAvatarWeapon(Game.avatar2.weapon, Game.avatar2.netId);
        }
        stopThorsHammerChallenge() {
            let avatar1Inv = Game.avatar1.items.find(item => item.id == Items.ITEMID.THORSHAMMER);
            let avatar2Inv = Game.avatar2.items.find(item => item.id == Items.ITEMID.THORSHAMMER);
            if (avatar1Inv != undefined || avatar2Inv != undefined) {
                if (avatar1Inv != undefined) {
                    Game.avatar1.items.splice(Game.avatar1.items.indexOf(avatar1Inv), 1);
                    Networking.updateInventory(false, avatar1Inv.id, avatar1Inv.netId, Game.avatar1.netId);
                    Game.avatar1.weapon.getCoolDown.setMaxCoolDown = +localStorage.getItem("cooldownTime");
                    Game.avatar1.weapon.aimType = Weapons.AIM[localStorage.getItem("aimType")];
                    Game.avatar1.weapon.bulletType = Bullets.BULLETTYPE[localStorage.getItem("bulletType")];
                    Game.avatar1.weapon.projectileAmount = +localStorage.getItem("projectileAmount");
                }
                if (avatar2Inv != undefined) {
                    Game.avatar2.items.splice(Game.avatar2.items.indexOf(avatar2Inv), 1);
                    Networking.updateInventory(false, avatar2Inv.id, avatar2Inv.netId, Game.avatar2.netId);
                    Game.avatar2.weapon.getCoolDown.setMaxCoolDown = +localStorage.getItem("cooldownTime");
                    Game.avatar2.weapon.aimType = Weapons.AIM[localStorage.getItem("aimType")];
                    Game.avatar2.weapon.bulletType = Bullets.BULLETTYPE[localStorage.getItem("bulletType")];
                    Game.avatar2.weapon.projectileAmount = +localStorage.getItem("projectileAmount");
                }
                Game.avatar1.weapon.canShoot = true;
                Game.avatar2.weapon.canShoot = true;
                Networking.updateAvatarWeapon(Game.avatar1.weapon, Game.avatar1.netId);
                Networking.updateAvatarWeapon(Game.avatar2.weapon, Game.avatar2.netId);
            }
            let roomInv = Game.items.find(item => item.id == Items.ITEMID.THORSHAMMER);
            if (roomInv != undefined) {
                roomInv.despawn();
            }
        }
    }
    Generation.ChallengeRoom = ChallengeRoom;
    class Wall extends ƒ.Node {
        constructor(_pos, _scaling, _room) {
            super("Wall");
            this.tag = Tag.TAG.WALL;
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("red", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("red")))));
            let newPos = _pos.toVector3(0.01);
            this.mtxLocal.translation = newPos;
            this.mtxLocal.scaling = _scaling.toVector3(1);
            if (_pos.x != 0) {
                if (_pos.x > 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(-1, 0, 0);
                }
                else if (_pos.x < 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(1, 0, 0);
                }
            }
            else {
                if (_pos.y > 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(0, -1, 0);
                }
                else if (_pos.y < 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(0, 1, 0);
                }
            }
        }
        get getNormal() { return this.normal; }
        ;
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
        constructor() {
            super("Door");
            this.tag = Tag.TAG.DOOR;
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
        constructor(_parent, _position, _scale) {
            super("Obstical");
            this.tag = Tag.TAG.OBSTICAL;
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
        Generation.rooms.push(generateChallengeRoom());
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
    function generateChallengeRoom() {
        for (let i = 0; i < Generation.rooms.length; i++) {
            if (i > 0) {
                let nextCoord = getNextPossibleCoordFromSpecificCoord(getCoordsFromRooms(), Generation.rooms[i].coordinates);
                if (nextCoord != undefined) {
                    return new Generation.ChallengeRoom(nextCoord, 20);
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
        constructor(_parent) {
            super("shadow");
            this.mesh = new ƒ.MeshQuad;
            this.shadowMatt = new ƒ.Material("startRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Entity.txtShadow));
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
        constructor(_cooldownTime, _attackCount, _bulletType, _projectileAmount, _ownerNetId, _aimType) {
            this.bulletType = Bullets.BULLETTYPE.STANDARD;
            this.projectileAmount = 1;
            this.canShoot = true;
            this.attackCount = _attackCount;
            this.currentAttackCount = _attackCount;
            this.bulletType = _bulletType;
            this.projectileAmount = _projectileAmount;
            this.ownerNetId = _ownerNetId;
            this.aimType = _aimType;
            this.cooldown = new Ability.Cooldown(_cooldownTime);
        }
        get owner() { return Game.entities.find(elem => elem.netId == this.ownerNetId); }
        ;
        get getCoolDown() { return this.cooldown; }
        ;
        get getAttackCount() { return this.attackCount; }
        ;
        shoot(_position, _direciton, _bulletNetId, _sync) {
            if (this.canShoot) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL0NsYXNzZXMvTWFpbi50cyIsIi4uL0NsYXNzZXMvVUkudHMiLCIuLi9DbGFzc2VzL1RhZy50cyIsIi4uL0NsYXNzZXMvRW50aXR5LnRzIiwiLi4vQ2xhc3Nlcy9FbmVteS50cyIsIi4uL0NsYXNzZXMvSW50ZXJmYWNlcy50cyIsIi4uL0NsYXNzZXMvSXRlbXMudHMiLCIuLi9DbGFzc2VzL0FuaW1hdGlvbkdlbmVyYXRpb24udHMiLCIuLi9DbGFzc2VzL1ByZWRpY3Rpb24udHMiLCIuLi9DbGFzc2VzL0FiaWxpdHkudHMiLCIuLi9DbGFzc2VzL0FyZWFPZkVmZmVjdC50cyIsIi4uL0NsYXNzZXMvQXR0cmlidXRlcy50cyIsIi4uL0NsYXNzZXMvQm9zcy50cyIsIi4uL0NsYXNzZXMvQnVmZi50cyIsIi4uL0NsYXNzZXMvQnVsbGV0LnRzIiwiLi4vQ2xhc3Nlcy9Db2xsaWRlci50cyIsIi4uL0NsYXNzZXMvRW5lbXlTcGF3bmVyLnRzIiwiLi4vQ2xhc3Nlcy9GbG9ja2luZy50cyIsIi4uL0NsYXNzZXMvRnJpZW5kbHlDcmVhdHVyZXMudHMiLCIuLi9DbGFzc2VzL0dhbWVDYWxjdWxhdGlvbi50cyIsIi4uL0NsYXNzZXMvSW5wdXRTeXN0ZW0udHMiLCIuLi9DbGFzc2VzL0xhbmRzY2FwZS50cyIsIi4uL0NsYXNzZXMvTWluaW1hcC50cyIsIi4uL0NsYXNzZXMvTmV0d29ya2luZy50cyIsIi4uL0NsYXNzZXMvUGxheWVyLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tR2VuZXJhdGlvbi50cyIsIi4uL0NsYXNzZXMvU2hhZG93LnRzIiwiLi4vQ2xhc3Nlcy9XZWFwb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtQkFBbUI7QUFDbkIsd0RBQXdEO0FBQ3hELHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFFdEIsSUFBVSxJQUFJLENBK2FiO0FBcGJELG1CQUFt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QUssQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFBLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQzNJLE1BQU07Z0JBQ1YsS0FBSyxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVE7b0JBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFBLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQzdJLE1BQU07Z0JBQ1YsS0FBSyxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVE7b0JBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFBLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQzdJLE1BQU07Z0JBQ1YsS0FBSyxVQUFVLENBQUMsUUFBUSxDQUFDLFNBQVM7b0JBQzlCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFBLGFBQWEsQ0FBQyxDQUFDLENBQUM7b0JBQzlJLE1BQU07Z0JBQ1YsS0FBSyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUk7b0JBQ3pCLElBQUksQ0FBQyxPQUFPLEdBQUcs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QUFHLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdk4sVUFBVSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7WUFDbEMscUJBQXFCLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDckM7UUFDRCxJQUFJLFVBQVUsSUFBSSxTQUFTLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFO1lBQ3hELFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdk4sVUFBVSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7WUFDbEMscUJBQXFCLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDckM7UUFDRCxJQUFJLFVBQVUsSUFBSSxTQUFTLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFO1lBQ3hELFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFV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LElBQUksQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7d0JBQ2xHLE1BQU07b0JBQ1YsS0FBSyxHQUFHLENBQUMsTUFBTTt3QkFDWCxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDL0csTUFBTTtpQkFDYjthQUNKO1lBQ0QsT0FBTyxRQUFRLENBQUM7UUFDcEIsQ0FBQztLQUNKO0lBdkdZLGNBQU0sU0F1R2xCLENBQUE7SUFFRCxJQUFZLEdBR1g7SUFIRCxXQUFZLEdBQUc7UUFDWCxpQ0FBTSxDQUFBO1FBQ04saUNBQU0sQ0FBQTtJQUNWLENBQUMsRUFIVyxHQUFHLEdBQUgsV0FBRyxLQUFILFdBQUcsUUFHZDtBQUVMLENBQUMsRUEvR1MsT0FBTyxLQUFQLE9BQU8sUUErR2hCIiwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIFwiSW1wb3J0c1wiXHJcbi8vLzxyZWZlcmVuY2UgdHlwZXM9XCIuLi9GVURHRS9Db3JlL0J1aWxkL0Z1ZGdlQ29yZS5qc1wiLz5cclxuLy8vPHJlZmVyZW5jZSB0eXBlcz1cIi4uL0ZVREdFL0FpZC9CdWlsZC9GdWRnZUFpZC5qc1wiLz5cclxuLy8jZW5kcmVnaW9uIFwiSW1wb3J0c1wiXHJcblxyXG5uYW1lc3BhY2UgR2FtZSB7XHJcbiAgICBleHBvcnQgZW51bSBHQU1FU1RBVEVTIHtcclxuICAgICAgICBQTEFZSU5HLFxyXG4gICAgICAgIFBBVVNFXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGltcG9ydCDGkiA9IEZ1ZGdlQ29yZTtcclxuICAgIGV4cG9ydCBpbXBvcnQgxpJBaWQgPSBGdWRnZUFpZDtcclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiRG9tRWxlbWVudHNcIlxyXG4gICAgZXhwb3J0IGxldCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50ID0gPEhUTUxDYW52YXNFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ2FudmFzXCIpO1xyXG4gICAgLy8gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGluaXQpO1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIHN0YXJ0KTtcclxuXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJhbmdlZFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcGxheWVyQ2hvaWNlKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTWVsZWVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHBsYXllckNob2ljZSk7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJEb21FbGVtZW50c1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiUHVibGljVmFyaWFibGVzXCJcclxuICAgIGV4cG9ydCBsZXQgZ2FtZXN0YXRlOiBHQU1FU1RBVEVTID0gR0FNRVNUQVRFUy5QQVVTRTtcclxuICAgIGV4cG9ydCBsZXQgdmlld3BvcnQ6IMaSLlZpZXdwb3J0ID0gbmV3IMaSLlZpZXdwb3J0KCk7XHJcbiAgICBleHBvcnQgbGV0IGNtcENhbWVyYTogxpIuQ29tcG9uZW50Q2FtZXJhID0gbmV3IMaSLkNvbXBvbmVudENhbWVyYSgpO1xyXG4gICAgZXhwb3J0IGxldCBncmFwaDogxpIuTm9kZSA9IG5ldyDGki5Ob2RlKFwiR3JhcGhcIik7XHJcblxyXG4gICAgdmlld3BvcnQuaW5pdGlhbGl6ZShcIlZpZXdwb3J0XCIsIGdyYXBoLCBjbXBDYW1lcmEsIGNhbnZhcyk7XHJcblxyXG4gICAgZXhwb3J0IGxldCBhdmF0YXIxOiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgZXhwb3J0IGxldCBhdmF0YXIyOiBQbGF5ZXIuUGxheWVyO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY3VycmVudFJvb206IEdlbmVyYXRpb24uUm9vbTtcclxuICAgIGV4cG9ydCBsZXQgbWluaU1hcDogVUkuTWluaW1hcDtcclxuXHJcbiAgICBleHBvcnQgbGV0IGNvbm5lY3RlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgZXhwb3J0IGxldCBkZWx0YVRpbWU6IG51bWJlcjtcclxuXHJcbiAgICBleHBvcnQgbGV0IHNlcnZlclByZWRpY3Rpb25BdmF0YXI6IE5ldHdvcmtpbmcuU2VydmVyUHJlZGljdGlvbjtcclxuXHJcbiAgICBleHBvcnQgbGV0IGN1cnJlbnROZXRPYmo6IEludGVyZmFjZXMuSU5ldHdvcmtPYmplY3RzW10gPSBbXTtcclxuXHJcbiAgICBleHBvcnQgbGV0IGVudGl0aWVzOiBFbnRpdHkuRW50aXR5W10gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgZW5lbWllczogRW5lbXkuRW5lbXlbXSA9IFtdO1xyXG4gICAgZXhwb3J0IGxldCBidWxsZXRzOiBCdWxsZXRzLkJ1bGxldFtdID0gW107XHJcbiAgICBleHBvcnQgbGV0IGl0ZW1zOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuXHJcbiAgICBleHBvcnQgbGV0IGNvb2xEb3duczogQWJpbGl0eS5Db29sZG93bltdID0gW107XHJcbiAgICAvL0pTT05cclxuICAgIGV4cG9ydCBsZXQgZW5lbWllc0pTT046IEVudGl0eS5FbnRpdHlbXTtcclxuICAgIGV4cG9ydCBsZXQgaW50ZXJuYWxJdGVtSlNPTjogSXRlbXMuSW50ZXJuYWxJdGVtW107XHJcbiAgICBleHBvcnQgbGV0IGJ1ZmZJdGVtSlNPTjogSXRlbXMuQnVmZkl0ZW1bXTtcclxuXHJcbiAgICBleHBvcnQgbGV0IGJ1bGxldHNKU09OOiBCdWxsZXRzLkJ1bGxldFtdO1xyXG4gICAgZXhwb3J0IGxldCBsb2FkZWQgPSBmYWxzZTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcIlB1YmxpY1ZhcmlhYmxlc1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiUHJpdmF0ZVZhcmlhYmxlc1wiXHJcbiAgICBjb25zdCBkYW1wZXI6IG51bWJlciA9IDMuNTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcIlByaXZhdGVWYXJpYWJsZXNcIlxyXG5cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiZXNzZW50aWFsXCJcclxuICAgIGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0ZVooMjUpO1xyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC5yb3RhdGVZKDE4MCk7XHJcblxyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgLy8gR2VuZXJhdGlvbi5yb29tcyA9IEdlbmVyYXRpb24uZ2VuZXJhdGVOb3JtYWxSb29tcygpO1xyXG4gICAgICAgICAgICBJdGVtcy5JdGVtR2VuZXJhdG9yLmZpbGxQb29sKCk7XHJcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLnByb2NlZHVhbFJvb21HZW5lcmF0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIUdlbmVyYXRpb24uZ2VuZXJhdGlvbkZhaWxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiR0VORVJBVElPTiBGQUlMRUQgLT4gUkVTVEFSVCBHRU5FUkFUSU9OXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNlcnZlclByZWRpY3Rpb25BdmF0YXIgPSBuZXcgTmV0d29ya2luZy5TZXJ2ZXJQcmVkaWN0aW9uKG51bGwpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ3JhcGguYXBwZW5kQ2hpbGQoYXZhdGFyMSk7XHJcblxyXG4gICAgICAgIMaSQWlkLmFkZFN0YW5kYXJkTGlnaHRDb21wb25lbnRzKGdyYXBoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgZmluZEdhbWVPYmplY3RzKCk7XHJcbiAgICAgICAgZGVsdGFUaW1lID0gR2FtZS7Gki5Mb29wLnRpbWVGcmFtZUdhbWUgKiAwLjAwMTtcclxuICAgICAgICBwYXVzZUNoZWNrKCk7XHJcbiAgICAgICAgR2FtZS5hdmF0YXIxLnByZWRpY3QoKTtcclxuICAgICAgICBjYW1lcmFVcGRhdGUoKTtcclxuXHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhclBvc2l0aW9uKEdhbWUuYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgR2FtZS5hdmF0YXIxLm10eExvY2FsLnJvdGF0aW9uKTtcclxuICAgICAgICAgICAgc2VydmVyUHJlZGljdGlvbkF2YXRhci51cGRhdGUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIFVJLnVwZGF0ZVVJKCk7XHJcblxyXG4gICAgICAgIGRyYXcoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmaW5kR2FtZU9iamVjdHMoKTogdm9pZCB7XHJcbiAgICAgICAgaXRlbXMgPSA8SXRlbXMuSXRlbVtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxJdGVtcy5JdGVtPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLklURU0pO1xyXG4gICAgICAgIGJ1bGxldHMgPSA8QnVsbGV0cy5CdWxsZXRbXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8QnVsbGV0cy5CdWxsZXQ+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuQlVMTEVUKTtcclxuICAgICAgICBlbnRpdGllcyA9IDxFbnRpdHkuRW50aXR5W10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoY2hpbGQgPT4gKDxFbnRpdHkuRW50aXR5PmNoaWxkKSBpbnN0YW5jZW9mIEVudGl0eS5FbnRpdHkpO1xyXG4gICAgICAgIGVuZW1pZXMgPSA8RW5lbXkuRW5lbXlbXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuRU5FTVkpO1xyXG4gICAgICAgIGN1cnJlbnRSb29tID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbSA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtKS50YWcgPT0gVGFnLlRBRy5ST09NKSk7XHJcbiAgICAgICAgY3VycmVudE5ldE9iaiA9IHNldE5ldE9iaihncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtID0+IE5ldHdvcmtpbmcuaXNOZXR3b3JrT2JqZWN0KGVsZW0pKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2V0TmV0T2JqKF9uZXRPajogR2FtZS7Gki5Ob2RlW10pOiBJbnRlcmZhY2VzLklOZXR3b3JrT2JqZWN0c1tdIHtcclxuICAgICAgICBsZXQgdGVtcE5ldE9ianM6IEludGVyZmFjZXMuSU5ldHdvcmtPYmplY3RzW10gPSBbXTtcclxuICAgICAgICBfbmV0T2ouZm9yRWFjaChvYmogPT4ge1xyXG4gICAgICAgICAgICB0ZW1wTmV0T2Jqcy5wdXNoKDxJbnRlcmZhY2VzLklOZXR3b3JrT2JqZWN0cz57IG5ldElkOiBOZXR3b3JraW5nLmdldE5ldElkKG9iaiksIG5ldE9iamVjdE5vZGU6IG9iaiB9KVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgcmV0dXJuIHRlbXBOZXRPYmpzO1xyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gc2V0Q2xpZW50KCkge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5zb2NrZXQucmVhZHlTdGF0ZSA9PSBOZXR3b3JraW5nLmNsaWVudC5zb2NrZXQuT1BFTiAmJiBOZXR3b3JraW5nLmNsaWVudC5pZFJvb20udG9Mb3dlckNhc2UoKSAhPSBcImxvYmJ5XCIpIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zZXRDbGllbnQoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4geyBzZXRDbGllbnQoKSB9LCAxMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByZWFkeVNhdGUoKSB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50cy5sZW5ndGggPj0gMiAmJiBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc2V0Q2xpZW50UmVhZHkoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsgcmVhZHlTYXRlKCkgfSwgMTAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc3RhcnRMb29wKCkge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCAhPSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgJiYgYXZhdGFyMiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5sb2FkZWQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKEdhbWUubG9hZGVkKSB7XHJcbiAgICAgICAgICAgIMaSLkxvb3Auc3RhcnQoxpIuTE9PUF9NT0RFLlRJTUVfR0FNRSwgZGVsdGFUaW1lKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJVSVwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBzdGFydExvb3AoKTtcclxuICAgICAgICAgICAgfSwgMTAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc3RhcnQoKSB7XHJcbiAgICAgICAgbG9hZFRleHR1cmVzKCk7XHJcbiAgICAgICAgLy8gbG9hZEpTT04oKTtcclxuXHJcbiAgICAgICAgLy9UT0RPOiBhZGQgc3ByaXRlIHRvIGdyYXBoZSBmb3Igc3RhcnRzY3JlZW5cclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0R2FtZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG5cclxuICAgICAgICAgICAgTmV0d29ya2luZy5jb25uZWN0aW5nKCk7XHJcblxyXG4gICAgICAgICAgICB3YWl0T25Db25uZWN0aW9uKCk7XHJcbiAgICAgICAgICAgIGFzeW5jIGZ1bmN0aW9uIHdhaXRPbkNvbm5lY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBzZXRDbGllbnQoKTtcclxuICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMuZmlsdGVyKGVsZW0gPT4gZWxlbS5yZWFkeSA9PSB0cnVlKS5sZW5ndGggPj0gMiAmJiBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIklNSE9TVFwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGxvYWRKU09OKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgaW5pdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGdhbWVzdGF0ZSA9IEdBTUVTVEFURVMuUExBWUlORztcclxuICAgICAgICAgICAgICAgICAgICAvLyBFbmVteVNwYXduZXIuc3Bhd25FbmVtaWVzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5lbXlTcGF3bmVyLnNwYXduQnlJRChFbmVteS5FTkVNWUNMQVNTLlNVTU1PTk9SQUREUywgRW50aXR5LklELlJFRFRJQ0ssIG5ldyDGki5WZWN0b3IyKDMsIDMpLCBhdmF0YXIxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5lbXlTcGF3bmVyLnNwYXduTXVsdGlwbGVFbmVtaWVzQXRSb29tKDUsIEdhbWUuY3VycmVudFJvb20ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFbmVteVNwYXduZXIuc3Bhd25CeUlEKEVuZW15LkVORU1ZQ0xBU1MuRU5FTVlTTUFTSCwgRW50aXR5LklELk9HRVIsIG5ldyDGki5WZWN0b3IyKDMsIDMpLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5lbXlTcGF3bmVyLnNwYXduQnlJRChFbmVteS5FTkVNWUNMQVNTLlNVTU1PTk9SLCBFbnRpdHkuSUQuU1VNTU9OT1IsIG5ldyDGki5WZWN0b3IyKDMsIDMpLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vI3JlZ2lvbiBpbml0IEl0ZW1zXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaXRlbTIgPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKEl0ZW1zLklURU1JRC5USE9SU0hBTU1FUik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0yLnNldFBvc2l0aW9uKG5ldyDGki5WZWN0b3IyKC01LCAwKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0IGl0ZW0zID0gbmV3IEl0ZW1zLkludGVybmFsSXRlbShJdGVtcy5JVEVNSUQuU0NBTEVVUCwgbmV3IMaSLlZlY3RvcjIoLTIsIDApLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHppcHphcCA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oSXRlbXMuSVRFTUlELlpJUFpBUCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHppcHphcC5zZXRQb3NpdGlvbihuZXcgxpIuVmVjdG9yMig1LCAwKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHppcHphcC5zcGF3bigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JhcGguYXBwZW5kQ2hpbGQoaXRlbTIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBncmFwaC5hcHBlbmRDaGlsZChpdGVtMyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduUGxheWVyKCk7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb29tSW5mb3M6IEludGVyZmFjZXMuSU1pbmltYXBJbmZvc1tdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb29yZHM6IEdhbWUuxpIuVmVjdG9yMltdID0gR2VuZXJhdGlvbi5nZXRDb29yZHNGcm9tUm9vbXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvb21JbmZvcy5wdXNoKDxJbnRlcmZhY2VzLklNaW5pbWFwSW5mb3M+eyBjb29yZHM6IGNvb3Jkc1tpXSwgcm9vbVR5cGU6IEdlbmVyYXRpb24ucm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMgPT0gY29vcmRzW2ldKS5yb29tVHlwZSB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pbmlNYXAgPSBuZXcgVUkuTWluaW1hcChyb29tSW5mb3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBncmFwaC5hZGRDaGlsZChtaW5pTWFwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICBzdGFydExvb3AoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCh3YWl0T25Db25uZWN0aW9uLCAzMDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJIb3N0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSG9zdFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgTmV0d29ya2luZy5jcmVhdGVSb29tKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJKb2luXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcm9vbUlkOiBzdHJpbmcgPSAoPEhUTUxJbnB1dEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJSb29tXCIpKS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuam9pblJvb20ocm9vbUlkKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB3YWl0Rm9yTG9iYnkoKTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gd2FpdEZvckxvYmJ5KCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50cy5sZW5ndGggPiAxICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkUm9vbS50b0xvY2FsZUxvd2VyQ2FzZSgpICE9IFwibG9iYnlcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSG9zdHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJvb21JZFwiKS5wYXJlbnRFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkxvYmJ5c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdEZvckxvYmJ5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQmFja09wdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDcmVkaXRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvbnNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNyZWRpdHNcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDcmVkaXRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG5cclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJCYWNrQ3JlZGl0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNyZWRpdHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBsYXllckNob2ljZShfZTogRXZlbnQpIHtcclxuICAgICAgICBpZiAoKDxIVE1MQnV0dG9uRWxlbWVudD5fZS50YXJnZXQpLmlkID09IFwiUmFuZ2VkXCIpIHtcclxuICAgICAgICAgICAgYXZhdGFyMSA9IG5ldyBQbGF5ZXIuUmFuZ2VkKEVudGl0eS5JRC5SQU5HRUQsIG5ldyBFbnRpdHkuQXR0cmlidXRlcygxMDAwMCwgNSwgNSwgMSwgMiwgNSwgMSwgODApKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCg8SFRNTEJ1dHRvbkVsZW1lbnQ+X2UudGFyZ2V0KS5pZCA9PSBcIk1lbGVlXCIpIHtcclxuICAgICAgICAgICAgYXZhdGFyMSA9IG5ldyBQbGF5ZXIuTWVsZWUoRW50aXR5LklELk1FTEVFLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMoMTAwMDAsIDEsIDUsIDEsIDIsIDEwLCAxLCA4MCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkxvYmJ5c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgIHJlYWR5U2F0ZSgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXVzZUNoZWNrKCkge1xyXG4gICAgICAgIGlmICgod2luZG93LnNjcmVlblggPCAtd2luZG93LnNjcmVlbi5hdmFpbFdpZHRoKSAmJiAod2luZG93LnNjcmVlblkgPCAtd2luZG93LnNjcmVlbi5hdmFpbEhlaWdodCkpIHtcclxuICAgICAgICAgICAgcGF1c2UodHJ1ZSwgZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBwYXVzZUNoZWNrKCk7XHJcbiAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcGxheWluZyh0cnVlLCBmYWxzZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBwYXVzZShfc3luYzogYm9vbGVhbiwgX3RyaWdnZXJPcHRpb246IGJvb2xlYW4pIHtcclxuICAgICAgICBpZiAoZ2FtZXN0YXRlID09IEdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc2V0R2FtZXN0YXRlKGZhbHNlKTtcclxuICAgICAgICAgICAgfSBpZiAoX3RyaWdnZXJPcHRpb24pIHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgYmFjayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQmFja09wdGlvblwiKTtcclxuICAgICAgICAgICAgICAgIGxldCBiYWNrQ2xvbmUgPSBiYWNrLmNsb25lTm9kZSh0cnVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBiYWNrLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGJhY2tDbG9uZSwgYmFjayk7XHJcblxyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJCYWNrT3B0aW9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25zY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBnYW1lc3RhdGUgPSBHQU1FU1RBVEVTLlBBVVNFO1xyXG4gICAgICAgICAgICDGki5Mb29wLnN0b3AoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHBsYXlpbmcoX3N5bmM6IGJvb2xlYW4sIF90cmlnZ2VyT3B0aW9uOiBib29sZWFuKSB7XHJcbiAgICAgICAgaWYgKGdhbWVzdGF0ZSA9PSBHQU1FU1RBVEVTLlBBVVNFKSB7XHJcbiAgICAgICAgICAgIGlmIChfc3luYykge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zZXRHYW1lc3RhdGUodHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF90cmlnZ2VyT3B0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvbnNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBnYW1lc3RhdGUgPSBHQU1FU1RBVEVTLlBMQVlJTkc7XHJcbiAgICAgICAgICAgIMaSLkxvb3AuY29udGludWUoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gbG9hZEpTT04oKSB7XHJcbiAgICAgICAgY29uc3QgbG9hZEVuZW15ID0gYXdhaXQgKGF3YWl0IGZldGNoKFwiLi9SZXNvdXJjZXMvRW5lbWllc1N0b3JhZ2UuanNvblwiKSkuanNvbigpO1xyXG4gICAgICAgIGVuZW1pZXNKU09OID0gKDxFbnRpdHkuRW50aXR5W10+bG9hZEVuZW15LmVuZW1pZXMpO1xyXG5cclxuICAgICAgICBjb25zdCBsb2FkSXRlbSA9IGF3YWl0IChhd2FpdCBmZXRjaChcIi4vUmVzb3VyY2VzL0l0ZW1TdG9yYWdlLmpzb25cIikpLmpzb24oKTtcclxuICAgICAgICBpbnRlcm5hbEl0ZW1KU09OID0gKDxJdGVtcy5JbnRlcm5hbEl0ZW1bXT5sb2FkSXRlbS5pbnRlcm5hbEl0ZW1zKTtcclxuICAgICAgICBidWZmSXRlbUpTT04gPSAoPEl0ZW1zLkJ1ZmZJdGVtW10+bG9hZEl0ZW0uYnVmZkl0ZW1zKTtcclxuXHJcblxyXG4gICAgICAgIGNvbnN0IGxvYWRCdWxsZXRzID0gYXdhaXQgKGF3YWl0IGZldGNoKFwiLi9SZXNvdXJjZXMvQnVsbGV0U3RvcmFnZS5qc29uXCIpKS5qc29uKCk7XHJcbiAgICAgICAgYnVsbGV0c0pTT04gPSAoPEJ1bGxldHMuQnVsbGV0W10+bG9hZEJ1bGxldHMuc3RhbmRhcmRCdWxsZXRzKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRUZXh0dXJlcygpIHtcclxuICAgICAgICBhd2FpdCBHZW5lcmF0aW9uLnR4dFN0YXJ0Um9vbS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUm9vbXMvbWFwMDEucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBCdWxsZXRzLmJ1bGxldFR4dC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUHJvamVjdGlsZXMvYXJyb3cucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEJ1bGxldHMud2F0ZXJCYWxsVHh0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9Qcm9qZWN0aWxlcy93YXRlckJhbGwucG5nXCIpXHJcblxyXG4gICAgICAgIC8vVUlcclxuICAgICAgICBhd2FpdCBVSS50eHRaZXJvLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTAucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dE9uZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGUxLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRUb3cubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlMi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0VGhyZWUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlMy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0Rm91ci5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU0LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRGaXZlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFNpeC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU2LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRTZXZlbi5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU3LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRFaWdodC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU4LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHROaW5lLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTkucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFRlbi5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGUxMC5wbmdcIik7XHJcblxyXG4gICAgICAgIC8vVUkgcGFydGljbGVcclxuICAgICAgICBhd2FpdCBVSS5oZWFsUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9oZWFsaW5nLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5wb2lzb25QYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL3BvaXNvbi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuYnVyblBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvcG9pc29uLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5ibGVlZGluZ1BhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvYmxlZWRpbmcucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnNsb3dQYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL3Nsb3cucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLmltbXVuZVBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvaW1tdW5lLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgVUkuY29tbW9uUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9SYXJpdHkvY29tbW9uLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5yYXJlUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9SYXJpdHkvcmFyZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuZXBpY1BhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvUmFyaXR5L2VwaWMucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLmxlZ2VuZGFyeVBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvUmFyaXR5L2xlZ2VuZGFyeS5wbmdcIik7XHJcblxyXG5cclxuICAgICAgICBhd2FpdCBFbnRpdHkudHh0U2hhZG93LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvc2hhZG93LnBuZ1wiKTtcclxuXHJcbiAgICAgICAgLy9NaW5pbWFwXHJcbiAgICAgICAgYXdhaXQgVUkubm9ybWFsUm9vbS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvTWluaW1hcC9ub3JtYWwucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLmNoYWxsZW5nZVJvb20ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL01pbmltYXAvY2hhbGxlbmdlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5tZXJjaGFudFJvb20ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL01pbmltYXAvbWVyY2hhbnQucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnRyZWFzdXJlUm9vbS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvTWluaW1hcC90cmVhc3VyZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuYm9zc1Jvb20ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL01pbmltYXAvYm9zcy5wbmdcIik7XHJcblxyXG5cclxuICAgICAgICAvL0VORU1ZXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRCYXRJZGxlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL2JhdC9iYXRJZGxlLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRSZWRUaWNrSWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy90aWNrL3JlZFRpY2tJZGxlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFJlZFRpY2tXYWxrLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3RpY2svcmVkVGlja1dhbGsucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFNtYWxsVGlja0lkbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc21hbGxUaWNrL3NtYWxsVGlja0lkbGUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U21hbGxUaWNrV2Fsay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9zbWFsbFRpY2svc21hbGxUaWNrV2Fsay5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U2tlbGV0b25JZGxlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3NrZWxldG9uL3NrZWxldG9uSWRsZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRTa2VsZXRvbldhbGsubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc2tlbGV0b24vc2tlbGV0b25XYWxrLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRPZ2VySWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9vZ2VyL29nZXJJZGxlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dE9nZXJXYWxrLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL29nZXIvb2dlcldhbGsucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0T2dlckF0dGFjay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9vZ2VyL29nZXJBdHRhY2sucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFN1bW1vbmVySWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9zdW1tb25lci9zdW1tb25lcklkbGUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U3VtbW9uZXJTdW1tb24ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc3VtbW9uZXIvc3VtbW9uZXJTbWFzaC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRTdW1tb25lclRlbGVwb3J0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3N1bW1vbmVyL3N1bW1vbmVyVGVsZXBvcnQucG5nXCIpO1xyXG5cclxuXHJcblxyXG5cclxuICAgICAgICAvL0l0ZW1zXHJcbiAgICAgICAgYXdhaXQgSXRlbXMudHh0SWNlQnVja2V0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy9pY2VCdWNrZXQucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEl0ZW1zLnR4dERtZ1VwLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy9kYW1hZ2VVcC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgSXRlbXMudHh0SGVhbHRoVXAubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0l0ZW1zL2hlYWx0aFVwLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBJdGVtcy50eHRTcGVlZFVwLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy9zcGVlZFVwLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBJdGVtcy50eHRUb3hpY1JlbGF0aW9uc2hpcC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvSXRlbXMvdG94aWNSZWxhdGlvbnNoaXAucG5nXCIpO1xyXG5cclxuXHJcbiAgICAgICAgQW5pbWF0aW9uR2VuZXJhdGlvbi5nZW5lcmF0ZUFuaW1hdGlvbk9iamVjdHMoKTtcclxuXHJcbiAgICAgICAgLy9UT0RPOiBVU0UgVEhJU1xyXG4gICAgICAgIC8vIGNvbnNvbGUuY2xlYXIoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmF3KCk6IHZvaWQge1xyXG4gICAgICAgIHZpZXdwb3J0LmRyYXcoKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2FtZXJhVXBkYXRlKCkge1xyXG4gICAgICAgIGxldCBkaXJlY3Rpb24gPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UoYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZShkZWx0YVRpbWUgKiBkYW1wZXIpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZShhdmF0YXIxLmNsaWVudC5taW5UaW1lQmV0d2VlblRpY2tzICogZGFtcGVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0ZShuZXcgxpIuVmVjdG9yMygtZGlyZWN0aW9uLngsIGRpcmVjdGlvbi55LCAwKSwgdHJ1ZSk7XHJcbiAgICAgICAgbWluaU1hcC5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGlvbi54ICsgbWluaU1hcC5vZmZzZXRYLCBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRpb24ueSArIG1pbmlNYXAub2Zmc2V0WSwgMCk7XHJcbiAgICB9XHJcblxyXG4gICAgxpIuTG9vcC5hZGRFdmVudExpc3RlbmVyKMaSLkVWRU5ULkxPT1BfRlJBTUUsIHVwZGF0ZSk7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJlc3NlbnRpYWxcIlxyXG5cclxufVxyXG4iLCJuYW1lc3BhY2UgVUkge1xyXG4gICAgLy9sZXQgZGl2VUk6IEhUTUxEaXZFbGVtZW50ID0gPEhUTUxEaXZFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiVUlcIik7XHJcbiAgICBsZXQgcGxheWVyMVVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjFcIik7XHJcbiAgICBsZXQgcGxheWVyMlVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjJcIik7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVVJKCkge1xyXG4gICAgICAgIC8vQXZhdGFyMSBVSVxyXG4gICAgICAgICg8SFRNTERpdkVsZW1lbnQ+cGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSFBcIikpLnN0eWxlLndpZHRoID0gKEdhbWUuYXZhdGFyMS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyAvIEdhbWUuYXZhdGFyMS5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAqIDEwMCkgKyBcIiVcIjtcclxuXHJcbiAgICAgICAgLy9JbnZlbnRvcnlVSVxyXG4gICAgICAgIEdhbWUuYXZhdGFyMS5pdGVtcy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGV4c2lzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmltZ1NyYyA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBleHNpc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIxVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikucXVlcnlTZWxlY3RvckFsbChcImltZ1wiKS5mb3JFYWNoKChpbWdFbGVtZW50KSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW1nTmFtZSA9IGVsZW1lbnQuaW1nU3JjLnNwbGl0KFwiL1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGltZ0VsZW1lbnQuc3JjLnNwbGl0KFwiL1wiKS5maW5kKGVsZW0gPT4gZWxlbSA9PSBpbWdOYW1lW2ltZ05hbWUubGVuZ3RoIC0gMV0pICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4c2lzdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgLy9ub25lIGV4c2lzdGluZyBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgICAgIGlmICghZXhzaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEhUTUxJbWFnZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc3JjID0gZWxlbWVudC5pbWdTcmM7XHJcbiAgICAgICAgICAgICAgICAgICAgcGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLmFwcGVuZENoaWxkKG5ld0l0ZW0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vQXZhdGFyMiBVSVxyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAoPEhUTUxEaXZFbGVtZW50PnBsYXllcjJVSS5xdWVyeVNlbGVjdG9yKFwiI0hQXCIpKS5zdHlsZS53aWR0aCA9IChHYW1lLmF2YXRhcjIuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLyBHYW1lLmF2YXRhcjIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgKiAxMDApICsgXCIlXCI7XHJcblxyXG4gICAgICAgICAgICAvL0ludmVudG9yeVVJXHJcbiAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5pdGVtcy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZXhzaXN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmltZ1NyYyA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgICAgICAgICAgICAgcGxheWVyMlVJLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbWdcIikuZm9yRWFjaCgoaW1nRWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGltZ05hbWUgPSBlbGVtZW50LmltZ1NyYy5zcGxpdChcIi9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1nRWxlbWVudC5zcmMuc3BsaXQoXCIvXCIpLmZpbmQoZWxlbSA9PiBlbGVtID09IGltZ05hbWVbaW1nTmFtZS5sZW5ndGggLSAxXSkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4c2lzdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vbm9uZSBleHNpc3RpbmcgRE9NSW1nIGZvciBJdGVtXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFleHNpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEhUTUxJbWFnZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnNyYyA9IGVsZW1lbnQuaW1nU3JjO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikuYXBwZW5kQ2hpbGQobmV3SXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRaZXJvOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE9uZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRUb3c6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VGhyZWU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0Rm91cjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRGaXZlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNpeDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTZXZlbjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRFaWdodDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHROaW5lOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFRlbjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBEYW1hZ2VVSSBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLlVJO1xyXG4gICAgICAgIHVwOiBudW1iZXIgPSAwLjE1O1xyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXIgPSAwLjUgKiA2MDtcclxuICAgICAgICByYW5kb21YOiBudW1iZXIgPSBNYXRoLnJhbmRvbSgpICogMC4wNSAtIE1hdGgucmFuZG9tKCkgKiAwLjA1O1xyXG4gICAgICAgIGFzeW5jIGxpZmVzcGFuKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA+PSAwICYmIHRoaXMubGlmZXRpbWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saWZldGltZS0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfZGFtYWdlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJkYW1hZ2VVSVwiKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjMoMC4zMywgMC4zMywgMC4zMykpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgMC4yNSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWVzaCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckxpdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIikpKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUoX2RhbWFnZSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5SRU5ERVJfUFJFUEFSRSwgdGhpcy51cGRhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy5tb3ZlKCk7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXNwYW4oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIG1vdmUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShuZXcgxpIuVmVjdG9yMyh0aGlzLnJhbmRvbVgsIHRoaXMudXAsIDApKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGUoxpIuVmVjdG9yMy5PTkUoMS4wMSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZFRleHR1cmUoX2RhbWFnZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGxldCBuZXdUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgICAgICAgICAgbGV0IG5ld0NvYXQ6IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCA9IG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoKTtcclxuICAgICAgICAgICAgbGV0IG5ld010cjogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtdHJcIiwgxpIuU2hhZGVyRmxhdFRleHR1cmVkLCBuZXdDb2F0KTtcclxuICAgICAgICAgICAgbGV0IG9sZENvbUNvYXQ6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKCk7XHJcblxyXG4gICAgICAgICAgICBvbGRDb21Db2F0ID0gdGhpcy5nZXRDb21wb25lbnQoxpIuQ29tcG9uZW50TWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChNYXRoLmFicyhfZGFtYWdlKSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFplcm87XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0T25lO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFRvdztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRUaHJlZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNDpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRGb3VyO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEZpdmU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDY6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0U2V2ZW47XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDc6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0RWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDg6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0RWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDk6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0TmluZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMTA6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0VGVuO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RhbWFnZSA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdDb2F0LmNvbG9yID0gxpIuQ29sb3IuQ1NTKFwicmVkXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbmV3Q29hdC5jb2xvciA9IMaSLkNvbG9yLkNTUyhcImdyZWVuXCIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cCA9IDAuMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBuZXdDb2F0LnRleHR1cmUgPSBuZXdUeHQ7XHJcbiAgICAgICAgICAgIG9sZENvbUNvYXQubWF0ZXJpYWwgPSBuZXdNdHI7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBsZXQgaGVhbFBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHBvaXNvblBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IGJ1cm5QYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBibGVlZGluZ1BhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHNsb3dQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBpbW11bmVQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY29tbW9uUGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgcmFyZVBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IGVwaWNQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBsZWdlbmRhcnlQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBQYXJ0aWNsZXMgZXh0ZW5kcyBHYW1lLsaSQWlkLk5vZGVTcHJpdGUge1xyXG4gICAgICAgIGlkOiBCdWZmLkJVRkZJRCB8IEl0ZW1zLlJBUklUWTtcclxuICAgICAgICBhbmltYXRpb25QYXJ0aWNsZXM6IEdhbWUuxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb247XHJcbiAgICAgICAgcGFydGljbGVmcmFtZU51bWJlcjogbnVtYmVyO1xyXG4gICAgICAgIHBhcnRpY2xlZnJhbWVSYXRlOiBudW1iZXI7XHJcbiAgICAgICAgd2lkdGg6IG51bWJlcjtcclxuICAgICAgICBoZWlnaHQ6IG51bWJlcjtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEJ1ZmYuQlVGRklEIHwgSXRlbXMuUkFSSVRZLCBfdGV4dHVyZTogR2FtZS7Gki5UZXh0dXJlSW1hZ2UsIF9mcmFtZUNvdW50OiBudW1iZXIsIF9mcmFtZVJhdGU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihCdWZmLkJVRkZJRFtfaWRdLnRvTG93ZXJDYXNlKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gX2lkO1xyXG4gICAgICAgICAgICB0aGlzLnBhcnRpY2xlZnJhbWVOdW1iZXIgPSBfZnJhbWVDb3VudDtcclxuICAgICAgICAgICAgdGhpcy5wYXJ0aWNsZWZyYW1lUmF0ZSA9IF9mcmFtZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uUGFydGljbGVzID0gbmV3IEdhbWUuxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24oQnVmZi5CVUZGSURbX2lkXS50b0xvd2VyQ2FzZSgpLCBuZXcgxpIuQ29hdFRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpLCBfdGV4dHVyZSkpXHJcbiAgICAgICAgICAgIHRoaXMuaGVpZ2h0ID0gX3RleHR1cmUuaW1hZ2UuaGVpZ2h0O1xyXG4gICAgICAgICAgICB0aGlzLndpZHRoID0gX3RleHR1cmUuaW1hZ2Uud2lkdGggLyB0aGlzLnBhcnRpY2xlZnJhbWVOdW1iZXI7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvblBhcnRpY2xlcy5nZW5lcmF0ZUJ5R3JpZCjGki5SZWN0YW5nbGUuR0VUKDAsIDAsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSwgdGhpcy5wYXJ0aWNsZWZyYW1lTnVtYmVyLCAzMiwgxpIuT1JJR0lOMkQuQ0VOVEVSLCDGki5WZWN0b3IyLlgodGhpcy53aWR0aCkpO1xyXG4gICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbih0aGlzLmFuaW1hdGlvblBhcnRpY2xlcyk7XHJcbiAgICAgICAgICAgIHRoaXMuZnJhbWVyYXRlID0gX2ZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IEdhbWUuxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0ZVooMC4wMDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgVGFnIHtcclxuICAgIGV4cG9ydCBlbnVtIFRBRyB7XHJcbiAgICAgICAgUExBWUVSLFxyXG4gICAgICAgIEVORU1ZLFxyXG4gICAgICAgIEJVTExFVCxcclxuICAgICAgICBJVEVNLFxyXG4gICAgICAgIFJPT00sXHJcbiAgICAgICAgV0FMTCxcclxuICAgICAgICBET09SLFxyXG4gICAgICAgIE9CU1RJQ0FMLFxyXG4gICAgICAgIFVJXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW50aXR5IHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW50aXR5IGV4dGVuZHMgR2FtZS7GkkFpZC5Ob2RlU3ByaXRlIGltcGxlbWVudHMgSW50ZXJmYWNlcy5JTmV0d29ya2FibGUge1xyXG4gICAgICAgIHByaXZhdGUgY3VycmVudEFuaW1hdGlvblN0YXRlOiBBTklNQVRJT05TVEFURVM7XHJcbiAgICAgICAgcHJpdmF0ZSBwZXJmb3JtS25vY2tiYWNrOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRztcclxuICAgICAgICBwdWJsaWMgbmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgbmV0T2JqZWN0Tm9kZTogxpIuTm9kZSA9IHRoaXM7XHJcbiAgICAgICAgcHVibGljIGlkOiBFbnRpdHkuSUQ7XHJcbiAgICAgICAgcHVibGljIGF0dHJpYnV0ZXM6IEF0dHJpYnV0ZXM7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcjtcclxuICAgICAgICBwdWJsaWMgaXRlbXM6IEFycmF5PEl0ZW1zLkl0ZW0+ID0gW107XHJcbiAgICAgICAgcHVibGljIHdlYXBvbjogV2VhcG9ucy5XZWFwb247XHJcbiAgICAgICAgcHVibGljIGJ1ZmZzOiBCdWZmLkJ1ZmZbXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBvZmZzZXRDb2xsaWRlclg6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgb2Zmc2V0Q29sbGlkZXJZOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyU2NhbGVGYWt0b3I6IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgY2FuTW92ZVg6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgICAgIHByb3RlY3RlZCBjYW5Nb3ZlWTogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgcHJvdGVjdGVkIG1vdmVEaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgcHJvdGVjdGVkIGFuaW1hdGlvbkNvbnRhaW5lcjogQW5pbWF0aW9uR2VuZXJhdGlvbi5BbmltYXRpb25Db250YWluZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGlkbGVTY2FsZTogbnVtYmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBjdXJyZW50S25vY2tiYWNrOiDGki5WZWN0b3IzID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgcHVibGljIHNoYWRvdzogU2hhZG93O1xyXG5cclxuXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihnZXROYW1lQnlJZChfaWQpKTtcclxuICAgICAgICAgICAgdGhpcy5uZXRJZCA9IE5ldHdvcmtpbmcuSWRNYW5hZ2VyKF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IG5ldyBBdHRyaWJ1dGVzKDEsIDEsIDEsIDEsIDEsIDEsIDEsIDEpO1xyXG4gICAgICAgICAgICBpZiAoQW5pbWF0aW9uR2VuZXJhdGlvbi5nZXRBbmltYXRpb25CeUlkKHRoaXMuaWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGxldCBhbmkgPSBBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFuaW1hdGlvbkNvbnRhaW5lciA9IGFuaTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaWRsZVNjYWxlID0gYW5pLnNjYWxlLmZpbmQoYW5pbWF0aW9uID0+IGFuaW1hdGlvblswXSA9PSBcImlkbGVcIilbMV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5vZmZzZXRDb2xsaWRlclggPSAwO1xyXG4gICAgICAgICAgICB0aGlzLm9mZnNldENvbGxpZGVyWSA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXJTY2FsZUZha3RvciA9IDE7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIobmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgKHRoaXMub2Zmc2V0Q29sbGlkZXJYICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLngpLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKyAodGhpcy5vZmZzZXRDb2xsaWRlclkgKiB0aGlzLm10eExvY2FsLnNjYWxpbmcueSkpLCAodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMikgKiB0aGlzLmNvbGxpZGVyU2NhbGVGYWt0b3IsIHRoaXMubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKEFuaW1hdGlvbkdlbmVyYXRpb24uZ2V0QW5pbWF0aW9uQnlJZCh0aGlzLmlkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYW5pID0gQW5pbWF0aW9uR2VuZXJhdGlvbi5nZXRBbmltYXRpb25CeUlkKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hbmltYXRpb25Db250YWluZXIgPSBhbmk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlkbGVTY2FsZSA9IGFuaS5zY2FsZS5maW5kKGFuaW1hdGlvbiA9PiBhbmltYXRpb25bMF0gPT0gXCJpZGxlXCIpWzFdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuc2hhZG93ID0gbmV3IFNoYWRvdyh0aGlzKTtcclxuICAgICAgICAgICAgLy8gdGhpcy5hZGRDaGlsZCh0aGlzLnNoYWRvdyk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHYW1lLsaSLkVWRU5ULlJFTkRFUl9QUkVQQVJFLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIGV2ZW50VXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUJ1ZmZzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2hhZG93LnVwZGF0ZVNoYWRvd1BvcygpO1xyXG4gICAgICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldENvbGxpZGVyKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVTY2FsZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLnVwZGF0ZVNjYWxlRGVwZW5kZW5jaWVzKCk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwuc2NhbGluZyA9IG5ldyDGki5WZWN0b3IzKHRoaXMuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLmF0dHJpYnV0ZXMuc2NhbGUpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnNldFNjYWxlKCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyKSAqIHRoaXMuY29sbGlkZXJTY2FsZUZha3Rvcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0Q29sbGlkZXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIuc2V0UG9zaXRpb24obmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgKHRoaXMub2Zmc2V0Q29sbGlkZXJYICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLngpLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKyAodGhpcy5vZmZzZXRDb2xsaWRlclkgKiB0aGlzLm10eExvY2FsLnNjYWxpbmcueSkpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCB1cGRhdGVCdWZmcygpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnVmZnMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnVmZnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVmZnNbaV0uZG9CdWZmU3R1ZmYodGhpcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBjb2xsaWRlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSB0cnVlO1xyXG4gICAgICAgICAgICBsZXQgd2FsbHM6IEdlbmVyYXRpb24uV2FsbFtdID0gR2FtZS5jdXJyZW50Um9vbS53YWxscztcclxuICAgICAgICAgICAgbGV0IHdhbGxDb2xsaWRlcnM6IEdhbWUuxpIuUmVjdGFuZ2xlW10gPSBbXTtcclxuICAgICAgICAgICAgd2FsbHMuZm9yRWFjaChlbGVtID0+IHtcclxuICAgICAgICAgICAgICAgIHdhbGxDb2xsaWRlcnMucHVzaChlbGVtLmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgbGV0IG1ld0RpcmVjdGlvbiA9IF9kaXJlY3Rpb24uY2xvbmU7XHJcbiAgICAgICAgICAgIGlmICghbWV3RGlyZWN0aW9uLmVxdWFscyhHYW1lLsaSLlZlY3RvcjMuWkVSTygpKSkge1xyXG4gICAgICAgICAgICAgICAgbWV3RGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgbWV3RGlyZWN0aW9uLnNjYWxlKChHYW1lLmRlbHRhVGltZSAqIHRoaXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlQ29sbGlzaW9uKHdhbGxDb2xsaWRlcnMsIG1ld0RpcmVjdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgY2FsY3VsYXRlQ29sbGlzaW9uKF9jb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXJbXSB8IEdhbWUuxpIuUmVjdGFuZ2xlW10sIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgX2NvbGxpZGVyLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgQ29sbGlkZXIuQ29sbGlkZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQmVmb3JlTW92ZSA9IGludGVyc2VjdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IHRoaXMuY29sbGlkZXIuZ2V0UmFkaXVzICsgZWxlbWVudC5nZXRSYWRpdXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvbGRQb3NpdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIodGhpcy5jb2xsaWRlci5wb3NpdGlvbi54LCB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoX2RpcmVjdGlvbi54LCAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50KSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVggPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMigwLCBfZGlyZWN0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50KSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5vd25lck5ldElkID09IEdhbWUuYXZhdGFyMS5uZXRJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5nZXRLbm9ja2JhY2sodGhpcy5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50Lm93bmVyTmV0SWQgPT0gR2FtZS5hdmF0YXIyLm5ldElkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5rbm9ja2JhY2tQdXNoKHRoaXMuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChlbGVtZW50IGluc3RhbmNlb2YgR2FtZS7Gki5SZWN0YW5nbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlc1JlY3QoZWxlbWVudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFCZWZvcmVNb3ZlID0gaW50ZXJzZWN0aW9uLmhlaWdodCAqIGludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IHRoaXMubXR4TG9jYWwuc2NhbGluZy54ICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvbGRQb3NpdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIodGhpcy5jb2xsaWRlci5wb3NpdGlvbi54LCB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoX2RpcmVjdGlvbi54LCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uLmhlaWdodCAqIG5ld0ludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoMCwgX2RpcmVjdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uLmhlaWdodCAqIG5ld0ludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVZID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXREYW1hZ2UoX3ZhbHVlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKF92YWx1ZSAhPSBudWxsICYmIHRoaXMuYXR0cmlidXRlcy5oaXRhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGhpdFZhbHVlID0gdGhpcy5nZXREYW1hZ2VSZWR1Y3Rpb24oX3ZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC09IGhpdFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IFVJLkRhbWFnZVVJKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24sIE1hdGgucm91bmQoaGl0VmFsdWUpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVVSSh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBNYXRoLnJvdW5kKGhpdFZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogdGhpcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgdHlwZTogQVRUUklCVVRFVFlQRS5IRUFMVEhQT0lOVFMgfSwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA8PSAwKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucmVtb3ZlRW5lbXkodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kaWUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRpZSgpIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgZ2V0RGFtYWdlUmVkdWN0aW9uKF92YWx1ZTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIF92YWx1ZSAqICgxIC0gKHRoaXMuYXR0cmlidXRlcy5hcm1vciAvIDEwMCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyNyZWdpb24ga25vY2tiYWNrXHJcbiAgICAgICAgcHVibGljIGRvS25vY2tiYWNrKF9ib2R5OiBFbnRpdHkuRW50aXR5KSB7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLnBlcmZvcm1Lbm9ja2JhY2spIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucGVyZm9ybUtub2NrYmFjayA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgX3Bvc2l0aW9uLnRvVmVjdG9yMigpKS50b1ZlY3RvcjMoMCk7XHJcbiAgICAgICAgICAgICAgICBsZXQga25vY2tCYWNrU2NhbGluZzogbnVtYmVyID0gR2FtZS5kZWx0YVRpbWUgKiB0aGlzLmF0dHJpYnV0ZXMuc2NhbGU7XHJcblxyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZShfa25vY2tiYWNrRm9yY2UgKiBrbm9ja0JhY2tTY2FsaW5nKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRLbm9ja2JhY2suYWRkKGRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCByZWR1Y2VLbm9ja2JhY2soKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEtub2NrYmFjay5zY2FsZSgwLjUpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmN1cnJlbnRLbm9ja2JhY2subWFnbml0dWRlKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEtub2NrYmFjay5tYWduaXR1ZGUgPCAwLjAwMDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEtub2NrYmFjayA9IEdhbWUuxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBlcmZvcm1Lbm9ja2JhY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgcHVibGljIHN3aXRjaEFuaW1hdGlvbihfbmFtZTogQU5JTUFUSU9OU1RBVEVTKSB7XHJcbiAgICAgICAgICAgIGxldCBuYW1lOiBzdHJpbmcgPSBBTklNQVRJT05TVEFURVNbX25hbWVdLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmFuaW1hdGlvbkNvbnRhaW5lciAhPSBudWxsICYmIDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRBbmltYXRpb25TdGF0ZSAhPSBfbmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoX25hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlID0gQU5JTUFUSU9OU1RBVEVTLklETEU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuV0FMSzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlID0gQU5JTUFUSU9OU1RBVEVTLldBTEs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuU1VNTU9OOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbbmFtZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QW5pbWF0aW9uU3RhdGUgPSBBTklNQVRJT05TVEFURVMuU1VNTU9OO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQU5JTUFUSU9OU1RBVEVTLkFUVEFDSzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlID0gQU5JTUFUSU9OU1RBVEVTLkFUVEFDSztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mcmFtZXJhdGUgPSB0aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5mcmFtZVJhdGUuZmluZChvYmogPT4gb2JqWzBdID09IG5hbWUpWzFdO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0RnJhbWVEaXJlY3Rpb24oMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBbmltYXRpb25TdGF0ZSh0aGlzLmN1cnJlbnRBbmltYXRpb25TdGF0ZSwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLndhcm4oXCJubyBhbmltYXRpb25Db250YWluZXIgb3IgYW5pbWF0aW9uIHdpdGggbmFtZTogXCIgKyBuYW1lICsgXCIgYXQgRW50aXR5OiBcIiArIHRoaXMubmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuICAgIGV4cG9ydCBlbnVtIEFOSU1BVElPTlNUQVRFUyB7XHJcbiAgICAgICAgSURMRSwgV0FMSywgU1VNTU9OLCBBVFRBQ0tcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBCRUhBVklPVVIge1xyXG4gICAgICAgIElETEUsIEZPTExPVywgRkxFRSwgU1VNTU9OLCBBVFRBQ0tcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBJRCB7XHJcbiAgICAgICAgUkFOR0VELFxyXG4gICAgICAgIE1FTEVFLFxyXG4gICAgICAgIE1FUkNIQU5ULFxyXG4gICAgICAgIEJBVCxcclxuICAgICAgICBSRURUSUNLLFxyXG4gICAgICAgIFNNQUxMVElDSyxcclxuICAgICAgICBTS0VMRVRPTixcclxuICAgICAgICBPR0VSLFxyXG4gICAgICAgIFNVTU1PTk9SXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldE5hbWVCeUlkKF9pZDogRW50aXR5LklEKTogc3RyaW5nIHtcclxuICAgICAgICBzd2l0Y2ggKF9pZCkge1xyXG4gICAgICAgICAgICBjYXNlIElELlJBTkdFRDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInJhbmdlZFwiO1xyXG4gICAgICAgICAgICBjYXNlIElELk1FTEVFOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwidGFua1wiO1xyXG4gICAgICAgICAgICBjYXNlIElELkJBVDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcImJhdFwiO1xyXG4gICAgICAgICAgICBjYXNlIElELlJFRFRJQ0s6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJyZWRUaWNrXCI7XHJcbiAgICAgICAgICAgIGNhc2UgSUQuU01BTExUSUNLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwic21hbGxUaWNrXCI7XHJcbiAgICAgICAgICAgIGNhc2UgSUQuU0tFTEVUT046XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJza2VsZXRvblwiO1xyXG4gICAgICAgICAgICBjYXNlIElELk9HRVI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJvZ2VyXCI7XHJcbiAgICAgICAgICAgIGNhc2UgSUQuU0tFTEVUT046XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJzdW1tb25vclwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBFbmVteSB7XHJcblxyXG4gICAgZXhwb3J0IGVudW0gRU5FTVlDTEFTUyB7XHJcbiAgICAgICAgRU5FTVlEVU1CLFxyXG4gICAgICAgIEVORU1ZREFTSCxcclxuICAgICAgICBFTkVNWVNNQVNILFxyXG4gICAgICAgIEVORU1ZUEFUUk9MLFxyXG4gICAgICAgIEVORU1ZU0hPT1QsXHJcbiAgICAgICAgU1VNTU9OT1IsXHJcbiAgICAgICAgU1VNTU9OT1JBRERTXHJcbiAgICB9XHJcblxyXG4gICAgaW1wb3J0IMaSQWlkID0gRnVkZ2VBaWQ7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15IGV4dGVuZHMgRW50aXR5LkVudGl0eSBpbXBsZW1lbnRzIEludGVyZmFjZXMuSUtub2NrYmFja2FibGUge1xyXG4gICAgICAgIGN1cnJlbnRCZWhhdmlvdXI6IEVudGl0eS5CRUhBVklPVVI7XHJcbiAgICAgICAgdGFyZ2V0OiDGki5WZWN0b3IyO1xyXG4gICAgICAgIG1vdmVEaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgZmxvY2tpbmc6IEZsb2NraW5nQmVoYXZpb3VyO1xyXG4gICAgICAgIGlzQWdncmVzc2l2ZTogYm9vbGVhbjtcclxuXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMudGFnID0gVGFnLlRBRy5FTkVNWTtcclxuICAgICAgICAgICAgdGhpcy5pc0FnZ3Jlc3NpdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgbGV0IHJlZiA9IEdhbWUuZW5lbWllc0pTT04uZmluZChlbmVteSA9PiBlbmVteS5uYW1lID09IEVudGl0eS5JRFtfaWRdLnRvTG93ZXJDYXNlKCkpXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlZik7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IG5ldyBFbnRpdHkuQXR0cmlidXRlcyhyZWYuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgcmVmLmF0dHJpYnV0ZXMuc3BlZWQsIHJlZi5hdHRyaWJ1dGVzLnNjYWxlLCByZWYuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgcmVmLmF0dHJpYnV0ZXMuYXJtb3IsIHJlZi5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uLCByZWYuYXR0cmlidXRlcy5hY2N1cmFjeSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25Db250YWluZXIuYW5pbWF0aW9uc1tcImlkbGVcIl0pO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgMC4xKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IMaSLlZlY3RvcjModGhpcy5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMuYXR0cmlidXRlcy5zY2FsZSk7XHJcbiAgICAgICAgICAgIHRoaXMub2Zmc2V0Q29sbGlkZXJYID0gcmVmLm9mZnNldENvbGxpZGVyWDtcclxuICAgICAgICAgICAgdGhpcy5vZmZzZXRDb2xsaWRlclkgPSByZWYub2Zmc2V0Q29sbGlkZXJZO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyU2NhbGVGYWt0b3IgPSByZWYuY29sbGlkZXJTY2FsZUZha3RvcjtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcihuZXcgxpIuVmVjdG9yMih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKyAocmVmLm9mZnNldENvbGxpZGVyWCAqIHRoaXMubXR4TG9jYWwuc2NhbGluZy54KSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi55ICsgKHJlZi5vZmZzZXRDb2xsaWRlclkgKiB0aGlzLm10eExvY2FsLnNjYWxpbmcueSkpLCAoKHRoaXMubXR4TG9jYWwuc2NhbGluZy54ICogdGhpcy5pZGxlU2NhbGUpIC8gMikgKiB0aGlzLmNvbGxpZGVyU2NhbGVGYWt0b3IsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgc3VwZXIudXBkYXRlKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVCZWhhdmlvdXIoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZSh0aGlzLm1vdmVEaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbmVteVBvc2l0aW9uKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXREYW1hZ2UoX3ZhbHVlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuZ2V0RGFtYWdlKF92YWx1ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuaXNBZ2dyZXNzaXZlID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkb0tub2NrYmFjayhfYm9keTogRW50aXR5LkVudGl0eSk6IHZvaWQge1xyXG4gICAgICAgICAgICAvLyAoPFBsYXllci5QbGF5ZXI+X2JvZHkpLmdldEtub2NrYmFjayh0aGlzLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2UsIF9wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG1vdmUoX2RpcmVjdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICAvLyB0aGlzLm1vdmVEaXJlY3Rpb24uYWRkKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc0FnZ3Jlc3NpdmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gdGhpcy5tb3ZlRGlyZWN0aW9uLnN1YnRyYWN0KF9kaXJlY3Rpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBtb3ZlU2ltcGxlKF90YXJnZXQ6IMaSLlZlY3RvcjIpOiDGki5WZWN0b3IyIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBfdGFyZ2V0O1xyXG4gICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldC50b1ZlY3RvcjMoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG1vdmVBd2F5KF90YXJnZXQ6IMaSLlZlY3RvcjIpOiDGki5WZWN0b3IyIHtcclxuICAgICAgICAgICAgbGV0IG1vdmVTaW1wbGUgPSB0aGlzLm1vdmVTaW1wbGUoX3RhcmdldCk7XHJcbiAgICAgICAgICAgIG1vdmVTaW1wbGUueCAqPSAtMTtcclxuICAgICAgICAgICAgbW92ZVNpbXBsZS55ICo9IC0xO1xyXG4gICAgICAgICAgICByZXR1cm4gbW92ZVNpbXBsZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkaWUoKSB7XHJcbiAgICAgICAgICAgIHN1cGVyLmRpZSgpO1xyXG4gICAgICAgICAgICBHYW1lLmN1cnJlbnRSb29tLmVuZW15Q291bnRNYW5hZ2VyLm9uRW5lbXlEZWF0aCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNvbGxpZGUoX2RpcmVjdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBsZXQga25vY2tiYWNrID0gdGhpcy5jdXJyZW50S25vY2tiYWNrLmNsb25lO1xyXG4gICAgICAgICAgICBpZiAoa25vY2tiYWNrLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiZGlyZWN0aW9uOiBcIiArIGtub2NrYmFjay5tYWduaXR1ZGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLmFkZChrbm9ja2JhY2spO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKChHYW1lLmRlbHRhVGltZSAqIHRoaXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG4gICAgICAgICAgICAgICAga25vY2tiYWNrLnNjYWxlKChHYW1lLmRlbHRhVGltZSAqIHRoaXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBzdXBlci5jb2xsaWRlKF9kaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBhdmF0YXI6IFBsYXllci5QbGF5ZXJbXSA9ICg8UGxheWVyLlBsYXllcltdPkdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuUExBWUVSKSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgYXZhdGFyQ29sbGlkZXJzOiBDb2xsaWRlci5Db2xsaWRlcltdID0gW107XHJcbiAgICAgICAgICAgICAgICBhdmF0YXIuZm9yRWFjaCgoZWxlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGF2YXRhckNvbGxpZGVycy5wdXNoKCg8UGxheWVyLlBsYXllcj5lbGVtKS5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZUNvbGxpc2lvbihhdmF0YXJDb2xsaWRlcnMsIF9kaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNhbk1vdmVYICYmIHRoaXMuY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY2FuTW92ZVggJiYgIXRoaXMuY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgICAgICBfZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoX2RpcmVjdGlvbi54LCAwLCBfZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghdGhpcy5jYW5Nb3ZlWCAmJiB0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIF9kaXJlY3Rpb24ueSwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc3VidHJhY3Qoa25vY2tiYWNrKTtcclxuICAgICAgICAgICAgICAgIGlmIChrbm9ja2JhY2subWFnbml0dWRlID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwia25vY2tiYWNrOiBcIiArIGtub2NrYmFjay5tYWduaXR1ZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiZGlyZWN0aW9uOiBcIiArIF9kaXJlY3Rpb24ubWFnbml0dWRlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5yZWR1Y2VLbm9ja2JhY2soKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteUR1bWIgZXh0ZW5kcyBFbmVteSB7XHJcbiAgICAgICAgcHVibGljIGZsb2NraW5nOiBGbG9ja2luZ0JlaGF2aW91ciA9IG5ldyBGbG9ja2luZ0JlaGF2aW91cih0aGlzLCAyLCAyLCAwLjEsIDEsIDEsIDEsIDAsIDEpO1xyXG4gICAgICAgIHByaXZhdGUgYWdncmVzc2l2ZURpc3RhbmNlOiBudW1iZXIgPSAzICogMztcclxuICAgICAgICBwcml2YXRlIHN0YW1pbmE6IEFiaWxpdHkuQ29vbGRvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93bigxODApO1xyXG4gICAgICAgIHByaXZhdGUgcmVjb3ZlcjogQWJpbGl0eS5Db29sZG93biA9IG5ldyBBYmlsaXR5LkNvb2xkb3duKDYwKTtcclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGVTcXVhcmVkO1xyXG4gICAgICAgICAgICB0aGlzLmZsb2NraW5nLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICAvL1RPRE86IHNldCB0byAzIGFmdGVyIHRlc3RpbmdcclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgdGhpcy5hZ2dyZXNzaXZlRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNBZ2dyZXNzaXZlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5pc0FnZ3Jlc3NpdmUgJiYgIXRoaXMucmVjb3Zlci5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmVoYXZpb3VyKCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jdXJyZW50QmVoYXZpb3VyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5zdGFtaW5hLmhhc0Nvb2xEb3duICYmICF0aGlzLnJlY292ZXIuaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFtaW5hLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhbWluYS5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLmZsb2NraW5nLmdldE1vdmVWZWN0b3IoKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhbWluYS5nZXRDdXJyZW50Q29vbGRvd24gPT0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWNvdmVyLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuSURMRTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15U21hc2ggZXh0ZW5kcyBFbmVteSB7XHJcbiAgICAgICAgY29vbERvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93big1KTtcclxuICAgICAgICBhdmF0YXJzOiBQbGF5ZXIuUGxheWVyW10gPSBbXTtcclxuICAgICAgICByYW5kb21QbGF5ZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpO1xyXG4gICAgICAgIGN1cnJlbnRCZWhhdmlvdXI6IEVudGl0eS5CRUhBVklPVVIgPSBFbnRpdHkuQkVIQVZJT1VSLklETEU7XHJcblxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFycyA9IFtHYW1lLmF2YXRhcjEsIEdhbWUuYXZhdGFyMl07XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gKDxQbGF5ZXIuUGxheWVyPnRoaXMuYXZhdGFyc1t0aGlzLnJhbmRvbVBsYXllcl0pLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGU7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QmVoYXZpb3VyID09IEVudGl0eS5CRUhBVklPVVIuQVRUQUNLICYmIHRoaXMuZ2V0Q3VycmVudEZyYW1lID49ICg8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25Db250YWluZXIuYW5pbWF0aW9uc1tcImF0dGFja1wiXSkuZnJhbWVzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuSURMRTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZGlzdGFuY2UgPCA0ICYmICF0aGlzLmNvb2xEb3duLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvb2xEb3duLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuQVRUQUNLO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvb2xEb3duLmhhc0Nvb2xEb3duICYmIHRoaXMuY3VycmVudEJlaGF2aW91ciAhPSBFbnRpdHkuQkVIQVZJT1VSLklETEUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuSURMRTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QmVoYXZpb3VyICE9IEVudGl0eS5CRUhBVklPVVIuRk9MTE9XKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZVNpbXBsZSh0aGlzLnRhcmdldCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuQVRUQUNLOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuQVRUQUNLKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15RGFzaCBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICBwcm90ZWN0ZWQgZGFzaCA9IG5ldyBBYmlsaXR5LkRhc2godGhpcy5uZXRJZCwgMTIsIDEsIDUgKiA2MCwgMyk7XHJcbiAgICAgICAgbGFzdE1vdmVEaXJlY2l0b246IEdhbWUuxpIuVmVjdG9yMztcclxuICAgICAgICBkYXNoQ291bnQ6IG51bWJlciA9IDE7XHJcbiAgICAgICAgYXZhdGFyczogUGxheWVyLlBsYXllcltdID0gW107XHJcbiAgICAgICAgcmFuZG9tUGxheWVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLmZsb2NraW5nID0gbmV3IEZsb2NraW5nQmVoYXZpb3VyKHRoaXMsIDMsIDAuOCwgMS41LCAxLCAxLCAwLjEsIDApO1xyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgYmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhcnMgPSBbR2FtZS5hdmF0YXIxLCBHYW1lLmF2YXRhcjJdXHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gKDxQbGF5ZXIuUGxheWVyPnRoaXMuYXZhdGFyc1t0aGlzLnJhbmRvbVBsYXllcl0pLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGVTcXVhcmVkO1xyXG4gICAgICAgICAgICB0aGlzLmZsb2NraW5nLnVwZGF0ZSgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLmRhc2guaGFzQ29vbGRvd24oKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKE1hdGgucmFuZG9tKCkgKiAxMDAgPCAwLjEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGFzaC5kb0FiaWxpdHkoKTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5tb3ZlRGlyZWN0aW9uLm1hZ25pdHVkZVNxdWFyZWQgPiAwLjAwMDUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuV0FMSyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5iZWhhdmlvdXIoKTtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmRhc2guZG9lc0FiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5mbG9ja2luZy5nZXRNb3ZlVmVjdG9yKCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdE1vdmVEaXJlY2l0b24gPSB0aGlzLm1vdmVEaXJlY3Rpb247XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLklETEU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRkxFRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZUF3YXkodGhpcy50YXJnZXQpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteVBhdHJvbCBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICBwYXRyb2xQb2ludHM6IMaSLlZlY3RvcjJbXSA9IFtuZXcgxpIuVmVjdG9yMigwLCA0KSwgbmV3IMaSLlZlY3RvcjIoNSwgMCldO1xyXG4gICAgICAgIHdhaXRUaW1lOiBudW1iZXIgPSAxMDAwO1xyXG4gICAgICAgIGN1cnJlblBvaW50SW5kZXg6IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMucGF0cm9sKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwYXRyb2woKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKMaSLlZlY3RvcjMuU1VNKHRoaXMucGF0cm9sUG9pbnRzW3RoaXMuY3VycmVuUG9pbnRJbmRleF0udG9WZWN0b3IzKCksIEdhbWUuY3VycmVudFJvb20ubXR4TG9jYWwudHJhbnNsYXRpb24pKSA+IDAuMykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5tb3ZlU2ltcGxlKCjGki5WZWN0b3IyLlNVTSh0aGlzLnBhdHJvbFBvaW50c1t0aGlzLmN1cnJlblBvaW50SW5kZXhdLCBHYW1lLmN1cnJlbnRSb29tLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKSkpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVuUG9pbnRJbmRleCArIDEgPCB0aGlzLnBhdHJvbFBvaW50cy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW5Qb2ludEluZGV4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlblBvaW50SW5kZXggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sIHRoaXMud2FpdFRpbWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlTaG9vdCBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICB2aWV3UmFkaXVzOiBudW1iZXIgPSAzO1xyXG4gICAgICAgIGdvdFJlY29nbml6ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy53ZWFwb24gPSBuZXcgV2VhcG9ucy5XZWFwb24oNjAsIDEsIEJ1bGxldHMuQlVMTEVUVFlQRS5TVEFOREFSRCwgMiwgdGhpcy5uZXRJZCwgV2VhcG9ucy5BSU0uTk9STUFMKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbikudG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZSA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldC50b1ZlY3RvcjMoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLm1hZ25pdHVkZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZSA8IDUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZUF3YXkodGhpcy50YXJnZXQpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nb3RSZWNvZ25pemVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNob290KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0RGFtYWdlKF92YWx1ZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmdldERhbWFnZShfdmFsdWUpO1xyXG4gICAgICAgICAgICB0aGlzLmdvdFJlY29nbml6ZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNob290KF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICBsZXQgX2RpcmVjdGlvbiA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldC50b1ZlY3RvcjMoMCksIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ubWFnbml0dWRlIDwgMyB8fCB0aGlzLmdvdFJlY29nbml6ZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMud2VhcG9uLnNob290KHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIF9kaXJlY3Rpb24sIF9uZXRJZCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAvLyBpZiAodGhpcy53ZWFwb24uY3VycmVudEF0dGFja0NvdW50ID4gMCAmJiBfZGlyZWN0aW9uLm1hZ25pdHVkZSA8IHRoaXMudmlld1JhZGl1cykge1xyXG4gICAgICAgICAgICAvLyAgICAgX2RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgLy8gICAgIC8vIGxldCBidWxsZXQ6IEJ1bGxldHMuQnVsbGV0ID0gbmV3IEJ1bGxldHMuSG9taW5nQnVsbGV0KG5ldyDGki5WZWN0b3IyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpLCBfZGlyZWN0aW9uLCBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKSwgX25ldElkKTtcclxuICAgICAgICAgICAgLy8gICAgIGJ1bGxldC5vd25lciA9IHRoaXMudGFnO1xyXG4gICAgICAgICAgICAvLyAgICAgYnVsbGV0LmZseURpcmVjdGlvbi5zY2FsZSgxIC8gR2FtZS5mcmFtZVJhdGUgKiBidWxsZXQuc3BlZWQpO1xyXG4gICAgICAgICAgICAvLyAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChidWxsZXQpO1xyXG4gICAgICAgICAgICAvLyAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25CdWxsZXRBdEVuZW15KGJ1bGxldC5uZXRJZCwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgdGhpcy53ZWFwb24uY3VycmVudEF0dGFja0NvdW50LS07XHJcbiAgICAgICAgICAgIC8vICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTdW1tb25vckFkZHMgZXh0ZW5kcyBFbmVteURhc2gge1xyXG4gICAgICAgIGF2YXRhcjogUGxheWVyLlBsYXllcjtcclxuICAgICAgICByYW5kb21QbGF5ZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfdGFyZ2V0OiBQbGF5ZXIuUGxheWVyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyID0gX3RhcmdldDtcclxuICAgICAgICAgICAgdGhpcy5mbG9ja2luZyA9IG5ldyBGbG9ja2luZ0JlaGF2aW91cih0aGlzLCAzLCAwLjgsIDEuNSwgMSwgMSwgMC4xLCAwKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gdGhpcy5hdmF0YXIubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGU7XHJcblxyXG4gICAgICAgICAgICBpZiAoZGlzdGFuY2UgPiA1KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVztcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoZGlzdGFuY2UgPCAzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRhc2guZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5mbG9ja2luZy51cGRhdGUoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5kYXNoLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdE1vdmVEaXJlY2l0b24gPSB0aGlzLm1vdmVEaXJlY3Rpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMuZmxvY2tpbmcuZ2V0TW92ZVZlY3RvcigpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRkxFRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZUF3YXkodGhpcy50YXJnZXQpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgLy8gZXhwb3J0IGNsYXNzIEVuZW15Q2lyY2xlIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgLy8gICAgIGRpc3RhbmNlOiBudW1iZXIgPSA1O1xyXG5cclxuICAgIC8vICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3RlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyKSB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyKF9uYW1lLCBfcHJvcGVydGllcywgX3Bvc2l0aW9uKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIG1vdmUoKTogdm9pZCB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyLm1vdmUoKTtcclxuICAgIC8vICAgICAgICAgdGhpcy5tb3ZlQ2lyY2xlKCk7XHJcbiAgICAvLyAgICAgfVxyXG5cclxuICAgIC8vICAgICBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpOiB2b2lkIHtcclxuICAgIC8vICAgICAgICAgc3VwZXIubGlmZXNwYW4oX2dyYXBoKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIGFzeW5jIG1vdmVDaXJjbGUoKSB7XHJcbiAgICAvLyAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnRhcmdldCk7XHJcbiAgICAvLyAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjEgPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgIC8vICAgICAgICAgLy8gbGV0IGRpc3RhbmNlUGxheWVyMiA9IHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKEdhbWUucGxheWVyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICBpZiAoZGlzdGFuY2VQbGF5ZXIxID4gdGhpcy5kaXN0YW5jZSkge1xyXG4gICAgLy8gICAgICAgICAgICAgdGhpcy5tb3ZlU2ltcGxlKCk7XHJcbiAgICAvLyAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgZWxzZSB7XHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgZGVncmVlID0gQ2FsY3VsYXRpb24uY2FsY0RlZ3JlZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy50YXJnZXQpXHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgYWRkID0gMDtcclxuXHJcbiAgICAvLyAgICAgICAgICAgICAvLyB3aGlsZSAoZGlzdGFuY2VQbGF5ZXIxIDw9IHRoaXMuZGlzdGFuY2UpIHtcclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgSW5wdXRTeXN0ZW0uY2FsY1Bvc2l0aW9uRnJvbURlZ3JlZShkZWdyZWUgKyBhZGQsIHRoaXMuZGlzdGFuY2UpLnRvVmVjdG9yMygwKSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBkaXJlY3Rpb24uc2NhbGUoKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKGRpcmVjdGlvbiwgdHJ1ZSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgYWRkICs9IDU7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyB9XHJcblxyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgfVxyXG4gICAgLy8gfVxyXG59IiwibmFtZXNwYWNlIEludGVyZmFjZXMge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJU3Bhd25hYmxlIHtcclxuICAgICAgICBsaWZldGltZT86IG51bWJlcjtcclxuICAgICAgICBkZXNwYXduKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJS25vY2tiYWNrYWJsZSB7XHJcbiAgICAgICAgZG9Lbm9ja2JhY2soX2JvZHk6IEVudGl0eS5FbnRpdHkpOiB2b2lkO1xyXG4gICAgICAgIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUtpbGxhYmxlIHtcclxuICAgICAgICBvbkRlYXRoKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRGFtYWdlYWJsZSB7XHJcbiAgICAgICAgZ2V0RGFtYWdlKCk6IHZvaWQ7XHJcbiAgICB9XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElBdHRyaWJ1dGVWYWx1ZVBheWxvYWQge1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXIgfCBib29sZWFuO1xyXG4gICAgICAgIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU5ldHdvcmthYmxlIHtcclxuICAgICAgICBuZXRJZDogbnVtYmVyO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU5ldHdvcmtPYmplY3RzIHtcclxuICAgICAgICBuZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIG5ldE9iamVjdE5vZGU6IEdhbWUuxpIuTm9kZTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElJbnB1dEJ1bGxldFBheWxvYWQge1xyXG4gICAgICAgIHRpY2s6IG51bWJlcjtcclxuICAgICAgICBpbnB1dFZlY3RvcjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElJbnB1dEF2YXRhclBheWxvYWQge1xyXG4gICAgICAgIHRpY2s6IG51bWJlcjtcclxuICAgICAgICBpbnB1dFZlY3RvcjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgICAgIGRvZXNBYmlsaXR5OiBib29sZWFuO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSVN0YXRlUGF5bG9hZCB7XHJcbiAgICAgICAgdGljazogbnVtYmVyO1xyXG4gICAgICAgIHBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjM7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZXhwb3J0IGludGVyZmFjZSBCdWxsZXRJbmZvcm1hdGlvbiB7XHJcbiAgICAvLyAgICAgc3BlZWQ6IG51bWJlcjtcclxuICAgIC8vICAgICBoaXRQb2ludDogbnVtYmVyO1xyXG4gICAgLy8gICAgIGxpZmVUaW1lOiBudW1iZXI7XHJcbiAgICAvLyAgICAga25vY2tiYWNrRm9yY2U6IG51bWJlcjtcclxuICAgIC8vICAgICBwYXNzdGhyb3VnaEVuZW15OiBudW1iZXI7XHJcbiAgICAvLyAgICAgcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgIC8vICAgICBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgIC8vICAgICByb3RhdGlvbkRlZzogbnVtYmVyO1xyXG4gICAgLy8gICAgIGhvbWluZ1RhcmdldD86IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgIC8vIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElSb29tRXhpdHMge1xyXG4gICAgICAgIG5vcnRoOiBib29sZWFuO1xyXG4gICAgICAgIGVhc3Q6IGJvb2xlYW47XHJcbiAgICAgICAgc291dGg6IGJvb2xlYW47XHJcbiAgICAgICAgd2VzdDogYm9vbGVhbjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElSb29tIHtcclxuICAgICAgICBjb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHJvb21TaXplOiBudW1iZXI7XHJcbiAgICAgICAgZXhpdHM6IElSb29tRXhpdHM7XHJcbiAgICAgICAgcm9vbVR5cGU6IEdlbmVyYXRpb24uUk9PTVRZUEU7XHJcbiAgICAgICAgdHJhbnNsYXRpb246IEdhbWUuxpIuVmVjdG9yMztcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElNaW5pbWFwSW5mb3Mge1xyXG4gICAgICAgIGNvb3JkczogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHJvb21UeXBlOiBHZW5lcmF0aW9uLlJPT01UWVBFO1xyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEl0ZW1zIHtcclxuICAgIGV4cG9ydCBlbnVtIElURU1JRCB7XHJcbiAgICAgICAgSUNFQlVDS0VUQ0hBTExFTkdFLFxyXG4gICAgICAgIERNR1VQLFxyXG4gICAgICAgIFNQRUVEVVAsXHJcbiAgICAgICAgUFJPSkVDVElMRVNVUCxcclxuICAgICAgICBIRUFMVEhVUCxcclxuICAgICAgICBTQ0FMRVVQLFxyXG4gICAgICAgIFNDQUxFRE9XTixcclxuICAgICAgICBBUk1PUlVQLFxyXG4gICAgICAgIEhPTUVDT01JTkcsXHJcbiAgICAgICAgVE9YSUNSRUxBVElPTlNISVAsXHJcbiAgICAgICAgVkFNUFksXHJcbiAgICAgICAgU0xPV1lTTE9XLFxyXG4gICAgICAgIFRIT1JTSEFNTUVSLFxyXG4gICAgICAgIEdFVFNUUk9OS08sXHJcbiAgICAgICAgR0VUV0VBS08sXHJcbiAgICAgICAgWklQWkFQXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRJY2VCdWNrZXQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0RG1nVXA6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0SGVhbHRoVXA6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VG94aWNSZWxhdGlvbnNoaXA6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U3BlZWRVcDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuXHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgSXRlbSBleHRlbmRzIEdhbWUuxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuSVRFTTtcclxuICAgICAgICBpZDogSVRFTUlEO1xyXG4gICAgICAgIHB1YmxpYyByYXJpdHk6IFJBUklUWTtcclxuICAgICAgICBwdWJsaWMgbmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgZGVzY3JpcHRpb246IHN0cmluZztcclxuICAgICAgICBwdWJsaWMgaW1nU3JjOiBzdHJpbmc7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcjtcclxuICAgICAgICB0cmFuc2Zvcm06IMaSLkNvbXBvbmVudFRyYW5zZm9ybSA9IG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKTtcclxuICAgICAgICBwcml2YXRlIHBvc2l0aW9uOiDGki5WZWN0b3IyOyBnZXQgZ2V0UG9zaXRpb24oKTogxpIuVmVjdG9yMiB7IHJldHVybiB0aGlzLnBvc2l0aW9uIH1cclxuICAgICAgICBidWZmOiBCdWZmLkJ1ZmZbXSA9IFtdO1xyXG4gICAgICAgIHByb3RlY3RlZCBjaGFuZ2VkVmFsdWU6IG51bWJlcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBJVEVNSUQsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihJVEVNSURbX2lkXSk7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMubmV0SWQgPSBOZXR3b3JraW5nLklkTWFuYWdlcihfbmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IMaSLk1lc2hRdWFkKCkpKTtcclxuICAgICAgICAgICAgbGV0IG1hdGVyaWFsOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIndoaXRlXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChtYXRlcmlhbCkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5idWZmLnB1c2godGhpcy5nZXRCdWZmQnlJZCgpKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRUZXh0dXJlQnlJZCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNsb25lKCk6IEl0ZW0ge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGFkZFJhcml0eUJ1ZmYoKSB7XHJcbiAgICAgICAgICAgIGxldCBidWZmID0gbmV3IEJ1ZmYuUmFyaXR5QnVmZih0aGlzLnJhcml0eSk7XHJcbiAgICAgICAgICAgIGJ1ZmYuYWRkVG9JdGVtKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGdldEJ1ZmZCeUlkKCk6IEJ1ZmYuQnVmZiB7XHJcbiAgICAgICAgICAgIGxldCB0ZW1wOiBJdGVtcy5CdWZmSXRlbSA9IGdldEJ1ZmZJdGVtQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5UT1hJQ1JFTEFUSU9OU0hJUDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJ1ZmYuRGFtYWdlQnVmZihCdWZmLkJVRkZJRC5QT0lTT04sIHRlbXAuZHVyYXRpb24sIHRlbXAudGlja1JhdGUsIHRlbXAudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVkFNUFk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCdWZmLkRhbWFnZUJ1ZmYoQnVmZi5CVUZGSUQuQkxFRURJTkcsIHRlbXAuZHVyYXRpb24sIHRlbXAudGlja1JhdGUsIHRlbXAudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0xPV1lTTE9XOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQnVmZi5BdHRyaWJ1dGVzQnVmZihCdWZmLkJVRkZJRC5TTE9XLCB0ZW1wLmR1cmF0aW9uLCB0ZW1wLnRpY2tSYXRlLCB0ZW1wLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkdFVFNUUk9OS086XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCdWZmLkF0dHJpYnV0ZXNCdWZmKEJ1ZmYuQlVGRklELlNDQUxFVVAsIHRlbXAuZHVyYXRpb24sIHRlbXAudGlja1JhdGUsIHRlbXAudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuR0VUV0VBS086XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCdWZmLkF0dHJpYnV0ZXNCdWZmKEJ1ZmYuQlVGRklELlNDQUxFRE9XTiwgdGVtcC5kdXJhdGlvbiwgdGVtcC50aWNrUmF0ZSwgdGVtcC52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgbG9hZFRleHR1cmUoX3RleHR1cmU6IMaSLlRleHR1cmVJbWFnZSk6IHZvaWQge1xyXG4gICAgICAgICAgICBsZXQgbmV3VHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICAgICAgICAgIG5ld1R4dCA9IF90ZXh0dXJlO1xyXG4gICAgICAgICAgICBsZXQgbmV3Q29hdDogxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkID0gbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCgpO1xyXG4gICAgICAgICAgICBuZXdDb2F0LnRleHR1cmUgPSBuZXdUeHQ7XHJcbiAgICAgICAgICAgIGxldCBuZXdNdHI6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibXRyXCIsIMaSLlNoYWRlckZsYXRUZXh0dXJlZCwgbmV3Q29hdCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudE1hdGVyaWFsKS5tYXRlcmlhbCA9IG5ld010cjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIHNldFRleHR1cmVCeUlkKCkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELklDRUJVQ0tFVENIQUxMRU5HRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dEljZUJ1Y2tldCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5ETUdVUDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dERtZ1VwKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNQRUVEVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSh0eHRTcGVlZFVwKTtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuUFJPSkVDVElMRVNVUDpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSEVBTFRIVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSh0eHRIZWFsdGhVcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNDQUxFVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNDQUxFRE9XTjpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5BUk1PUlVQOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkhPTUVDT01JTkc6XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5UT1hJQ1JFTEFUSU9OU0hJUDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dFRveGljUmVsYXRpb25zaGlwKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlZBTVBZOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlRIT1JTSEFNTUVSOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldFBvc2l0aW9uKF9wb3NpdGlvbjogxpIuVmVjdG9yMikge1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uID0gX3Bvc2l0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gX3Bvc2l0aW9uLnRvVmVjdG9yMygwLjAxKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5zZXRQb3NpdGlvbihfcG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgc3Bhd24oKTogdm9pZCB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25JdGVtKHRoaXMuaWQsIHRoaXMucG9zaXRpb24sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgZGVzcGF3bigpOiB2b2lkIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5yZW1vdmVJdGVtKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGFkZEl0ZW1Ub0VudGl0eShfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKSB7XHJcbiAgICAgICAgICAgIF9hdmF0YXIuaXRlbXMucHVzaCh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyByZW1vdmVJdGVtVG9FbnRpdHkoX2F2YXRhcjogUGxheWVyLlBsYXllcikge1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBJbnRlcm5hbEl0ZW0gZXh0ZW5kcyBJdGVtIHtcclxuICAgICAgICB2YWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIGNob29zZW5PbmVOZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogSVRFTUlELCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gZ2V0SW50ZXJuYWxJdGVtQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgaWYgKGl0ZW0gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5hbWUgPSBpdGVtLm5hbWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlID0gaXRlbS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGVzY3JpcHRpb24gPSBpdGVtLmRlc2NyaXB0aW9uO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbWdTcmMgPSBpdGVtLmltZ1NyYztcclxuICAgICAgICAgICAgICAgIHRoaXMucmFyaXR5ID0gaXRlbS5yYXJpdHk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkUmFyaXR5QnVmZigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldENob29zZW5PbmVOZXRJZChfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLmNob29zZW5PbmVOZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBhZGRJdGVtVG9FbnRpdHkoX2F2YXRhcjogUGxheWVyLlBsYXllcikge1xyXG4gICAgICAgICAgICBzdXBlci5hZGRJdGVtVG9FbnRpdHkoX2F2YXRhcik7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlc0J5SWQoX2F2YXRhciwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuZGVzcGF3bigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHJlbW92ZUl0ZW1Ub0VudGl0eShfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlc0J5SWQoX2F2YXRhciwgZmFsc2UpO1xyXG4gICAgICAgICAgICBfYXZhdGFyLml0ZW1zLnNwbGljZShfYXZhdGFyLml0ZW1zLmluZGV4T2YoX2F2YXRhci5pdGVtcy5maW5kKGl0ZW0gPT4gaXRlbS5pZCA9PSB0aGlzLmlkKSksIDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNsb25lKCk6IEl0ZW0ge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEludGVybmFsSXRlbSh0aGlzLmlkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBzZXRBdHRyaWJ1dGVzQnlJZChfYXZhdGFyOiBQbGF5ZXIuUGxheWVyLCBfYWRkOiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSUNFQlVDS0VUQ0hBTExFTkdFOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlZFZhbHVlID0gX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uIC0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uID0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiArPSB0aGlzLmNoYW5nZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uLCB0eXBlOiBFbnRpdHkuQVRUUklCVVRFVFlQRS5DT09MRE9XTlJFRFVDVElPTiB9LCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkRNR1VQOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMgKz0gdGhpcy52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzIC09IHRoaXMudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLkFUVEFDS1BPSU5UUyB9LCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNQRUVEVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VkVmFsdWUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQsIHRoaXMudmFsdWUpIC0gX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCAtPSB0aGlzLmNoYW5nZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkLCB0eXBlOiBFbnRpdHkuQVRUUklCVVRFVFlQRS5TUEVFRCB9LCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlBST0pFQ1RJTEVTVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24ucHJvamVjdGlsZUFtb3VudCArPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uLnByb2plY3RpbGVBbW91bnQgLT0gdGhpcy52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJXZWFwb24oX2F2YXRhci53ZWFwb24sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSEVBTFRIVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VkVmFsdWUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzLCB0aGlzLnZhbHVlKSAtIF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50TWF4UG9pbnRzID0gX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyA9IENhbGN1bGF0aW9uLmFkZFBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYW1vdW50ID0gX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAtIGN1cnJlbnRNYXhQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgKz0gYW1vdW50O1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgLT0gdGhpcy5jaGFuZ2VkVmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50TWF4UG9pbnRzID0gX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFtb3VudCA9IF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgLSBjdXJyZW50TWF4UG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC09IGFtb3VudDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogX2F2YXRhci5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuSEVBTFRIUE9JTlRTIH0sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMsIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLk1BWEhFQUxUSFBPSU5UUyB9LCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNDQUxFVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VkVmFsdWUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpIC0gX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSAtPSB0aGlzLmNoYW5nZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuU0NBTEUgfSwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5TQ0FMRURPV046XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VkVmFsdWUgPSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpIC0gX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUgPSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSAtPSB0aGlzLmNoYW5nZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuU0NBTEUgfSwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5BUk1PUlVQOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5hcm1vciArPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5hcm1vciAtPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuYXJtb3IsIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLkFSTU9SIH0sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSE9NRUNPTUlORzpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2F2YXRhciBpbnN0YW5jZW9mIFBsYXllci5SYW5nZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uLmFpbVR5cGUgPSBXZWFwb25zLkFJTS5IT01JTkc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLndlYXBvbi5haW1UeXBlID0gV2VhcG9ucy5BSU0uTk9STUFMO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKF9hdmF0YXIud2VhcG9uLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5USE9SU0hBTU1FUjpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2F2YXRhciBpbnN0YW5jZW9mIFBsYXllci5SYW5nZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJjb29sZG93blRpbWVcIiwgX2F2YXRhci53ZWFwb24uZ2V0Q29vbERvd24uZ2V0TWF4Q29vbERvd24udG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiYWltVHlwZVwiLCBXZWFwb25zLkFJTVtfYXZhdGFyLndlYXBvbi5haW1UeXBlXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiYnVsbGV0VHlwZVwiLCBCdWxsZXRzLkJVTExFVFRZUEVbX2F2YXRhci53ZWFwb24uYnVsbGV0VHlwZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInByb2plY3RpbGVBbW91bnRcIiwgX2F2YXRhci53ZWFwb24ucHJvamVjdGlsZUFtb3VudC50b1N0cmluZygpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uLmdldENvb2xEb3duLnNldE1heENvb2xEb3duID0gMTAwICogNjA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uLmFpbVR5cGUgPSBXZWFwb25zLkFJTS5OT1JNQUw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uLmJ1bGxldFR5cGUgPSBCdWxsZXRzLkJVTExFVFRZUEUuVEhPUlNIQU1NRVI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uLnByb2plY3RpbGVBbW91bnQgPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLndlYXBvbi5jYW5TaG9vdCA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhcldlYXBvbihfYXZhdGFyLndlYXBvbiwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuWklQWkFQOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJdGVtOiBCdWxsZXRzLlppcFphcE9iamVjdCA9IG5ldyBCdWxsZXRzLlppcFphcE9iamVjdChfYXZhdGFyLm5ldElkLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zcGF3bigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB6aXB6YXAgPSA8QnVsbGV0cy5aaXBaYXBPYmplY3Q+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoaXRlbSA9PiAoPEJ1bGxldHMuWmlwWmFwT2JqZWN0Pml0ZW0pLnR5cGUgPT0gQnVsbGV0cy5CVUxMRVRUWVBFLlpJUFpBUCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHppcHphcC5kZXNwYXduKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCdWZmSXRlbSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXI7XHJcbiAgICAgICAgdGlja1JhdGU6IG51bWJlcjtcclxuICAgICAgICBkdXJhdGlvbjogbnVtYmVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IElURU1JRCwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX25ldElkKTtcclxuICAgICAgICAgICAgbGV0IHRlbXAgPSBnZXRCdWZmSXRlbUJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IHRlbXAubmFtZTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHRlbXAudmFsdWU7XHJcbiAgICAgICAgICAgIHRoaXMudGlja1JhdGUgPSB0ZW1wLnRpY2tSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLmR1cmF0aW9uID0gdGVtcC5kdXJhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5pbWdTcmMgPSB0ZW1wLmltZ1NyYztcclxuICAgICAgICAgICAgdGhpcy5yYXJpdHkgPSB0ZW1wLnJhcml0eTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkUmFyaXR5QnVmZigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWRkSXRlbVRvRW50aXR5KF9hdmF0YXI6IFBsYXllci5QbGF5ZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuYWRkSXRlbVRvRW50aXR5KF9hdmF0YXIpO1xyXG4gICAgICAgICAgICB0aGlzLnNldEJ1ZmZCeUlkKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICB0aGlzLmRlc3Bhd24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjbG9uZSgpOiBCdWZmSXRlbSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgQnVmZkl0ZW0odGhpcy5pZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRCdWZmQnlJZChfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVE9YSUNSRUxBVElPTlNISVA6XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0J1ZmYgPSB0aGlzLmJ1ZmYuZmluZChidWZmID0+IGJ1ZmYuaWQgPT0gQnVmZi5CVUZGSUQuUE9JU09OKS5jbG9uZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0J1ZmYuZHVyYXRpb24gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgKDxCdWZmLkRhbWFnZUJ1ZmY+bmV3QnVmZikudmFsdWUgPSAwLjU7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3QnVmZi5hZGRUb0VudGl0eShfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRJbnRlcm5hbEl0ZW1CeUlkKF9pZDogSVRFTUlEKTogSXRlbXMuSW50ZXJuYWxJdGVtIHtcclxuICAgICAgICByZXR1cm4gR2FtZS5pbnRlcm5hbEl0ZW1KU09OLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IF9pZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldEJ1ZmZJdGVtQnlJZChfaWQ6IElURU1JRCk6IEl0ZW1zLkJ1ZmZJdGVtIHtcclxuICAgICAgICByZXR1cm4gR2FtZS5idWZmSXRlbUpTT04uZmluZChpdGVtID0+IGl0ZW0uaWQgPT0gX2lkKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIEl0ZW1HZW5lcmF0b3Ige1xyXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGl0ZW1Qb29sOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZmlsbFBvb2woKSB7XHJcbiAgICAgICAgICAgIEdhbWUuaW50ZXJuYWxJdGVtSlNPTi5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtUG9vbC5wdXNoKG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oaXRlbS5pZCkpXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBHYW1lLmJ1ZmZJdGVtSlNPTi5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtUG9vbC5wdXNoKG5ldyBCdWZmSXRlbShpdGVtLmlkKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXRSYW5kb21JdGVtKCk6IEl0ZW1zLkl0ZW0ge1xyXG4gICAgICAgICAgICBsZXQgcG9zc2libGVJdGVtczogSXRlbXMuSXRlbVtdID0gW107XHJcbiAgICAgICAgICAgIHBvc3NpYmxlSXRlbXMgPSB0aGlzLmdldFBvc3NpYmxlSXRlbXMoKTtcclxuICAgICAgICAgICAgbGV0IHJhbmRvbUluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKHBvc3NpYmxlSXRlbXMubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICBsZXQgcmV0dXJuSXRlbSA9IHBvc3NpYmxlSXRlbXNbcmFuZG9tSW5kZXhdO1xyXG4gICAgICAgICAgICAvLyB0aGlzLml0ZW1Qb29sLnNwbGljZSh0aGlzLml0ZW1Qb29sLmluZGV4T2YocmV0dXJuSXRlbSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuSXRlbS5jbG9uZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXRSYW5kb21JdGVtQnlSYXJpdHkoX3Jhcml0eTogUkFSSVRZKTogSXRlbXMuSXRlbSB7XHJcbiAgICAgICAgICAgIGxldCBwb3NzaWJsZUl0ZW1zID0gdGhpcy5pdGVtUG9vbC5maWx0ZXIoaXRlbSA9PiBpdGVtLnJhcml0eSA9PSBfcmFyaXR5KTtcclxuICAgICAgICAgICAgbGV0IHJhbmRvbUluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKHBvc3NpYmxlSXRlbXMubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICBsZXQgcmV0dXJuSXRlbSA9IHBvc3NpYmxlSXRlbXNbcmFuZG9tSW5kZXhdO1xyXG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuSXRlbS5jbG9uZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgZ2V0UG9zc2libGVJdGVtcygpOiBJdGVtcy5JdGVtW10ge1xyXG4gICAgICAgICAgICBsZXQgY2hvc2VuUmFyaXR5OiBSQVJJVFkgPSB0aGlzLmdldFJhcml0eSgpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKGNob3NlblJhcml0eSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBSQVJJVFkuQ09NTU9OOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1Qb29sLmZpbHRlcihpdGVtID0+IGl0ZW0ucmFyaXR5ID09IFJBUklUWS5DT01NT04pO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBSQVJJVFkuUkFSRTpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtUG9vbC5maWx0ZXIoaXRlbSA9PiBpdGVtLnJhcml0eSA9PSBSQVJJVFkuUkFSRSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJBUklUWS5FUElDOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1Qb29sLmZpbHRlcihpdGVtID0+IGl0ZW0ucmFyaXR5ID09IFJBUklUWS5FUElDKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgUkFSSVRZLkxFR0VOREFSWTpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtUG9vbC5maWx0ZXIoaXRlbSA9PiBpdGVtLnJhcml0eSA9PSBSQVJJVFkuTEVHRU5EQVJZKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbVBvb2wuZmlsdGVyKGl0ZW0gPT4gaXRlbS5yYXJpdHkgPSBSQVJJVFkuQ09NTU9OKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgZ2V0UmFyaXR5KCk6IFJBUklUWSB7XHJcbiAgICAgICAgICAgIGxldCByYXJpdHlOdW1iZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMDApO1xyXG4gICAgICAgICAgICBpZiAocmFyaXR5TnVtYmVyID49IDUwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUkFSSVRZLkNPTU1PTjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmFyaXR5TnVtYmVyID49IDIwICYmIHJhcml0eU51bWJlciA8IDUwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUkFSSVRZLlJBUkU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJhcml0eU51bWJlciA+PSA1ICYmIHJhcml0eU51bWJlciA8IDIwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUkFSSVRZLkVQSUM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJhcml0eU51bWJlciA8IDUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBSQVJJVFkuTEVHRU5EQVJZO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBSQVJJVFkuQ09NTU9OO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBSQVJJVFkge1xyXG4gICAgICAgIENPTU1PTixcclxuICAgICAgICBSQVJFLFxyXG4gICAgICAgIEVQSUMsXHJcbiAgICAgICAgTEVHRU5EQVJZXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQW5pbWF0aW9uR2VuZXJhdGlvbiB7XHJcbiAgICBleHBvcnQgbGV0IHR4dFJlZFRpY2tJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFJlZFRpY2tXYWxrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRTbWFsbFRpY2tJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNtYWxsVGlja1dhbGs6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dEJhdElkbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dFNrZWxldG9uSWRsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTa2VsZXRvbldhbGs6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dE9nZXJJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE9nZXJXYWxrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE9nZXJBdHRhY2s6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRTdW1tb25lcklkbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U3VtbW9uZXJTdW1tb246IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U3VtbW9uZXJUZWxlcG9ydDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuXHJcbiAgICBleHBvcnQgaW1wb3J0IMaSQWlkID0gRnVkZ2VBaWQ7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEFuaW1hdGlvbkNvbnRhaW5lciB7XHJcbiAgICAgICAgaWQ6IEVudGl0eS5JRDtcclxuICAgICAgICBhbmltYXRpb25zOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbnMgPSB7fTtcclxuICAgICAgICBzY2FsZTogW3N0cmluZywgbnVtYmVyXVtdID0gW107XHJcbiAgICAgICAgZnJhbWVSYXRlOiBbc3RyaW5nLCBudW1iZXJdW10gPSBbXTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCkge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gX2lkO1xyXG4gICAgICAgICAgICB0aGlzLmdldEFuaW1hdGlvbkJ5SWQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYWRkQW5pbWF0aW9uKF9hbmk6IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uLCBfc2NhbGU6IG51bWJlciwgX2ZyYW1lUmF0ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uc1tfYW5pLm5hbWVdID0gX2FuaTtcclxuICAgICAgICAgICAgdGhpcy5zY2FsZS5wdXNoKFtfYW5pLm5hbWUsIF9zY2FsZV0pO1xyXG4gICAgICAgICAgICB0aGlzLmZyYW1lUmF0ZS5wdXNoKFtfYW5pLm5hbWUsIF9mcmFtZVJhdGVdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEFuaW1hdGlvbkJ5SWQoKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuQkFUOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKGJhdElkbGUuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBiYXRJZGxlLmFuaW1hdGlvblNjYWxlLCBiYXRJZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5SRURUSUNLOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHJlZFRpY2tJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgcmVkVGlja0lkbGUuYW5pbWF0aW9uU2NhbGUsIHJlZFRpY2tJZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24ocmVkVGlja1dhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCByZWRUaWNrV2Fsay5hbmltYXRpb25TY2FsZSwgcmVkVGlja1dhbGsuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlNNQUxMVElDSzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihzbWFsbFRpY2tJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc21hbGxUaWNrSWRsZS5hbmltYXRpb25TY2FsZSwgc21hbGxUaWNrSWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHNtYWxsVGlja1dhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBzbWFsbFRpY2tXYWxrLmFuaW1hdGlvblNjYWxlLCBzbWFsbFRpY2tXYWxrLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5TS0VMRVRPTjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihza2VsZXRvbklkbGUuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBza2VsZXRvbklkbGUuYW5pbWF0aW9uU2NhbGUsIHNrZWxldG9uSWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHNrZWxldG9uV2Fsay5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHNrZWxldG9uV2Fsay5hbmltYXRpb25TY2FsZSwgc2tlbGV0b25XYWxrLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5PR0VSOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKG9nZXJJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgb2dlcklkbGUuYW5pbWF0aW9uU2NhbGUsIG9nZXJJZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24ob2dlcldhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBvZ2VyV2Fsay5hbmltYXRpb25TY2FsZSwgb2dlcldhbGsuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihvZ2VyQXR0YWNrLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgb2dlckF0dGFjay5hbmltYXRpb25TY2FsZSwgb2dlckF0dGFjay5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU1VNTU9OT1I6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oc3VtbW9uZXJJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc3VtbW9uZXJJZGxlLmFuaW1hdGlvblNjYWxlLCBzdW1tb25lcklkbGUuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihzdW1tb25lcldhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBzdW1tb25lcldhbGsuYW5pbWF0aW9uU2NhbGUsIHN1bW1vbmVyV2Fsay5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHN1bW1vbmVyU3VtbW9uLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc3VtbW9uZXJTdW1tb24uYW5pbWF0aW9uU2NhbGUsIHN1bW1vbmVyU3VtbW9uLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oc3VtbW9uZXJUZWxlcG9ydC5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHN1bW1vbmVyVGVsZXBvcnQuYW5pbWF0aW9uU2NhbGUsIHN1bW1vbmVyVGVsZXBvcnQuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xhc3MgTXlBbmltYXRpb25DbGFzcyB7XHJcbiAgICAgICAgcHVibGljIGlkOiBFbnRpdHkuSUQ7XHJcbiAgICAgICAgYW5pbWF0aW9uTmFtZTogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBzcHJpdGVTaGVldDogxpIuVGV4dHVyZUltYWdlO1xyXG4gICAgICAgIGFtb3VudE9mRnJhbWVzOiBudW1iZXI7XHJcbiAgICAgICAgZnJhbWVSYXRlOiBudW1iZXI7XHJcbiAgICAgICAgZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbjtcclxuICAgICAgICBhbmltYXRpb25TY2FsZTogbnVtYmVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX2FuaW1hdGlvbk5hbWU6IHN0cmluZywgX3RleHR1cmU6IMaSLlRleHR1cmVJbWFnZSwgX2Ftb3VudE9mRnJhbWVzOiBudW1iZXIsIF9mcmFtZVJhdGU6IG51bWJlciwpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25OYW1lID0gX2FuaW1hdGlvbk5hbWU7XHJcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlU2hlZXQgPSBfdGV4dHVyZTtcclxuICAgICAgICAgICAgdGhpcy5mcmFtZVJhdGUgPSBfZnJhbWVSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLmFtb3VudE9mRnJhbWVzID0gX2Ftb3VudE9mRnJhbWVzO1xyXG4gICAgICAgICAgICBnZW5lcmF0ZUFuaW1hdGlvbkZyb21HcmlkKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UT0RPOiBnZXQgYW5pbWF0aW9uIHNjYWxlXHJcbiAgICB9XHJcblxyXG4gICAgLy8jcmVnaW9uIHNwcml0ZVNoZWV0XHJcbiAgICBsZXQgYmF0SWRsZTogTXlBbmltYXRpb25DbGFzcztcclxuXHJcbiAgICBsZXQgcmVkVGlja0lkbGU6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgcmVkVGlja1dhbGs6IE15QW5pbWF0aW9uQ2xhc3M7XHJcblxyXG4gICAgbGV0IHNtYWxsVGlja0lkbGU6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgc21hbGxUaWNrV2FsazogTXlBbmltYXRpb25DbGFzcztcclxuXHJcbiAgICBsZXQgc2tlbGV0b25JZGxlOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IHNrZWxldG9uV2FsazogTXlBbmltYXRpb25DbGFzcztcclxuXHJcbiAgICBsZXQgb2dlcklkbGU6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgb2dlcldhbGs6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgb2dlckF0dGFjazogTXlBbmltYXRpb25DbGFzcztcclxuXHJcbiAgICBsZXQgc3VtbW9uZXJJZGxlOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IHN1bW1vbmVyV2FsazogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBzdW1tb25lclN1bW1vbjogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBzdW1tb25lclRlbGVwb3J0OiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBBbmltYXRpb25Db250YWluZXJcclxuICAgIGxldCBiYXRBbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIGxldCByZWRUaWNrQW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICBsZXQgc21hbGxUaWNrQW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICBsZXQgc2tlbGV0b25BbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIGxldCBvZ2VyQW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICBsZXQgc3VtbW9uZXJBbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUFuaW1hdGlvbk9iamVjdHMoKSB7XHJcblxyXG4gICAgICAgIGJhdElkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuQkFULCBcImlkbGVcIiwgdHh0QmF0SWRsZSwgNCwgMTIpO1xyXG5cclxuICAgICAgICByZWRUaWNrSWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5SRURUSUNLLCBcImlkbGVcIiwgdHh0UmVkVGlja0lkbGUsIDYsIDEyKTtcclxuICAgICAgICByZWRUaWNrV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5SRURUSUNLLCBcIndhbGtcIiwgdHh0UmVkVGlja1dhbGssIDQsIDE2KTtcclxuXHJcbiAgICAgICAgc21hbGxUaWNrSWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TTUFMTFRJQ0ssIFwiaWRsZVwiLCB0eHRTbWFsbFRpY2tJZGxlLCA2LCAxMik7XHJcbiAgICAgICAgc21hbGxUaWNrV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TTUFMTFRJQ0ssIFwid2Fsa1wiLCB0eHRTbWFsbFRpY2tXYWxrLCA0LCAxMik7XHJcblxyXG4gICAgICAgIHNrZWxldG9uSWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TS0VMRVRPTiwgXCJpZGxlXCIsIHR4dFNrZWxldG9uSWRsZSwgNSwgMTIpO1xyXG4gICAgICAgIHNrZWxldG9uV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TS0VMRVRPTiwgXCJ3YWxrXCIsIHR4dFNrZWxldG9uV2FsaywgNywgMTIpO1xyXG5cclxuICAgICAgICBvZ2VySWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5PR0VSLCBcImlkbGVcIiwgdHh0T2dlcklkbGUsIDUsIDYpO1xyXG4gICAgICAgIG9nZXJXYWxrID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELk9HRVIsIFwid2Fsa1wiLCB0eHRPZ2VyV2FsaywgNiwgNik7XHJcbiAgICAgICAgb2dlckF0dGFjayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5PR0VSLCBcImF0dGFja1wiLCB0eHRPZ2VyQXR0YWNrLCAxMCwgMTIpO1xyXG5cclxuICAgICAgICBzdW1tb25lcklkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU1VNTU9OT1IsIFwiaWRsZVwiLCB0eHRTdW1tb25lcklkbGUsIDYsIDEyKTtcclxuICAgICAgICBzdW1tb25lcldhbGsgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU1VNTU9OT1IsIFwid2Fsa1wiLCB0eHRTdW1tb25lcklkbGUsIDYsIDEyKTtcclxuICAgICAgICBzdW1tb25lclN1bW1vbiA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TVU1NT05PUiwgXCJzdW1tb25cIiwgdHh0U3VtbW9uZXJTdW1tb24sIDEzLCAxMik7XHJcbiAgICAgICAgc3VtbW9uZXJUZWxlcG9ydCA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TVU1NT05PUiwgXCJ0ZWxlcG9ydFwiLCB0eHRTdW1tb25lclRlbGVwb3J0LCA2LCAxMik7XHJcblxyXG5cclxuXHJcbiAgICAgICAgYmF0QW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuQkFUKTtcclxuICAgICAgICByZWRUaWNrQW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuUkVEVElDSyk7XHJcbiAgICAgICAgc21hbGxUaWNrQW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuU01BTExUSUNLKTtcclxuICAgICAgICBza2VsZXRvbkFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb25Db250YWluZXIoRW50aXR5LklELlNLRUxFVE9OKTtcclxuICAgICAgICBvZ2VyQW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuT0dFUik7XHJcbiAgICAgICAgc3VtbW9uZXJBbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uQ29udGFpbmVyKEVudGl0eS5JRC5TVU1NT05PUik7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldEFuaW1hdGlvbkJ5SWQoX2lkOiBFbnRpdHkuSUQpOiBBbmltYXRpb25Db250YWluZXIge1xyXG4gICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELkJBVDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBiYXRBbmltYXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlJFRFRJQ0s6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVkVGlja0FuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU01BTExUSUNLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNtYWxsVGlja0FuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU0tFTEVUT046XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2tlbGV0b25BbmltYXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELk9HRVI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2dlckFuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU1VNTU9OT1I6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc3VtbW9uZXJBbmltYXRpb247XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRQaXhlbFJhdGlvKF93aWR0aDogbnVtYmVyLCBfaGVpZ2h0OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBtYXggPSBNYXRoLm1heChfd2lkdGgsIF9oZWlnaHQpO1xyXG4gICAgICAgIGxldCBtaW4gPSBNYXRoLm1pbihfd2lkdGgsIF9oZWlnaHQpO1xyXG5cclxuICAgICAgICBsZXQgc2NhbGUgPSAxIC8gbWF4ICogbWluO1xyXG4gICAgICAgIHJldHVybiBzY2FsZTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVBbmltYXRpb25Gcm9tR3JpZChfY2xhc3M6IE15QW5pbWF0aW9uQ2xhc3MpIHtcclxuICAgICAgICBsZXQgY2xyV2hpdGU6IMaSLkNvbG9yID0gxpIuQ29sb3IuQ1NTKFwid2hpdGVcIik7XHJcbiAgICAgICAgbGV0IGNvYXRlZFNwcml0ZVNoZWV0OiDGki5Db2F0VGV4dHVyZWQgPSBuZXcgxpIuQ29hdFRleHR1cmVkKGNscldoaXRlLCBfY2xhc3Muc3ByaXRlU2hlZXQpO1xyXG4gICAgICAgIGxldCB3aWR0aDogbnVtYmVyID0gX2NsYXNzLnNwcml0ZVNoZWV0LnRleEltYWdlU291cmNlLndpZHRoIC8gX2NsYXNzLmFtb3VudE9mRnJhbWVzO1xyXG4gICAgICAgIGxldCBoZWlnaHQ6IG51bWJlciA9IF9jbGFzcy5zcHJpdGVTaGVldC50ZXhJbWFnZVNvdXJjZS5oZWlnaHQ7XHJcbiAgICAgICAgbGV0IGNyZWF0ZWRBbmltYXRpb246IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uID0gbmV3IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uKF9jbGFzcy5hbmltYXRpb25OYW1lLCBjb2F0ZWRTcHJpdGVTaGVldCk7XHJcbiAgICAgICAgY3JlYXRlZEFuaW1hdGlvbi5nZW5lcmF0ZUJ5R3JpZCjGki5SZWN0YW5nbGUuR0VUKDAsIDAsIHdpZHRoLCBoZWlnaHQpLCBfY2xhc3MuYW1vdW50T2ZGcmFtZXMsIDMyLCDGki5PUklHSU4yRC5DRU5URVIsIMaSLlZlY3RvcjIuWCh3aWR0aCkpO1xyXG4gICAgICAgIF9jbGFzcy5hbmltYXRpb25TY2FsZSA9IGdldFBpeGVsUmF0aW8od2lkdGgsIGhlaWdodCk7XHJcbiAgICAgICAgX2NsYXNzLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiA9IGNyZWF0ZWRBbmltYXRpb247XHJcbiAgICB9XHJcblxyXG5cclxufVxyXG5cclxuIiwibmFtZXNwYWNlIE5ldHdvcmtpbmcge1xyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFByZWRpY3Rpb24ge1xyXG4gICAgICAgIHByb3RlY3RlZCB0aW1lcjogbnVtYmVyID0gMDtcclxuICAgICAgICBwcm90ZWN0ZWQgY3VycmVudFRpY2s6IG51bWJlciA9IDA7XHJcbiAgICAgICAgcHVibGljIG1pblRpbWVCZXR3ZWVuVGlja3M6IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgZ2FtZVRpY2tSYXRlOiBudW1iZXIgPSA2Mi41O1xyXG4gICAgICAgIHByb3RlY3RlZCBidWZmZXJTaXplOiBudW1iZXIgPSAxMDI0O1xyXG4gICAgICAgIHByb3RlY3RlZCBvd25lck5ldElkOiBudW1iZXI7IGdldCBvd25lcigpOiBHYW1lLsaSLk5vZGUgeyByZXR1cm4gR2FtZS5jdXJyZW50TmV0T2JqLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IHRoaXMub3duZXJOZXRJZCkubmV0T2JqZWN0Tm9kZSB9O1xyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGVCdWZmZXI6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZFtdO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWluVGltZUJldHdlZW5UaWNrcyA9IDEgLyB0aGlzLmdhbWVUaWNrUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlciA9IG5ldyBBcnJheTxJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQ+KHRoaXMuYnVmZmVyU2l6ZSk7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9vd25lck5ldElkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGhhbmRsZVRpY2soKSB7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgcHJvY2Vzc01vdmVtZW50KF9pbnB1dDogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkKTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9Ly8jcmVnaW9uICBidWxsZXQgUHJlZGljdGlvblxyXG4gICAgYWJzdHJhY3QgY2xhc3MgQnVsbGV0UHJlZGljdGlvbiBleHRlbmRzIFByZWRpY3Rpb24ge1xyXG4gICAgICAgIHByb3RlY3RlZCBwcm9jZXNzTW92ZW1lbnQoaW5wdXQ6IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCk6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCB7XHJcbiAgICAgICAgICAgIGxldCBjbG9uZUlucHV0VmVjdG9yID0gaW5wdXQuaW5wdXRWZWN0b3IuY2xvbmU7XHJcbiAgICAgICAgICAgIGxldCBidWxsZXQ6IEJ1bGxldHMuQnVsbGV0ID0gPEJ1bGxldHMuQnVsbGV0PnRoaXMub3duZXI7XHJcbiAgICAgICAgICAgIGJ1bGxldC5tb3ZlKGNsb25lSW5wdXRWZWN0b3IpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG5ld1N0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkID0geyB0aWNrOiBpbnB1dC50aWNrLCBwb3NpdGlvbjogYnVsbGV0Lm10eExvY2FsLnRyYW5zbGF0aW9uIH1cclxuICAgICAgICAgICAgcmV0dXJuIG5ld1N0YXRlUGF5bG9hZDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFNlcnZlckJ1bGxldFByZWRpY3Rpb24gZXh0ZW5kcyBCdWxsZXRQcmVkaWN0aW9uIHtcclxuICAgICAgICBwcml2YXRlIGlucHV0UXVldWU6IFF1ZXVlID0gbmV3IFF1ZXVlKCk7XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVFbnRpdHlUb0NoZWNrKF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGltZXIgKz0gR2FtZS5kZWx0YVRpbWU7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRpbWVyID49IHRoaXMubWluVGltZUJldHdlZW5UaWNrcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3M7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVRpY2soKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpY2srKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaGFuZGxlVGljaygpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IC0xO1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5pbnB1dFF1ZXVlLmdldFF1ZXVlTGVuZ3RoKCkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWQgPSA8SW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkPnRoaXMuaW5wdXRRdWV1ZS5kZXF1ZXVlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgYnVmZmVySW5kZXggPSBpbnB1dFBheWxvYWQudGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCA9IHRoaXMucHJvY2Vzc01vdmVtZW50KGlucHV0UGF5bG9hZClcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gc3RhdGVQYXlsb2FkO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYnVmZmVySW5kZXggIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIC8vU2VuZCB0byBjbGllbnQgbmV3IHBvc2l0aW9uXHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNlbmRTZXJ2ZXJCdWZmZXIodGhpcy5vd25lck5ldElkLCB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkNsaWVudElucHV0KGlucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRRdWV1ZS5lbnF1ZXVlKGlucHV0UGF5bG9hZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBDbGllbnRCdWxsZXRQcmVkaWN0aW9uIGV4dGVuZHMgQnVsbGV0UHJlZGljdGlvbiB7XHJcbiAgICAgICAgcHJpdmF0ZSBpbnB1dEJ1ZmZlcjogSW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkW107XHJcbiAgICAgICAgcHJpdmF0ZSBsYXRlc3RTZXJ2ZXJTdGF0ZTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkO1xyXG4gICAgICAgIHByaXZhdGUgbGFzdFByb2Nlc3NlZFN0YXRlOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgcHJpdmF0ZSBmbHlEaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMztcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBBc3luY1RvbGVyYW5jZTogbnVtYmVyID0gMC4yO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX293bmVyTmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfb3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRCdWZmZXIgPSBuZXcgQXJyYXk8SW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkPih0aGlzLmJ1ZmZlclNpemUpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZseURpcmVjdGlvbiA9ICg8QnVsbGV0cy5CdWxsZXQ+dGhpcy5vd25lcikuZmx5RGlyZWN0aW9uO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJjYW50IGZpbmQgb3duZXJcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy50aW1lciArPSBHYW1lLmRlbHRhVGltZTtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMudGltZXIgPj0gdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVyIC09IHRoaXMubWluVGltZUJldHdlZW5UaWNrcztcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVGljaygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VGljaysrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgaGFuZGxlVGljaygpIHtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxhdGVzdFNlcnZlclN0YXRlICE9IHRoaXMubGFzdFByb2Nlc3NlZFN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNlcnZlclJlY29uY2lsaWF0aW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IHRoaXMuY3VycmVudFRpY2sgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgIGxldCBpbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCA9IHsgdGljazogdGhpcy5jdXJyZW50VGljaywgaW5wdXRWZWN0b3I6IHRoaXMuZmx5RGlyZWN0aW9uIH07XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRCdWZmZXJbYnVmZmVySW5kZXhdID0gaW5wdXRQYXlsb2FkO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhpbnB1dFBheWxvYWQudGljayArIFwiX19fXCIgKyBpbnB1dFBheWxvYWQuaW5wdXRWZWN0b3IpO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSA9IHRoaXMucHJvY2Vzc01vdmVtZW50KGlucHV0UGF5bG9hZCk7XHJcblxyXG4gICAgICAgICAgICAvL3NlbmQgaW5wdXRQYXlsb2FkIHRvIGhvc3RcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zZW5kQnVsbGV0SW5wdXQodGhpcy5vd25lck5ldElkLCBpbnB1dFBheWxvYWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uU2VydmVyTW92ZW1lbnRTdGF0ZShfc2VydmVyU3RhdGU6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCkge1xyXG4gICAgICAgICAgICB0aGlzLmxhdGVzdFNlcnZlclN0YXRlID0gX3NlcnZlclN0YXRlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoYW5kbGVTZXJ2ZXJSZWNvbmNpbGlhdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5sYXN0UHJvY2Vzc2VkU3RhdGUgPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlO1xyXG5cclxuICAgICAgICAgICAgbGV0IHNlcnZlclN0YXRlQnVmZmVySW5kZXggPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnRpY2sgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgIGxldCBwb3NpdGlvbkVycm9yOiBudW1iZXIgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uLCB0aGlzLnN0YXRlQnVmZmVyW3NlcnZlclN0YXRlQnVmZmVySW5kZXhdLnBvc2l0aW9uKS5tYWduaXR1ZGU7XHJcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbkVycm9yID4gdGhpcy5Bc3luY1RvbGVyYW5jZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKHRoaXMub3duZXIubmFtZSArIFwiIG5lZWQgdG8gYmUgdXBkYXRlZCB0bzogWDpcIiArIHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb24ueCArIFwiIFk6IFwiICsgdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbi55KTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3duZXIubXR4TG9jYWwudHJhbnNsYXRpb24gPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbc2VydmVyU3RhdGVCdWZmZXJJbmRleF0gPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCB0aWNrVG9Qcm9jZXNzID0gKHRoaXMubGF0ZXN0U2VydmVyU3RhdGUudGljayArIDEpO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoaWxlICh0aWNrVG9Qcm9jZXNzIDwgdGhpcy5jdXJyZW50VGljaykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCA9IHRoaXMucHJvY2Vzc01vdmVtZW50KHRoaXMuaW5wdXRCdWZmZXJbdGlja1RvUHJvY2VzcyAlIHRoaXMuYnVmZmVyU2l6ZV0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgYnVmZmVySW5kZXggPSB0aWNrVG9Qcm9jZXNzICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gc3RhdGVQYXlsb2FkO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aWNrVG9Qcm9jZXNzKys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuICAgIC8vI3JlZ2lvbiAgYXZhdGFyIFByZWNkaWN0aW9uXHJcbiAgICBhYnN0cmFjdCBjbGFzcyBBdmF0YXJQcmVkaWN0aW9uIGV4dGVuZHMgUHJlZGljdGlvbiB7XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBwcm9jZXNzTW92ZW1lbnQoaW5wdXQ6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCk6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCB7XHJcbiAgICAgICAgICAgIGxldCBjbG9uZUlucHV0VmVjdG9yID0gaW5wdXQuaW5wdXRWZWN0b3IuY2xvbmU7XHJcbiAgICAgICAgICAgIGlmIChjbG9uZUlucHV0VmVjdG9yLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNsb25lSW5wdXRWZWN0b3Iubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgJiYgaW5wdXQuZG9lc0FiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj50aGlzLm93bmVyKS5kb0FiaWxpdHkoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPnRoaXMub3duZXIpLm1vdmUoY2xvbmVJbnB1dFZlY3Rvcik7XHJcblxyXG5cclxuICAgICAgICAgICAgbGV0IG5ld1N0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkID0geyB0aWNrOiBpbnB1dC50aWNrLCBwb3NpdGlvbjogdGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbiB9XHJcbiAgICAgICAgICAgIHJldHVybiBuZXdTdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBDbGllbnRQcmVkaWN0aW9uIGV4dGVuZHMgQXZhdGFyUHJlZGljdGlvbiB7XHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5wdXRCdWZmZXI6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZFtdO1xyXG4gICAgICAgIHByaXZhdGUgbGF0ZXN0U2VydmVyU3RhdGU6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZDtcclxuICAgICAgICBwcml2YXRlIGxhc3RQcm9jZXNzZWRTdGF0ZTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkO1xyXG4gICAgICAgIHByaXZhdGUgaG9yaXpvbnRhbElucHV0OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSB2ZXJ0aWNhbElucHV0OiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGRvZXNBYmlsaXR5OiBib29sZWFuO1xyXG5cclxuICAgICAgICBwcml2YXRlIEFzeW5jVG9sZXJhbmNlOiBudW1iZXIgPSAwLjE7XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9vd25lck5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dEJ1ZmZlciA9IG5ldyBBcnJheTxJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQ+KHRoaXMuYnVmZmVyU2l6ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5ob3Jpem9udGFsSW5wdXQgPSBJbnB1dFN5c3RlbS5tb3ZlKCkueDtcclxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNhbElucHV0ID0gSW5wdXRTeXN0ZW0ubW92ZSgpLnk7XHJcbiAgICAgICAgICAgIHRoaXMudGltZXIgKz0gR2FtZS5kZWx0YVRpbWU7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRpbWVyID49IHRoaXMubWluVGltZUJldHdlZW5UaWNrcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3M7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVRpY2soKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpY2srKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGhhbmRsZVRpY2soKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZSAhPSB0aGlzLmxhc3RQcm9jZXNzZWRTdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTZXJ2ZXJSZWNvbmNpbGlhdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IHRoaXMuY3VycmVudFRpY2sgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgIHRoaXMuc3dpdGNoQXZhdGFyQWJpbGl0eVN0YXRlKCk7XHJcbiAgICAgICAgICAgIGxldCBpbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCA9IHsgdGljazogdGhpcy5jdXJyZW50VGljaywgaW5wdXRWZWN0b3I6IG5ldyDGki5WZWN0b3IzKHRoaXMuaG9yaXpvbnRhbElucHV0LCB0aGlzLnZlcnRpY2FsSW5wdXQsIDApLCBkb2VzQWJpbGl0eTogdGhpcy5kb2VzQWJpbGl0eSB9O1xyXG4gICAgICAgICAgICB0aGlzLmlucHV0QnVmZmVyW2J1ZmZlckluZGV4XSA9IGlucHV0UGF5bG9hZDtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coaW5wdXRQYXlsb2FkLnRpY2sgKyBcIl9fX1wiICsgaW5wdXRQYXlsb2FkLmlucHV0VmVjdG9yLmNsb25lKTtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0gPSB0aGlzLnByb2Nlc3NNb3ZlbWVudChpbnB1dFBheWxvYWQpO1xyXG5cclxuICAgICAgICAgICAgLy9zZW5kIGlucHV0UGF5bG9hZCB0byBob3N0XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc2VuZENsaWVudElucHV0KHRoaXMub3duZXJOZXRJZCwgaW5wdXRQYXlsb2FkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN3aXRjaEF2YXRhckFiaWxpdHlTdGF0ZSgpIHtcclxuICAgICAgICAgICAgaWYgKCg8RW50aXR5LkVudGl0eT50aGlzLm93bmVyKS5pZCA9PSBFbnRpdHkuSUQuUkFOR0VEKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvZXNBYmlsaXR5ID0gKDxQbGF5ZXIuUmFuZ2VkPnRoaXMub3duZXIpLmRhc2guZG9lc0FiaWxpdHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvZXNBYmlsaXR5ID0gKDxQbGF5ZXIuTWVsZWU+dGhpcy5vd25lcikuYmxvY2suZG9lc0FiaWxpdHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgb25TZXJ2ZXJNb3ZlbWVudFN0YXRlKF9zZXJ2ZXJTdGF0ZTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U2VydmVyU3RhdGUgPSBfc2VydmVyU3RhdGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhhbmRsZVNlcnZlclJlY29uY2lsaWF0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLmxhc3RQcm9jZXNzZWRTdGF0ZSA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGU7XHJcblxyXG4gICAgICAgICAgICBsZXQgc2VydmVyU3RhdGVCdWZmZXJJbmRleCA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGUudGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgbGV0IHBvc2l0aW9uRXJyb3I6IG51bWJlciA9IEdhbWUuxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb24sIHRoaXMuc3RhdGVCdWZmZXJbc2VydmVyU3RhdGVCdWZmZXJJbmRleF0ucG9zaXRpb24pLm1hZ25pdHVkZTtcclxuICAgICAgICAgICAgaWYgKHBvc2l0aW9uRXJyb3IgPiB0aGlzLkFzeW5jVG9sZXJhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJ5b3UgbmVlZCB0byBiZSB1cGRhdGVkIHRvOiBYOlwiICsgdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbi54ICsgXCIgWTogXCIgKyB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltzZXJ2ZXJTdGF0ZUJ1ZmZlckluZGV4XSA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGU7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHRpY2tUb1Byb2Nlc3MgPSAodGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS50aWNrICsgMSk7XHJcblxyXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRpY2tUb1Byb2Nlc3MgPCB0aGlzLmN1cnJlbnRUaWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkID0gdGhpcy5wcm9jZXNzTW92ZW1lbnQodGhpcy5pbnB1dEJ1ZmZlclt0aWNrVG9Qcm9jZXNzICUgdGhpcy5idWZmZXJTaXplXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IHRpY2tUb1Byb2Nlc3MgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0gPSBzdGF0ZVBheWxvYWQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRpY2tUb1Byb2Nlc3MrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgU2VydmVyUHJlZGljdGlvbiBleHRlbmRzIEF2YXRhclByZWRpY3Rpb24ge1xyXG5cclxuICAgICAgICBwcml2YXRlIGlucHV0UXVldWU6IFF1ZXVlID0gbmV3IFF1ZXVlKCk7XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVFbnRpdHlUb0NoZWNrKF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGltZXIgKz0gR2FtZS5kZWx0YVRpbWU7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRpbWVyID49IHRoaXMubWluVGltZUJldHdlZW5UaWNrcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3M7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVRpY2soKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpY2srKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaGFuZGxlVGljaygpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IC0xO1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5pbnB1dFF1ZXVlLmdldFF1ZXVlTGVuZ3RoKCkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQgPSA8SW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkPnRoaXMuaW5wdXRRdWV1ZS5kZXF1ZXVlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgYnVmZmVySW5kZXggPSBpbnB1dFBheWxvYWQudGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCA9IHRoaXMucHJvY2Vzc01vdmVtZW50KGlucHV0UGF5bG9hZClcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gc3RhdGVQYXlsb2FkO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYnVmZmVySW5kZXggIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIC8vU2VuZCB0byBjbGllbnQgbmV3IHBvc2l0aW9uXHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNlbmRTZXJ2ZXJCdWZmZXIodGhpcy5vd25lck5ldElkLCB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkNsaWVudElucHV0KGlucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRRdWV1ZS5lbnF1ZXVlKGlucHV0UGF5bG9hZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuICAgIGNsYXNzIFF1ZXVlIHtcclxuICAgICAgICBwcml2YXRlIGl0ZW1zOiBhbnlbXTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMgPSBbXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGVucXVldWUoX2l0ZW06IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCB8IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCkge1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zLnB1c2goX2l0ZW0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGVxdWV1ZSgpOiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQgfCBJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWQge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtcy5zaGlmdCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0UXVldWVMZW5ndGgoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zLmxlbmd0aDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEl0ZW1zKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59IiwibmFtZXNwYWNlIEFiaWxpdHkge1xyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFiaWxpdHkge1xyXG4gICAgICAgIHByb3RlY3RlZCBvd25lck5ldElkOiBudW1iZXI7IGdldCBvd25lcigpOiBFbnRpdHkuRW50aXR5IHsgcmV0dXJuIEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gdGhpcy5vd25lck5ldElkKSB9O1xyXG4gICAgICAgIHByb3RlY3RlZCBjb29sZG93bjogQ29vbGRvd247XHJcbiAgICAgICAgcHJvdGVjdGVkIGFiaWxpdHlDb3VudDogbnVtYmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBjdXJyZW50YWJpbGl0eUNvdW50OiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGR1cmF0aW9uOiBDb29sZG93bjtcclxuICAgICAgICBwdWJsaWMgZG9lc0FiaWxpdHk6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX293bmVyTmV0SWQ6IG51bWJlciwgX2R1cmF0aW9uOiBudW1iZXIsIF9hYmlsaXR5Q291bnQ6IG51bWJlciwgX2Nvb2xkb3duVGltZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9vd25lck5ldElkO1xyXG4gICAgICAgICAgICB0aGlzLmFiaWxpdHlDb3VudCA9IF9hYmlsaXR5Q291bnQ7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA9IHRoaXMuYWJpbGl0eUNvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmR1cmF0aW9uID0gbmV3IENvb2xkb3duKF9kdXJhdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuY29vbGRvd24gPSBuZXcgQ29vbGRvd24oX2Nvb2xkb3duVGltZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUFiaWxpdHkoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIHVwZGF0ZUFiaWxpdHkoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmRvZXNBYmlsaXR5ICYmICF0aGlzLmR1cmF0aW9uLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvZXNBYmlsaXR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy9kbyBzdHVmZlxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24gJiYgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA9IHRoaXMuYWJpbGl0eUNvdW50O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb29sZG93bi5oYXNDb29sRG93biAmJiB0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvZXNBYmlsaXR5ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWN0aXZhdGVBYmlsaXR5KClcclxuICAgICAgICAgICAgICAgIHRoaXMuZHVyYXRpb24uc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50LS07XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50YWJpbGl0eUNvdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvb2xkb3duLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgaGFzQ29vbGRvd24oKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvb2xkb3duLmhhc0Nvb2xEb3duO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGFjdGl2YXRlQWJpbGl0eSgpIHtcclxuICAgICAgICAgICAgR2FtZS7Gki5Mb29wLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5MT09QX0ZSQU1FLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb3RlY3RlZCBkZWFjdGl2YXRlQWJpbGl0eSgpIHtcclxuICAgICAgICAgICAgR2FtZS7Gki5Mb29wLnJlbW92ZUV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5MT09QX0ZSQU1FLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQmxvY2sgZXh0ZW5kcyBBYmlsaXR5IHtcclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGFjdGl2YXRlQWJpbGl0eSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5oaXRhYmxlID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZGVhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmRlYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5oaXRhYmxlID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERhc2ggZXh0ZW5kcyBBYmlsaXR5IHtcclxuICAgICAgICBzcGVlZDogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9vd25lck5ldElkOiBudW1iZXIsIF9kdXJhdGlvbjogbnVtYmVyLCBfYWJpbGl0eUNvdW50OiBudW1iZXIsIF9jb29sZG93blRpbWU6IG51bWJlciwgX3NwZWVkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX293bmVyTmV0SWQsIF9kdXJhdGlvbiwgX2FiaWxpdHlDb3VudCwgX2Nvb2xkb3duVGltZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSBfc3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb3RlY3RlZCBhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmFjdGl2YXRlQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFjdGl2YXRlXCIpO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuc3BlZWQgKj0gdGhpcy5zcGVlZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIGRlYWN0aXZhdGVBYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5kZWFjdGl2YXRlQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImRlYWN0aXZhdGVcIik7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5oaXRhYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5vd25lci5hdHRyaWJ1dGVzLnNwZWVkIC89IHRoaXMuc3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTcGF3blN1bW1vbmVycyBleHRlbmRzIEFiaWxpdHkge1xyXG4gICAgICAgIHByaXZhdGUgc3Bhd25SYWRpdXM6IG51bWJlciA9IDE7XHJcbiAgICAgICAgcHJvdGVjdGVkIGFjdGl2YXRlQWJpbGl0eSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyID0gbmV3IMaSLlZlY3RvcjIodGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgTWF0aC5yYW5kb20oKSAqIHRoaXMuc3Bhd25SYWRpdXMsIHRoaXMub3duZXIubXR4TG9jYWwudHJhbnNsYXRpb24ueSArIDIpXHJcbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKSA+IDAuNSkge1xyXG4gICAgICAgICAgICAgICAgICAgIEVuZW15U3Bhd25lci5zcGF3bkJ5SUQoRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUkFERFMsIEVudGl0eS5JRC5CQVQsIHBvc2l0aW9uLCBHYW1lLmF2YXRhcjEsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBFbmVteVNwYXduZXIuc3Bhd25CeUlEKEVuZW15LkVORU1ZQ0xBU1MuU1VNTU9OT1JBRERTLCBFbnRpdHkuSUQuQkFULCBwb3NpdGlvbiwgR2FtZS5hdmF0YXIyLCBudWxsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgY2lyY2xlU2hvb3QgZXh0ZW5kcyBBYmlsaXR5IHtcclxuICAgICAgICBwdWJsaWMgYnVsbGV0QW1vdW50OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBidWxsZXRzOiBCdWxsZXRzLkJ1bGxldFtdID0gW107XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmFjdGl2YXRlQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICB0aGlzLmJ1bGxldHMgPSBbXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmJ1bGxldEFtb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1bGxldHMucHVzaChuZXcgQnVsbGV0cy5CdWxsZXQoQnVsbGV0cy5CVUxMRVRUWVBFLlNUQU5EQVJELCB0aGlzLm93bmVyLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBHYW1lLsaSLlZlY3RvcjMuWkVSTygpLCB0aGlzLm93bmVyTmV0SWQpKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVsbGV0c1tpXS5tdHhMb2NhbC5yb3RhdGVaKCgzNjAgLyB0aGlzLmJ1bGxldEFtb3VudCAqIGkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnVsbGV0QW1vdW50OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQodGhpcy5idWxsZXRzW2ldKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25CdWxsZXQoV2VhcG9ucy5BSU0uTk9STUFMLCB0aGlzLmJ1bGxldHNbaV0uZGlyZWN0aW9uLCB0aGlzLmJ1bGxldHNbaV0ubmV0SWQsIHRoaXMub3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIENvb2xkb3duIHtcclxuICAgICAgICBwdWJsaWMgaGFzQ29vbERvd246IGJvb2xlYW5cclxuICAgICAgICBwcml2YXRlIGNvb2xEb3duOiBudW1iZXI7IGdldCBnZXRNYXhDb29sRG93bigpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5jb29sRG93biB9OyBzZXQgc2V0TWF4Q29vbERvd24oX3BhcmFtOiBudW1iZXIpIHsgdGhpcy5oYXNDb29sRG93biA9IGZhbHNlOyB0aGlzLmNvb2xEb3duID0gX3BhcmFtOyB0aGlzLmN1cnJlbnRDb29sZG93biA9IHRoaXMuY29vbERvd247IH1cclxuICAgICAgICBwcml2YXRlIGN1cnJlbnRDb29sZG93bjogbnVtYmVyOyBnZXQgZ2V0Q3VycmVudENvb2xkb3duKCk6IG51bWJlciB7IHJldHVybiB0aGlzLmN1cnJlbnRDb29sZG93biB9O1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9udW1iZXI6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvb2xEb3duID0gX251bWJlcjtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29vbGRvd24gPSBfbnVtYmVyO1xyXG4gICAgICAgICAgICB0aGlzLmhhc0Nvb2xEb3duID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc3RhcnRDb29sRG93bigpIHtcclxuICAgICAgICAgICAgdGhpcy5oYXNDb29sRG93biA9IHRydWVcclxuICAgICAgICAgICAgR2FtZS7Gki5Mb29wLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5MT09QX0ZSQU1FLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgZW5kQ29vbERvd24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFzQ29vbERvd24gPSBmYWxzZTtcclxuICAgICAgICAgICAgR2FtZS7Gki5Mb29wLnJlbW92ZUV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5MT09QX0ZSQU1FLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBldmVudFVwZGF0ZSA9IChfZXZlbnQ6IEV2ZW50KTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ29vbERvd24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVDb29sRG93bigpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaGFzQ29vbERvd24gJiYgdGhpcy5jdXJyZW50Q29vbGRvd24gPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDb29sZG93bi0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRDb29sZG93biA8PSAwICYmIHRoaXMuaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZW5kQ29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudENvb2xkb3duID0gdGhpcy5jb29sRG93bjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuIiwibmFtZXNwYWNlIEFiaWxpdHkge1xyXG5cclxuICAgIGVudW0gQU9FVFlQRSB7XHJcbiAgICAgICAgSEVBTFRIVVBcclxuICAgIH1cclxuXHJcbiAgICBjbGFzcyBBcmVhT2ZFZmZlY3QgZXh0ZW5kcyBHYW1lLsaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBpZDogQU9FVFlQRTtcclxuICAgICAgICBwcml2YXRlIHBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjI7IGdldCBnZXRQb3NpdGlvbigpOiBHYW1lLsaSLlZlY3RvcjIgeyByZXR1cm4gdGhpcy5wb3NpdGlvbiB9OyBzZXQgc2V0UG9zaXRpb24oX3BvczogR2FtZS7Gki5WZWN0b3IyKSB7IHRoaXMucG9zaXRpb24gPSBfcG9zIH07XHJcbiAgICAgICAgcHJpdmF0ZSBjb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7IGdldCBnZXRDb2xsaWRlcigpOiBDb2xsaWRlci5Db2xsaWRlciB7IHJldHVybiB0aGlzLmNvbGxpZGVyIH07XHJcbiAgICAgICAgcHJpdmF0ZSBkdXJhdGlvbjogQWJpbGl0eS5Db29sZG93bjtcclxuICAgICAgICBwcml2YXRlIGJ1ZmZMaXN0OiBCdWZmLkJ1ZmZbXTsgZ2V0IGdldEJ1ZmZMaXN0KCk6IEJ1ZmYuQnVmZltdIHsgcmV0dXJuIHRoaXMuYnVmZkxpc3QgfTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBBT0VUWVBFLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihBT0VUWVBFW19pZF0udG9Mb3dlckNhc2UoKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEVudGl0eSB7XHJcblxyXG4gICAgZXhwb3J0IGVudW0gQVRUUklCVVRFVFlQRSB7XHJcbiAgICAgICAgSEVBTFRIUE9JTlRTLFxyXG4gICAgICAgIE1BWEhFQUxUSFBPSU5UUyxcclxuICAgICAgICBLTk9DS0JBQ0tGT1JDRSxcclxuICAgICAgICBISVRBQkxFLFxyXG4gICAgICAgIEFSTU9SLFxyXG4gICAgICAgIFNQRUVELFxyXG4gICAgICAgIEFUVEFDS1BPSU5UUyxcclxuICAgICAgICBDT09MRE9XTlJFRFVDVElPTixcclxuICAgICAgICBTQ0FMRVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIEF0dHJpYnV0ZXMge1xyXG5cclxuICAgICAgICBoZWFsdGhQb2ludHM6IG51bWJlcjtcclxuICAgICAgICBtYXhIZWFsdGhQb2ludHM6IG51bWJlcjtcclxuICAgICAgICBrbm9ja2JhY2tGb3JjZTogbnVtYmVyO1xyXG4gICAgICAgIGhpdGFibGU6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgICAgIGFybW9yOiBudW1iZXI7XHJcbiAgICAgICAgc3BlZWQ6IG51bWJlcjtcclxuICAgICAgICBhdHRhY2tQb2ludHM6IG51bWJlcjtcclxuICAgICAgICBjb29sRG93blJlZHVjdGlvbjogbnVtYmVyID0gMTtcclxuICAgICAgICBzY2FsZTogbnVtYmVyO1xyXG4gICAgICAgIGFjY3VyYWN5OiBudW1iZXIgPSA4MDtcclxuXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9oZWFsdGhQb2ludHM6IG51bWJlciwgX2F0dGFja1BvaW50czogbnVtYmVyLCBfc3BlZWQ6IG51bWJlciwgX3NjYWxlOiBudW1iZXIsIF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfYXJtb3I6IG51bWJlciwgX2Nvb2xkb3duUmVkdWN0aW9uOiBudW1iZXIsIF9hY2N1cmFjeTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2NhbGUgPSBfc2NhbGU7XHJcbiAgICAgICAgICAgIHRoaXMuYXJtb3IgPSBfYXJtb3I7XHJcbiAgICAgICAgICAgIHRoaXMuaGVhbHRoUG9pbnRzID0gX2hlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgdGhpcy5tYXhIZWFsdGhQb2ludHMgPSB0aGlzLmhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgdGhpcy5hdHRhY2tQb2ludHMgPSBfYXR0YWNrUG9pbnRzO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gX3NwZWVkO1xyXG4gICAgICAgICAgICB0aGlzLmtub2NrYmFja0ZvcmNlID0gX2tub2NrYmFja0ZvcmNlXHJcbiAgICAgICAgICAgIHRoaXMuY29vbERvd25SZWR1Y3Rpb24gPSBfY29vbGRvd25SZWR1Y3Rpb247XHJcbiAgICAgICAgICAgIHRoaXMuYWNjdXJhY3kgPSBfYWNjdXJhY3k7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlU2NhbGVEZXBlbmRlbmNpZXMoKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWF4SGVhbHRoUG9pbnRzID0gTWF0aC5yb3VuZCh0aGlzLm1heEhlYWx0aFBvaW50cyAqICgxMDAgKyAoMTAgKiB0aGlzLnNjYWxlKSkgLyAxMDApO1xyXG4gICAgICAgICAgICB0aGlzLmhlYWx0aFBvaW50cyA9IE1hdGgucm91bmQodGhpcy5oZWFsdGhQb2ludHMgKiAoMTAwICsgKDEwICogdGhpcy5zY2FsZSkpIC8gMTAwKTtcclxuICAgICAgICAgICAgdGhpcy5hdHRhY2tQb2ludHMgPSBNYXRoLnJvdW5kKHRoaXMuYXR0YWNrUG9pbnRzICogdGhpcy5zY2FsZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSBNYXRoLmZyb3VuZCh0aGlzLnNwZWVkIC8gdGhpcy5zY2FsZSk7XHJcbiAgICAgICAgICAgIHRoaXMua25vY2tiYWNrRm9yY2UgPSB0aGlzLmtub2NrYmFja0ZvcmNlICogKDEwMCArICgxMCAqIHRoaXMuc2NhbGUpKSAvIDEwMDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXkge1xyXG4gICAgZXhwb3J0IGNsYXNzIFN1bW1vbm9yIGV4dGVuZHMgRW5lbXlTaG9vdCB7XHJcbiAgICAgICAgZGFtYWdlVGFrZW46IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgIGF0dGFja1BoYXNlQ2Q6IEFiaWxpdHkuQ29vbGRvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93big1ODApO1xyXG4gICAgICAgIGRlZmVuY2VQaGFzZUNkOiBBYmlsaXR5LkNvb2xkb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oNzIwKTtcclxuICAgICAgICBiZWdpblNob290aW5nOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgc2hvb3RpbmdDb3VudDogbnVtYmVyID0gMztcclxuICAgICAgICBjdXJyZW50U2hvb3RpbmdDb3VudDogbnVtYmVyID0gMDtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzdW1tb246IEFiaWxpdHkuU3Bhd25TdW1tb25lcnMgPSBuZXcgQWJpbGl0eS5TcGF3blN1bW1vbmVycyh0aGlzLm5ldElkLCAwLCAxLCA0NSk7XHJcbiAgICAgICAgcHJpdmF0ZSBkYXNoOiBBYmlsaXR5LkRhc2ggPSBuZXcgQWJpbGl0eS5EYXNoKHRoaXMubmV0SWQsIDQ1LCAxLCAxMyAqIDYwLCA1KTtcclxuICAgICAgICBwcml2YXRlIHNob290MzYwOiBBYmlsaXR5LmNpcmNsZVNob290ID0gbmV3IEFiaWxpdHkuY2lyY2xlU2hvb3QodGhpcy5uZXRJZCwgMCwgMywgNSAqIDYwKTtcclxuICAgICAgICBwcml2YXRlIGRhc2hXZWFwb246IFdlYXBvbnMuV2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKDEyLCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuU1VNTU9ORVIsIDEsIHRoaXMubmV0SWQsIFdlYXBvbnMuQUlNLk5PUk1BTCk7XHJcbiAgICAgICAgcHJpdmF0ZSBmbG9jazogRmxvY2tpbmdCZWhhdmlvdXIgPSBuZXcgRmxvY2tpbmdCZWhhdmlvdXIodGhpcywgNCwgNCwgMCwgMCwgMSwgMSwgMSwgMik7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuRU5FTVk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gR2FtZS5hdmF0YXIxLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UoQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbikudG9WZWN0b3IyKCkudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGU7XHJcbiAgICAgICAgICAgIHRoaXMuZmxvY2sudXBkYXRlKCk7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMuZmxvY2suZ2V0TW92ZVZlY3RvcigpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICBpZiAoZGlzdGFuY2UgPCA1KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdvdFJlY29nbml6ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5mbG9jay5hdm9pZFdlaWdodCA9IDU7XHJcbiAgICAgICAgICAgICAgICAvL1RPRE86IEludHJvIGFuaW1hdGlvbiBoZXJlIGFuZCB3aGVuIGl0IGlzIGRvbmUgdGhlbiBmaWdodC4uLlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5mbG9jay5hdm9pZFdlaWdodCA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmRhbWFnZVRha2VuID49IDI1KSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgQnVmZi5BdHRyaWJ1dGVzQnVmZihCdWZmLkJVRkZJRC5JTU1VTkUsIG51bGwsIDEsIDApLmFkZFRvRW50aXR5KHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgLy8gbmV3IEJ1ZmYuRGFtYWdlQnVmZihCdWZmLkJVRkZJRC5QT0lTT04sIDEyMCwgMzAsIDMpLmFkZFRvRW50aXR5KHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5TVU1NT047XHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzLmRhbWFnZVRha2VuID0gMDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuRkxFRTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldERhbWFnZShfdmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5nZXREYW1hZ2UoX3ZhbHVlKTtcclxuICAgICAgICAgICAgdGhpcy5kYW1hZ2VUYWtlbiArPSBfdmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRkxFRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNraW5nUGhhc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5TVU1NT046XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5TVU1NT04pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmZW5jZVBoYXNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbnNbXCJpZGxlXCJdKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXR0YWNraW5nUGhhc2UoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5hdHRhY2tQaGFzZUNkLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF0dGFja1BoYXNlQ2Quc2V0TWF4Q29vbERvd24gPSBNYXRoLnJvdW5kKHRoaXMuYXR0YWNrUGhhc2VDZC5nZXRNYXhDb29sRG93biArIE1hdGgucmFuZG9tKCkgKiA1ICsgTWF0aC5yYW5kb20oKSAqIC01KTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNrUGhhc2VDZC5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuYXR0YWNrUGhhc2VDZC5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpLnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChkaXN0YW5jZSA+IDEwIHx8IHRoaXMuZGFzaC5kb2VzQWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IENhbGN1bGF0aW9uLmdldFJvdGF0ZWRWZWN0b3JCeUFuZ2xlMkQodGhpcy5tb3ZlRGlyZWN0aW9uLCA5MCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDEwMCkgPj0gMTApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXNoLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5tb3ZlQXdheShDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikudG9WZWN0b3IyKCkpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhc2guZG9lc0FiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhc2hXZWFwb24uc2hvb3QodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpLnRvVmVjdG9yMygpLCBudWxsLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhc2hXZWFwb24uZ2V0Q29vbERvd24uc2V0TWF4Q29vbERvd24gPSBDYWxjdWxhdGlvbi5jbGFtcE51bWJlcihNYXRoLnJhbmRvbSgpICogMzAsIDgsIDMwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSAobmV3IMaSLlZlY3RvcjIoMCwgMCkpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zaG9vdGluZzM2MCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkZWZlbmNlUGhhc2UoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuc3VtbW9uLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICAvL1RPRE86IG1ha2UgaWYgZGVwZW5kZW50IGZyb20gdGVsZXBvcnQgYW5pbWF0aW9uIGZyYW1lXHJcbiAgICAgICAgICAgIC8vIGlmICghdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi5lcXVhbHMobmV3IMaSLlZlY3RvcjIoMCwgLTEzKS50b1ZlY3RvcjMoKSwgMSkpIHtcclxuICAgICAgICAgICAgLy8gbGV0IHN1bW1vblBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjIgPSBuZXcgxpIuVmVjdG9yMigwLCAtMTApO1xyXG4gICAgICAgICAgICAvLyB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gc3VtbW9uUG9zaXRpb24udG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIC8vIC8vIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGlmICghdGhpcy5kZWZlbmNlUGhhc2VDZC5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAvLyAgICAgdGhpcy5kZWZlbmNlUGhhc2VDZC5zZXRNYXhDb29sRG93biA9IE1hdGgucm91bmQodGhpcy5kZWZlbmNlUGhhc2VDZC5nZXRNYXhDb29sRG93biArIE1hdGgucmFuZG9tKCkgKiA1ICsgTWF0aC5yYW5kb20oKSAqIC01KTtcclxuICAgICAgICAgICAgLy8gICAgIHRoaXMuZGVmZW5jZVBoYXNlQ2Quc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgIC8vIGlmICh0aGlzLmRlZmVuY2VQaGFzZUNkLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgIC8vICAgICBpZiAodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi5lcXVhbHMoc3VtbW9uUG9zaXRpb24udG9WZWN0b3IzKCksIDEpICYmIHRoaXMuZ2V0Q3VycmVudEZyYW1lID09IDkpIHtcclxuICAgICAgICAgICAgLy8gICAgICAgICBjb25zb2xlLmxvZyhcInNwYXduaW5nXCIpO1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIC8vIHRoaXMuc3VtbW9uLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgICAgICAvLyB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyAgICAgLy8gKDxCdWZmLkF0dHJpYnV0ZXNCdWZmPnRoaXMuYnVmZnMuZmluZChidWZmID0+IGJ1ZmYuaWQgPT0gQnVmZi5CVUZGSUQuSU1NVU5FKSkuZHVyYXRpb24gPSAwO1xyXG4gICAgICAgICAgICAvLyAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IChuZXcgxpIuVmVjdG9yMigwLCAwKSkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIC8vICAgICB0aGlzLnNob290aW5nMzYwKCk7XHJcbiAgICAgICAgICAgIC8vICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLkZMRUU7XHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2hvb3RpbmczNjAoKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5iZWdpblNob290aW5nKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTaG9vdGluZ0NvdW50ID0gTWF0aC5yb3VuZCh0aGlzLnNob290aW5nQ291bnQgKyBNYXRoLnJhbmRvbSgpICogMik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJlZ2luU2hvb3RpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFNob290aW5nQ291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG9vdDM2MC5idWxsZXRBbW91bnQgPSBNYXRoLnJvdW5kKDggKyBNYXRoLnJhbmRvbSgpICogOCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG9vdDM2MC5kb0FiaWxpdHkoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zaG9vdDM2MC5kb2VzQWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTaG9vdGluZ0NvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luU2hvb3RpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBCdWZmIHtcclxuXHJcbiAgICBleHBvcnQgZW51bSBCVUZGSUQge1xyXG4gICAgICAgIEJMRUVESU5HLFxyXG4gICAgICAgIFBPSVNPTixcclxuICAgICAgICBIRUFMLFxyXG4gICAgICAgIFNMT1csXHJcbiAgICAgICAgSU1NVU5FLFxyXG4gICAgICAgIFNDQUxFVVAsXHJcbiAgICAgICAgU0NBTEVET1dOXHJcbiAgICB9XHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgQnVmZiB7XHJcbiAgICAgICAgZHVyYXRpb246IG51bWJlcjtcclxuICAgICAgICB0aWNrUmF0ZTogbnVtYmVyXHJcbiAgICAgICAgaWQ6IEJVRkZJRDtcclxuICAgICAgICBwcm90ZWN0ZWQgbm9EdXJhdGlvbjogbnVtYmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBjb29sRG93bjogQWJpbGl0eS5Db29sZG93bjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBCVUZGSUQsIF9kdXJhdGlvbjogbnVtYmVyLCBfdGlja1JhdGU6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gX2lkO1xyXG4gICAgICAgICAgICB0aGlzLmR1cmF0aW9uID0gX2R1cmF0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLnRpY2tSYXRlID0gX3RpY2tSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLm5vRHVyYXRpb24gPSAwO1xyXG4gICAgICAgICAgICBpZiAoX2R1cmF0aW9uICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb29sRG93biA9IG5ldyBBYmlsaXR5LkNvb2xkb3duKF9kdXJhdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvb2xEb3duID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZ2V0UGFydGljbGVCeUlkKF9pZDogQlVGRklEKTogVUkuUGFydGljbGVzIHtcclxuICAgICAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELlBPSVNPTjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVJLlBhcnRpY2xlcyhCVUZGSUQuUE9JU09OLCBVSS5wb2lzb25QYXJ0aWNsZSwgNiwgMTIpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuSU1NVU5FOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVUkuUGFydGljbGVzKEJVRkZJRC5JTU1VTkUsIFVJLmltbXVuZVBhcnRpY2xlLCAxLCA2KTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjbG9uZSgpOiBCdWZmIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgYXBwbHlCdWZmKF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRCdWZmQnlJZCh0aGlzLmlkLCBfYXZhdGFyLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQnVmZkxpc3QoX2F2YXRhci5idWZmcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogcmVtb3ZlcyB0aGUgYnVmZiBmcm9tIHRoZSBidWZmIGxpc3QsIHJlbW92ZXMgdGhlIHBhcnRpY2xlIGFuZCBzZW5kcyB0aGUgbmV3IGxpc3QgdG8gdGhlIGNsaWVudFxyXG4gICAgICAgICAqIEBwYXJhbSBfYXZhdGFyIGVudGl0eSB0aGUgYnVmZiBzaG91bGQgYmUgcmVtb3ZlZFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyByZW1vdmVCdWZmKF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgX2F2YXRhci5yZW1vdmVDaGlsZChfYXZhdGFyLmdldENoaWxkcmVuKCkuZmluZChjaGlsZCA9PiAoPFVJLlBhcnRpY2xlcz5jaGlsZCkuaWQgPT0gdGhpcy5pZCkpO1xyXG4gICAgICAgICAgICBfYXZhdGFyLmJ1ZmZzLnNwbGljZShfYXZhdGFyLmJ1ZmZzLmluZGV4T2YodGhpcykpO1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEJ1ZmZCeUlkKHRoaXMuaWQsIF9hdmF0YXIsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQnVmZkxpc3QoX2F2YXRhci5idWZmcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogb25seSB1c2UgdGhpcyBmdW5jdGlvbiB0byBhZGQgYnVmZnMgdG8gZW50aXRpZXNcclxuICAgICAgICAgKiBAcGFyYW0gX2F2YXRhciBlbnRpdHkgaXQgc2hvdWxkIGJlIGFkZCB0b1xyXG4gICAgICAgICAqIEByZXR1cm5zIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBhZGRUb0VudGl0eShfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIGlmIChfYXZhdGFyLmJ1ZmZzLmZpbHRlcihidWZmID0+IGJ1ZmYuaWQgPT0gdGhpcy5pZCkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgX2F2YXRhci5idWZmcy5wdXNoKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRQYXJ0aWNsZShfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvb2xEb3duICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29vbERvd24uc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVCdWZmTGlzdChfYXZhdGFyLmJ1ZmZzLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogYnVmZiBhcHBsaWVzIGl0cyBidWZmIHN0YXRzIHRvIHRoZSBlbnRpdHkgYW5kIGRlbGV0ZXMgaXRzZWxmIHdoZW4gaXRzIGR1cmF0aW9uIGlzIG92ZXJcclxuICAgICAgICAgKiBAcGFyYW0gX2F2YXRhciBlbnRpdHkgaXQgc2hvdWxkIGJlIGFkZCB0b1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBkb0J1ZmZTdHVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGdldEJ1ZmZCeUlkKF9pZDogQnVmZi5CVUZGSUQsIF9hdmF0YXI6IEVudGl0eS5FbnRpdHksIF9hZGQ6IGJvb2xlYW4pIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgYWRkUGFydGljbGUoX2F2YXRhcjogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICBpZiAoX2F2YXRhci5nZXRDaGlsZHJlbigpLmZpbmQoY2hpbGQgPT4gKDxVSS5QYXJ0aWNsZXM+Y2hpbGQpLmlkID09IHRoaXMuaWQpID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHBhcnRpY2xlID0gdGhpcy5nZXRQYXJ0aWNsZUJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgICAgICBpZiAocGFydGljbGUgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hZGRDaGlsZChwYXJ0aWNsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFydGljbGUubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjMoX2F2YXRhci5tdHhMb2NhbC5zY2FsaW5nLngsIF9hdmF0YXIubXR4TG9jYWwuc2NhbGluZy55LCAxKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFydGljbGUubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMihfYXZhdGFyLm9mZnNldENvbGxpZGVyWCwgX2F2YXRhci5vZmZzZXRDb2xsaWRlclkpLnRvVmVjdG9yMygwLjEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcnRpY2xlLmFjdGl2YXRlKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBSYXJpdHlCdWZmIHtcclxuICAgICAgICBpZDogSXRlbXMuUkFSSVRZO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogSXRlbXMuUkFSSVRZKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgYWRkVG9JdGVtKF9pdGVtOiBJdGVtcy5JdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkUGFydGljbGVUb0l0ZW0oX2l0ZW0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBnZXRQYXJ0aWNsZUJ5SWQoX2lkOiBJdGVtcy5SQVJJVFkpOiBVSS5QYXJ0aWNsZXMge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKF9pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5SQVJJVFkuQ09NTU9OOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVUkuUGFydGljbGVzKF9pZCwgVUkuY29tbW9uUGFydGljbGUsIDEsIDEyKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgSXRlbXMuUkFSSVRZLlJBUkU6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoX2lkLCBVSS5yYXJlUGFydGljbGUsIDEsIDEyKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgSXRlbXMuUkFSSVRZLkVQSUM6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoX2lkLCBVSS5lcGljUGFydGljbGUsIDEsIDEyKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgSXRlbXMuUkFSSVRZLkxFR0VOREFSWTpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVJLlBhcnRpY2xlcyhfaWQsIFVJLmxlZ2VuZGFyeVBhcnRpY2xlLCAxLCAxMik7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVUkuUGFydGljbGVzKF9pZCwgVUkuY29tbW9uUGFydGljbGUsIDEsIDEyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBhZGRQYXJ0aWNsZVRvSXRlbShfaXRlbTogSXRlbXMuSXRlbSkge1xyXG4gICAgICAgICAgICBpZiAoX2l0ZW0uZ2V0Q2hpbGRyZW4oKS5maW5kKGNoaWxkID0+ICg8VUkuUGFydGljbGVzPmNoaWxkKS5pZCA9PSB0aGlzLmlkKSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBwYXJ0aWNsZSA9IHRoaXMuZ2V0UGFydGljbGVCeUlkKHRoaXMuaWQpXHJcbiAgICAgICAgICAgICAgICBpZiAocGFydGljbGUgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2l0ZW0uYWRkQ2hpbGQocGFydGljbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcnRpY2xlLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKF9pdGVtLm10eExvY2FsLnNjYWxpbmcueCwgX2l0ZW0ubXR4TG9jYWwuc2NhbGluZy55LCAxKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFydGljbGUubXR4TG9jYWwudHJhbnNsYXRlWigwLjEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcnRpY2xlLmFjdGl2YXRlKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBjcmVhdGVzIGEgbmV3IEJ1ZmYgdGhhdCBkb2VzIERhbWFnZSB0byBhbiBFbnRpdHk7XHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBEYW1hZ2VCdWZmIGV4dGVuZHMgQnVmZiB7XHJcbiAgICAgICAgdmFsdWU6IG51bWJlcjtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEJVRkZJRCwgX2R1cmF0aW9uOiBudW1iZXIsIF90aWNrUmF0ZTogbnVtYmVyLCBfdmFsdWU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9kdXJhdGlvbiwgX3RpY2tSYXRlKVxyXG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gX3ZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNsb25lKCk6IERhbWFnZUJ1ZmYge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IERhbWFnZUJ1ZmYodGhpcy5pZCwgdGhpcy5kdXJhdGlvbiwgdGhpcy50aWNrUmF0ZSwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZG9CdWZmU3R1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb29sRG93biAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5jb29sRG93bi5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlQnVmZihfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0aGlzLmNvb2xEb3duLmdldEN1cnJlbnRDb29sZG93biAlIHRoaXMudGlja1JhdGUgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubm9EdXJhdGlvbiAlIHRoaXMudGlja1JhdGUgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5ub0R1cmF0aW9uKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBnZXRCdWZmQnlJZChfaWQ6IEJVRkZJRCwgX2F2YXRhcjogRW50aXR5LkVudGl0eSwgX2FkZDogYm9vbGVhbikge1xyXG4gICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5CTEVFRElORzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5nZXREYW1hZ2UodGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELlBPSVNPTjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSBkbyBkYW1hZ2UgdG8gcGxheWVyIHVudGlsIGhlIGhhcyAyMCUgaGVhbHRoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfYXZhdGFyIGluc3RhbmNlb2YgUGxheWVyLlBsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9hdmF0YXIuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgPiBfYXZhdGFyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzICogMC4yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5nZXREYW1hZ2UodGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmdldERhbWFnZSh0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHsgcmV0dXJuOyB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBjcmVhdGVzIGEgbmV3IEJ1ZmYgdGhhdCBjaGFuZ2VzIGFuIGF0dHJpYnV0ZSBvZiBhbiBFbnRpdHkgZm9yIHRoZSBkdXJhdGlvbiBvZiB0aGUgYnVmZlxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgQXR0cmlidXRlc0J1ZmYgZXh0ZW5kcyBCdWZmIHtcclxuICAgICAgICBpc0J1ZmZBcHBsaWVkOiBib29sZWFuO1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXI7XHJcbiAgICAgICAgcmVtb3ZlZFZhbHVlOiBudW1iZXI7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBCVUZGSUQsIF9kdXJhdGlvbjogbnVtYmVyLCBfdGlja1JhdGU6IG51bWJlciwgX3ZhbHVlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfZHVyYXRpb24sIF90aWNrUmF0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuaXNCdWZmQXBwbGllZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gX3ZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgY2xvbmUoKTogQXR0cmlidXRlc0J1ZmYge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEF0dHJpYnV0ZXNCdWZmKHRoaXMuaWQsIHRoaXMuZHVyYXRpb24sIHRoaXMudGlja1JhdGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgZG9CdWZmU3R1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmR1cmF0aW9uIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUJ1ZmYoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmICghdGhpcy5pc0J1ZmZBcHBsaWVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseUJ1ZmYoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0J1ZmZBcHBsaWVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuZHVyYXRpb24tLTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5pc0J1ZmZBcHBsaWVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseUJ1ZmYoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0J1ZmZBcHBsaWVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkUGFydGljbGUoX2F2YXRhcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBnZXRCdWZmQnlJZChfaWQ6IEJVRkZJRCwgX2F2YXRhcjogRW50aXR5LkVudGl0eSwgX2FkZDogYm9vbGVhbikge1xyXG4gICAgICAgICAgICBsZXQgcGF5bG9hZDogSW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKF9pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuU0xPVzpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZWRWYWx1ZSA9IF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCAtIENhbGN1bGF0aW9uLnN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCAtPSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCArPSB0aGlzLnJlbW92ZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5JTU1VTkU6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmhpdGFibGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHBheWxvYWQgPSA8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5oaXRhYmxlLCB0eXBlOiBFbnRpdHkuQVRUUklCVVRFVFlQRS5ISVRBQkxFIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELlNDQUxFVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVkVmFsdWUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpIC0gX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlIC09IHRoaXMucmVtb3ZlZFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLnVwZGF0ZVNjYWxlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGF5bG9hZCA9IDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCB0eXBlOiBFbnRpdHkuQVRUUklCVVRFVFlQRS5TQ0FMRSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuU0NBTEVET1dOOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlZFZhbHVlID0gX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlIC0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlID0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSArPSB0aGlzLnJlbW92ZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBheWxvYWQgPSA8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuU0NBTEUgfTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMocGF5bG9hZCwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEJ1bGxldHMge1xyXG5cclxuICAgIGV4cG9ydCBlbnVtIEJVTExFVFRZUEUge1xyXG4gICAgICAgIFNUQU5EQVJELFxyXG4gICAgICAgIEhJR0hTUEVFRCxcclxuICAgICAgICBTTE9XLFxyXG4gICAgICAgIE1FTEVFLFxyXG4gICAgICAgIFNVTU1PTkVSLFxyXG4gICAgICAgIFRIT1JTSEFNTUVSLFxyXG4gICAgICAgIFpJUFpBUFxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBsZXQgYnVsbGV0VHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHdhdGVyQmFsbFR4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQnVsbGV0IGV4dGVuZHMgR2FtZS7Gki5Ob2RlIGltcGxlbWVudHMgSW50ZXJmYWNlcy5JU3Bhd25hYmxlLCBJbnRlcmZhY2VzLklOZXR3b3JrYWJsZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuQlVMTEVUO1xyXG4gICAgICAgIG93bmVyTmV0SWQ6IG51bWJlcjsgZ2V0IG93bmVyKCk6IEVudGl0eS5FbnRpdHkgeyByZXR1cm4gR2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSB0aGlzLm93bmVyTmV0SWQpIH07XHJcbiAgICAgICAgcHVibGljIG5ldElkOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGNsaWVudFByZWRpY3Rpb246IE5ldHdvcmtpbmcuQ2xpZW50QnVsbGV0UHJlZGljdGlvbjtcclxuICAgICAgICBwdWJsaWMgc2VydmVyUHJlZGljdGlvbjogTmV0d29ya2luZy5TZXJ2ZXJCdWxsZXRQcmVkaWN0aW9uO1xyXG4gICAgICAgIHB1YmxpYyBmbHlEaXJlY3Rpb246IMaSLlZlY3RvcjM7XHJcbiAgICAgICAgZGlyZWN0aW9uOiDGki5WZWN0b3IzO1xyXG5cclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG5cclxuICAgICAgICBwdWJsaWMgaGl0UG9pbnRzU2NhbGU6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgc3BlZWQ6IG51bWJlciA9IDIwO1xyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXIgPSAxICogNjA7XHJcbiAgICAgICAga25vY2tiYWNrRm9yY2U6IG51bWJlciA9IDQ7XHJcbiAgICAgICAgdHlwZTogQlVMTEVUVFlQRTtcclxuXHJcbiAgICAgICAgdGltZTogbnVtYmVyID0gMDtcclxuICAgICAgICBraWxsY291bnQ6IG51bWJlciA9IDE7XHJcblxyXG4gICAgICAgIHRleHR1cmVQYXRoOiBzdHJpbmc7XHJcblxyXG4gICAgICAgIHB1YmxpYyBkZXNwYXduKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA+PSAwICYmIHRoaXMubGlmZXRpbWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saWZldGltZS0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnJlbW92ZUJ1bGxldCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50eXBlID09IEJVTExFVFRZUEUuVEhPUlNIQU1NRVIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zcGF3blRob3JzSGFtbWVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfYnVsbGV0VHlwZTogQlVMTEVUVFlQRSwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfb3duZXJOZXRJZDogbnVtYmVyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoQlVMTEVUVFlQRVtfYnVsbGV0VHlwZV0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy50eXBlID0gX2J1bGxldFR5cGU7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm5ldElkID0gTmV0d29ya2luZy5JZE1hbmFnZXIoX25ldElkKTtcclxuXHJcbiAgICAgICAgICAgIGxldCByZWYgPSBHYW1lLmJ1bGxldHNKU09OLmZpbmQoYnVsbGV0ID0+IGJ1bGxldC5uYW1lID09IEJVTExFVFRZUEVbX2J1bGxldFR5cGVdLnRvTG93ZXJDYXNlKCkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IHJlZi5zcGVlZDtcclxuICAgICAgICAgICAgdGhpcy5oaXRQb2ludHNTY2FsZSA9IHJlZi5oaXRQb2ludHNTY2FsZTtcclxuICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IHJlZi5saWZldGltZTtcclxuICAgICAgICAgICAgdGhpcy5rbm9ja2JhY2tGb3JjZSA9IHJlZi5rbm9ja2JhY2tGb3JjZTtcclxuICAgICAgICAgICAgdGhpcy5raWxsY291bnQgPSByZWYua2lsbGNvdW50O1xyXG4gICAgICAgICAgICB0aGlzLnRleHR1cmVQYXRoID0gcmVmLnRleHR1cmVQYXRoO1xyXG5cclxuICAgICAgICAgICAgLy8gdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudExpZ2h0KG5ldyDGki5MaWdodFBvaW50KMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgMCk7XHJcbiAgICAgICAgICAgIGxldCBtZXNoOiDGki5NZXNoUXVhZCA9IG5ldyDGki5NZXNoUXVhZCgpO1xyXG4gICAgICAgICAgICBsZXQgY21wTWVzaDogxpIuQ29tcG9uZW50TWVzaCA9IG5ldyDGki5Db21wb25lbnRNZXNoKG1lc2gpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChjbXBNZXNoKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBtdHJTb2xpZFdoaXRlOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIlNvbGlkV2hpdGVcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIikpKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1hdGVyaWFsOiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChtdHJTb2xpZFdoaXRlKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyUG9zaXRpb24gPSBuZXcgxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIoY29sbGlkZXJQb3NpdGlvbiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55IC8gMS41LCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVSb3RhdGlvbihfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSgpO1xyXG4gICAgICAgICAgICB0aGlzLmZseURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWCgpO1xyXG4gICAgICAgICAgICB0aGlzLmRpcmVjdGlvbiA9IF9kaXJlY3Rpb247XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9vd25lck5ldElkO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXJ2ZXJQcmVkaWN0aW9uID0gbmV3IE5ldHdvcmtpbmcuU2VydmVyQnVsbGV0UHJlZGljdGlvbih0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5jbGllbnRQcmVkaWN0aW9uID0gbmV3IE5ldHdvcmtpbmcuQ2xpZW50QnVsbGV0UHJlZGljdGlvbih0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuUkVOREVSX1BSRVBBUkUsIHRoaXMuZXZlbnRVcGRhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGV2ZW50VXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICB0aGlzLnByZWRpY3QoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBwcmVkaWN0KCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkICYmIHRoaXMub3duZXIgPT0gR2FtZS5hdmF0YXIxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsaWVudFByZWRpY3Rpb24udXBkYXRlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vd25lciA9PSBHYW1lLmF2YXRhcjIpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcnZlclByZWRpY3Rpb24udXBkYXRlKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZSh0aGlzLmZseURpcmVjdGlvbi5jbG9uZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVCdWxsZXQodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy5tdHhMb2NhbC5yb3RhdGlvbiwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kZXNwYXduKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIG1vdmUoX2RpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQgJiYgdGhpcy5vd25lciA9PSBHYW1lLmF2YXRhcjIpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUodGhpcy5jbGllbnRQcmVkaWN0aW9uLm1pblRpbWVCZXR3ZWVuVGlja3MgKiB0aGlzLnNwZWVkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLnNwZWVkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMub2Zmc2V0Q29sbGlkZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaXNpb25EZXRlY3Rpb24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCB1cGRhdGVSb3RhdGlvbihfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwucm90YXRlWihDYWxjdWxhdGlvbi5jYWxjRGVncmVlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCDGki5WZWN0b3IzLlNVTShfZGlyZWN0aW9uLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikpICsgOTApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHNwYXduVGhvcnNIYW1tZXIoKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIGxldCByZW1vdmVJdGVtID0gdGhpcy5vd25lci5pdGVtcy5maW5kKGl0ZW0gPT4gKDxJdGVtcy5JbnRlcm5hbEl0ZW0+aXRlbSkuaWQgPT0gSXRlbXMuSVRFTUlELlRIT1JTSEFNTUVSKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlSW52ZW50b3J5KGZhbHNlLCByZW1vdmVJdGVtLmlkLCByZW1vdmVJdGVtLm5ldElkLCB0aGlzLm93bmVyTmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vd25lci5pdGVtcy5zcGxpY2UodGhpcy5vd25lci5pdGVtcy5pbmRleE9mKHJlbW92ZUl0ZW0pLCAxKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaXRlbSA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oSXRlbXMuSVRFTUlELlRIT1JTSEFNTUVSKTtcclxuICAgICAgICAgICAgICAgIGl0ZW0uc2V0UG9zaXRpb24odGhpcy5tdHhXb3JsZC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vd25lciA9PSBHYW1lLmF2YXRhcjEpIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLnNldENob29zZW5PbmVOZXRJZChHYW1lLmF2YXRhcjIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLnNldENob29zZW5PbmVOZXRJZChHYW1lLmF2YXRhcjEubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaXRlbS5zcGF3bigpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMub3duZXIud2VhcG9uLmdldENvb2xEb3duLnNldE1heENvb2xEb3duID0gK2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwiY29vbGRvd25UaW1lXCIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vd25lci53ZWFwb24uYWltVHlwZSA9ICg8YW55PldlYXBvbnMuQUlNKVtsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImFpbVR5cGVcIildO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vd25lci53ZWFwb24uYnVsbGV0VHlwZSA9ICg8YW55PkJVTExFVFRZUEUpW2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwiYnVsbGV0VHlwZVwiKV07XHJcbiAgICAgICAgICAgICAgICB0aGlzLm93bmVyLndlYXBvbi5wcm9qZWN0aWxlQW1vdW50ID0gK2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwicHJvamVjdGlsZUFtb3VudFwiKTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3duZXIud2VhcG9uLmNhblNob290ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhcldlYXBvbih0aGlzLm93bmVyLndlYXBvbiwgdGhpcy5vd25lck5ldElkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGxvYWRUZXh0dXJlKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy50ZXh0dXJlUGF0aCAhPSBcIlwiIHx8IHRoaXMudGV4dHVyZVBhdGggIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld1R4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld0NvYXQ6IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCA9IG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoKTtcclxuICAgICAgICAgICAgICAgIGxldCBuZXdNdHI6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibXRyXCIsIMaSLlNoYWRlckZsYXRUZXh0dXJlZCwgbmV3Q29hdCk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG9sZENvbUNvYXQ6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgb2xkQ29tQ29hdCA9IHRoaXMuZ2V0Q29tcG9uZW50KMaSLkNvbXBvbmVudE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMudGV4dHVyZVBhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIGJ1bGxldFR4dC51cmw6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IGJ1bGxldFR4dDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSB3YXRlckJhbGxUeHQudXJsOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB3YXRlckJhbGxUeHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIG5ld0NvYXQuY29sb3IgPSDGki5Db2xvci5DU1MoXCJXSElURVwiKTtcclxuICAgICAgICAgICAgICAgIG5ld0NvYXQudGV4dHVyZSA9IG5ld1R4dDtcclxuICAgICAgICAgICAgICAgIG9sZENvbUNvYXQubWF0ZXJpYWwgPSBuZXdNdHI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldEJ1ZmZUb1RhcmdldChfdGFyZ2V0OiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuaXRlbXMuZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgICAgIGl0ZW0uYnVmZi5mb3JFYWNoKGJ1ZmYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChidWZmICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmLmNsb25lKCkuYWRkVG9FbnRpdHkoX3RhcmdldCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgb2Zmc2V0Q29sbGlkZXIoKSB7XHJcbiAgICAgICAgICAgIGxldCBuZXdQb3NpdGlvbiA9IG5ldyDGki5WZWN0b3IyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKyB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG5ld1Bvc2l0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNvbGxpc2lvbkRldGVjdGlvbigpIHtcclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyczogxpIuTm9kZVtdID0gW107XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm93bmVyLnRhZyA9PSBUYWcuVEFHLlBMQVlFUikge1xyXG4gICAgICAgICAgICAgICAgY29sbGlkZXJzID0gR2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuRU5FTVkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChfZWxlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnQ6IEVuZW15LkVuZW15ID0gKDxFbmVteS5FbmVteT5fZWxlbSk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50LmNvbGxpZGVyKSAmJiBlbGVtZW50LmF0dHJpYnV0ZXMgIT0gdW5kZWZpbmVkICYmIHRoaXMua2lsbGNvdW50ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgoPEVuZW15LkVuZW15PmVsZW1lbnQpLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEVuZW15LlN1bW1vbm9yQWRkcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCg8RW5lbXkuU3VtbW9ub3JBZGRzPmVsZW1lbnQpLmF2YXRhciA9PSB0aGlzLm93bmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5raWxsY291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxFbmVteS5FbmVteT5lbGVtZW50KS5nZXREYW1hZ2UodGhpcy5vd25lci5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cyAqIHRoaXMuaGl0UG9pbnRzU2NhbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEJ1ZmZUb1RhcmdldCgoPEVuZW15LkVuZW15PmVsZW1lbnQpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxFbmVteS5FbmVteT5lbGVtZW50KS5nZXRLbm9ja2JhY2sodGhpcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMua2lsbGNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICBpZiAodGhpcy5vd25lci50YWcgPT0gVGFnLlRBRy5FTkVNWSkge1xyXG4gICAgICAgICAgICAgICAgY29sbGlkZXJzID0gR2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5QTEFZRVIpO1xyXG4gICAgICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKF9lbGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVsZW1lbnQ6IFBsYXllci5QbGF5ZXIgPSAoPFBsYXllci5QbGF5ZXI+X2VsZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQuY29sbGlkZXIpICYmIGVsZW1lbnQuYXR0cmlidXRlcyAhPSB1bmRlZmluZWQgJiYgdGhpcy5raWxsY291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgPiAwICYmICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5hdHRyaWJ1dGVzLmhpdGFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5nZXREYW1hZ2UodGhpcy5oaXRQb2ludHNTY2FsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkuZ2V0S25vY2tiYWNrKHRoaXMua25vY2tiYWNrRm9yY2UsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXcgVUkuRGFtYWdlVUkoKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy5oaXRQb2ludHNTY2FsZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5raWxsY291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmtpbGxjb3VudCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29sbGlkZXJzID0gW107XHJcbiAgICAgICAgICAgIGNvbGxpZGVycyA9ICg8R2VuZXJhdGlvbi5Sb29tPkdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maW5kKGVsZW1lbnQgPT4gKDxHZW5lcmF0aW9uLlJvb20+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuUk9PTSkpLndhbGxzO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoX2VsZW0pID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBlbGVtZW50OiBHZW5lcmF0aW9uLldhbGwgPSAoPEdlbmVyYXRpb24uV2FsbD5fZWxlbSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5jb2xsaWRlciAhPSB1bmRlZmluZWQgJiYgdGhpcy5jb2xsaWRlci5jb2xsaWRlc1JlY3QoZWxlbWVudC5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEhvbWluZ0J1bGxldCBleHRlbmRzIEJ1bGxldCB7XHJcbiAgICAgICAgdGFyZ2V0OiDGki5WZWN0b3IzO1xyXG4gICAgICAgIHJvdGF0ZVNwZWVkOiBudW1iZXIgPSAyO1xyXG4gICAgICAgIHRhcmdldERpcmVjdGlvbjogxpIuVmVjdG9yMztcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2J1bGxldHR5cGU6IEJVTExFVFRZUEUsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX293bmVySWQ6IG51bWJlciwgX3RhcmdldD86IMaSLlZlY3RvcjMsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfYnVsbGV0dHlwZSwgX3Bvc2l0aW9uLCBfZGlyZWN0aW9uLCBfb3duZXJJZCwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IDIwO1xyXG4gICAgICAgICAgICB0aGlzLmhpdFBvaW50c1NjYWxlID0gMTtcclxuICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDEgKiA2MDtcclxuICAgICAgICAgICAgdGhpcy5raWxsY291bnQgPSAxO1xyXG4gICAgICAgICAgICBpZiAoX3RhcmdldCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRhcmdldCA9IF90YXJnZXQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vICAgICB0aGlzLnRhcmdldCA9IMaSLlZlY3RvcjMuU1VNKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24sIF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0RGlyZWN0aW9uID0gX2RpcmVjdGlvbjtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRUYXJnZXQoR2FtZS5hdmF0YXIyLm5ldElkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG1vdmUoX2RpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIHN1cGVyLm1vdmUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlSG9taW5nKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vd25lciA9PSBHYW1lLmF2YXRhcjEpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZUhvbWluZygpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRUYXJnZXQoX25ldElEOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgaWYgKEdhbWUuZW50aXRpZXMuZmluZChlbnQgPT4gZW50Lm5ldElkID09IF9uZXRJRCkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRhcmdldCA9IEdhbWUuZW50aXRpZXMuZmluZChlbnQgPT4gZW50Lm5ldElkID09IF9uZXRJRCkubXR4TG9jYWwudHJhbnNsYXRpb247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgY2FsY3VsYXRlSG9taW5nKCkge1xyXG4gICAgICAgICAgICBsZXQgbmV3RGlyZWN0aW9uID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgaWYgKG5ld0RpcmVjdGlvbi54ICE9IDAgJiYgbmV3RGlyZWN0aW9uLnkgIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCByb3RhdGVBbW91bnQyOiBudW1iZXIgPSDGki5WZWN0b3IzLkNST1NTKG5ld0RpcmVjdGlvbiwgdGhpcy5tdHhMb2NhbC5nZXRYKCkpLno7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwucm90YXRlWigtcm90YXRlQW1vdW50MiAqIHRoaXMucm90YXRlU3BlZWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgWmlwWmFwT2JqZWN0IGV4dGVuZHMgQnVsbGV0IHtcclxuICAgICAgICBwcml2YXRlIG5leHRUYXJnZXQ6IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgICAgICBwcml2YXRlIGF2YXRhcnM6IFBsYXllci5QbGF5ZXJbXTtcclxuICAgICAgICBwcml2YXRlIHBsYXllclNpemU6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIGNvdW50ZXI6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIHRpY2tIaXQ6IEFiaWxpdHkuQ29vbGRvd247XHJcbiAgICAgICAgY29uc3RydWN0b3IoX293bmVyTmV0SWQ6IG51bWJlciwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoQlVMTEVUVFlQRS5aSVBaQVAsIG5ldyDGki5WZWN0b3IyKDAsIDApLCBuZXcgxpIuVmVjdG9yMigwLCAwKS50b1ZlY3RvcjMoKSwgX293bmVyTmV0SWQsIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFycyA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdGhpcy5jb3VudGVyID0gMDtcclxuICAgICAgICAgICAgdGhpcy50YWcgPSBUYWcuVEFHLlVJO1xyXG4gICAgICAgICAgICB0aGlzLnRpY2tIaXQgPSBuZXcgQWJpbGl0eS5Db29sZG93bigxMik7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLm5ldElkKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIGV2ZW50VXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHByb3RlY3RlZCB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChHYW1lLmF2YXRhcjEgIT0gdW5kZWZpbmVkICYmIEdhbWUuYXZhdGFyMiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5hdmF0YXJzID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmF2YXRhcnMgPSBbR2FtZS5hdmF0YXIxLCBHYW1lLmF2YXRhcjJdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsYXllclNpemUgPSB0aGlzLmF2YXRhcnMubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm5leHRUYXJnZXQgPSB0aGlzLmF2YXRhcnNbMCAlIHRoaXMucGxheWVyU2l6ZV0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSB0aGlzLm5leHRUYXJnZXQudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXZhdGFycyA9IFtHYW1lLmF2YXRhcjEsIEdhbWUuYXZhdGFyMl07XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnRpY2tIaXQuaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaXNpb25EZXRlY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50aWNrSGl0LnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVCdWxsZXQodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy5tdHhMb2NhbC5yb3RhdGlvbiwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5raWxsY291bnQgPSA1MDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBzcGF3bigpIHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3blppcFphcCh0aGlzLm93bmVyTmV0SWQsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRlc3Bhd24oKSB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcucmVtb3ZlQnVsbGV0KHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG1vdmUoKSB7XHJcbiAgICAgICAgICAgIGxldCBkaXJlY3Rpb24gPSBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLm5leHRUYXJnZXQsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSBkaXJlY3Rpb24ubWFnbml0dWRlU3F1YXJlZDtcclxuICAgICAgICAgICAgaWYgKGRpcmVjdGlvbi5tYWduaXR1ZGVTcXVhcmVkID4gMCkge1xyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZShHYW1lLmRlbHRhVGltZSAqIHRoaXMuc3BlZWQpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0ZShkaXJlY3Rpb24udG9WZWN0b3IzKCkpO1xyXG4gICAgICAgICAgICBpZiAoZGlzdGFuY2UgPCAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvdW50ZXIgPSAodGhpcy5jb3VudGVyICsgMSkgJSB0aGlzLnBsYXllclNpemU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5uZXh0VGFyZ2V0ID0gdGhpcy5hdmF0YXJzW3RoaXMuY291bnRlcl0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIENvbGxpZGVyIHtcclxuICAgIGV4cG9ydCBjbGFzcyBDb2xsaWRlciB7XHJcbiAgICAgICAgcHVibGljIG93bmVyTmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIHJhZGl1czogbnVtYmVyOyBnZXQgZ2V0UmFkaXVzKCk6IG51bWJlciB7IHJldHVybiB0aGlzLnJhZGl1cyB9O1xyXG4gICAgICAgIHB1YmxpYyBwb3NpdGlvbjogxpIuVmVjdG9yMjtcclxuXHJcbiAgICAgICAgZ2V0IHRvcCgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueSAtIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IGxlZnQoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLnBvc2l0aW9uLnggLSB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCByaWdodCgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueCArIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IGJvdHRvbSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueSArIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX3JhZGl1czogbnVtYmVyLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uID0gX3Bvc2l0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLnJhZGl1cyA9IF9yYWRpdXM7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRQb3NpdGlvbihfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMikge1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uID0gX3Bvc2l0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldFNjYWxlKF9zY2FsZUFtb3VudDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmFkaXVzID0gX3NjYWxlQW1vdW50O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29sbGlkZXMoX2NvbGxpZGVyOiBDb2xsaWRlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2U6IMaSLlZlY3RvcjIgPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5wb3NpdGlvbiwgX2NvbGxpZGVyLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMucmFkaXVzICsgX2NvbGxpZGVyLnJhZGl1cyA+IGRpc3RhbmNlLm1hZ25pdHVkZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29sbGlkZXNSZWN0KF9jb2xsaWRlcjogR2FtZS7Gki5SZWN0YW5nbGUpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGVmdCA+IF9jb2xsaWRlci5yaWdodCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5yaWdodCA8IF9jb2xsaWRlci5sZWZ0KSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRvcCA+IF9jb2xsaWRlci5ib3R0b20pIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYm90dG9tIDwgX2NvbGxpZGVyLnRvcCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEludGVyc2VjdGlvbihfY29sbGlkZXI6IENvbGxpZGVyKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbGxpZGVzKF9jb2xsaWRlcikpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZTogxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvc2l0aW9uLCBfY29sbGlkZXIucG9zaXRpb24pO1xyXG4gICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5yYWRpdXMgKyBfY29sbGlkZXIucmFkaXVzIC0gZGlzdGFuY2UubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGludGVyc2VjdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEludGVyc2VjdGlvblJlY3QoX2NvbGxpZGVyOiDGki5SZWN0YW5nbGUpOiDGki5SZWN0YW5nbGUge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29sbGlkZXNSZWN0KF9jb2xsaWRlcikpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb246IMaSLlJlY3RhbmdsZSA9IG5ldyDGki5SZWN0YW5nbGUoKTtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLnggPSBNYXRoLm1heCh0aGlzLmxlZnQsIF9jb2xsaWRlci5sZWZ0KTtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLnkgPSBNYXRoLm1heCh0aGlzLnRvcCwgX2NvbGxpZGVyLnRvcCk7XHJcbiAgICAgICAgICAgIGludGVyc2VjdGlvbi53aWR0aCA9IE1hdGgubWluKHRoaXMucmlnaHQsIF9jb2xsaWRlci5yaWdodCkgLSBpbnRlcnNlY3Rpb24ueDtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLmhlaWdodCA9IE1hdGgubWluKHRoaXMuYm90dG9tLCBfY29sbGlkZXIuYm90dG9tKSAtIGludGVyc2VjdGlvbi55O1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGludGVyc2VjdGlvbjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXlTcGF3bmVyIHtcclxuICAgIGxldCBzcGF3blRpbWU6IG51bWJlciA9IDAgKiA2MDtcclxuICAgIGxldCBjdXJyZW50VGltZTogbnVtYmVyID0gc3Bhd25UaW1lO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bk11bHRpcGxlRW5lbWllc0F0Um9vbShfbWF4RW5lbWllczogbnVtYmVyLCBfcm9vbVBvczogR2FtZS7Gki5WZWN0b3IyKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAvL1RPRE86IGRlcGVuZGluZyBvbiBjdXJyZW50cm9vbS5lbmVteUNvdW50IGFuZCBkZWNyZWFzZSBpdCBcclxuICAgICAgICAgICAgbGV0IHNwYXduZWRFbmVtaWVzOiBudW1iZXIgPSAwO1xyXG4gICAgICAgICAgICB3aGlsZSAoc3Bhd25lZEVuZW1pZXMgPCBfbWF4RW5lbWllcykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRUaW1lID09IHNwYXduVGltZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbiA9IG5ldyDGki5WZWN0b3IyKCgoTWF0aC5yYW5kb20oKSAqIEdhbWUuY3VycmVudFJvb20ucm9vbVNpemUgLyAyKSAtICgoTWF0aC5yYW5kb20oKSAqIEdhbWUuY3VycmVudFJvb20ucm9vbVNpemUgLyAyKSkpLCAoKE1hdGgucmFuZG9tKCkgKiBHYW1lLmN1cnJlbnRSb29tLnJvb21TaXplIC8gMikgLSAoKE1hdGgucmFuZG9tKCkgKiBHYW1lLmN1cnJlbnRSb29tLnJvb21TaXplIC8gMikpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24uYWRkKF9yb29tUG9zKTtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IHVzZSBJRCB0byBnZXQgcmFuZG9tIGVuZW1pZXNcclxuICAgICAgICAgICAgICAgICAgICBzcGF3bkJ5SUQoRW5lbXkuRU5FTVlDTEFTUy5FTkVNWURVTUIsIEVudGl0eS5JRC5TTUFMTFRJQ0ssIHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBzcGF3bmVkRW5lbWllcysrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY3VycmVudFRpbWUtLTtcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50VGltZSA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFRpbWUgPSBzcGF3blRpbWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0UmFuZG9tRW5lbXlJZCgpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCByYW5kb20gPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiBPYmplY3Qua2V5cyhFbnRpdHkuSUQpLmxlbmd0aCAvIDIpO1xyXG4gICAgICAgIGlmIChyYW5kb20gPD0gMikge1xyXG4gICAgICAgICAgICByZXR1cm4gZ2V0UmFuZG9tRW5lbXlJZCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cocmFuZG9tKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJhbmRvbTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduQnlJRChfZW5lbXlDbGFzczogRW5lbXkuRU5FTVlDTEFTUywgX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX3RhcmdldD86IFBsYXllci5QbGF5ZXIsIF9uZXRJRD86IG51bWJlcikge1xyXG4gICAgICAgIGxldCBlbmVteTogRW5lbXkuRW5lbXk7XHJcbiAgICAgICAgc3dpdGNoIChfZW5lbXlDbGFzcykge1xyXG4gICAgICAgICAgICBjYXNlIEVuZW15LkVORU1ZQ0xBU1MuRU5FTVlEQVNIOlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEYXNoKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteURhc2goX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWUNMQVNTLkVORU1ZRFVNQjpcclxuICAgICAgICAgICAgICAgIGlmIChfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RHVtYihfaWQsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEdW1iKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlDTEFTUy5FTkVNWVBBVFJPTDpcclxuICAgICAgICAgICAgICAgIGlmIChfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15UGF0cm9sKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVBhdHJvbChfaWQsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAvLyBjYXNlIEVuZW15LkU6XHJcbiAgICAgICAgICAgIC8vICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgLy8gICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVNob290KF9pZCwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCwgcmVmLmF0dHJpYnV0ZXMuc2NhbGUsIE1hdGgucmFuZG9tKCkgKiByZWYuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSArIDAuNSwgcmVmLmF0dHJpYnV0ZXMuYXJtb3IpLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgIC8vICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15U2hvb3QoX2lkLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgICAgICAvLyAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlDTEFTUy5FTkVNWVNNQVNIOlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlTbWFzaChfaWQsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlTbWFzaChfaWQsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEVuZW15LkVORU1ZQ0xBU1MuU1VNTU9OT1JBRERTOlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuU3VtbW9ub3JBZGRzKF9pZCwgX3Bvc2l0aW9uLCBfdGFyZ2V0LCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5TdW1tb25vckFkZHMoX2lkLCBfcG9zaXRpb24sIF90YXJnZXQsIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWUNMQVNTLlNVTU1PTk9SOlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuU3VtbW9ub3IoX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LlN1bW1vbm9yKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGVuZW15ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChlbmVteSk7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25FbmVteShfZW5lbXlDbGFzcywgZW5lbXksIGVuZW15Lm5ldElkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIG5ldHdvcmtTcGF3bkJ5SWQoX2VuZW15Q2xhc3M6IEVuZW15LkVORU1ZQ0xBU1MsIF9pZDogRW50aXR5LklELCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJRDogbnVtYmVyLCBfdGFyZ2V0PzogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKF90YXJnZXQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBpZiAoR2FtZS5hdmF0YXIxLm5ldElkID09IF90YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgIHNwYXduQnlJRChfZW5lbXlDbGFzcywgX2lkLCBfcG9zaXRpb24sIEdhbWUuYXZhdGFyMSwgX25ldElEKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNwYXduQnlJRChfZW5lbXlDbGFzcywgX2lkLCBfcG9zaXRpb24sIEdhbWUuYXZhdGFyMiwgX25ldElEKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNwYXduQnlJRChfZW5lbXlDbGFzcywgX2lkLCBfcG9zaXRpb24sIG51bGwsIF9uZXRJRCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufSIsIm5hbWVzcGFjZSBFbmVteSB7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEZsb2NraW5nQmVoYXZpb3VyIHtcclxuICAgICAgICBwcml2YXRlIGN1cnJlbnROZWlnaGJvdXJzOiBFbmVteVtdO1xyXG4gICAgICAgIHB1YmxpYyBzaWdodFJhZGl1czogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBhdm9pZFJhZGl1czogbnVtYmVyXHJcbiAgICAgICAgcHJpdmF0ZSBlbmVtaWVzOiBFbmVteVtdID0gW107XHJcbiAgICAgICAgcHJpdmF0ZSBwb3M6IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgICAgICBwcml2YXRlIG15RW5lbXk6IEVuZW15O1xyXG4gICAgICAgIHB1YmxpYyBjb2hlc2lvbldlaWdodDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBhbGxpZ25XZWlnaHQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgYXZvaWRXZWlnaHQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgdG9UYXJnZXRXZWlnaHQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgbm90VG9UYXJnZXRXZWlnaHQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgb2JzdGljYWxBdm9pZFdlaWdodDogbnVtYmVyID0gMS41O1xyXG5cclxuICAgICAgICBwcml2YXRlIG9ic3RpY2FsQ29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfZW5lbXk6IEVuZW15LCBfc2lnaHRSYWRpdXM6IG51bWJlciwgX2F2b2lkUmFkaXVzOiBudW1iZXIsIF9jb2hlc2lvbldlaWdodDogbnVtYmVyLCBfYWxsaWduV2VpZ2h0OiBudW1iZXIsIF9hdm9pZFdlaWdodDogbnVtYmVyLCBfdG9UYXJnZXRXZWlnaHQ6IG51bWJlciwgX25vdFRvVGFyZ2V0V2VpZ2h0OiBudW1iZXIsIF9vYnN0aWNhbEF2b2lkV2VpZ2h0PzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zID0gX2VuZW15Lm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICB0aGlzLm15RW5lbXkgPSBfZW5lbXk7XHJcbiAgICAgICAgICAgIHRoaXMuc2lnaHRSYWRpdXMgPSBfc2lnaHRSYWRpdXM7XHJcbiAgICAgICAgICAgIHRoaXMuYXZvaWRSYWRpdXMgPSBfYXZvaWRSYWRpdXM7XHJcbiAgICAgICAgICAgIHRoaXMuY29oZXNpb25XZWlnaHQgPSBfY29oZXNpb25XZWlnaHQ7XHJcbiAgICAgICAgICAgIHRoaXMuYWxsaWduV2VpZ2h0ID0gX2FsbGlnbldlaWdodDtcclxuICAgICAgICAgICAgdGhpcy5hdm9pZFdlaWdodCA9IF9hdm9pZFdlaWdodDtcclxuICAgICAgICAgICAgdGhpcy50b1RhcmdldFdlaWdodCA9IF90b1RhcmdldFdlaWdodDtcclxuICAgICAgICAgICAgdGhpcy5ub3RUb1RhcmdldFdlaWdodCA9IF9ub3RUb1RhcmdldFdlaWdodDtcclxuICAgICAgICAgICAgaWYgKF9vYnN0aWNhbEF2b2lkV2VpZ2h0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMub2JzdGljYWxBdm9pZFdlaWdodCA9IF9vYnN0aWNhbEF2b2lkV2VpZ2h0O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLm9ic3RpY2FsQ29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5wb3MsIHRoaXMubXlFbmVteS5jb2xsaWRlci5nZXRSYWRpdXMgKiAxLjc1LCB0aGlzLm15RW5lbXkubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICB0aGlzLmVuZW1pZXMgPSBHYW1lLmVuZW1pZXM7XHJcbiAgICAgICAgICAgIHRoaXMucG9zID0gdGhpcy5teUVuZW15Lm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICB0aGlzLm9ic3RpY2FsQ29sbGlkZXIucG9zaXRpb24gPSB0aGlzLnBvcztcclxuICAgICAgICAgICAgdGhpcy5maW5kTmVpZ2hib3VycygpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHByaXZhdGUgZmluZE5laWdoYm91cnMoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudE5laWdoYm91cnMgPSBbXTtcclxuICAgICAgICAgICAgdGhpcy5lbmVtaWVzLmZvckVhY2goZW5lbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5teUVuZW15Lm5ldElkICE9IGVuZW0ubmV0SWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZW5lbS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZSh0aGlzLnBvcy50b1ZlY3RvcjMoKSkgPCB0aGlzLnNpZ2h0UmFkaXVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE5laWdoYm91cnMucHVzaChlbmVtKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2FsY3VsYXRlQ29oZXNpb25Nb3ZlKCk6IEdhbWUuxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnROZWlnaGJvdXJzLmxlbmd0aCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgY29oZXNpb25Nb3ZlOiBHYW1lLsaSLlZlY3RvcjIgPSDGki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE5laWdoYm91cnMuZm9yRWFjaChlbmVtID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb2hlc2lvbk1vdmUgPSBHYW1lLsaSLlZlY3RvcjIuU1VNKGNvaGVzaW9uTW92ZSwgZW5lbS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgY29oZXNpb25Nb3ZlLnNjYWxlKDEgLyB0aGlzLmN1cnJlbnROZWlnaGJvdXJzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICBjb2hlc2lvbk1vdmUuc3VidHJhY3QodGhpcy5wb3MpO1xyXG4gICAgICAgICAgICAgICAgY29oZXNpb25Nb3ZlID0gQ2FsY3VsYXRpb24uZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRCh0aGlzLm15RW5lbXkubW92ZURpcmVjdGlvbiwgQ2FsY3VsYXRpb24uY2FsY0RlZ3JlZSh0aGlzLm15RW5lbXkubXR4TG9jYWwudHJhbnNsYXRpb24sIGNvaGVzaW9uTW92ZS50b1ZlY3RvcjMoKSkgLyAxMCkudG9WZWN0b3IyKClcclxuICAgICAgICAgICAgICAgIHJldHVybiBjb2hlc2lvbk1vdmU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjYWxjdWxhdGVBbGxpZ25tZW50TW92ZSgpOiBHYW1lLsaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50TmVpZ2hib3Vycy5sZW5ndGggPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubXlFbmVteS5tb3ZlRGlyZWN0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGV0IGFsbGlnbm1lbnRNb3ZlOiBHYW1lLsaSLlZlY3RvcjIgPSDGki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE5laWdoYm91cnMuZm9yRWFjaChlbmVtID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBhbGxpZ25tZW50TW92ZSA9IEdhbWUuxpIuVmVjdG9yMi5TVU0oYWxsaWdubWVudE1vdmUsIGVuZW0ubW92ZURpcmVjdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgYWxsaWdubWVudE1vdmUuc2NhbGUoMSAvIHRoaXMuY3VycmVudE5laWdoYm91cnMubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhbGxpZ25tZW50TW92ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNhbGN1bGF0ZUF2b2lkYW5jZU1vdmUoKTogR2FtZS7Gki5WZWN0b3IyIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudE5laWdoYm91cnMubGVuZ3RoIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiDGki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxldCBhdm9pZGFuY2VNb3ZlOiBHYW1lLsaSLlZlY3RvcjIgPSDGki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgIGxldCBuQXZvaWQ6IG51bWJlciA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROZWlnaGJvdXJzLmZvckVhY2goZW5lbSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuZW0ubXR4TG9jYWwudHJhbnNsYXRpb24uZ2V0RGlzdGFuY2UodGhpcy5wb3MudG9WZWN0b3IzKCkpIDwgdGhpcy5hdm9pZFJhZGl1cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuQXZvaWQrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXZvaWRhbmNlTW92ZSA9IEdhbWUuxpIuVmVjdG9yMi5TVU0oYXZvaWRhbmNlTW92ZSwgR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5wb3MsIGVuZW0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgaWYgKG5Bdm9pZCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBhdm9pZGFuY2VNb3ZlLnNjYWxlKDEgLyBuQXZvaWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF2b2lkYW5jZU1vdmU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjYWxjdWxhdGVPYnN0aWNhbEF2b2lkYW5jZU1vdmUoKTogR2FtZS7Gki5WZWN0b3IyIHtcclxuICAgICAgICAgICAgbGV0IG9ic3RpY2FsczogR2FtZS7Gki5Ob2RlW10gPSBbXTtcclxuICAgICAgICAgICAgR2FtZS5jdXJyZW50Um9vbS53YWxscy5mb3JFYWNoKGVsZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgb2JzdGljYWxzLnB1c2goZWxlbSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBHYW1lLmN1cnJlbnRSb29tLm9ic3RpY2Fscy5mb3JFYWNoKGVsZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgb2JzdGljYWxzLnB1c2goZWxlbSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBsZXQgcmV0dXJuVmVjdG9yOiBHYW1lLsaSLlZlY3RvcjIgPSBHYW1lLsaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICBsZXQgbkF2b2lkOiBudW1iZXIgPSAwO1xyXG5cclxuICAgICAgICAgICAgb2JzdGljYWxzLmZvckVhY2gob2JzdGljYWwgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCg8YW55Pm9ic3RpY2FsKS5jb2xsaWRlciBpbnN0YW5jZW9mIEdhbWUuxpIuUmVjdGFuZ2xlICYmIHRoaXMub2JzdGljYWxDb2xsaWRlci5jb2xsaWRlc1JlY3QoKDxhbnk+b2JzdGljYWwpLmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBtb3ZlOiBHYW1lLsaSLlZlY3RvcjIgPSBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvcywgb2JzdGljYWwubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1vdmUubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb246IEdhbWUuxpIuUmVjdGFuZ2xlID0gdGhpcy5vYnN0aWNhbENvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoKDxhbnk+b2JzdGljYWwpLmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUJlZm9yZU1vdmU6IG51bWJlciA9IGludGVyc2VjdGlvbi53aWR0aCAqIGludGVyc2VjdGlvbi5oZWlnaHQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2JzdGljYWxDb2xsaWRlci5wb3NpdGlvbi5hZGQobmV3IEdhbWUuxpIuVmVjdG9yMihtb3ZlLngsIDApKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5vYnN0aWNhbENvbGxpZGVyLmNvbGxpZGVzUmVjdCgoPGFueT5vYnN0aWNhbCkuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGludGVyc2VjdGlvbiA9IHRoaXMub2JzdGljYWxDb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KCg8YW55Pm9ic3RpY2FsKS5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhZnRlckJlZm9yZU1vdmU6IG51bWJlciA9IGludGVyc2VjdGlvbi53aWR0aCAqIGludGVyc2VjdGlvbi5oZWlnaHQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPD0gYWZ0ZXJCZWZvcmVNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WZWN0b3IuYWRkKG5ldyBHYW1lLsaSLlZlY3RvcjIoMCwgbW92ZS55KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WZWN0b3IuYWRkKG5ldyBHYW1lLsaSLlZlY3RvcjIobW92ZS54LCAwKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WZWN0b3IuYWRkKG5ldyBHYW1lLsaSLlZlY3RvcjIobW92ZS54LCAwKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9ic3RpY2FsQ29sbGlkZXIucG9zaXRpb24uc3VidHJhY3QobmV3IEdhbWUuxpIuVmVjdG9yMihtb3ZlLngsIDApKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbkF2b2lkKys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoKDxhbnk+b2JzdGljYWwpLmNvbGxpZGVyIGluc3RhbmNlb2YgQ29sbGlkZXIuQ29sbGlkZXIgJiYgdGhpcy5vYnN0aWNhbENvbGxpZGVyLmNvbGxpZGVzKCg8YW55Pm9ic3RpY2FsKS5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbW92ZTogR2FtZS7Gki5WZWN0b3IyID0gR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5wb3MsIG9ic3RpY2FsLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbG9jYWxBd2F5OiBHYW1lLsaSLlZlY3RvcjIgPSBHYW1lLsaSLlZlY3RvcjIuU1VNKG1vdmUsIHRoaXMubXlFbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBkaXN0YW5jZVBvcyA9IChHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLm15RW5lbXkudGFyZ2V0LCBHYW1lLsaSLlZlY3RvcjIuU1VNKENhbGN1bGF0aW9uLmdldFJvdGF0ZWRWZWN0b3JCeUFuZ2xlMkQobG9jYWxBd2F5LmNsb25lLnRvVmVjdG9yMygpLCAxMzUpLnRvVmVjdG9yMigpLCB0aGlzLm15RW5lbXkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRpc3RhbmNlTmVnID0gKEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMubXlFbmVteS50YXJnZXQsIEdhbWUuxpIuVmVjdG9yMi5TVU0oQ2FsY3VsYXRpb24uZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRChsb2NhbEF3YXkuY2xvbmUudG9WZWN0b3IzKCksIC0xMzUpLnRvVmVjdG9yMigpLCB0aGlzLm15RW5lbXkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkaXN0YW5jZU5lZy5tYWduaXR1ZGVTcXVhcmVkID4gZGlzdGFuY2VQb3MubWFnbml0dWRlU3F1YXJlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb3ZlLmFkZChDYWxjdWxhdGlvbi5nZXRSb3RhdGVkVmVjdG9yQnlBbmdsZTJEKG1vdmUuY2xvbmUudG9WZWN0b3IzKCksIDEzNSkudG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vdmUuYWRkKENhbGN1bGF0aW9uLmdldFJvdGF0ZWRWZWN0b3JCeUFuZ2xlMkQobW92ZS5jbG9uZS50b1ZlY3RvcjMoKSwgLTEzNSkudG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmVjdG9yLmFkZChtb3ZlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbkF2b2lkKys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgICBpZiAobkF2b2lkID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuVmVjdG9yLnNjYWxlKDEgLyBuQXZvaWQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuVmVjdG9yO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldE1vdmVWZWN0b3IoKTogR2FtZS7Gki5WZWN0b3IyIHtcclxuICAgICAgICAgICAgbGV0IGNvaGVzaW9uOiBHYW1lLsaSLlZlY3RvcjIgPSBHYW1lLsaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICBsZXQgYXZvaWQ6IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgICAgIGxldCBhbGxpZ246IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgICAgIGxldCBvYnN0aWNhbEF2b2lkOiBHYW1lLsaSLlZlY3RvcjIgPSBHYW1lLsaSLlZlY3RvcjIuWkVSTygpO1xyXG5cclxuXHJcbiAgICAgICAgICAgIGxldCB0YXJnZXQgPSB0aGlzLm15RW5lbXkubW92ZVNpbXBsZSh0aGlzLm15RW5lbXkudGFyZ2V0KTtcclxuICAgICAgICAgICAgaWYgKHRhcmdldC5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy50b1RhcmdldFdlaWdodCAqIHRoaXMudG9UYXJnZXRXZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldC5ub3JtYWxpemU7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQuc2NhbGUodGhpcy50b1RhcmdldFdlaWdodCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBub3RUb1RhcmdldCA9IHRoaXMubXlFbmVteS5tb3ZlQXdheSh0aGlzLm15RW5lbXkudGFyZ2V0KVxyXG4gICAgICAgICAgICBpZiAobm90VG9UYXJnZXQubWFnbml0dWRlU3F1YXJlZCA+IHRoaXMubm90VG9UYXJnZXRXZWlnaHQgKiB0aGlzLm5vdFRvVGFyZ2V0V2VpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICBub3RUb1RhcmdldC5ub3JtYWxpemU7XHJcbiAgICAgICAgICAgICAgICBub3RUb1RhcmdldC5zY2FsZSh0aGlzLm5vdFRvVGFyZ2V0V2VpZ2h0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29oZXNpb24gPSB0aGlzLmNhbGN1bGF0ZUNvaGVzaW9uTW92ZSgpO1xyXG4gICAgICAgICAgICBpZiAoY29oZXNpb24ubWFnbml0dWRlU3F1YXJlZCA+IHRoaXMuY29oZXNpb25XZWlnaHQgKiB0aGlzLmNvaGVzaW9uV2VpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICBjb2hlc2lvbi5ub3JtYWxpemU7XHJcbiAgICAgICAgICAgICAgICBjb2hlc2lvbi5zY2FsZSh0aGlzLmNvaGVzaW9uV2VpZ2h0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhdm9pZCA9IHRoaXMuY2FsY3VsYXRlQXZvaWRhbmNlTW92ZSgpO1xyXG4gICAgICAgICAgICBpZiAoYXZvaWQubWFnbml0dWRlU3F1YXJlZCA+IHRoaXMuYXZvaWRXZWlnaHQgKiB0aGlzLmF2b2lkV2VpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICBhdm9pZC5ub3JtYWxpemU7XHJcbiAgICAgICAgICAgICAgICBhdm9pZC5zY2FsZSh0aGlzLmF2b2lkV2VpZ2h0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhbGxpZ24gPSB0aGlzLmNhbGN1bGF0ZUFsbGlnbm1lbnRNb3ZlKCk7XHJcbiAgICAgICAgICAgIGlmIChhbGxpZ24ubWFnbml0dWRlU3F1YXJlZCA+IHRoaXMuYWxsaWduV2VpZ2h0ICogdGhpcy5hbGxpZ25XZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIGFsbGlnbi5ub3JtYWxpemU7XHJcbiAgICAgICAgICAgICAgICBhbGxpZ24uc2NhbGUodGhpcy5hbGxpZ25XZWlnaHQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBvYnN0aWNhbEF2b2lkID0gdGhpcy5jYWxjdWxhdGVPYnN0aWNhbEF2b2lkYW5jZU1vdmUoKTtcclxuICAgICAgICAgICAgaWYgKG9ic3RpY2FsQXZvaWQubWFnbml0dWRlU3F1YXJlZCA+IHRoaXMub2JzdGljYWxBdm9pZFdlaWdodCAqIHRoaXMub2JzdGljYWxBdm9pZFdlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgb2JzdGljYWxBdm9pZC5ub3JtYWxpemU7XHJcbiAgICAgICAgICAgICAgICBvYnN0aWNhbEF2b2lkLnNjYWxlKHRoaXMub2JzdGljYWxBdm9pZFdlaWdodCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBtb3ZlID0gR2FtZS7Gki5WZWN0b3IyLlNVTShub3RUb1RhcmdldCwgdGFyZ2V0LCBjb2hlc2lvbiwgYXZvaWQsIGFsbGlnbiwgb2JzdGljYWxBdm9pZCk7XHJcbiAgICAgICAgICAgIHJldHVybiBtb3ZlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuXHJcbiIsIm5hbWVzcGFjZSBFbnRpdHkgeyBcclxuICAgIGV4cG9ydCBjbGFzcyBNZXJjaGFudCBleHRlbmRzIEVudGl0eXtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IG51bWJlciwgX25ldElkPzpudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfbmV0SWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBDYWxjdWxhdGlvbiB7XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24oX3N0YXJ0UG9pbnQ6IMaSLlZlY3RvcjMpOiDGki5WZWN0b3IzIHtcclxuICAgICAgICBsZXQgdGFyZ2V0ID0gR2FtZS5hdmF0YXIxO1xyXG5cclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlUGxheWVyMSA9IF9zdGFydFBvaW50LmdldERpc3RhbmNlKEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2VQbGF5ZXIyID0gX3N0YXJ0UG9pbnQuZ2V0RGlzdGFuY2UoR2FtZS5hdmF0YXIyLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcblxyXG4gICAgICAgICAgICBpZiAoZGlzdGFuY2VQbGF5ZXIxIDwgZGlzdGFuY2VQbGF5ZXIyKSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQgPSBHYW1lLmF2YXRhcjE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQgPSBHYW1lLmF2YXRhcjI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0YXJnZXQuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2FsY0RlZ3JlZShfY2VudGVyOiDGki5WZWN0b3IzLCBfdGFyZ2V0OiDGki5WZWN0b3IzKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgeERpc3RhbmNlOiBudW1iZXIgPSBfdGFyZ2V0LnggLSBfY2VudGVyLng7XHJcbiAgICAgICAgbGV0IHlEaXN0YW5jZTogbnVtYmVyID0gX3RhcmdldC55IC0gX2NlbnRlci55O1xyXG4gICAgICAgIGxldCBkZWdyZWVzOiBudW1iZXIgPSBNYXRoLmF0YW4yKHlEaXN0YW5jZSwgeERpc3RhbmNlKSAqICgxODAgLyBNYXRoLlBJKSAtIDkwO1xyXG4gICAgICAgIHJldHVybiBkZWdyZWVzO1xyXG5cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRSb3RhdGVkVmVjdG9yQnlBbmdsZTJEKF92ZWN0b3JUb1JvdGF0ZTogxpIuVmVjdG9yMywgX2FuZ2xlOiBudW1iZXIpOiDGki5WZWN0b3IzIHtcclxuICAgICAgICBsZXQgYW5nbGVUb1JhZGlhbjogbnVtYmVyID0gX2FuZ2xlICogKE1hdGguUEkgLyAxODApO1xyXG5cclxuICAgICAgICBsZXQgbmV3WCA9IF92ZWN0b3JUb1JvdGF0ZS54ICogTWF0aC5jb3MoYW5nbGVUb1JhZGlhbikgLSBfdmVjdG9yVG9Sb3RhdGUueSAqIE1hdGguc2luKGFuZ2xlVG9SYWRpYW4pO1xyXG4gICAgICAgIGxldCBuZXdZID0gX3ZlY3RvclRvUm90YXRlLnggKiBNYXRoLnNpbihhbmdsZVRvUmFkaWFuKSArIF92ZWN0b3JUb1JvdGF0ZS55ICogTWF0aC5jb3MoYW5nbGVUb1JhZGlhbik7XHJcblxyXG4gICAgICAgIHJldHVybiBuZXcgxpIuVmVjdG9yMyhuZXdYLCBuZXdZLCBfdmVjdG9yVG9Sb3RhdGUueik7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGFkZFBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9iYXNlVmFsdWU6IG51bWJlciwgX3BlcmNlbnRhZ2VBbW91bnQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIF9iYXNlVmFsdWUgKiAoKDEwMCArIF9wZXJjZW50YWdlQW1vdW50KSAvIDEwMCk7XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2Jhc2VWYWx1ZTogbnVtYmVyLCBfcGVyY2VudGFnZUFtb3VudDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gX2Jhc2VWYWx1ZSAqICgxMDAgLyAoMTAwICsgX3BlcmNlbnRhZ2VBbW91bnQpKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2xhbXBOdW1iZXIoX251bWJlcjogbnVtYmVyLCBfbWluOiBudW1iZXIsIF9tYXg6IG51bWJlcikge1xyXG4gICAgICAgIHJldHVybiBNYXRoLm1heChfbWluLCBNYXRoLm1pbihfbnVtYmVyLCBfbWF4KSk7XHJcbiAgICB9XHJcblxyXG5cclxufSIsIm5hbWVzcGFjZSBJbnB1dFN5c3RlbSB7XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwga2V5Ym9hcmREb3duRXZlbnQpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGtleWJvYXJkVXBFdmVudCk7XHJcbiAgICBHYW1lLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGF0dGFjayk7XHJcbiAgICBHYW1lLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIHJvdGF0ZVRvTW91c2UpO1xyXG5cclxuICAgIC8vI3JlZ2lvbiByb3RhdGVcclxuICAgIGxldCBtb3VzZVBvc2l0aW9uOiDGki5WZWN0b3IzO1xyXG5cclxuICAgIGZ1bmN0aW9uIHJvdGF0ZVRvTW91c2UoX21vdXNlRXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgbGV0IHJheTogxpIuUmF5ID0gR2FtZS52aWV3cG9ydC5nZXRSYXlGcm9tQ2xpZW50KG5ldyDGki5WZWN0b3IyKF9tb3VzZUV2ZW50Lm9mZnNldFgsIF9tb3VzZUV2ZW50Lm9mZnNldFkpKTtcclxuICAgICAgICAgICAgbW91c2VQb3NpdGlvbiA9IHJheS5pbnRlcnNlY3RQbGFuZShuZXcgxpIuVmVjdG9yMygwLCAwLCAwKSwgbmV3IMaSLlZlY3RvcjMoMCwgMCwgMSkpO1xyXG4gICAgICAgICAgICAvLyBHYW1lLmF2YXRhcjEubXR4TG9jYWwucm90YXRpb24gPSBuZXcgxpIuVmVjdG9yMygwLCAwLCBDYWxjdWxhdGlvbi5jYWxjRGVncmVlKEdhbWUuYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgbW91c2VQb3NpdGlvbikpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGNQb3NpdGlvbkZyb21EZWdyZWUoX2RlZ3JlZXM6IG51bWJlciwgX2Rpc3RhbmNlOiBudW1iZXIpOiDGki5WZWN0b3IyIHtcclxuICAgICAgICBsZXQgZGlzdGFuY2UgPSA1O1xyXG4gICAgICAgIGxldCBuZXdEZWcgPSAoX2RlZ3JlZXMgKiBNYXRoLlBJKSAvIDE4MDtcclxuICAgICAgICBsZXQgeSA9IE1hdGguY29zKG5ld0RlZyk7XHJcbiAgICAgICAgbGV0IHggPSBNYXRoLnNpbihuZXdEZWcpICogLTE7XHJcbiAgICAgICAgbGV0IGNvb3JkID0gbmV3IMaSLlZlY3RvcjIoeCwgeSk7XHJcbiAgICAgICAgY29vcmQuc2NhbGUoZGlzdGFuY2UpO1xyXG4gICAgICAgIHJldHVybiBjb29yZDtcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBtb3ZlIGFuZCBhYmlsaXR5XHJcbiAgICBsZXQgY29udHJvbGxlciA9IG5ldyBNYXA8c3RyaW5nLCBib29sZWFuPihbXHJcbiAgICAgICAgW1wiV1wiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiQVwiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiU1wiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiRFwiLCBmYWxzZV1cclxuICAgIF0pO1xyXG5cclxuICAgIGZ1bmN0aW9uIGtleWJvYXJkRG93bkV2ZW50KF9lOiBLZXlib2FyZEV2ZW50KSB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGlmIChfZS5jb2RlLnRvVXBwZXJDYXNlKCkgPT0gXCJLRVlFXCIpIHtcclxuICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5vcGVuRG9vcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZS5jb2RlLnRvVXBwZXJDYXNlKCkgIT0gXCJTUEFDRVwiKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQga2V5OiBzdHJpbmcgPSBfZS5jb2RlLnRvVXBwZXJDYXNlKCkuc3Vic3RyaW5nKDMpO1xyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlci5zZXQoa2V5LCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2UuY29kZS50b1VwcGVyQ2FzZSgpID09IFwiU1BBQ0VcIikge1xyXG4gICAgICAgICAgICAgICAgLy9EbyBhYmlsdHkgZnJvbSBwbGF5ZXJcclxuICAgICAgICAgICAgICAgIGFiaWxpdHkoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKF9lLmNvZGUudG9VcHBlckNhc2UoKSA9PSBcIkVTQ0FQRVwiKSB7XHJcbiAgICAgICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICAgICAgR2FtZS5wYXVzZSh0cnVlLCB0cnVlKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIEdhbWUucGxheWluZyh0cnVlLCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBrZXlib2FyZFVwRXZlbnQoX2U6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgbGV0IGtleTogc3RyaW5nID0gX2UuY29kZS50b1VwcGVyQ2FzZSgpLnN1YnN0cmluZygzKTtcclxuICAgICAgICAgICAgY29udHJvbGxlci5zZXQoa2V5LCBmYWxzZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBtb3ZlKCk6IEdhbWUuxpIuVmVjdG9yMyB7XHJcbiAgICAgICAgbGV0IG1vdmVWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5aRVJPKCk7XHJcblxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIldcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci55ICs9IDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIkFcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci54IC09IDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIlNcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci55IC09IDE7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb250cm9sbGVyLmdldChcIkRcIikpIHtcclxuICAgICAgICAgICAgbW92ZVZlY3Rvci54ICs9IDE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBHYW1lLmF2YXRhcjEubW92ZShtb3ZlVmVjdG9yKTtcclxuICAgICAgICByZXR1cm4gbW92ZVZlY3RvcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhYmlsaXR5KCkge1xyXG4gICAgICAgIEdhbWUuYXZhdGFyMS5kb0FiaWxpdHkoKTtcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBhdHRhY2tcclxuICAgIGZ1bmN0aW9uIGF0dGFjayhlXzogTW91c2VFdmVudCkge1xyXG4gICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBsZXQgbW91c2VCdXR0b24gPSBlXy5idXR0b247XHJcbiAgICAgICAgICAgIHN3aXRjaCAobW91c2VCdXR0b24pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgICAgICAgICAvL2xlZnQgbW91c2UgYnV0dG9uIHBsYXllci5hdHRhY2tcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UobW91c2VQb3NpdGlvbiwgR2FtZS5hdmF0YXIxLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICByb3RhdGVUb01vdXNlKGVfKTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEuYXR0YWNrKGRpcmVjdGlvbiwgbnVsbCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiByaWdodCBtb3VzZSBidXR0b24gcGxheWVyLmhlYXZ5QXR0YWNrIG9yIHNvbWV0aGluZyBsaWtlIHRoYXRcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG59IiwibmFtZXNwYWNlIExldmVsIHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgTGFuZHNjYXBlIGV4dGVuZHMgxpIuTm9kZXtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMuZ2V0Q2hpbGRyZW4oKVswXS5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0pLm10eExvY2FsLnRyYW5zbGF0ZVooLTIpXHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCJuYW1lc3BhY2UgVUkge1xyXG4gICAgZXhwb3J0IGNsYXNzIE1pbmltYXAgZXh0ZW5kcyBHYW1lLsaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLlVJO1xyXG4gICAgICAgIHByaXZhdGUgbWlubWFwSW5mbzogSW50ZXJmYWNlcy5JTWluaW1hcEluZm9zW107XHJcbiAgICAgICAgcHJpdmF0ZSByb29tTWluaW1hcHNpemU6IG51bWJlciA9IDAuODtcclxuICAgICAgICBwcml2YXRlIG1pbmlSb29tczogTWluaVJvb21bXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBvZmZzZXRYOiBudW1iZXIgPSAxMTtcclxuICAgICAgICBwdWJsaWMgb2Zmc2V0WTogbnVtYmVyID0gNjtcclxuICAgICAgICBwcml2YXRlIGN1cnJlbnRSb29tOiBHZW5lcmF0aW9uLlJvb207XHJcbiAgICAgICAgcHJpdmF0ZSBwb2ludGVyOiBHYW1lLsaSLk5vZGU7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9taW5pbWFwSW5mbzogSW50ZXJmYWNlcy5JTWluaW1hcEluZm9zW10pIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJNaW5pbWFwXCIpO1xyXG4gICAgICAgICAgICB0aGlzLm1pbm1hcEluZm8gPSBfbWluaW1hcEluZm87XHJcblxyXG5cclxuICAgICAgICAgICAgdGhpcy5wb2ludGVyID0gbmV3IEdhbWUuxpIuTm9kZShcInBvaW50ZXJcIik7XHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRlci5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IEdhbWUuxpIuTWVzaFF1YWQpKTtcclxuICAgICAgICAgICAgdGhpcy5wb2ludGVyLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobmV3IMaSLk1hdGVyaWFsKFwiY2hhbGxlbmdlUm9vbU1hdFwiLCDGki5TaGFkZXJMaXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImJsdWVcIikpKSkpO1xyXG4gICAgICAgICAgICB0aGlzLnBvaW50ZXIuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRlci5tdHhMb2NhbC5zY2FsZShHYW1lLsaSLlZlY3RvcjMuT05FKHRoaXMucm9vbU1pbmltYXBzaXplIC8gMikpO1xyXG4gICAgICAgICAgICB0aGlzLnBvaW50ZXIubXR4TG9jYWwudHJhbnNsYXRlWigxMCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMucG9pbnRlcik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwuc2NhbGUobmV3IEdhbWUuxpIuVmVjdG9yMyh0aGlzLnJvb21NaW5pbWFwc2l6ZSwgdGhpcy5yb29tTWluaW1hcHNpemUsIHRoaXMucm9vbU1pbmltYXBzaXplKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHYW1lLsaSLkVWRU5ULlJFTkRFUl9QUkVQQVJFLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLmNyZWF0ZU1pbmlSb29tcygpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXRDdXJyZW50Um9vbShHYW1lLmN1cnJlbnRSb29tKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25NaW5pbWFwKHRoaXMubWlubWFwSW5mbyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNyZWF0ZU1pbmlSb29tcygpIHtcclxuICAgICAgICAgICAgdGhpcy5taW5tYXBJbmZvLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1pbmlSb29tcy5wdXNoKG5ldyBNaW5pUm9vbShlbGVtZW50LmNvb3JkcywgZWxlbWVudC5yb29tVHlwZSkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdGhpcy5taW5pUm9vbXMuZm9yRWFjaChyb29tID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQocm9vbSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBldmVudFVwZGF0ZSA9IChfZXZlbnQ6IEV2ZW50KTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzZXRDdXJyZW50Um9vbShfcm9vbTogR2VuZXJhdGlvbi5Sb29tKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWluaVJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzLmVxdWFscyhfcm9vbS5jb29yZGluYXRlcykpLmlzRGlzY292ZXJlZCgpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50Um9vbSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBzdWJYID0gdGhpcy5jdXJyZW50Um9vbS5jb29yZGluYXRlcy54IC0gX3Jvb20uY29vcmRpbmF0ZXMueDtcclxuICAgICAgICAgICAgICAgIGxldCBzdWJZID0gdGhpcy5jdXJyZW50Um9vbS5jb29yZGluYXRlcy55IC0gX3Jvb20uY29vcmRpbmF0ZXMueTtcclxuICAgICAgICAgICAgICAgIHRoaXMub2Zmc2V0WCArPSBzdWJYICogdGhpcy5yb29tTWluaW1hcHNpemU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9mZnNldFkgKz0gc3ViWSAqIHRoaXMucm9vbU1pbmltYXBzaXplO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRSb29tID0gX3Jvb207XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRSb29tICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFJvb20gIT0gR2FtZS5jdXJyZW50Um9vbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0Q3VycmVudFJvb20oR2FtZS5jdXJyZW50Um9vbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wb2ludGVyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gdGhpcy5taW5pUm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMpKS5tdHhMb2NhbC50cmFuc2xhdGlvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbGV0IG5vcm1hbFJvb206IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTs7XHJcbiAgICBleHBvcnQgbGV0IGNoYWxsZW5nZVJvb206IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTs7XHJcbiAgICBleHBvcnQgbGV0IG1lcmNoYW50Um9vbTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpOztcclxuICAgIGV4cG9ydCBsZXQgdHJlYXN1cmVSb29tOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7O1xyXG4gICAgZXhwb3J0IGxldCBib3NzUm9vbTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpOztcclxuXHJcbiAgICBjbGFzcyBNaW5pUm9vbSBleHRlbmRzIEdhbWUuxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIGRpc2NvdmVyZWQ6IGJvb2xlYW47XHJcbiAgICAgICAgcHVibGljIGNvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAgICAgcHVibGljIHJvb21UeXBlOiBHZW5lcmF0aW9uLlJPT01UWVBFO1xyXG4gICAgICAgIHB1YmxpYyBvcGFjaXR5OiBudW1iZXIgPSAwLjc1O1xyXG5cclxuICAgICAgICBwcml2YXRlIHJvb21NYXQ6IMaSLk1hdGVyaWFsO1xyXG5cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBtZXNoOiDGki5NZXNoUXVhZCA9IG5ldyDGki5NZXNoUXVhZDtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tVHlwZTogR2VuZXJhdGlvbi5ST09NVFlQRSkge1xyXG4gICAgICAgICAgICBzdXBlcihcIk1pbmltYXBSb29tXCIpO1xyXG4gICAgICAgICAgICB0aGlzLmNvb3JkaW5hdGVzID0gX2Nvb3JkaW5hdGVzO1xyXG4gICAgICAgICAgICB0aGlzLnJvb21UeXBlID0gX3Jvb21UeXBlO1xyXG4gICAgICAgICAgICB0aGlzLmRpc2NvdmVyZWQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyBHYW1lLsaSLkNvbXBvbmVudE1lc2godGhpcy5tZXNoKSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLnJvb21UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuU1RBUlQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb29tTWF0ID0gbmV3IMaSLk1hdGVyaWFsKFwicm9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiLCB0aGlzLm9wYWNpdHkpLCBub3JtYWxSb29tKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuTk9STUFMOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucm9vbU1hdCA9IG5ldyDGki5NYXRlcmlhbChcInJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiwgdGhpcy5vcGFjaXR5KSwgbm9ybWFsUm9vbSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLk1FUkNIQU5UOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucm9vbU1hdCA9IG5ldyDGki5NYXRlcmlhbChcInJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiwgdGhpcy5vcGFjaXR5KSwgbWVyY2hhbnRSb29tKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuVFJFQVNVUkU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb29tTWF0ID0gbmV3IMaSLk1hdGVyaWFsKFwicm9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiLCB0aGlzLm9wYWNpdHkpLCB0cmVhc3VyZVJvb20pKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5DSEFMTEVOR0U6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb29tTWF0ID0gbmV3IMaSLk1hdGVyaWFsKFwicm9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiLCB0aGlzLm9wYWNpdHkpLCBjaGFsbGVuZ2VSb29tKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuQk9TUzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb21NYXQgPSBuZXcgxpIuTWF0ZXJpYWwoXCJyb29tTWF0XCIsIMaSLlNoYWRlckxpdFRleHR1cmVkLCBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIsIHRoaXMub3BhY2l0eSksIGJvc3NSb29tKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY21wTWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwodGhpcy5yb29tTWF0KTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWF0ZXJpYWwpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyh0aGlzLmNvb3JkaW5hdGVzLngsIHRoaXMuY29vcmRpbmF0ZXMueSwgMSk7XHJcbiAgICAgICAgICAgIC8vIHRoaXMuYWN0aXZhdGUoZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGlzRGlzY292ZXJlZCgpIHtcclxuICAgICAgICAgICAgdGhpcy5kaXNjb3ZlcmVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZSh0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCIvLy88cmVmZXJlbmNlIHBhdGg9XCIuLi9GVURHRS9OZXQvQnVpbGQvQ2xpZW50L0Z1ZGdlQ2xpZW50LmQudHNcIi8+XHJcblxyXG5uYW1lc3BhY2UgTmV0d29ya2luZyB7XHJcbiAgICBleHBvcnQgZW51bSBGVU5DVElPTiB7XHJcbiAgICAgICAgQ09OTkVDVEVELFxyXG4gICAgICAgIFNFVEdBTUVTVEFURSxcclxuICAgICAgICBMT0FERUQsXHJcbiAgICAgICAgU0VUUkVBRFksXHJcbiAgICAgICAgU1BBV04sXHJcbiAgICAgICAgVFJBTlNGT1JNLFxyXG4gICAgICAgIENMSUVOVE1PVkVNRU5ULFxyXG4gICAgICAgIFNFUlZFUkJVRkZFUixcclxuICAgICAgICBVUERBVEVJTlZFTlRPUlksXHJcbiAgICAgICAgS05PQ0tCQUNLUkVRVUVTVCxcclxuICAgICAgICBLTk9DS0JBQ0tQVVNILFxyXG4gICAgICAgIFNQQVdOQlVMTEVULFxyXG4gICAgICAgIEJVTExFVFBSRURJQ1QsXHJcbiAgICAgICAgQlVMTEVUVFJBTlNGT1JNLFxyXG4gICAgICAgIEJVTExFVERJRSxcclxuICAgICAgICBTUEFXTkVORU1ZLFxyXG4gICAgICAgIEVORU1ZVFJBTlNGT1JNLFxyXG4gICAgICAgIEVOVElUWUFOSU1BVElPTlNUQVRFLFxyXG4gICAgICAgIEVORU1ZRElFLFxyXG4gICAgICAgIFNQQVdOSU5URVJOQUxJVEVNLFxyXG4gICAgICAgIFVQREFURUFUVFJJQlVURVMsXHJcbiAgICAgICAgVVBEQVRFV0VBUE9OLFxyXG4gICAgICAgIElURU1ESUUsXHJcbiAgICAgICAgU0VORFJPT00sXHJcbiAgICAgICAgU1dJVENIUk9PTVJFUVVFU1QsXHJcbiAgICAgICAgVVBEQVRFQlVGRixcclxuICAgICAgICBVUERBVEVVSSxcclxuICAgICAgICBTUFdBTk1JTklNQVAsXHJcbiAgICAgICAgU1BBV05aSVBaQVBcclxuICAgIH1cclxuXHJcbiAgICBpbXBvcnQgxpJDbGllbnQgPSBGdWRnZU5ldC5GdWRnZUNsaWVudDtcclxuXHJcbiAgICBleHBvcnQgbGV0IGNsaWVudDogxpJDbGllbnQ7XHJcbiAgICBleHBvcnQgbGV0IGNyZWF0ZWRSb29tOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IGNsaWVudHM6IEFycmF5PHsgaWQ6IHN0cmluZywgcmVhZHk6IGJvb2xlYW4gfT4gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgcG9zVXBkYXRlOiDGki5WZWN0b3IzO1xyXG4gICAgZXhwb3J0IGxldCBzb21lb25lSXNIb3N0OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IGVuZW15OiBFbmVteS5FbmVteTtcclxuICAgIGV4cG9ydCBsZXQgY3VycmVudElEczogbnVtYmVyW10gPSBbXTtcclxuXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RTcGF3blwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4geyBzcGF3blBsYXllcigpIH0sIHRydWUpO1xyXG4gICAgbGV0IElQQ29ubmVjdGlvbiA9IDxIVE1MSW5wdXRFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSVBDb25uZWN0aW9uXCIpO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDb25uZWN0aW5nXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjb25uZWN0aW5nLCB0cnVlKTtcclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNvbm5lY3RpbmcoKSB7XHJcbiAgICAgICAgY2xpZW50ID0gbmV3IMaSQ2xpZW50KCk7XHJcbiAgICAgICAgY2xpZW50LmFkZEV2ZW50TGlzdGVuZXIoRnVkZ2VOZXQuRVZFTlQuTUVTU0FHRV9SRUNFSVZFRCwgcmVjZWl2ZU1lc3NhZ2UpO1xyXG4gICAgICAgIGNsaWVudC5jb25uZWN0VG9TZXJ2ZXIoSVBDb25uZWN0aW9uLnZhbHVlKTtcclxuXHJcbiAgICAgICAgYWRkQ2xpZW50SUQoKVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBhZGRDbGllbnRJRCgpIHtcclxuICAgICAgICAgICAgaWYgKGNsaWVudC5pZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBvYmo6IHsgaWQ6IHN0cmluZywgcmVhZHk6IGJvb2xlYW4gfSA9IHsgaWQ6IGNsaWVudC5pZCwgcmVhZHk6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICBjbGllbnRzLnB1c2gob2JqKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoYWRkQ2xpZW50SUQsIDMwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiByZWNlaXZlTWVzc2FnZShfZXZlbnQ6IEN1c3RvbUV2ZW50IHwgTWVzc2FnZUV2ZW50IHwgRXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBpZiAoX2V2ZW50IGluc3RhbmNlb2YgTWVzc2FnZUV2ZW50KSB7XHJcbiAgICAgICAgICAgIGxldCBtZXNzYWdlOiBGdWRnZU5ldC5NZXNzYWdlID0gSlNPTi5wYXJzZShfZXZlbnQuZGF0YSk7XHJcblxyXG4gICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5MT0FERUQudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgR2FtZS5sb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pZFNvdXJjZSAhPSBjbGllbnQuaWQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kID09IEZ1ZGdlTmV0LkNPTU1BTkQuUk9PTV9DUkVBVEUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlLmNvbnRlbnQucm9vbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGh0bWw6IEhUTUxFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJSb29tSWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgaHRtbC5wYXJlbnRFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgICAgICAgICBodG1sLnRleHRDb250ZW50ID0gbWVzc2FnZS5jb250ZW50LnJvb207XHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlZFJvb20gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGpvaW5Sb29tKG1lc3NhZ2UuY29udGVudC5yb29tKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kID09IEZ1ZGdlTmV0LkNPTU1BTkQuUk9PTV9FTlRFUikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjcmVhdGVkUm9vbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGllbnQuYmVjb21lSG9zdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kICE9IEZ1ZGdlTmV0LkNPTU1BTkQuU0VSVkVSX0hFQVJUQkVBVCAmJiBtZXNzYWdlLmNvbW1hbmQgIT0gRnVkZ2VOZXQuQ09NTUFORC5DTElFTlRfSEVBUlRCRUFUKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9BZGQgbmV3IGNsaWVudCB0byBhcnJheSBjbGllbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQ09OTkVDVEVELnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudC52YWx1ZSAhPSBjbGllbnQuaWQgJiYgY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudCA9PSBtZXNzYWdlLmNvbnRlbnQudmFsdWUpID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgPT0gbWVzc2FnZS5jb250ZW50LnZhbHVlKSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpZW50cy5wdXNoKHsgaWQ6IG1lc3NhZ2UuY29udGVudC52YWx1ZSwgcmVhZHk6IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TRVRHQU1FU1RBVEUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50LnBsYXlpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUucGxheWluZyhmYWxzZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIW1lc3NhZ2UuY29udGVudC5wbGF5aW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBhdXNlKGZhbHNlLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9TUEFXTiBNSU5JTUFQIEJZIENMSUVOVFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQV0FOTUlOSU1BUC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvbGRNaW5pTWFwSW5mbyA9IG1lc3NhZ2UuY29udGVudC5taW5pTWFwSW5mb3M7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdNaW5pTWFwSW5mbzogSW50ZXJmYWNlcy5JTWluaW1hcEluZm9zW10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvbGRNaW5pTWFwSW5mby5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0Nvb3JkczogR2FtZS7Gki5WZWN0b3IyID0gbmV3IEdhbWUuxpIuVmVjdG9yMihvbGRNaW5pTWFwSW5mb1tpXS5jb29yZHMuZGF0YVswXSwgb2xkTWluaU1hcEluZm9baV0uY29vcmRzLmRhdGFbMV0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdNaW5pTWFwSW5mby5wdXNoKDxJbnRlcmZhY2VzLklNaW5pbWFwSW5mb3M+eyBjb29yZHM6IG5ld0Nvb3Jkcywgcm9vbVR5cGU6IG9sZE1pbmlNYXBJbmZvW2ldLnJvb21UeXBlIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUubWluaU1hcCA9IG5ldyBVSS5NaW5pbWFwKG5ld01pbmlNYXBJbmZvKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChHYW1lLm1pbmlNYXApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9GUk9NIENMSUVOVCBJTlBVVCBWRUNUT1JTIEZST00gQVZBVEFSXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQ0xJRU5UTU9WRU1FTlQudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXRWZWN0b3IgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5pbnB1dC5pbnB1dFZlY3Rvci5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuaW5wdXQuaW5wdXRWZWN0b3IuZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LmlucHV0LmlucHV0VmVjdG9yLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXQ6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCA9IHsgdGljazogbWVzc2FnZS5jb250ZW50LmlucHV0LnRpY2ssIGlucHV0VmVjdG9yOiBpbnB1dFZlY3RvciwgZG9lc0FiaWxpdHk6IG1lc3NhZ2UuY29udGVudC5pbnB1dC5kb2VzQWJpbGl0eSB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuc2VydmVyUHJlZGljdGlvbkF2YXRhci51cGRhdGVFbnRpdHlUb0NoZWNrKG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuc2VydmVyUHJlZGljdGlvbkF2YXRhci5vbkNsaWVudElucHV0KGlucHV0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPIENMSUVOVCBDQUxDVUxBVEVEIFBPU0lUSU9OIEZPUiBBVkFUQVJcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TRVJWRVJCVUZGRVIudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV0T2JqOiBJbnRlcmZhY2VzLklOZXR3b3JrT2JqZWN0cyA9IEdhbWUuY3VycmVudE5ldE9iai5maW5kKGVudGl0eSA9PiBlbnRpdHkubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQuYnVmZmVyLnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5idWZmZXIucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LmJ1ZmZlci5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXRlOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQgPSB7IHRpY2s6IG1lc3NhZ2UuY29udGVudC5idWZmZXIudGljaywgcG9zaXRpb246IHBvc2l0aW9uIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXRPYmogIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgb2JqID0gbmV0T2JqLm5ldE9iamVjdE5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2JqIGluc3RhbmNlb2YgUGxheWVyLlBsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5vYmopLmNsaWVudC5vblNlcnZlck1vdmVtZW50U3RhdGUoc3RhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPEJ1bGxldHMuQnVsbGV0Pm9iaikuY2xpZW50UHJlZGljdGlvbi5vblNlcnZlck1vdmVtZW50U3RhdGUoc3RhdGUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvL0ZST00gQ0xJRU5UIEJVTExFVCBWRUNUT1JTXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQlVMTEVUUFJFRElDVC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnB1dFZlY3RvciA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmlucHV0LmlucHV0VmVjdG9yLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5pbnB1dC5pbnB1dFZlY3Rvci5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQuaW5wdXQuaW5wdXRWZWN0b3IuZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnB1dDogSW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkID0geyB0aWNrOiBtZXNzYWdlLmNvbnRlbnQuaW5wdXQudGljaywgaW5wdXRWZWN0b3I6IGlucHV0VmVjdG9yIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ldE9iajogSW50ZXJmYWNlcy5JTmV0d29ya09iamVjdHMgPSBHYW1lLmN1cnJlbnROZXRPYmouZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ1bGxldDogQnVsbGV0cy5CdWxsZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXRPYmogIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQgPSA8QnVsbGV0cy5CdWxsZXQ+bmV0T2JqLm5ldE9iamVjdE5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhidWxsZXQgKyBcIlwiICsgbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldC5zZXJ2ZXJQcmVkaWN0aW9uLnVwZGF0ZUVudGl0eVRvQ2hlY2sobWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldC5zZXJ2ZXJQcmVkaWN0aW9uLm9uQ2xpZW50SW5wdXQoaW5wdXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9TZXQgY2xpZW50IHJlYWR5XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU0VUUkVBRFkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5pZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQuaWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5yZWFkeSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gYXZhdGFyMiBhcyByYW5nZWQgb3IgbWVsZWUgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV04udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV0SWQ6IG51bWJlciA9IG1lc3NhZ2UuY29udGVudC5uZXRJZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXR0cmlidXRlczogRW50aXR5LkF0dHJpYnV0ZXMgPSBuZXcgRW50aXR5LkF0dHJpYnV0ZXMobWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLnNwZWVkLCBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5zY2FsZSwgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UsIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmFybW9yLCBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiwgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuYWNjdXJhY3kpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50LnR5cGUgPT0gRW50aXR5LklELk1FTEVFKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIgPSBuZXcgUGxheWVyLk1lbGVlKEVudGl0eS5JRC5NRUxFRSwgYXR0cmlidXRlcywgbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChHYW1lLmF2YXRhcjIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuY29udGVudC50eXBlID09IEVudGl0eS5JRC5SQU5HRUQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMiA9IG5ldyBQbGF5ZXIuUmFuZ2VkKEVudGl0eS5JRC5SQU5HRUQsIGF0dHJpYnV0ZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChHYW1lLmF2YXRhcjIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1J1bnRpbWUgdXBkYXRlcyBhbmQgY29tbXVuaWNhdGlvblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TeW5jIGF2YXRhcjIgcG9zaXRpb24gYW5kIHJvdGF0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQgdGVzdDogR2FtZS7Gki5WZWN0b3IzID0gbWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAvLyBjb25zb2xlLmxvZyh0ZXN0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBtb3ZlVmVjdG9yOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJvdGF0ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzJdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5hdmF0YXIyICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG1vdmVWZWN0b3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnJvdGF0aW9uID0gcm90YXRlVmVjdG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5jb2xsaWRlci5wb3NpdGlvbiA9IG1vdmVWZWN0b3IudG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHYW1lLmF2YXRhcjIuYXZhdGFyUHJlZGljdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9VcGRhdGUgaW52ZW50b3J5XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlVQREFURUlOVkVOVE9SWS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbTogSXRlbXMuSXRlbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChJdGVtcy5nZXRCdWZmSXRlbUJ5SWQobWVzc2FnZS5jb250ZW50Lml0ZW1JZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0gPSBuZXcgSXRlbXMuQnVmZkl0ZW0obWVzc2FnZS5jb250ZW50Lml0ZW1JZCwgbWVzc2FnZS5jb250ZW50Lml0ZW1OZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEl0ZW1zLmdldEludGVybmFsSXRlbUJ5SWQobWVzc2FnZS5jb250ZW50Lml0ZW1JZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0gPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKG1lc3NhZ2UuY29udGVudC5pdGVtSWQsIG1lc3NhZ2UuY29udGVudC5pdGVtTmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbnRpdHkgPSBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiAoPFBsYXllci5QbGF5ZXI+ZWxlbSkubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50LmFkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5pdGVtcy5wdXNoKG5ld0l0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuaXRlbXMuc3BsaWNlKGVudGl0eS5pdGVtcy5pbmRleE9mKGVudGl0eS5pdGVtcy5maW5kKGl0ZW0gPT4gaXRlbS5pZCA9PSBuZXdJdGVtLmlkKSksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0NsaWVudCByZXF1ZXN0IGZvciBtb3ZlIGtub2NrYmFja1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5LTk9DS0JBQ0tSRVFVRVNULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmVteTogRW5lbXkuRW5lbXkgPSBHYW1lLmVuZW1pZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS5nZXRLbm9ja2JhY2sobWVzc2FnZS5jb250ZW50Lmtub2NrYmFja0ZvcmNlLCBwb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vSG9zdCBwdXNoIG1vdmUga25vY2tiYWNrIGZyb20gZW5lbXlcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uS05PQ0tCQUNLUFVTSC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5nZXRLbm9ja2JhY2sobWVzc2FnZS5jb250ZW50Lmtub2NrYmFja0ZvcmNlLCBwb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gYnVsbGV0IGZyb20gaG9zdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUEFXTkJVTExFVC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnVsbGV0OiBCdWxsZXRzLkJ1bGxldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbnRpdHk6IEVudGl0eS5FbnRpdHkgPSBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5vd25lck5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW50aXR5ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgd2VhcG9uOiBXZWFwb25zLldlYXBvbiA9IGVudGl0eS53ZWFwb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRpcmVjaXRvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQuZGlyZWN0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKDxXZWFwb25zLkFJTT5tZXNzYWdlLmNvbnRlbnQuYWltVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFdlYXBvbnMuQUlNLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldCA9IG5ldyBCdWxsZXRzLkJ1bGxldCh3ZWFwb24uYnVsbGV0VHlwZSwgZW50aXR5Lm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBkaXJlY2l0b24sIGVudGl0eS5uZXRJZCwgbWVzc2FnZS5jb250ZW50LmJ1bGxldE5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFdlYXBvbnMuQUlNLkhPTUlORzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWxsZXRUYXJnZXQ6IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmJ1bGxldFRhcmdldC5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuYnVsbGV0VGFyZ2V0LmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5idWxsZXRUYXJnZXQuZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQgPSBuZXcgQnVsbGV0cy5Ib21pbmdCdWxsZXQod2VhcG9uLmJ1bGxldFR5cGUsIGVudGl0eS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgZGlyZWNpdG9uLCBlbnRpdHkubmV0SWQsIGJ1bGxldFRhcmdldCwgbWVzc2FnZS5jb250ZW50LmJ1bGxldE5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGJ1bGxldCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3luYyBidWxsZXQgdHJhbnNmb3JtIGZyb20gaG9zdCB0byBjbGllbnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQlVMTEVUVFJBTlNGT1JNLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmN1cnJlbnROZXRPYmouZmluZChlbGVtZW50ID0+IGVsZW1lbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5jdXJyZW50TmV0T2JqLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkubmV0T2JqZWN0Tm9kZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdQb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld1JvdGF0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmN1cnJlbnROZXRPYmouZmluZChlbGVtZW50ID0+IGVsZW1lbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5uZXRPYmplY3ROb2RlLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3UG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuY3VycmVudE5ldE9iai5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpLm5ldE9iamVjdE5vZGUubXR4TG9jYWwucm90YXRpb24gPSBuZXdSb3RhdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0tpbGwgYnVsbGV0IGF0IHRoZSBjbGllbnQgZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkJVTExFVERJRS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnVsbGV0ID0gR2FtZS5idWxsZXRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChidWxsZXQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldC5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldC5kZXNwYXduKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGVuZW15IGF0IHRoZSBjbGllbnQgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdORU5FTVkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBjaGFuZ2UgYXR0cmlidXRlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRW5lbXlTcGF3bmVyLm5ldHdvcmtTcGF3bkJ5SWQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LmVuZW15Q2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LmlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyDGki5WZWN0b3IyKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5uZXRJZCwgbWVzc2FnZS5jb250ZW50LnRhcmdldCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3luYyBlbmVteSB0cmFuc2Zvcm0gZnJvbSBob3N0IHRvIGNsaWVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5FTkVNWVRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5lbXkgPSBHYW1lLmVuZW1pZXMuZmluZChlbmVtID0+IGVuZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmVteSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS5zZXRDb2xsaWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3luYyBhbmltYXRpb24gc3RhdGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5USVRZQU5JTUFUSU9OU1RBVEUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eSA9IEdhbWUuZW50aXRpZXMuZmluZChlbmVtID0+IGVuZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbnRpdHkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LnN3aXRjaEFuaW1hdGlvbihtZXNzYWdlLmNvbnRlbnQuc3RhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0tpbGwgZW5lbXkgYXQgdGhlIGNsaWVudCBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5FTVlESUUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuZW15ID0gR2FtZS5lbmVtaWVzLmZpbmQoZW5lbSA9PiBlbmVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW5lbXkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuZGllKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy91cGRhdGUgRW50aXR5IGJ1ZmYgTGlzdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5VUERBVEVCVUZGLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWZmTGlzdDogQnVmZi5CdWZmW10gPSA8QnVmZi5CdWZmW10+bWVzc2FnZS5jb250ZW50LmJ1ZmZMaXN0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eSA9IEdhbWUuZW50aXRpZXMuZmluZChlbnQgPT4gZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQgbmV3QnVmZnM6IEJ1ZmYuQnVmZltdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYnVmZnMuZm9yRWFjaChvbGRCdWZmID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnVmZlRvQ2hlY2sgPSBidWZmTGlzdC5maW5kKGJ1ZmYgPT4gYnVmZi5pZCA9PSBvbGRCdWZmLmlkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChidWZmVG9DaGVjayA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkQnVmZi5yZW1vdmVCdWZmKGVudGl0eSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZMaXN0LmZvckVhY2goYnVmZiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChidWZmLmlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQnVmZi5CVUZGSUQuUE9JU09OIHwgQnVmZi5CVUZGSUQuQkxFRURJTkc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgQnVmZi5EYW1hZ2VCdWZmKGJ1ZmYuaWQsIGJ1ZmYuZHVyYXRpb24sIGJ1ZmYudGlja1JhdGUsICg8QnVmZi5EYW1hZ2VCdWZmPmJ1ZmYpLnZhbHVlKS5hZGRUb0VudGl0eShlbnRpdHkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQnVmZi5CVUZGSUQuSU1NVU5FOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IEJ1ZmYuQXR0cmlidXRlc0J1ZmYoYnVmZi5pZCwgYnVmZi5kdXJhdGlvbiwgYnVmZi50aWNrUmF0ZSwgKDxCdWZmLkF0dHJpYnV0ZXNCdWZmPmJ1ZmYpLnZhbHVlKS5hZGRUb0VudGl0eShlbnRpdHkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBlbnRpdHkuYnVmZnMuZm9yRWFjaChidWZmID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICBsZXQgZmxhZzogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIGJ1ZmZMaXN0LmZvckVhY2gobmV3QnVmZiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgIGlmIChidWZmLmlkID09IG5ld0J1ZmYuaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAgIGZsYWcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICBpZiAoIWZsYWcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAgICAgZW50aXR5LnJlbW92ZUNoaWxkKGVudGl0eS5nZXRDaGlsZHJlbigpLmZpbmQoY2hpbGQgPT4gKDxVSS5QYXJ0aWNsZXM+Y2hpbGQpLmlkID09IGJ1ZmYuaWQpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVudGl0eS5idWZmcyA9IG5ld0J1ZmZzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdXBkYXRlIFVJXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlVQREFURVVJLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjogxpIuVmVjdG9yMiA9IG5ldyDGki5WZWN0b3IyKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBVSS5EYW1hZ2VVSShwb3NpdGlvbi50b1ZlY3RvcjMoKSwgbWVzc2FnZS5jb250ZW50LnZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vc3Bhd24gc3BlY2lhbCBpdGVtc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUEFXTlpJUFpBUC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaXRlbTogQnVsbGV0cy5aaXBaYXBPYmplY3QgPSBuZXcgQnVsbGV0cy5aaXBaYXBPYmplY3QobWVzc2FnZS5jb250ZW50Lm93bmVyTmV0SWQsIG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5zcGF3bigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGl0ZW0gZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdOSU5URVJOQUxJVEVNLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChJdGVtcy5nZXRCdWZmSXRlbUJ5SWQobWVzc2FnZS5jb250ZW50LmlkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJdGVtID0gbmV3IEl0ZW1zLkJ1ZmZJdGVtKG1lc3NhZ2UuY29udGVudC5pZCwgbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zZXRQb3NpdGlvbihuZXcgxpIuVmVjdG9yMihtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0pKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ld0l0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoSXRlbXMuZ2V0SW50ZXJuYWxJdGVtQnlJZChtZXNzYWdlLmNvbnRlbnQuaWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW0gPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKG1lc3NhZ2UuY29udGVudC5pZCwgbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zZXRQb3NpdGlvbihuZXcgxpIuVmVjdG9yMihtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXdJdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vYXBwbHkgaXRlbSBhdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlVQREFURUFUVFJJQlVURVMudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eSA9IEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobWVzc2FnZS5jb250ZW50LnBheWxvYWQudHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuSEVBTFRIUE9JTlRTOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgPSBtZXNzYWdlLmNvbnRlbnQucGF5bG9hZC52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQVRUUklCVVRFVFlQRS5NQVhIRUFMVEhQT0lOVFM6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuS05PQ0tCQUNLRk9SQ0U6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuSElUQUJMRTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMuaGl0YWJsZSA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5BVFRSSUJVVEVUWVBFLkFSTU9SOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5hcm1vciA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5BVFRSSUJVVEVUWVBFLlNQRUVEOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5zcGVlZCA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5BVFRSSUJVVEVUWVBFLkFUVEFDS1BPSU5UUzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuQ09PTERPV05SRURVQ1RJT046XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuU0NBTEU6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzLnNjYWxlID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9hcHBseSB3ZWFwb25cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVVBEQVRFV0VBUE9OLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZWZXZWFwb246IFdlYXBvbnMuV2VhcG9uID0gPFdlYXBvbnMuV2VhcG9uPm1lc3NhZ2UuY29udGVudC53ZWFwb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlLmNvbnRlbnQud2VhcG9uLmNvb2xkb3duLmNvb2xEb3duKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBXZWFwb246IFdlYXBvbnMuV2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKG1lc3NhZ2UuY29udGVudC53ZWFwb24uY29vbGRvd24uY29vbERvd24sIG1lc3NhZ2UuY29udGVudC53ZWFwb24uYXR0YWNrQ291bnQsIHJlZldlYXBvbi5idWxsZXRUeXBlLCByZWZXZWFwb24ucHJvamVjdGlsZUFtb3VudCwgcmVmV2VhcG9uLm93bmVyTmV0SWQsIHJlZldlYXBvbi5haW1UeXBlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBXZWFwb24uY2FuU2hvb3QgPSByZWZXZWFwb24uY2FuU2hvb3Q7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPFBsYXllci5QbGF5ZXI+R2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpKS53ZWFwb24gPSB0ZW1wV2VhcG9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0tpbGwgaXRlbSBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uSVRFTURJRS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaXRlbSA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maW5kKGVuZW0gPT4gKDxJdGVtcy5JdGVtPmVuZW0pLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9wSUQobWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3NlbmQgcm9vbSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU0VORFJPT00udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvb3JkaWFudGVzOiBHYW1lLsaSLlZlY3RvcjIgPSBuZXcgR2FtZS7Gki5WZWN0b3IyKG1lc3NhZ2UuY29udGVudC5yb29tLmNvb3JkaW5hdGVzLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5yb29tLmNvb3JkaW5hdGVzLmRhdGFbMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhbnNsYXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnJvb20udHJhbnNsYXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnJvb20udHJhbnNsYXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnJvb20udHJhbnNsYXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcm9vbUluZm86IEludGVyZmFjZXMuSVJvb20gPSB7IGNvb3JkaW5hdGVzOiBjb29yZGlhbnRlcywgcm9vbVNpemU6IG1lc3NhZ2UuY29udGVudC5yb29tLnJvb21TaXplLCBleGl0czogbWVzc2FnZS5jb250ZW50LnJvb20uZXhpdHMsIHJvb21UeXBlOiBtZXNzYWdlLmNvbnRlbnQucm9vbS5yb29tVHlwZSwgdHJhbnNsYXRpb246IHRhbnNsYXRpb24gfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdSb29tOiBHZW5lcmF0aW9uLlJvb207XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHJvb21JbmZvLnJvb21UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLlNUQVJUOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IEdlbmVyYXRpb24uU3RhcnRSb29tKHJvb21JbmZvLmNvb3JkaW5hdGVzLCByb29tSW5mby5yb29tU2l6ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5OT1JNQUw6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgR2VuZXJhdGlvbi5Ob3JtYWxSb29tKHJvb21JbmZvLmNvb3JkaW5hdGVzLCByb29tSW5mby5yb29tU2l6ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5CT1NTOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IEdlbmVyYXRpb24uQm9zc1Jvb20ocm9vbUluZm8uY29vcmRpbmF0ZXMsIHJvb21JbmZvLnJvb21TaXplKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLlRSRUFTVVJFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IEdlbmVyYXRpb24uVHJlYXN1cmVSb29tKHJvb21JbmZvLmNvb3JkaW5hdGVzLCByb29tSW5mby5yb29tU2l6ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5NRVJDSEFOVDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBHZW5lcmF0aW9uLk1lcmNoYW50Um9vbShyb29tSW5mby5jb29yZGluYXRlcywgcm9vbUluZm8ucm9vbVNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuQ0hBTExFTkdFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IEdlbmVyYXRpb24uQ2hhbGxlbmdlUm9vbShyb29tSW5mby5jb29yZGluYXRlcywgcm9vbUluZm8ucm9vbVNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20uZXhpdHMgPSByb29tSW5mby5leGl0cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20ubXR4TG9jYWwudHJhbnNsYXRpb24gPSByb29tSW5mby50cmFuc2xhdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20uc2V0U3Bhd25Qb2ludHMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20ub3BlbkRvb3JzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLmFkZFJvb21Ub0dyYXBoKG5ld1Jvb20pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3NlbmQgcmVxdWVzdCB0byBzd2l0Y2ggcm9vbXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1dJVENIUk9PTVJFUVVFU1QudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2VuZXJhdGlvbi5zd2l0Y2hSb29tKG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2V0Q2xpZW50UmVhZHkoKSB7XHJcbiAgICAgICAgY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5pZCA9PSBjbGllbnQuaWQpLnJlYWR5ID0gdHJ1ZTtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TRVRSRUFEWSwgbmV0SWQ6IGNsaWVudC5pZCB9IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZXRHYW1lc3RhdGUoX3BsYXlpbmc6IGJvb2xlYW4pIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWQpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFVEdBTUVTVEFURSwgcGxheWluZzogX3BsYXlpbmcgfSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlUm9vbSgpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29tbWFuZDogRnVkZ2VOZXQuQ09NTUFORC5ST09NX0NSRUFURSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gam9pblJvb20oX3Jvb21JZDogc3RyaW5nKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbW1hbmQ6IEZ1ZGdlTmV0LkNPTU1BTkQuUk9PTV9FTlRFUiwgY29udGVudDogeyByb29tOiBfcm9vbUlkIH0gfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8jcmVnaW9uIHBsYXllclxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGxvYWRlZCgpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5MT0FERUQgfSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25QbGF5ZXIoKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuYXZhdGFyMS5pZCA9PSBFbnRpdHkuSUQuTUVMRUUpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV04sIHR5cGU6IEVudGl0eS5JRC5NRUxFRSwgYXR0cmlidXRlczogR2FtZS5hdmF0YXIxLmF0dHJpYnV0ZXMsIHBvc2l0aW9uOiBHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCBuZXRJZDogR2FtZS5hdmF0YXIxLm5ldElkIH0gfSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTiwgdHlwZTogRW50aXR5LklELlJBTkdFRCwgYXR0cmlidXRlczogR2FtZS5hdmF0YXIxLmF0dHJpYnV0ZXMsIHBvc2l0aW9uOiBHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCBuZXRJZDogR2FtZS5hdmF0YXIxLm5ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZXRDbGllbnQoKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogTmV0d29ya2luZy5GVU5DVElPTi5DT05ORUNURUQsIHZhbHVlOiBOZXR3b3JraW5nLmNsaWVudC5pZCB9IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVBdmF0YXJQb3NpdGlvbihfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9yb3RhdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVFJBTlNGT1JNLCB2YWx1ZTogX3Bvc2l0aW9uLCByb3RhdGlvbjogX3JvdGF0aW9uIH0gfSlcclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNlbmRDbGllbnRJbnB1dChfbmV0SWQ6IG51bWJlciwgX2lucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLkhPU1QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQ0xJRU5UTU9WRU1FTlQsIG5ldElkOiBfbmV0SWQsIGlucHV0OiBfaW5wdXRQYXlsb2FkIH0gfSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2VuZFNlcnZlckJ1ZmZlcihfbmV0SWQ6IG51bWJlciwgX2J1ZmZlcjogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkKSB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWQpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFUlZFUkJVRkZFUiwgbmV0SWQ6IF9uZXRJZCwgYnVmZmVyOiBfYnVmZmVyIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGtub2NrYmFja1JlcXVlc3QoX25ldElkOiBudW1iZXIsIF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnQuaWRIb3N0LCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLktOT0NLQkFDS1JFUVVFU1QsIG5ldElkOiBfbmV0SWQsIGtub2NrYmFja0ZvcmNlOiBfa25vY2tiYWNrRm9yY2UsIHBvc2l0aW9uOiBfcG9zaXRpb24gfSB9KVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBrbm9ja2JhY2tQdXNoKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLktOT0NLQkFDS1BVU0gsIGtub2NrYmFja0ZvcmNlOiBfa25vY2tiYWNrRm9yY2UsIHBvc2l0aW9uOiBfcG9zaXRpb24gfSB9KVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVJbnZlbnRvcnkoX2FkZDogYm9vbGVhbiwgX2l0ZW1JZDogSXRlbXMuSVRFTUlELCBfaXRlbU5ldElkOiBudW1iZXIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKGNsaWVudC5pZCA9PSBjbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFSU5WRU5UT1JZLCBhZGQ6IF9hZGQsIGl0ZW1JZDogX2l0ZW1JZCwgaXRlbU5ldElkOiBfaXRlbU5ldElkLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduTWluaW1hcChfbWluaU1hcEluZm9zOiBJbnRlcmZhY2VzLklNaW5pbWFwSW5mb3NbXSkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQV0FOTUlOSU1BUCwgbWluaU1hcEluZm9zOiBfbWluaU1hcEluZm9zIH0gfSlcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBidWxsZXRcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkJ1bGxldChfYWltVHlwZTogV2VhcG9ucy5BSU0sIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9idWxsZXROZXRJZDogbnVtYmVyLCBfb3duZXJOZXRJZDogbnVtYmVyLCBfYnVsbGV0VGFyZ2V0PzogxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWQpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOQlVMTEVULCBhaW1UeXBlOiBfYWltVHlwZSwgZGlyZWN0aW9uOiBfZGlyZWN0aW9uLCBvd25lck5ldElkOiBfb3duZXJOZXRJZCwgYnVsbGV0TmV0SWQ6IF9idWxsZXROZXRJZCwgYnVsbGV0VGFyZ2V0OiBfYnVsbGV0VGFyZ2V0IH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2VuZEJ1bGxldElucHV0KF9uZXRJZDogbnVtYmVyLCBfaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWQpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuSE9TVCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5CVUxMRVRQUkVESUNULCBuZXRJZDogX25ldElkLCBpbnB1dDogX2lucHV0UGF5bG9hZCB9IH0pXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUJ1bGxldChfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9yb3RhdGlvbjogxpIuVmVjdG9yMywgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQlVMTEVUVFJBTlNGT1JNLCBwb3NpdGlvbjogX3Bvc2l0aW9uLCByb3RhdGlvbjogX3JvdGF0aW9uLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVtb3ZlQnVsbGV0KF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkJVTExFVERJRSwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIHNwZWNpYWxJdGVtc1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3blppcFphcChfb3duZXJOZXRJZDogbnVtYmVyLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTlpJUFpBUCwgb3duZXJOZXRJZDogX293bmVyTmV0SWQsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBlbmVteVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduRW5lbXkoX2VuZW15Q2xhc3M6IEVuZW15LkVORU1ZQ0xBU1MsIF9lbmVteTogRW5lbXkuRW5lbXksIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdORU5FTVksIGVuZW15Q2xhc3M6IF9lbmVteUNsYXNzLCBpZDogX2VuZW15LmlkLCBhdHRyaWJ1dGVzOiBfZW5lbXkuYXR0cmlidXRlcywgcG9zaXRpb246IF9lbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgbmV0SWQ6IF9uZXRJZCwgdGFyZ2V0OiBfZW5lbXkudGFyZ2V0IH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlRW5lbXlQb3NpdGlvbihfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5FTkVNWVRSQU5TRk9STSwgcG9zaXRpb246IF9wb3NpdGlvbiwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUVudGl0eUFuaW1hdGlvblN0YXRlKF9zdGF0ZTogRW50aXR5LkFOSU1BVElPTlNUQVRFUywgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkVOVElUWUFOSU1BVElPTlNUQVRFLCBzdGF0ZTogX3N0YXRlLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gZWxzZSB7XHJcbiAgICAgICAgLy8gICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkID09IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkVOVElUWUFOSU1BVElPTlNUQVRFLCBzdGF0ZTogX3N0YXRlLCBuZXRJZDogX25ldElkIH0gfSlcclxuXHJcbiAgICAgICAgLy8gfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUVuZW15KF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5FTVlESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gaXRlbXNcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkl0ZW0oX2lkOiBudW1iZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05JTlRFUk5BTElURU0sIGlkOiBfaWQsIHBvc2l0aW9uOiBfcG9zaXRpb24sIG5ldElkOiBfbmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlRW50aXR5QXR0cmlidXRlcyhfYXR0cmlidXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChjbGllbnQuaWRIb3N0ICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuSE9TVCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVBVFRSSUJVVEVTLCBwYXlsb2FkOiBfYXR0cmlidXRlUGF5bG9hZCwgbmV0SWQ6IF9uZXRJZCB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFQVRUUklCVVRFUywgcGF5bG9hZDogX2F0dHJpYnV0ZVBheWxvYWQsIG5ldElkOiBfbmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQXZhdGFyV2VhcG9uKF93ZWFwb246IFdlYXBvbnMuV2VhcG9uLCBfdGFyZ2V0TmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChjbGllbnQuaWRIb3N0ICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuSE9TVCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVXRUFQT04sIHdlYXBvbjogX3dlYXBvbiwgbmV0SWQ6IF90YXJnZXROZXRJZCB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFV0VBUE9OLCB3ZWFwb246IF93ZWFwb24sIG5ldElkOiBfdGFyZ2V0TmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUl0ZW0oX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCAhPSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLkhPU1QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uSVRFTURJRSwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5JVEVNRElFLCBuZXRJZDogX25ldElkIH0gfSlcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcbiAgICAvLyNyZWdpb24gYnVmZnNcclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVCdWZmTGlzdChfYnVmZkxpc3Q6IEJ1ZmYuQnVmZltdLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVCVUZGLCBidWZmTGlzdDogX2J1ZmZMaXN0LCBuZXRJZDogX25ldElkIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIFVJXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlVUkoX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjIsIF92YWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURVVJLCBwb3NpdGlvbjogX3Bvc2l0aW9uLCB2YWx1ZTogX3ZhbHVlIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiByb29tXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2VuZFJvb20oX3Jvb206IEludGVyZmFjZXMuSVJvb20pIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU0VORFJPT00sIHJvb206IF9yb29tIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3dpdGNoUm9vbVJlcXVlc3QoX2RpcmVjdGlvbjogSW50ZXJmYWNlcy5JUm9vbUV4aXRzKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgIT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnQuaWRIb3N0LCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNXSVRDSFJPT01SRVFVRVNULCBkaXJlY3Rpb246IF9kaXJlY3Rpb24gfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogZ2VuZXJhdGVzIGluZGl2aWR1YWwgSURzIG9uIEhvc3Qgd2l0aG91dCBkdXBsaWNhdGVzIHJldHVybnMgdGhlIGdpdmVuIE5ldElkXHJcbiAgICAgKiBAcGFyYW0gX25ldElkIGlmIHVuZGVmaW5lZCBnZW5lcmF0ZXMgYSBuZXcgTmV0SWQgLT4gb25seSB1bmRlZmluZWQgb24gSG9zdFxyXG4gICAgICogQHJldHVybnMgYSBuZXcgbmV0SWQgb3IgdGhlIG5ldElkIHByb3ZpZGVkIGJ5IHRoZSBob3N0XHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBJZE1hbmFnZXIoX25ldElkOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIGlmIChfbmV0SWQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRJRHMucHVzaChfbmV0SWQpO1xyXG4gICAgICAgICAgICByZXR1cm4gX25ldElkO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlTmV3SWQoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVOZXdJZCgpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBuZXdJZDogbnVtYmVyO1xyXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgIG5ld0lkID0gaWRHZW5lcmF0b3IoKTtcclxuICAgICAgICAgICAgaWYgKGN1cnJlbnRJRHMuZmluZChpZCA9PiBpZCA9PSBuZXdJZCkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBjdXJyZW50SURzLnB1c2gobmV3SWQpO1xyXG4gICAgICAgIHJldHVybiBuZXdJZDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpZEdlbmVyYXRvcigpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBpZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDApO1xyXG4gICAgICAgIHJldHVybiBpZDtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcG9wSUQoX2lkOiBudW1iZXIpIHtcclxuICAgICAgICBjdXJyZW50SURzID0gY3VycmVudElEcy5maWx0ZXIoZWxlbSA9PiBlbGVtICE9IF9pZClcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gaXNOZXR3b3JrT2JqZWN0KF9vYmplY3Q6IGFueSk6IF9vYmplY3QgaXMgSW50ZXJmYWNlcy5JTmV0d29ya2FibGUge1xyXG4gICAgICAgIHJldHVybiBcIm5ldElkXCIgaW4gX29iamVjdDtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0TmV0SWQoX29iamVjdDogR2FtZS7Gki5Ob2RlKTogbnVtYmVyIHtcclxuICAgICAgICBpZiAoaXNOZXR3b3JrT2JqZWN0KF9vYmplY3QpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBfb2JqZWN0Lm5ldElkO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXVubG9hZFwiLCBvblVubG9hZCwgZmFsc2UpO1xyXG5cclxuICAgIGZ1bmN0aW9uIG9uVW5sb2FkKCkge1xyXG4gICAgICAgIC8vVE9ETzogVGhpbmdzIHdlIGRvIGFmdGVyIHRoZSBwbGF5ZXIgbGVmdCB0aGUgZ2FtZVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFBsYXllciB7XHJcblxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFBsYXllciBleHRlbmRzIEVudGl0eS5FbnRpdHkge1xyXG4gICAgICAgIHB1YmxpYyB3ZWFwb246IFdlYXBvbnMuV2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKDI1LCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuU1RBTkRBUkQsIDEsIHRoaXMubmV0SWQsIFdlYXBvbnMuQUlNLk5PUk1BTCk7XHJcblxyXG4gICAgICAgIHB1YmxpYyBjbGllbnQ6IE5ldHdvcmtpbmcuQ2xpZW50UHJlZGljdGlvbjtcclxuICAgICAgICByZWFkb25seSBhYmlsaXR5Q291bnQ6IG51bWJlciA9IDE7XHJcbiAgICAgICAgY3VycmVudGFiaWxpdHlDb3VudDogbnVtYmVyID0gdGhpcy5hYmlsaXR5Q291bnQ7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfYXR0cmlidXRlczogRW50aXR5LkF0dHJpYnV0ZXMsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IF9hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuUExBWUVSO1xyXG4gICAgICAgICAgICB0aGlzLmNsaWVudCA9IG5ldyBOZXR3b3JraW5nLkNsaWVudFByZWRpY3Rpb24odGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChfZGlyZWN0aW9uLm1hZ25pdHVkZSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNldENvbGxpZGVyKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNjYWxlTW92ZVZlY3RvcihfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbi5hZGQoX2RpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGUodGhpcy5tb3ZlRGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbi5zdWJ0cmFjdChfZGlyZWN0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvcGVuRG9vcigpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IHdhbGxzOiBHZW5lcmF0aW9uLldhbGxbXSA9ICg8R2VuZXJhdGlvbi5XYWxsW10+R2FtZS5jdXJyZW50Um9vbS5nZXRDaGlsZHJlbigpKTtcclxuICAgICAgICAgICAgd2FsbHMuZm9yRWFjaCgod2FsbCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHdhbGwuZG9vciAhPSB1bmRlZmluZWQgJiYgd2FsbC5kb29yLmlzQWN0aXZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXNSZWN0KHdhbGwuZG9vci5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxHZW5lcmF0aW9uLkRvb3I+d2FsbC5kb29yKS5jaGFuZ2VSb29tKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBzY2FsZU1vdmVWZWN0b3IoX2RpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgJiYgdGhpcyA9PSBHYW1lLmF2YXRhcjEpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUoKEdhbWUuZGVsdGFUaW1lICogdGhpcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKCh0aGlzLmNsaWVudC5taW5UaW1lQmV0d2VlblRpY2tzICogdGhpcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBwcmVkaWN0KCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsaWVudC51cGRhdGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZShJbnB1dFN5c3RlbS5tb3ZlKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY29sbGlkZShfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY29sbGlkZShfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0SXRlbUNvbGxpc2lvbigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgZW5lbWllczogRW5lbXkuRW5lbXlbXSA9IEdhbWUuZW5lbWllcztcclxuICAgICAgICAgICAgbGV0IGVuZW1pZXNDb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICBlbmVtaWVzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBlbmVtaWVzQ29sbGlkZXIucHVzaChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETzogdW5jb21tZW50XHJcbiAgICAgICAgICAgIC8vIHRoaXMuY2FsY3VsYXRlQ29sbGlkZXIoZW5lbWllc0NvbGxpZGVyLCBfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNhbk1vdmVYICYmIHRoaXMuY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNhbk1vdmVYICYmICF0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoX2RpcmVjdGlvbi54LCAwLCBfZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuY2FuTW92ZVggJiYgdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIF9kaXJlY3Rpb24ueSwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRJdGVtQ29sbGlzaW9uKCkge1xyXG4gICAgICAgICAgICBsZXQgaXRlbUNvbGxpZGVyOiBJdGVtcy5JdGVtW10gPSBHYW1lLml0ZW1zO1xyXG4gICAgICAgICAgICBpdGVtQ29sbGlkZXIuZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGl0ZW0uY29sbGlkZXIpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgSXRlbXMuSW50ZXJuYWxJdGVtICYmICg8SXRlbXMuSW50ZXJuYWxJdGVtPml0ZW0pLmNob29zZW5PbmVOZXRJZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCg8SXRlbXMuSW50ZXJuYWxJdGVtPml0ZW0pLmNob29zZW5PbmVOZXRJZCAhPSB0aGlzLm5ldElkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmN1cnJlbnRSb29tLnJvb21UeXBlID09IEdlbmVyYXRpb24uUk9PTVRZUEUuVFJFQVNVUkUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxHZW5lcmF0aW9uLlRyZWFzdXJlUm9vbT5HYW1lLmN1cnJlbnRSb29tKS5vbkl0ZW1Db2xsZWN0KGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKEdhbWUuY3VycmVudFJvb20ucm9vbVR5cGUgPT0gR2VuZXJhdGlvbi5ST09NVFlQRS5NRVJDSEFOVCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISg8R2VuZXJhdGlvbi5NZXJjaGFudFJvb20+R2FtZS5jdXJyZW50Um9vbSkub25JdGVtQ29sbGVjdChpdGVtLCB0aGlzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeSh0cnVlLCBpdGVtLmlkLCBpdGVtLm5ldElkLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLmFkZEl0ZW1Ub0VudGl0eSh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBJdGVtcy5JbnRlcm5hbEl0ZW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coaXRlbS5uYW1lICsgXCI6IFwiICsgaXRlbS5kZXNjcmlwdGlvbiArIFwiIHNtdGggY2hhbmdlZCB0bzogXCIgKyAoPEl0ZW1zLkludGVybmFsSXRlbT5pdGVtKS52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgSXRlbXMuQnVmZkl0ZW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coaXRlbS5uYW1lICsgXCI6IFwiICsgaXRlbS5kZXNjcmlwdGlvbiArIFwiIHNtdGggY2hhbmdlZCB0bzogXCIgKyBCdWZmLkJVRkZJRFsoPEl0ZW1zLkJ1ZmZJdGVtPml0ZW0pLmJ1ZmZbMF0uaWRdLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgYXR0YWNrKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9uZXRJZD86IG51bWJlciwgX3N5bmM/OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIHRoaXMud2VhcG9uLnNob290KHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIF9kaXJlY3Rpb24sIF9uZXRJZCwgX3N5bmMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRvS25vY2tiYWNrKF9ib2R5OiBFbnRpdHkuRW50aXR5KTogdm9pZCB7XHJcbiAgICAgICAgICAgIC8vICg8RW5lbXkuRW5lbXk+X2JvZHkpLmdldEtub2NrYmFjayh0aGlzLmtub2NrYmFja0ZvcmNlLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZSwgX3Bvc2l0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkb0FiaWxpdHkoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgTWVsZWUgZXh0ZW5kcyBQbGF5ZXIge1xyXG4gICAgICAgIHB1YmxpYyBibG9jazogQWJpbGl0eS5CbG9jayA9IG5ldyBBYmlsaXR5LkJsb2NrKHRoaXMubmV0SWQsIDYwMCwgMSwgNSAqIDYwKTtcclxuICAgICAgICByZWFkb25seSBhYmlsaXR5Q29vbGRvd25UaW1lOiBudW1iZXIgPSA0MDtcclxuICAgICAgICBjdXJyZW50YWJpbGl0eUNvb2xkb3duVGltZTogbnVtYmVyID0gdGhpcy5hYmlsaXR5Q29vbGRvd25UaW1lO1xyXG5cclxuICAgICAgICBwdWJsaWMgd2VhcG9uOiBXZWFwb25zLldlYXBvbiA9IG5ldyBXZWFwb25zLldlYXBvbigxMiwgMSwgQnVsbGV0cy5CVUxMRVRUWVBFLk1FTEVFLCAxLCB0aGlzLm5ldElkLCBXZWFwb25zLkFJTS5OT1JNQUwpO1xyXG5cclxuXHJcbiAgICAgICAgcHVibGljIGF0dGFjayhfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ/OiBudW1iZXIsIF9zeW5jPzogYm9vbGVhbikge1xyXG4gICAgICAgICAgICB0aGlzLndlYXBvbi5zaG9vdCh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBfZGlyZWN0aW9uLCBfbmV0SWQsIF9zeW5jKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vQmxvY2tcclxuICAgICAgICBwdWJsaWMgZG9BYmlsaXR5KCkge1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgUmFuZ2VkIGV4dGVuZHMgUGxheWVyIHtcclxuXHJcbiAgICAgICAgcHVibGljIGRhc2g6IEFiaWxpdHkuRGFzaCA9IG5ldyBBYmlsaXR5LkRhc2godGhpcy5uZXRJZCwgOCwgMSwgNjAsIDUpO1xyXG4gICAgICAgIHBlcmZvcm1BYmlsaXR5OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGFzdE1vdmVEaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMztcclxuXHJcbiAgICAgICAgcHVibGljIG1vdmUoX2RpcmVjdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5kYXNoLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICBzdXBlci5tb3ZlKHRoaXMubGFzdE1vdmVEaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3VwZXIubW92ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RNb3ZlRGlyZWN0aW9uID0gX2RpcmVjdGlvbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9EYXNoXHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpIHtcclxuICAgICAgICAgICAgdGhpcy5kYXNoLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBHZW5lcmF0aW9uIHtcclxuICAgIGV4cG9ydCBlbnVtIFJPT01UWVBFIHtcclxuICAgICAgICBTVEFSVCxcclxuICAgICAgICBOT1JNQUwsXHJcbiAgICAgICAgTUVSQ0hBTlQsXHJcbiAgICAgICAgVFJFQVNVUkUsXHJcbiAgICAgICAgQ0hBTExFTkdFLFxyXG4gICAgICAgIEJPU1NcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlDb3VudE1hbmFnZXIge1xyXG4gICAgICAgIHByaXZhdGUgbWF4RW5lbXlDb3VudDogbnVtYmVyOyBnZXQgZ2V0TWF4RW5lbXlDb3VudCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5tYXhFbmVteUNvdW50IH07XHJcbiAgICAgICAgcHJpdmF0ZSBjdXJyZW50RW5lbXlDb291bnQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgZmluaXNoZWQ6IGJvb2xlYW47XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2VuZW15Q291bnQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLm1heEVuZW15Q291bnQgPSBfZW5lbXlDb3VudDtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50RW5lbXlDb291bnQgPSBfZW5lbXlDb3VudDtcclxuICAgICAgICAgICAgdGhpcy5maW5pc2hlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAoX2VuZW15Q291bnQgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5maW5pc2hlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkVuZW15RGVhdGgoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEVuZW15Q29vdW50LS07XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRFbmVteUNvb3VudCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZpbmlzaGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBsZXQgdHh0U3RhcnRSb29tOiBHYW1lLsaSLlRleHR1cmVJbWFnZSA9IG5ldyBHYW1lLsaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBSb29tIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRztcclxuICAgICAgICBwdWJsaWMgcm9vbVR5cGU6IFJPT01UWVBFO1xyXG4gICAgICAgIHB1YmxpYyBjb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHB1YmxpYyB3YWxsczogV2FsbFtdID0gW107XHJcbiAgICAgICAgcHVibGljIG9ic3RpY2FsczogT2JzaXRjYWxbXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBlbmVteUNvdW50TWFuYWdlcjogRW5lbXlDb3VudE1hbmFnZXI7XHJcbiAgICAgICAgcHVibGljIHBvc2l0aW9uVXBkYXRlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIHJvb21TaXplOiBudW1iZXIgPSAzMDtcclxuICAgICAgICBleGl0czogSW50ZXJmYWNlcy5JUm9vbUV4aXRzOyAvLyBOIEUgUyBXXHJcbiAgICAgICAgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQ7XHJcbiAgICAgICAgY21wTWVzaDogxpIuQ29tcG9uZW50TWVzaCA9IG5ldyDGki5Db21wb25lbnRNZXNoKHRoaXMubWVzaCk7XHJcbiAgICAgICAgcHJvdGVjdGVkIGF2YXRhclNwYXduUG9pbnROOiBHYW1lLsaSLlZlY3RvcjI7IGdldCBnZXRTcGF3blBvaW50TigpOiBHYW1lLsaSLlZlY3RvcjIgeyByZXR1cm4gdGhpcy5hdmF0YXJTcGF3blBvaW50TiB9O1xyXG4gICAgICAgIHByb3RlY3RlZCBhdmF0YXJTcGF3blBvaW50RTogR2FtZS7Gki5WZWN0b3IyOyBnZXQgZ2V0U3Bhd25Qb2ludEUoKTogR2FtZS7Gki5WZWN0b3IyIHsgcmV0dXJuIHRoaXMuYXZhdGFyU3Bhd25Qb2ludEUgfTtcclxuICAgICAgICBwcm90ZWN0ZWQgYXZhdGFyU3Bhd25Qb2ludFM6IEdhbWUuxpIuVmVjdG9yMjsgZ2V0IGdldFNwYXduUG9pbnRTKCk6IEdhbWUuxpIuVmVjdG9yMiB7IHJldHVybiB0aGlzLmF2YXRhclNwYXduUG9pbnRTIH07XHJcbiAgICAgICAgcHJvdGVjdGVkIGF2YXRhclNwYXduUG9pbnRXOiBHYW1lLsaSLlZlY3RvcjI7IGdldCBnZXRTcGF3blBvaW50VygpOiBHYW1lLsaSLlZlY3RvcjIgeyByZXR1cm4gdGhpcy5hdmF0YXJTcGF3blBvaW50VyB9O1xyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKCk7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29yZGlhbnRlczogR2FtZS7Gki5WZWN0b3IyLCBfcm9vbVNpemU6IG51bWJlciwgX3Jvb21UeXBlOiBST09NVFlQRSkge1xyXG4gICAgICAgICAgICBzdXBlcihcInJvb21cIik7XHJcbiAgICAgICAgICAgIHRoaXMudGFnID0gVGFnLlRBRy5ST09NO1xyXG4gICAgICAgICAgICB0aGlzLmNvb3JkaW5hdGVzID0gX2Nvb3JkaWFudGVzO1xyXG4gICAgICAgICAgICB0aGlzLmVuZW15Q291bnRNYW5hZ2VyID0gbmV3IEVuZW15Q291bnRNYW5hZ2VyKDApO1xyXG4gICAgICAgICAgICBpZiAoX3Jvb21TaXplICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yb29tU2l6ZSA9IF9yb29tU2l6ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX3Jvb21UeXBlICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yb29tVHlwZSA9IF9yb29tVHlwZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmV4aXRzID0gPEludGVyZmFjZXMuSVJvb21FeGl0cz57IG5vcnRoOiBmYWxzZSwgZWFzdDogZmFsc2UsIHNvdXRoOiBmYWxzZSwgd2VzdDogZmFsc2UgfVxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IMaSLlZlY3RvcjModGhpcy5yb29tU2l6ZSwgdGhpcy5yb29tU2l6ZSwgMSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KHRoaXMuY21wTWVzaCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KHRoaXMuY21wTWF0ZXJpYWwpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIDAsIC0wLjAxKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkV2FsbHMoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuUkVOREVSX1BSRVBBUkUsIHRoaXMuZXZlbnRVcGRhdGUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgb25BZGRUb0dyYXBoKCkge1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpOiB2b2lkIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGFkZFdhbGxzKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmFkZENoaWxkKChuZXcgV2FsbChuZXcgxpIuVmVjdG9yMigwLjUsIDApLCBuZXcgxpIuVmVjdG9yMigxIC8gdGhpcy5yb29tU2l6ZSwgMSArIDEgLyB0aGlzLnJvb21TaXplKSwgdGhpcykpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDaGlsZCgobmV3IFdhbGwobmV3IMaSLlZlY3RvcjIoMCwgMC41KSwgbmV3IMaSLlZlY3RvcjIoMSwgMSAvIHRoaXMucm9vbVNpemUpLCB0aGlzKSkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENoaWxkKChuZXcgV2FsbChuZXcgxpIuVmVjdG9yMigtMC41LCAwKSwgbmV3IMaSLlZlY3RvcjIoMSAvIHRoaXMucm9vbVNpemUsIDEgKyAxIC8gdGhpcy5yb29tU2l6ZSksIHRoaXMpKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQoKG5ldyBXYWxsKG5ldyDGki5WZWN0b3IyKDAsIC0wLjUpLCBuZXcgxpIuVmVjdG9yMigxLCAxIC8gdGhpcy5yb29tU2l6ZSksIHRoaXMpKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW0gPT4gKDxXYWxsPmVsZW0pLnRhZyA9PSBUYWcuVEFHLldBTEwpLmZvckVhY2god2FsbCA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndhbGxzLnB1c2goKDxXYWxsPndhbGwpKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRTcGF3blBvaW50cygpIHtcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXJTcGF3blBvaW50RSA9IG5ldyDGki5WZWN0b3IyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueCArICgodGhpcy5yb29tU2l6ZSAvIDIpIC0gMiksIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueSk7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyU3Bhd25Qb2ludFcgPSBuZXcgxpIuVmVjdG9yMih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnggLSAoKHRoaXMucm9vbVNpemUgLyAyKSAtIDIpLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpO1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhclNwYXduUG9pbnROID0gbmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKyAoKHRoaXMucm9vbVNpemUgLyAyKSAtIDIpKTtcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXJTcGF3blBvaW50UyA9IG5ldyDGki5WZWN0b3IyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi55IC0gKCh0aGlzLnJvb21TaXplIC8gMikgLSAyKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0Um9vbVNpemUoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucm9vbVNpemU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0Um9vbUV4aXQoX25laWdoYm91cjogUm9vbSkge1xyXG4gICAgICAgICAgICBsZXQgZGlmID0gR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UoX25laWdoYm91ci5jb29yZGluYXRlcywgdGhpcy5jb29yZGluYXRlcylcclxuICAgICAgICAgICAgaWYgKGRpZi5lcXVhbHMoY29tcGFyZU5vcnRoKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGl0cy5ub3J0aCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGRpZi5lcXVhbHMoY29tcGFyZUVhc3QpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRzLmVhc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChkaWYuZXF1YWxzKGNvbXBhcmVTb3V0aCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdHMuc291dGggPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChkaWYuZXF1YWxzKGNvbXBhcmVXZXN0KSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGl0cy53ZXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9wZW5Eb29ycygpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHMubm9ydGgpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMud2FsbHMuZmluZCh3YWxsID0+IHdhbGwuZG9vci5kaXJlY3Rpb24ubm9ydGggPT0gdHJ1ZSkuZG9vci5vcGVuRG9vcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4aXRzLmVhc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMud2FsbHMuZmluZCh3YWxsID0+IHdhbGwuZG9vci5kaXJlY3Rpb24uZWFzdCA9PSB0cnVlKS5kb29yLm9wZW5Eb29yKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHMuc291dGgpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMud2FsbHMuZmluZCh3YWxsID0+IHdhbGwuZG9vci5kaXJlY3Rpb24uc291dGggPT0gdHJ1ZSkuZG9vci5vcGVuRG9vcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4aXRzLndlc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMud2FsbHMuZmluZCh3YWxsID0+IHdhbGwuZG9vci5kaXJlY3Rpb24ud2VzdCA9PSB0cnVlKS5kb29yLm9wZW5Eb29yKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTdGFydFJvb20gZXh0ZW5kcyBSb29tIHtcclxuICAgICAgICBwcml2YXRlIHN0YXJ0Um9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJzdGFydFJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiksIHR4dFN0YXJ0Um9vbSkpO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyLCBfcm9vbVNpemU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfY29vcmRpbmF0ZXMsIF9yb29tU2l6ZSwgUk9PTVRZUEUuU1RBUlQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRNYXRlcmlhbCkubWF0ZXJpYWwgPSB0aGlzLnN0YXJ0Um9vbU1hdDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIE5vcm1hbFJvb20gZXh0ZW5kcyBSb29tIHtcclxuICAgICAgICBub3JtYWxSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm5vcm1hbFJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIikpKTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb21TaXplOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2Nvb3JkaW5hdGVzLCBfcm9vbVNpemUsIFJPT01UWVBFLk5PUk1BTCk7XHJcbiAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudE1hbmFnZXIgPSBuZXcgRW5lbXlDb3VudE1hbmFnZXIoNSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudE1hdGVyaWFsKS5tYXRlcmlhbCA9IHRoaXMubm9ybWFsUm9vbU1hdDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEJvc3NSb29tIGV4dGVuZHMgUm9vbSB7XHJcbiAgICAgICAgYm9zc1Jvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiYm9zc1Jvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiYmxhY2tcIikpKTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb21TaXplOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2Nvb3JkaW5hdGVzLCBfcm9vbVNpemUsIFJPT01UWVBFLkJPU1MpO1xyXG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudE1hdGVyaWFsKS5tYXRlcmlhbCA9IHRoaXMuYm9zc1Jvb21NYXQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBUcmVhc3VyZVJvb20gZXh0ZW5kcyBSb29tIHtcclxuICAgICAgICBwcml2YXRlIHRyZWFzdXJlUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJ0cmVhc3VyZVJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwieWVsbG93XCIpKSk7XHJcbiAgICAgICAgcHJpdmF0ZSBzcGF3bkNoYW5jZTogbnVtYmVyID0gMjU7IGdldCBnZXRTcGF3bkNoYW5jZSgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5zcGF3bkNoYW5jZSB9O1xyXG4gICAgICAgIHByaXZhdGUgdHJlYXN1cmVDb3VudDogbnVtYmVyID0gMjtcclxuICAgICAgICBwcml2YXRlIHRyZWFzdXJlczogSXRlbXMuSXRlbVtdID0gW107XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tU2l6ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9jb29yZGluYXRlcywgX3Jvb21TaXplLCBST09NVFlQRS5UUkVBU1VSRSk7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50TWF0ZXJpYWwpLm1hdGVyaWFsID0gdGhpcy50cmVhc3VyZVJvb21NYXQ7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlVHJlYXN1cmVzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgY3JlYXRlVHJlYXN1cmVzKCkge1xyXG4gICAgICAgICAgICBsZXQgdHJlYXN1cmVzOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRyZWFzdXJlQ291bnQ7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdHJlYXN1cmVzLnB1c2goSXRlbXMuSXRlbUdlbmVyYXRvci5nZXRSYW5kb21JdGVtKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMudHJlYXN1cmVzID0gdHJlYXN1cmVzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uQWRkVG9HcmFwaCgpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IGk6IG51bWJlciA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMudHJlYXN1cmVzLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLnNldFBvc2l0aW9uKG5ldyDGki5WZWN0b3IyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueCArIGksIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueSkpXHJcbiAgICAgICAgICAgICAgICBpdGVtLnNwYXduKCk7XHJcbiAgICAgICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb25JdGVtQ29sbGVjdChfaXRlbTogSXRlbXMuSXRlbSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy50cmVhc3VyZXMuZmluZChpdGVtID0+IGl0ZW0gPT0gX2l0ZW0pICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50cmVhc3VyZXMuc3BsaWNlKHRoaXMudHJlYXN1cmVzLmluZGV4T2YoX2l0ZW0pLCAxKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIE1lcmNoYW50Um9vbSBleHRlbmRzIFJvb20ge1xyXG4gICAgICAgIHByaXZhdGUgbWVyY2hhbnRSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm1lcmNoYW50Um9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJncmVlblwiKSkpO1xyXG4gICAgICAgIHByaXZhdGUgbWVyY2hhbnQ6IEVudGl0eS5NZXJjaGFudCA9IG5ldyBFbnRpdHkuTWVyY2hhbnQoRW50aXR5LklELk1FUkNIQU5UKTtcclxuICAgICAgICBwcml2YXRlIGl0ZW1zOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuICAgICAgICBwcml2YXRlIGl0ZW1zU3Bhd25Qb2ludHM6IMaSLlZlY3RvcjJbXSA9IFtdO1xyXG4gICAgICAgIHByaXZhdGUgaXRlbUNvdW50OiBudW1iZXIgPSA1O1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyLCBfcm9vbVNpemU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfY29vcmRpbmF0ZXMsIF9yb29tU2l6ZSwgUk9PTVRZUEUuTUVSQ0hBTlQpO1xyXG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudE1hdGVyaWFsKS5tYXRlcmlhbCA9IHRoaXMubWVyY2hhbnRSb29tTWF0O1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tZXJjaGFudC5tdHhMb2NhbC50cmFuc2xhdGVaKDAuMDEpO1xyXG4gICAgICAgICAgICB0aGlzLm1lcmNoYW50Lm10eExvY2FsLnRyYW5zbGF0ZVkoNSAvIHRoaXMucm9vbVNpemUpO1xyXG4gICAgICAgICAgICB0aGlzLm1lcmNoYW50Lm10eExvY2FsLnNjYWxlKEdhbWUuxpIuVmVjdG9yMy5PTkUoMSAvIHRoaXMucm9vbVNpemUpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLm1lcmNoYW50KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlU2hvcCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGNyZWF0ZVNob3AoKSB7XHJcbiAgICAgICAgICAgIGxldCBpdGVtczogSXRlbXMuSXRlbVtdID0gW107XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5pdGVtQ291bnQ7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaChJdGVtcy5JdGVtR2VuZXJhdG9yLmdldFJhbmRvbUl0ZW0oKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5pdGVtcyA9IGl0ZW1zO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uQWRkVG9HcmFwaCgpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5jcmVhdGVTcGF3blBvaW50cygpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGkgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5nZXRQb3NpdGlvbiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pdGVtc1NwYXduUG9pbnRzLmZpbmQocG9zID0+IHBvcy5lcXVhbHMoaXRlbS5nZXRQb3NpdGlvbikpID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnNldFBvc2l0aW9uKHRoaXMuaXRlbXNTcGF3blBvaW50c1tpXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLnNldFBvc2l0aW9uKHRoaXMuaXRlbXNTcGF3blBvaW50c1tpXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpdGVtLnNwYXduKCk7XHJcbiAgICAgICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGNyZWF0ZVNwYXduUG9pbnRzKCkge1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zU3Bhd25Qb2ludHMgPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGxldCBtaWRkbGUgPSB0aGlzLm10eFdvcmxkLmNsb25lLnRyYW5zbGF0aW9uO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5pdGVtc1NwYXduUG9pbnRzLnB1c2gobmV3IMaSLlZlY3RvcjIobWlkZGxlLngsIG1pZGRsZS55ICsgMykpO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zU3Bhd25Qb2ludHMucHVzaChuZXcgxpIuVmVjdG9yMihtaWRkbGUueCArIDMsIG1pZGRsZS55ICsgMykpO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zU3Bhd25Qb2ludHMucHVzaChuZXcgxpIuVmVjdG9yMihtaWRkbGUueCAtIDMsIG1pZGRsZS55ICsgMykpO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zU3Bhd25Qb2ludHMucHVzaChuZXcgxpIuVmVjdG9yMihtaWRkbGUueCArIDIsIG1pZGRsZS55ICsgMSkpO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zU3Bhd25Qb2ludHMucHVzaChuZXcgxpIuVmVjdG9yMihtaWRkbGUueCAtIDIsIG1pZGRsZS55ICsgMSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uSXRlbUNvbGxlY3QoX2l0ZW06IEl0ZW1zLkl0ZW0sIF9hdmF0YXI6IFBsYXllci5QbGF5ZXIpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXRlbXMuZmluZChpdGVtID0+IGl0ZW0gPT0gX2l0ZW0pICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2hvcGluZyhfaXRlbSwgX2F2YXRhcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzaG9waW5nKF9pdGVtOiBJdGVtcy5JdGVtLCBfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGxldCBzYW1lUmFyaXR5OiBJdGVtcy5JdGVtW10gPSBfYXZhdGFyLml0ZW1zLmZpbHRlcihpdGVtID0+IGl0ZW0ucmFyaXR5ID09IF9pdGVtLnJhcml0eSk7XHJcbiAgICAgICAgICAgIGxldCBsb3dlclJhcml0eTogSXRlbXMuSXRlbVtdID0gW107XHJcblxyXG4gICAgICAgICAgICBpZiAoX2l0ZW0ucmFyaXR5ICE9IEl0ZW1zLlJBUklUWS5DT01NT04pIHtcclxuICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5ID0gX2F2YXRhci5pdGVtcy5maWx0ZXIoaXRlbSA9PiBpdGVtLnJhcml0eSA9PSAoX2l0ZW0ucmFyaXR5IC0gMSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoc2FtZVJhcml0eS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5kZXg6IG51bWJlciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChzYW1lUmFyaXR5Lmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgICAgIHNhbWVSYXJpdHlbaW5kZXhdLnJlbW92ZUl0ZW1Ub0VudGl0eShfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXRlbXMuc3BsaWNlKHRoaXMuaXRlbXMuaW5kZXhPZihfaXRlbSksIDEpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVJbnZlbnRvcnkoZmFsc2UsIHNhbWVSYXJpdHlbaW5kZXhdLmlkLCBzYW1lUmFyaXR5W2luZGV4XS5uZXRJZCwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobG93ZXJSYXJpdHkubGVuZ3RoID49IDMpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW5kZXgxOiBudW1iZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAobG93ZXJSYXJpdHkubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5W2luZGV4MV0ucmVtb3ZlSXRlbVRvRW50aXR5KF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5LnNwbGljZShsb3dlclJhcml0eS5pbmRleE9mKGxvd2VyUmFyaXR5W2luZGV4MV0pLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eS5zbGljZShpbmRleDEsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5LnNwbGljZShpbmRleDEsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlSW52ZW50b3J5KGZhbHNlLCBsb3dlclJhcml0eVtpbmRleDFdLmlkLCBsb3dlclJhcml0eVtpbmRleDFdLm5ldElkLCBfYXZhdGFyLm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZGV4MjogbnVtYmVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKGxvd2VyUmFyaXR5Lmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eVtpbmRleDJdLnJlbW92ZUl0ZW1Ub0VudGl0eShfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eS5zcGxpY2UobG93ZXJSYXJpdHkuaW5kZXhPZihsb3dlclJhcml0eVtpbmRleDJdKSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkuc2xpY2UoaW5kZXgyLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eS5zcGxpY2UoaW5kZXgyLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeShmYWxzZSwgbG93ZXJSYXJpdHlbaW5kZXgyXS5pZCwgbG93ZXJSYXJpdHlbaW5kZXgyXS5uZXRJZCwgX2F2YXRhci5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbmRleDM6IG51bWJlciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChsb3dlclJhcml0eS5sZW5ndGggLSAxKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHlbaW5kZXgzXS5yZW1vdmVJdGVtVG9FbnRpdHkoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkuc3BsaWNlKGxvd2VyUmFyaXR5LmluZGV4T2YobG93ZXJSYXJpdHlbaW5kZXgzXSksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5LnNsaWNlKGluZGV4MywgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkuc3BsaWNlKGluZGV4MywgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVJbnZlbnRvcnkoZmFsc2UsIGxvd2VyUmFyaXR5W2luZGV4M10uaWQsIGxvd2VyUmFyaXR5W2luZGV4M10ubmV0SWQsIF9hdmF0YXIubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLml0ZW1zLnNwbGljZSh0aGlzLml0ZW1zLmluZGV4T2YoX2l0ZW0pLCAxKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBlbnVtIENIQUxMRU5HRSB7XHJcbiAgICAgICAgVEhPUlNIQU1NRVJcclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBDaGFsbGVuZ2VSb29tIGV4dGVuZHMgUm9vbSB7XHJcbiAgICAgICAgY2hhbGxlbmdlOiBDSEFMTEVOR0U7XHJcbiAgICAgICAgY2hhbGxlbmdlUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJjaGFsbGVuZ2VSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImJsdWVcIikpKTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tU2l6ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9jb29yZGluYXRlcywgX3Jvb21TaXplLCBST09NVFlQRS5DSEFMTEVOR0UpO1xyXG4gICAgICAgICAgICB0aGlzLmVuZW15Q291bnRNYW5hZ2VyID0gbmV3IEVuZW15Q291bnRNYW5hZ2VyKDEwKTtcclxuICAgICAgICAgICAgdGhpcy5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRNYXRlcmlhbCkubWF0ZXJpYWwgPSB0aGlzLmNoYWxsZW5nZVJvb21NYXQ7XHJcbiAgICAgICAgICAgIHRoaXMuY2hhbGxlbmdlID0gdGhpcy5yYW5kb21DaGFsbGVuZ2UoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCByYW5kb21DaGFsbGVuZ2UoKTogQ0hBTExFTkdFIHtcclxuICAgICAgICAgICAgbGV0IGluZGV4OiBudW1iZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAoT2JqZWN0LmtleXMoQ0hBTExFTkdFKS5sZW5ndGggLyAyIC0gMSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gKDxhbnk+Q0hBTExFTkdFKVtDSEFMTEVOR0VbaW5kZXhdXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmVuZW15Q291bnRNYW5hZ2VyLmZpbmlzaGVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0aGlzLmNoYWxsZW5nZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIENIQUxMRU5HRS5USE9SU0hBTU1FUjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RvcFRob3JzSGFtbWVyQ2hhbGxlbmdlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkFkZFRvR3JhcGgoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jaGFsbGVuZ2UpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgQ0hBTExFTkdFLlRIT1JTSEFNTUVSOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhcnRUaG9yc0hhbW1lckNoYWxsZW5nZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBzdGFydFRob3JzSGFtbWVyQ2hhbGxlbmdlKCkge1xyXG4gICAgICAgICAgICAvL1RPRE86IGFjdGl2YXRlXHJcbiAgICAgICAgICAgIC8vIGlmICh0aGlzLmVuZW15Q291bnRNYW5hZ2VyLmZpbmlzaGVkKSB7XHJcbiAgICAgICAgICAgIC8vICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgICAgIEdhbWUuYXZhdGFyMS53ZWFwb24uY2FuU2hvb3QgPSBmYWxzZTtcclxuICAgICAgICAgICAgR2FtZS5hdmF0YXIyLndlYXBvbi5jYW5TaG9vdCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgbGV0IHRob3JzaGFtbWVyOiBJdGVtcy5JbnRlcm5hbEl0ZW0gPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKEl0ZW1zLklURU1JRC5USE9SU0hBTU1FUik7XHJcbiAgICAgICAgICAgIGxldCBjaG9vc2VuT25lOiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgICAgICAgICBpZiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKSA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNob29zZW5PbmUgPSBHYW1lLmF2YXRhcjE7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjaG9vc2VuT25lID0gR2FtZS5hdmF0YXIyO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aG9yc2hhbW1lci5hZGRJdGVtVG9FbnRpdHkoY2hvb3Nlbk9uZSk7XHJcbiAgICAgICAgICAgIGNob29zZW5PbmUuaXRlbXMucHVzaCh0aG9yc2hhbW1lcik7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlSW52ZW50b3J5KHRydWUsIHRob3JzaGFtbWVyLmlkLCB0aG9yc2hhbW1lci5uZXRJZCwgY2hvb3Nlbk9uZS5uZXRJZCk7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKEdhbWUuYXZhdGFyMS53ZWFwb24sIEdhbWUuYXZhdGFyMS5uZXRJZCk7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKEdhbWUuYXZhdGFyMi53ZWFwb24sIEdhbWUuYXZhdGFyMi5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgc3RvcFRob3JzSGFtbWVyQ2hhbGxlbmdlKCkge1xyXG4gICAgICAgICAgICBsZXQgYXZhdGFyMUludiA9IEdhbWUuYXZhdGFyMS5pdGVtcy5maW5kKGl0ZW0gPT4gaXRlbS5pZCA9PSBJdGVtcy5JVEVNSUQuVEhPUlNIQU1NRVIpO1xyXG4gICAgICAgICAgICBsZXQgYXZhdGFyMkludiA9IEdhbWUuYXZhdGFyMi5pdGVtcy5maW5kKGl0ZW0gPT4gaXRlbS5pZCA9PSBJdGVtcy5JVEVNSUQuVEhPUlNIQU1NRVIpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGF2YXRhcjFJbnYgIT0gdW5kZWZpbmVkIHx8IGF2YXRhcjJJbnYgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYXZhdGFyMUludiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEuaXRlbXMuc3BsaWNlKEdhbWUuYXZhdGFyMS5pdGVtcy5pbmRleE9mKGF2YXRhcjFJbnYpLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeShmYWxzZSwgYXZhdGFyMUludi5pZCwgYXZhdGFyMUludi5uZXRJZCwgR2FtZS5hdmF0YXIxLm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIxLndlYXBvbi5nZXRDb29sRG93bi5zZXRNYXhDb29sRG93biA9ICtsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImNvb2xkb3duVGltZVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEud2VhcG9uLmFpbVR5cGUgPSAoPGFueT5XZWFwb25zLkFJTSlbbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJhaW1UeXBlXCIpXTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEud2VhcG9uLmJ1bGxldFR5cGUgPSAoPGFueT5CdWxsZXRzLkJVTExFVFRZUEUpW2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwiYnVsbGV0VHlwZVwiKV07XHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIxLndlYXBvbi5wcm9qZWN0aWxlQW1vdW50ID0gK2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwicHJvamVjdGlsZUFtb3VudFwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYXZhdGFyMkludiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIuaXRlbXMuc3BsaWNlKEdhbWUuYXZhdGFyMi5pdGVtcy5pbmRleE9mKGF2YXRhcjJJbnYpLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeShmYWxzZSwgYXZhdGFyMkludi5pZCwgYXZhdGFyMkludi5uZXRJZCwgR2FtZS5hdmF0YXIyLm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLndlYXBvbi5nZXRDb29sRG93bi5zZXRNYXhDb29sRG93biA9ICtsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImNvb2xkb3duVGltZVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIud2VhcG9uLmFpbVR5cGUgPSAoPGFueT5XZWFwb25zLkFJTSlbbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJhaW1UeXBlXCIpXTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIud2VhcG9uLmJ1bGxldFR5cGUgPSAoPGFueT5CdWxsZXRzLkJVTExFVFRZUEUpW2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwiYnVsbGV0VHlwZVwiKV07XHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLndlYXBvbi5wcm9qZWN0aWxlQW1vdW50ID0gK2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwicHJvamVjdGlsZUFtb3VudFwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIxLndlYXBvbi5jYW5TaG9vdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIud2VhcG9uLmNhblNob290ID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhcldlYXBvbihHYW1lLmF2YXRhcjEud2VhcG9uLCBHYW1lLmF2YXRhcjEubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJXZWFwb24oR2FtZS5hdmF0YXIyLndlYXBvbiwgR2FtZS5hdmF0YXIyLm5ldElkKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IHJvb21JbnYgPSBHYW1lLml0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IEl0ZW1zLklURU1JRC5USE9SU0hBTU1FUik7XHJcblxyXG4gICAgICAgICAgICBpZiAocm9vbUludiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHJvb21JbnYuZGVzcGF3bigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgV2FsbCBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLldBTEw7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBHYW1lLsaSLlJlY3RhbmdsZTtcclxuICAgICAgICBwdWJsaWMgZG9vcjogRG9vcjtcclxuICAgICAgICBwcml2YXRlIG5vcm1hbDogR2FtZS7Gki5WZWN0b3IzOyBnZXQgZ2V0Tm9ybWFsKCk6IEdhbWUuxpIuVmVjdG9yMyB7IHJldHVybiB0aGlzLm5vcm1hbCB9O1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfcG9zOiBHYW1lLsaSLlZlY3RvcjIsIF9zY2FsaW5nOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tOiBSb29tKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiV2FsbFwiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyDGki5NZXNoUXVhZCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobmV3IMaSLk1hdGVyaWFsKFwicmVkXCIsIMaSLlNoYWRlckxpdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwicmVkXCIpKSkpKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBuZXdQb3MgPSBfcG9zLnRvVmVjdG9yMygwLjAxKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ld1BvcztcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5zY2FsaW5nID0gX3NjYWxpbmcudG9WZWN0b3IzKDEpO1xyXG5cclxuXHJcbiAgICAgICAgICAgIGlmIChfcG9zLnggIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKF9wb3MueCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZERvb3IoX3BvcywgX3NjYWxpbmcpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9ybWFsID0gbmV3IMaSLlZlY3RvcjMoLTEsIDAsIDApO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfcG9zLnggPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGREb29yKF9wb3MsIF9zY2FsaW5nKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vcm1hbCA9IG5ldyDGki5WZWN0b3IzKDEsIDAsIDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKF9wb3MueSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZERvb3IoX3BvcywgX3NjYWxpbmcpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9ybWFsID0gbmV3IMaSLlZlY3RvcjMoMCwgLTEsIDApO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfcG9zLnkgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGREb29yKF9wb3MsIF9zY2FsaW5nKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vcm1hbCA9IG5ldyDGki5WZWN0b3IzKDAsIDEsIDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgYWRkRG9vcihfcG9zOiBHYW1lLsaSLlZlY3RvcjIsIF9zY2FsaW5nOiBHYW1lLsaSLlZlY3RvcjIpIHtcclxuICAgICAgICAgICAgdGhpcy5kb29yID0gbmV3IERvb3IoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLmRvb3IpO1xyXG5cclxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKF9wb3MueCkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvb3IubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMoMSwgX3NjYWxpbmcueCAvIF9zY2FsaW5nLnkgKiAzLCAxKTtcclxuICAgICAgICAgICAgICAgIGlmIChfcG9zLnggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb29yLmRpcmVjdGlvbiA9ICg8SW50ZXJmYWNlcy5JUm9vbUV4aXRzPnsgbm9ydGg6IGZhbHNlLCBlYXN0OiB0cnVlLCBzb3V0aDogZmFsc2UsIHdlc3Q6IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9vci5tdHhMb2NhbC50cmFuc2xhdGVYKC0wLjUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvb3IuZGlyZWN0aW9uID0gKDxJbnRlcmZhY2VzLklSb29tRXhpdHM+eyBub3J0aDogZmFsc2UsIGVhc3Q6IGZhbHNlLCBzb3V0aDogZmFsc2UsIHdlc3Q6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb29yLm10eExvY2FsLnRyYW5zbGF0ZVgoMC41KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9vci5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhfc2NhbGluZy55IC8gX3NjYWxpbmcueCAqIDMsIDEsIDEpO1xyXG4gICAgICAgICAgICAgICAgaWYgKF9wb3MueSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvb3IuZGlyZWN0aW9uID0gKDxJbnRlcmZhY2VzLklSb29tRXhpdHM+eyBub3J0aDogdHJ1ZSwgZWFzdDogZmFsc2UsIHNvdXRoOiBmYWxzZSwgd2VzdDogZmFsc2UgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb29yLm10eExvY2FsLnRyYW5zbGF0ZVkoLTAuNSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9vci5kaXJlY3Rpb24gPSAoPEludGVyZmFjZXMuSVJvb21FeGl0cz57IG5vcnRoOiBmYWxzZSwgZWFzdDogZmFsc2UsIHNvdXRoOiB0cnVlLCB3ZXN0OiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvb3IubXR4TG9jYWwudHJhbnNsYXRlWSgwLjUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRDb2xsaWRlcigpIHtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLm10eFdvcmxkLnRyYW5zbGF0aW9uLngsIHRoaXMubXR4V29ybGQudHJhbnNsYXRpb24ueSwgdGhpcy5tdHhXb3JsZC5zY2FsaW5nLngsIHRoaXMubXR4V29ybGQuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBEb29yIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuRE9PUjtcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlO1xyXG5cclxuICAgICAgICBwdWJsaWMgZGlyZWN0aW9uOiBJbnRlcmZhY2VzLklSb29tRXhpdHM7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgICAgICBzdXBlcihcIkRvb3JcIik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWVzaChuZXcgxpIuTWVzaFF1YWQpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG5ldyDGki5NYXRlcmlhbChcImdyZWVuXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImdyZWVuXCIpKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRlWigwLjEpO1xyXG4gICAgICAgICAgICB0aGlzLmNsb3NlRG9vcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0Q29sbGlkZXIoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMubXR4V29ybGQudHJhbnNsYXRpb24ueCwgdGhpcy5tdHhXb3JsZC50cmFuc2xhdGlvbi55LCB0aGlzLm10eFdvcmxkLnNjYWxpbmcueCwgdGhpcy5tdHhXb3JsZC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNoYW5nZVJvb20oKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIEdlbmVyYXRpb24uc3dpdGNoUm9vbSh0aGlzLmRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnN3aXRjaFJvb21SZXF1ZXN0KHRoaXMuZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9wZW5Eb29yKCkge1xyXG4gICAgICAgICAgICB0aGlzLmFjdGl2YXRlKHRydWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNsb3NlRG9vcigpIHtcclxuICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZShmYWxzZSk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIE9ic2l0Y2FsIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuT0JTVElDQUw7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcjtcclxuICAgICAgICBwdWJsaWMgcGFyZW50Um9vbTogUm9vbTtcclxuXHJcbiAgICAgICAgZGlyZWN0aW9uOiBJbnRlcmZhY2VzLklSb29tRXhpdHM7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wYXJlbnQ6IFJvb20sIF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyLCBfc2NhbGU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihcIk9ic3RpY2FsXCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wYXJlbnRSb29tID0gX3BhcmVudDtcclxuICAgICAgICAgICAgdGhpcy5wYXJlbnRSb29tLm9ic3RpY2Fscy5wdXNoKHRoaXMpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IMaSLk1lc2hRdWFkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChuZXcgxpIuTWF0ZXJpYWwoXCJibGFja1wiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJibGFja1wiKSkpKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gX3Bvc2l0aW9uLnRvVmVjdG9yMygwLjAxKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5zY2FsZShHYW1lLsaSLlZlY3RvcjMuT05FKF9zY2FsZSkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIG51bGwpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBHZW5lcmF0aW9uIHtcclxuXHJcbiAgICBsZXQgbnVtYmVyT2ZSb29tczogbnVtYmVyID0gNTtcclxuICAgIGV4cG9ydCBsZXQgZ2VuZXJhdGlvbkZhaWxlZCA9IGZhbHNlO1xyXG4gICAgZXhwb3J0IGxldCByb29tczogUm9vbVtdID0gW107XHJcblxyXG4gICAgZXhwb3J0IGNvbnN0IGNvbXBhcmVOb3J0aDogR2FtZS7Gki5WZWN0b3IyID0gbmV3IMaSLlZlY3RvcjIoMCwgMSk7XHJcbiAgICBleHBvcnQgY29uc3QgY29tcGFyZUVhc3Q6IEdhbWUuxpIuVmVjdG9yMiA9IG5ldyDGki5WZWN0b3IyKDEsIDApO1xyXG4gICAgZXhwb3J0IGNvbnN0IGNvbXBhcmVTb3V0aDogR2FtZS7Gki5WZWN0b3IyID0gbmV3IMaSLlZlY3RvcjIoMCwgLTEpO1xyXG4gICAgZXhwb3J0IGNvbnN0IGNvbXBhcmVXZXN0OiBHYW1lLsaSLlZlY3RvcjIgPSBuZXcgxpIuVmVjdG9yMigtMSwgMCk7XHJcblxyXG4gICAgLy9zcGF3biBjaGFuY2VzXHJcbiAgICBsZXQgY2hhbGxlbmdlUm9vbVNwYXduQ2hhbmNlOiBudW1iZXIgPSAzMDtcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcHJvY2VkdWFsUm9vbUdlbmVyYXRpb24oKSB7XHJcbiAgICAgICAgcm9vbXMgPSBbXTtcclxuICAgICAgICBnZW5lcmF0aW9uRmFpbGVkID0gZmFsc2U7XHJcbiAgICAgICAgcm9vbXMucHVzaChnZW5lcmF0ZVN0YXJ0Um9vbSgpKTtcclxuICAgICAgICByb29tcy5wdXNoLmFwcGx5KHJvb21zLCBnZW5lcmF0ZU5vcm1hbFJvb21zKCkpO1xyXG4gICAgICAgIGFkZEJvc3NSb29tKCk7XHJcbiAgICAgICAgcm9vbXMucHVzaC5hcHBseShyb29tcywgZ2VuZXJhdGVUcmVhc3VyZVJvb20oKSk7XHJcbiAgICAgICAgcm9vbXMucHVzaChnZW5lcmF0ZU1lcmNoYW50Um9vbSgpKTtcclxuICAgICAgICByb29tcy5wdXNoKGdlbmVyYXRlQ2hhbGxlbmdlUm9vbSgpKTtcclxuICAgICAgICBzZXRFeGl0cygpO1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7IGNvbnNvbGUubG9nKHJvb20ubXR4TG9jYWwudHJhbnNsYXRpb24uY2xvbmUudG9TdHJpbmcoKSkgfSk7XHJcbiAgICAgICAgbW92ZVJvb21Ub1dvcmxkQ29vcmRzKHJvb21zWzBdKTtcclxuXHJcblxyXG4gICAgICAgIHNldEV4aXRzKCk7XHJcbiAgICAgICAgYWRkUm9vbVRvR3JhcGgocm9vbXNbMF0pO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBnZW5lcmF0ZXMgYSBncmlkIHRoYXRzIGNvbm5lY3RlZCB0b2dnZXRoZXIgZnJvbSBhIGdpdmVuIHN0YXJ0aW5nIHBvaW50XHJcbiAgICAgKiBAcGFyYW0gX3N0YXJ0Q29vcmQgdGhlIHN0YXJ0aW5nIHBvaW50XHJcbiAgICAgKiBAcmV0dXJucyB2ZWN0b3IyIGFycmF5IG9mIGEgY29ubmVjdGluZyBncmlkIHdpdGhvdXQgb3ZlcmxhcHNcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVTbmFrZUdyaWQoX3N0YXJ0Q29vcmQ6IEdhbWUuxpIuVmVjdG9yMik6IEdhbWUuxpIuVmVjdG9yMltdIHtcclxuICAgICAgICBsZXQgZ3JpZDogR2FtZS7Gki5WZWN0b3IyW10gPSBbXTtcclxuICAgICAgICBncmlkLnB1c2goX3N0YXJ0Q29vcmQpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtYmVyT2ZSb29tczsgaSsrKSB7XHJcbiAgICAgICAgICAgIGxldCBuZXh0Q29vcmQgPSBnZXROZXh0UG9zc2libGVDb29yZEZyb21TcGVjaWZpY0Nvb3JkKGdyaWQsIGdyaWRbZ3JpZC5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgICAgIGlmIChuZXh0Q29vcmQgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGdyaWQucHVzaChuZXh0Q29vcmQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBncmlkO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBmdW5jdGlvbiB0byBnZXQgYSByYW5kb20gbmVpZ2loYm91ciB0YWtpbmcgY2FyZSBvZiBhbiBhY3V0YWwgZ3JpZFxyXG4gICAgICogQHBhcmFtIF9ncmlkIGV4aXN0aW5nIGdyaWQgdGhlIGZ1bmN0aW9uIHNob3VsZCBjYXJlIGFib3V0XHJcbiAgICAgKiBAcGFyYW0gX3NwZWNpZmljQ29vcmQgdGhlIGNvb3JkIHlvdSB3YW50IHRoZSBuZXh0IHBvc3NpYmxlIGNvb3JkIFxyXG4gICAgICogQHJldHVybnMgYSB2ZWN0b3IyIGNvb3JkIHRoYXRzIG5vdCBpbnNpZGUgb2YgX2dyaWQgYW5kIGFyb3VuZCAgX3NwZWNpZmljQ29vcmRcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gZ2V0TmV4dFBvc3NpYmxlQ29vcmRGcm9tU3BlY2lmaWNDb29yZChfZ3JpZDogR2FtZS7Gki5WZWN0b3IyW10sIF9zcGVjaWZpY0Nvb3JkOiBHYW1lLsaSLlZlY3RvcjIpOiBHYW1lLsaSLlZlY3RvcjIge1xyXG4gICAgICAgIGxldCBjb29yZE5laWdoYm91cnM6IEdhbWUuxpIuVmVjdG9yMltdID0gZ2V0TmVpZ2hib3VyQ29vcmRpbmF0ZShfc3BlY2lmaWNDb29yZCk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb29yZE5laWdoYm91cnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgbGV0IHJhbmRvbUluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKGNvb3JkTmVpZ2hib3Vycy5sZW5ndGggLSAxKSk7XHJcbiAgICAgICAgICAgIGxldCBuZXh0Q29vcmQgPSBjb29yZE5laWdoYm91cnNbcmFuZG9tSW5kZXhdO1xyXG4gICAgICAgICAgICBpZiAoX2dyaWQuZmluZChjb29yZCA9PiBjb29yZC5lcXVhbHMobmV4dENvb3JkKSkpIHtcclxuICAgICAgICAgICAgICAgIGNvb3JkTmVpZ2hib3VycyA9IGNvb3JkTmVpZ2hib3Vycy5maWx0ZXIoY29vcmQgPT4gIWNvb3JkLmVxdWFscyhuZXh0Q29vcmQpKTtcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5leHRDb29yZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogZnVuY3Rpb24gdG8gZ2V0IGFsbCBuZWlnaGJvdXJzIGlnbm9yaW5nIHRoZSBjdXJyZW50IGdyaWRcclxuICAgICAqIEBwYXJhbSBfY29vcmQgY29vcmRpYW50ZSB5b3Ugd2FudCB0aGUgbmVpZ2hib3VyIGZyb21cclxuICAgICAqIEByZXR1cm5zIDQgbmVpZ2hib3VycyBpbiBkaXJlY3Rpb24gTiBFIFMgYW5kIFdcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gZ2V0TmVpZ2hib3VyQ29vcmRpbmF0ZShfY29vcmQ6IEdhbWUuxpIuVmVjdG9yMik6IEdhbWUuxpIuVmVjdG9yMltdIHtcclxuICAgICAgICBsZXQgbmVpZ2hib3VyczogR2FtZS7Gki5WZWN0b3IyW10gPSBbXTtcclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2gobmV3IMaSLlZlY3RvcjIoX2Nvb3JkLnggKyAxLCBfY29vcmQueSkpO1xyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChuZXcgxpIuVmVjdG9yMihfY29vcmQueCAtIDEsIF9jb29yZC55KSk7XHJcblxyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChuZXcgxpIuVmVjdG9yMihfY29vcmQueCwgX2Nvb3JkLnkgKyAxKSk7XHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKG5ldyDGki5WZWN0b3IyKF9jb29yZC54LCBfY29vcmQueSAtIDEpKTtcclxuICAgICAgICByZXR1cm4gbmVpZ2hib3VycztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZVN0YXJ0Um9vbSgpOiBTdGFydFJvb20ge1xyXG4gICAgICAgIGxldCBzdGFydFJvb206IFN0YXJ0Um9vbSA9IG5ldyBTdGFydFJvb20obmV3IMaSLlZlY3RvcjIoMCwgMCksIDIwKTtcclxuICAgICAgICByZXR1cm4gc3RhcnRSb29tO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlTm9ybWFsUm9vbXMoKTogTm9ybWFsUm9vbVtdIHtcclxuICAgICAgICBsZXQgZ3JpZENvb3JkczogR2FtZS7Gki5WZWN0b3IyW107XHJcbiAgICAgICAgbGV0IG5vcm1hbFJvb21zOiBOb3JtYWxSb29tW10gPSBbXTtcclxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICBncmlkQ29vcmRzID0gZ2VuZXJhdGVTbmFrZUdyaWQocm9vbXNbMF0uY29vcmRpbmF0ZXMpO1xyXG4gICAgICAgICAgICBpZiAoKGdyaWRDb29yZHMubGVuZ3RoIC0gMSkgPT0gbnVtYmVyT2ZSb29tcykge1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZ3JpZENvb3Jkcy5mb3JFYWNoKGNvb3JkID0+IHtcclxuICAgICAgICAgICAgbm9ybWFsUm9vbXMucHVzaChuZXcgTm9ybWFsUm9vbShjb29yZCwgMjApKTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIHJldHVybiBub3JtYWxSb29tcztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGRCb3NzUm9vbSgpIHtcclxuICAgICAgICBsZXQgYmlnZ2VzdERpc3RhbmNlOiBHYW1lLsaSLlZlY3RvcjIgPSDGki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICByb29tcy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMocm9vbS5jb29yZGluYXRlcy54KSA+IGJpZ2dlc3REaXN0YW5jZS54ICYmIE1hdGguYWJzKHJvb20uY29vcmRpbmF0ZXMueSkgPiBiaWdnZXN0RGlzdGFuY2UueSkge1xyXG4gICAgICAgICAgICAgICAgYmlnZ2VzdERpc3RhbmNlID0gcm9vbS5jb29yZGluYXRlcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgbGV0IHJvb21Db29yZDogR2FtZS7Gki5WZWN0b3IyW10gPSBnZXRDb29yZHNGcm9tUm9vbXMoKTtcclxuICAgICAgICBsZXQgbmV4dENvb3JkID0gZ2V0TmV4dFBvc3NpYmxlQ29vcmRGcm9tU3BlY2lmaWNDb29yZChyb29tQ29vcmQsIHJvb21Db29yZFtyb29tQ29vcmQubGVuZ3RoIC0gMV0pO1xyXG4gICAgICAgIGlmIChuZXh0Q29vcmQgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIC8vIG5leHRDb29yZCA9IGdldE5leHRQb3NzaWJsZUNvb3JkRnJvbVNwZWNpZmljQ29vcmQocm9vbUNvb3JkLCByb29tQ29vcmRbcm9vbUNvb3JkLmxlbmd0aCAtIDJdKTtcclxuICAgICAgICAgICAgZ2VuZXJhdGlvbkZhaWxlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICByb29tcy5wdXNoKG5ldyBCb3NzUm9vbShuZXh0Q29vcmQsIDMwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlVHJlYXN1cmVSb29tKCk6IFRyZWFzdXJlUm9vbVtdIHtcclxuICAgICAgICBsZXQgcm9vbUNvb3JkczogR2FtZS7Gki5WZWN0b3IyW10gPSBnZXRDb29yZHNGcm9tUm9vbXMoKTtcclxuICAgICAgICBsZXQgbmV3VHJlYXN1cmVSb29tczogVHJlYXN1cmVSb29tW10gPSBbXVxyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyb29tLnJvb21UeXBlID09IFJPT01UWVBFLk5PUk1BTCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5leHRDb29yZCA9IGdldE5leHRQb3NzaWJsZUNvb3JkRnJvbVNwZWNpZmljQ29vcmQocm9vbUNvb3Jkcywgcm9vbS5jb29yZGluYXRlcylcclxuICAgICAgICAgICAgICAgIGlmIChuZXh0Q29vcmQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRyUm9vbSA9IG5ldyBUcmVhc3VyZVJvb20obmV4dENvb3JkLCAxMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzU3Bhd25pbmcodHJSb29tLmdldFNwYXduQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUcmVhc3VyZVJvb21zLnB1c2godHJSb29tKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICAgIHJldHVybiBuZXdUcmVhc3VyZVJvb21zO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlTWVyY2hhbnRSb29tKCk6IE1lcmNoYW50Um9vbSB7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb29tcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoaSA+IDApIHtcclxuICAgICAgICAgICAgICAgIGxldCBuZXh0Q29vcmQgPSBnZXROZXh0UG9zc2libGVDb29yZEZyb21TcGVjaWZpY0Nvb3JkKGdldENvb3Jkc0Zyb21Sb29tcygpLCByb29tc1tpXS5jb29yZGluYXRlcylcclxuICAgICAgICAgICAgICAgIGlmIChuZXh0Q29vcmQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBNZXJjaGFudFJvb20obmV4dENvb3JkLCAyMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZ2VuZXJhdGlvbkZhaWxlZCA9IHRydWU7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVDaGFsbGVuZ2VSb29tKCk6IENoYWxsZW5nZVJvb20ge1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcm9vbXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV4dENvb3JkID0gZ2V0TmV4dFBvc3NpYmxlQ29vcmRGcm9tU3BlY2lmaWNDb29yZChnZXRDb29yZHNGcm9tUm9vbXMoKSwgcm9vbXNbaV0uY29vcmRpbmF0ZXMpXHJcbiAgICAgICAgICAgICAgICBpZiAobmV4dENvb3JkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ2hhbGxlbmdlUm9vbShuZXh0Q29vcmQsIDIwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBnZW5lcmF0aW9uRmFpbGVkID0gdHJ1ZTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogZnVuY3Rpb24gdG8gZ2V0IGNvb3JkaWFudGVzIGZyb20gYWxsIGV4aXN0aW5nIHJvb21zXHJcbiAgICAgKiBAcmV0dXJucyBWZWN0b3IyIGFycmF5IHdpdGggY29vcmRpbmF0ZXMgb2YgYWxsIGN1cnJlbnQgZXhpc3Rpbmcgcm9vbXMgaW4gUm9vbUdlbmVyYXRpb24ucm9vbXNcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldENvb3Jkc0Zyb21Sb29tcygpOiBHYW1lLsaSLlZlY3RvcjJbXSB7XHJcbiAgICAgICAgbGV0IGNvb3JkczogR2FtZS7Gki5WZWN0b3IyW10gPSBbXTtcclxuICAgICAgICByb29tcy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICBjb29yZHMucHVzaChyb29tLmNvb3JkaW5hdGVzKTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIHJldHVybiBjb29yZHNcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzZXRFeGl0cygpIHtcclxuICAgICAgICByb29tcy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICBsZXQgbmVpZ2hib3VycyA9IHJvb21zLmZpbHRlcihlbGVtZW50ID0+IGVsZW1lbnQgIT0gcm9vbSk7XHJcbiAgICAgICAgICAgIG5laWdoYm91cnMuZm9yRWFjaChuZWlnaGJvdXIgPT4ge1xyXG4gICAgICAgICAgICAgICAgcm9vbS5zZXRSb29tRXhpdChuZWlnaGJvdXIpO1xyXG4gICAgICAgICAgICAgICAgcm9vbS5zZXRTcGF3blBvaW50cygpO1xyXG4gICAgICAgICAgICAgICAgcm9vbS5vcGVuRG9vcnMoKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGlzU3Bhd25pbmcoX3NwYXduQ2hhbmNlOiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgICAgICBsZXQgeCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDEwMCk7XHJcbiAgICAgICAgaWYgKHggPCBfc3Bhd25DaGFuY2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBtb3ZlUm9vbVRvV29ybGRDb29yZHMoX2ZpcnN0Um9vbTogUm9vbSkge1xyXG4gICAgICAgIGxldCBuZWlnaGJvdXJOOiBSb29tID0gcm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKG5ldyBHYW1lLsaSLlZlY3RvcjIoX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS54LCAoX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS55ICsgMSkpKSk7XHJcbiAgICAgICAgbGV0IG5laWdoYm91ckU6IFJvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IEdhbWUuxpIuVmVjdG9yMigoX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS54ICsgMSksIF9maXJzdFJvb20uY29vcmRpbmF0ZXMuY2xvbmUueSkpKTtcclxuICAgICAgICBsZXQgbmVpZ2hib3VyUzogUm9vbSA9IHJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzLmVxdWFscyhuZXcgR2FtZS7Gki5WZWN0b3IyKF9maXJzdFJvb20uY29vcmRpbmF0ZXMuY2xvbmUueCwgKF9maXJzdFJvb20uY29vcmRpbmF0ZXMuY2xvbmUueSAtIDEpKSkpO1xyXG4gICAgICAgIGxldCBuZWlnaGJvdXJXOiBSb29tID0gcm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKG5ldyBHYW1lLsaSLlZlY3RvcjIoKF9maXJzdFJvb20uY29vcmRpbmF0ZXMuY2xvbmUueCAtIDEpLCBfZmlyc3RSb29tLmNvb3JkaW5hdGVzLmNsb25lLnkpKSk7XHJcbiAgICAgICAgaWYgKG5laWdoYm91ck4gIT0gdW5kZWZpbmVkICYmICFuZWlnaGJvdXJOLnBvc2l0aW9uVXBkYXRlZCkge1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJOLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMobmVpZ2hib3VyTi5jb29yZGluYXRlcy54ICogKF9maXJzdFJvb20ucm9vbVNpemUgLyAyICsgbmVpZ2hib3VyTi5yb29tU2l6ZSAvIDIpLCBuZWlnaGJvdXJOLmNvb3JkaW5hdGVzLnkgKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBuZWlnaGJvdXJOLnJvb21TaXplIC8gMiksIC0wLjAxKTtcclxuICAgICAgICAgICAgbmVpZ2hib3VyTi5wb3NpdGlvblVwZGF0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBtb3ZlUm9vbVRvV29ybGRDb29yZHMobmVpZ2hib3VyTik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChuZWlnaGJvdXJFICE9IHVuZGVmaW5lZCAmJiAhbmVpZ2hib3VyRS5wb3NpdGlvblVwZGF0ZWQpIHtcclxuICAgICAgICAgICAgbmVpZ2hib3VyRS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKG5laWdoYm91ckUuY29vcmRpbmF0ZXMueCAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIG5laWdoYm91ckUucm9vbVNpemUgLyAyKSwgbmVpZ2hib3VyRS5jb29yZGluYXRlcy55ICogKF9maXJzdFJvb20ucm9vbVNpemUgLyAyICsgbmVpZ2hib3VyRS5yb29tU2l6ZSAvIDIpLCAtMC4wMSk7XHJcbiAgICAgICAgICAgIG5laWdoYm91ckUucG9zaXRpb25VcGRhdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgbW92ZVJvb21Ub1dvcmxkQ29vcmRzKG5laWdoYm91ckUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobmVpZ2hib3VyUyAhPSB1bmRlZmluZWQgJiYgIW5laWdoYm91clMucG9zaXRpb25VcGRhdGVkKSB7XHJcbiAgICAgICAgICAgIG5laWdoYm91clMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhuZWlnaGJvdXJTLmNvb3JkaW5hdGVzLnggKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBuZWlnaGJvdXJTLnJvb21TaXplIC8gMiksIG5laWdoYm91clMuY29vcmRpbmF0ZXMueSAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIG5laWdoYm91clMucm9vbVNpemUgLyAyKSwgLTAuMDEpO1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJTLnBvc2l0aW9uVXBkYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIG1vdmVSb29tVG9Xb3JsZENvb3JkcyhuZWlnaGJvdXJTKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5laWdoYm91clcgIT0gdW5kZWZpbmVkICYmICFuZWlnaGJvdXJXLnBvc2l0aW9uVXBkYXRlZCkge1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJXLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMobmVpZ2hib3VyVy5jb29yZGluYXRlcy54ICogKF9maXJzdFJvb20ucm9vbVNpemUgLyAyICsgbmVpZ2hib3VyVy5yb29tU2l6ZSAvIDIpLCBuZWlnaGJvdXJXLmNvb3JkaW5hdGVzLnkgKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBuZWlnaGJvdXJXLnJvb21TaXplIC8gMiksIC0wLjAxKTtcclxuICAgICAgICAgICAgbmVpZ2hib3VyVy5wb3NpdGlvblVwZGF0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBtb3ZlUm9vbVRvV29ybGRDb29yZHMobmVpZ2hib3VyVyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzd2l0Y2hSb29tKF9kaXJlY3Rpb246IEludGVyZmFjZXMuSVJvb21FeGl0cykge1xyXG4gICAgICAgIGlmIChHYW1lLmN1cnJlbnRSb29tLmVuZW15Q291bnRNYW5hZ2VyLmZpbmlzaGVkKSB7XHJcbiAgICAgICAgICAgIGxldCBuZXdSb29tOiBSb29tO1xyXG4gICAgICAgICAgICBsZXQgbmV3UG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMlxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5ub3J0aCkge1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbSA9IHJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzLmVxdWFscyhuZXcgxpIuVmVjdG9yMihHYW1lLmN1cnJlbnRSb29tLmNvb3JkaW5hdGVzLngsIEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueSArIDEpKSk7XHJcbiAgICAgICAgICAgICAgICBuZXdQb3NpdGlvbiA9IG5ld1Jvb20uZ2V0U3Bhd25Qb2ludFM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24uZWFzdCkge1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbSA9IHJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzLmVxdWFscyhuZXcgxpIuVmVjdG9yMihHYW1lLmN1cnJlbnRSb29tLmNvb3JkaW5hdGVzLnggKyAxLCBHYW1lLmN1cnJlbnRSb29tLmNvb3JkaW5hdGVzLnkpKSk7XHJcbiAgICAgICAgICAgICAgICBuZXdQb3NpdGlvbiA9IG5ld1Jvb20uZ2V0U3Bhd25Qb2ludFc7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLnNvdXRoKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gcm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKG5ldyDGki5WZWN0b3IyKEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueCwgR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy55IC0gMSkpKTtcclxuICAgICAgICAgICAgICAgIG5ld1Bvc2l0aW9uID0gbmV3Um9vbS5nZXRTcGF3blBvaW50TjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi53ZXN0KSB7XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gcm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKG5ldyDGki5WZWN0b3IyKEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueCAtIDEsIEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueSkpKTtcclxuICAgICAgICAgICAgICAgIG5ld1Bvc2l0aW9uID0gbmV3Um9vbS5nZXRTcGF3blBvaW50RTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAobmV3Um9vbSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJubyByb29tIGZvdW5kXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAvLyBHYW1lLmNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGlvbiA9IG5ld1Bvc2l0aW9uLnRvVmVjdG9yMyhHYW1lLmNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGlvbi56KTtcclxuXHJcbiAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3UG9zaXRpb24udG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3UG9zaXRpb24udG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGFkZFJvb21Ub0dyYXBoKG5ld1Jvb20pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogcmVtb3ZlcyBlcnl0aGluZyB1bnJlbGlhYmxlIGZyb20gdGhlIGdycGFoIGFuZCBhZGRzIHRoZSBuZXcgcm9vbSB0byB0aGUgZ3JhcGggLCBzZW5kaW5nIGl0IHRvIHRoZSBjbGllbnQgJiBzcGF3bnMgZW5lbWllcyBpZiBleGlzdGluZyBpbiByb29tXHJcbiAgICAgKiBAcGFyYW0gX3Jvb20gdGhlIHJvb20gaXQgc2hvdWxkIHNwYXduXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBhZGRSb29tVG9HcmFwaChfcm9vbTogUm9vbSkge1xyXG4gICAgICAgIE5ldHdvcmtpbmcuc2VuZFJvb20oPEludGVyZmFjZXMuSVJvb20+eyBjb29yZGluYXRlczogX3Jvb20uY29vcmRpbmF0ZXMsIHJvb21TaXplOiBfcm9vbS5yb29tU2l6ZSwgZXhpdHM6IF9yb29tLmV4aXRzLCByb29tVHlwZTogX3Jvb20ucm9vbVR5cGUsIHRyYW5zbGF0aW9uOiBfcm9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbiB9KTtcclxuXHJcbiAgICAgICAgbGV0IG9sZE9iamVjdHM6IEdhbWUuxpIuTm9kZVtdID0gR2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtID0+ICgoPGFueT5lbGVtKS50YWcgIT0gVGFnLlRBRy5QTEFZRVIpKTtcclxuICAgICAgICBvbGRPYmplY3RzID0gb2xkT2JqZWN0cy5maWx0ZXIoZWxlbSA9PiAoKDxhbnk+ZWxlbSkudGFnICE9IFRhZy5UQUcuVUkpKTtcclxuXHJcbiAgICAgICAgb2xkT2JqZWN0cy5mb3JFYWNoKChlbGVtKSA9PiB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQoZWxlbSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoX3Jvb20pO1xyXG4gICAgICAgIEdhbWUudmlld3BvcnQuY2FsY3VsYXRlVHJhbnNmb3JtcygpO1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgX3Jvb20ub25BZGRUb0dyYXBoKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBfcm9vbS53YWxscy5mb3JFYWNoKHdhbGwgPT4ge1xyXG4gICAgICAgICAgICB3YWxsLnNldENvbGxpZGVyKCk7XHJcbiAgICAgICAgICAgIGlmICh3YWxsLmRvb3IgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB3YWxsLmRvb3Iuc2V0Q29sbGlkZXIoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIEdhbWUuY3VycmVudFJvb20gPSBfcm9vbTtcclxuICAgICAgICBFbmVteVNwYXduZXIuc3Bhd25NdWx0aXBsZUVuZW1pZXNBdFJvb20oR2FtZS5jdXJyZW50Um9vbS5lbmVteUNvdW50TWFuYWdlci5nZXRNYXhFbmVteUNvdW50LCBHYW1lLmN1cnJlbnRSb29tLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBFbnRpdHkge1xyXG4gICAgZXhwb3J0IGxldCB0eHRTaGFkb3c6IEdhbWUuxpIuVGV4dHVyZUltYWdlID0gbmV3IEdhbWUuxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgY2xhc3MgU2hhZG93IGV4dGVuZHMgR2FtZS7Gki5Ob2RlIHtcclxuICAgICAgICBwcml2YXRlIG1lc2g6IMaSLk1lc2hRdWFkID0gbmV3IMaSLk1lc2hRdWFkO1xyXG4gICAgICAgIHByaXZhdGUgc2hhZG93TWF0dDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJzdGFydFJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiksIHR4dFNoYWRvdykpO1xyXG4gICAgICAgIHNoYWRvd1BhcmVudDogR2FtZS7Gki5Ob2RlO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wYXJlbnQ6IEdhbWUuxpIuTm9kZSkge1xyXG4gICAgICAgICAgICBzdXBlcihcInNoYWRvd1wiKTtcclxuICAgICAgICAgICAgdGhpcy5zaGFkb3dQYXJlbnQgPSBfcGFyZW50O1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgR2FtZS7Gki5Db21wb25lbnRNZXNoKHRoaXMubWVzaCkpO1xyXG4gICAgICAgICAgICBsZXQgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMuc2hhZG93TWF0dCk7O1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWF0ZXJpYWwpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4V29ybGQudHJhbnNsYXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IzKF9wYXJlbnQubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgX3BhcmVudC5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCAtMC4wMSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMoMiwgMiwgMik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGRhdGVTaGFkb3dQb3MoKSB7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMygwLCAwLCB0aGlzLnNoYWRvd1BhcmVudC5tdHhMb2NhbC50cmFuc2xhdGlvbi56Ki0xKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgV2VhcG9ucyB7XHJcbiAgICBleHBvcnQgY2xhc3MgV2VhcG9uIHtcclxuICAgICAgICBvd25lck5ldElkOiBudW1iZXI7IGdldCBvd25lcigpOiBFbnRpdHkuRW50aXR5IHsgcmV0dXJuIEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gdGhpcy5vd25lck5ldElkKSB9O1xyXG4gICAgICAgIHByb3RlY3RlZCBjb29sZG93bjogQWJpbGl0eS5Db29sZG93bjsgZ2V0IGdldENvb2xEb3duKCkgeyByZXR1cm4gdGhpcy5jb29sZG93biB9O1xyXG4gICAgICAgIHByb3RlY3RlZCBhdHRhY2tDb3VudDogbnVtYmVyOyBnZXQgZ2V0QXR0YWNrQ291bnQoKSB7IHJldHVybiB0aGlzLmF0dGFja0NvdW50IH07XHJcbiAgICAgICAgcHVibGljIGN1cnJlbnRBdHRhY2tDb3VudDogbnVtYmVyO1xyXG4gICAgICAgIGFpbVR5cGU6IEFJTTtcclxuICAgICAgICBidWxsZXRUeXBlOiBCdWxsZXRzLkJVTExFVFRZUEUgPSBCdWxsZXRzLkJVTExFVFRZUEUuU1RBTkRBUkQ7XHJcbiAgICAgICAgcHJvamVjdGlsZUFtb3VudDogbnVtYmVyID0gMTtcclxuICAgICAgICBjYW5TaG9vdCA9IHRydWU7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29sZG93blRpbWU6IG51bWJlciwgX2F0dGFja0NvdW50OiBudW1iZXIsIF9idWxsZXRUeXBlOiBCdWxsZXRzLkJVTExFVFRZUEUsIF9wcm9qZWN0aWxlQW1vdW50OiBudW1iZXIsIF9vd25lck5ldElkOiBudW1iZXIsIF9haW1UeXBlOiBBSU0pIHtcclxuICAgICAgICAgICAgdGhpcy5hdHRhY2tDb3VudCA9IF9hdHRhY2tDb3VudDtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0YWNrQ291bnQgPSBfYXR0YWNrQ291bnQ7XHJcbiAgICAgICAgICAgIHRoaXMuYnVsbGV0VHlwZSA9IF9idWxsZXRUeXBlO1xyXG4gICAgICAgICAgICB0aGlzLnByb2plY3RpbGVBbW91bnQgPSBfcHJvamVjdGlsZUFtb3VudDtcclxuICAgICAgICAgICAgdGhpcy5vd25lck5ldElkID0gX293bmVyTmV0SWQ7XHJcbiAgICAgICAgICAgIHRoaXMuYWltVHlwZSA9IF9haW1UeXBlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jb29sZG93biA9IG5ldyBBYmlsaXR5LkNvb2xkb3duKF9jb29sZG93blRpbWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNob290KF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX2RpcmVjaXRvbjogxpIuVmVjdG9yMywgX2J1bGxldE5ldElkPzogbnVtYmVyLCBfc3luYz86IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY2FuU2hvb3QpIHtcclxuICAgICAgICAgICAgICAgIGlmIChfc3luYykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRBdHRhY2tDb3VudCA8PSAwICYmICF0aGlzLmNvb2xkb3duLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dGFja0NvdW50ID0gdGhpcy5hdHRhY2tDb3VudDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEF0dGFja0NvdW50ID4gMCAmJiAhdGhpcy5jb29sZG93bi5oYXNDb29sRG93bikge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3duZXIuYXR0cmlidXRlcy5hY2N1cmFjeSA8IDEwMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbmFjY3VyYWN5KF9kaXJlY2l0b24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBfZGlyZWNpdG9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdID0gdGhpcy5sb2FkTWFnYXppbmUoX3Bvc2l0aW9uLCBfZGlyZWNpdG9uLCB0aGlzLmJ1bGxldFR5cGUsIF9idWxsZXROZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QnVsbGV0RGlyZWN0aW9uKG1hZ2F6aW5lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5maXJlKG1hZ2F6aW5lLCBfc3luYyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dGFja0NvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRBdHRhY2tDb3VudCA8PSAwICYmICF0aGlzLmNvb2xkb3duLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvb2xkb3duLnNldE1heENvb2xEb3duID0gdGhpcy5jb29sZG93bi5nZXRNYXhDb29sRG93biAqIHRoaXMub3duZXIuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29vbGRvd24uc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2RpcmVjaXRvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbWFnYXppbmU6IEJ1bGxldHMuQnVsbGV0W10gPSB0aGlzLmxvYWRNYWdhemluZShfcG9zaXRpb24sIF9kaXJlY2l0b24sIHRoaXMuYnVsbGV0VHlwZSwgX2J1bGxldE5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEJ1bGxldERpcmVjdGlvbihtYWdhemluZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maXJlKG1hZ2F6aW5lLCBfc3luYyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGluYWNjdXJhY3koX2RpcmVjaXRvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBfZGlyZWNpdG9uLnggPSBfZGlyZWNpdG9uLnggKyBNYXRoLnJhbmRvbSgpICogMTAgLyB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYWNjdXJhY3kgLSBNYXRoLnJhbmRvbSgpICogMTAgLyB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYWNjdXJhY3k7XHJcbiAgICAgICAgICAgIF9kaXJlY2l0b24ueSA9IF9kaXJlY2l0b24ueSArIE1hdGgucmFuZG9tKCkgKiAxMCAvIHRoaXMub3duZXIuYXR0cmlidXRlcy5hY2N1cmFjeSAtIE1hdGgucmFuZG9tKCkgKiAxMCAvIHRoaXMub3duZXIuYXR0cmlidXRlcy5hY2N1cmFjeTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZpcmUoX21hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdLCBfc3luYz86IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgX21hZ2F6aW5lLmZvckVhY2goYnVsbGV0ID0+IHtcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoYnVsbGV0KTtcclxuICAgICAgICAgICAgICAgIGlmIChfc3luYykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChidWxsZXQgaW5zdGFuY2VvZiBCdWxsZXRzLkhvbWluZ0J1bGxldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduQnVsbGV0KHRoaXMuYWltVHlwZSwgYnVsbGV0LmRpcmVjdGlvbiwgYnVsbGV0Lm5ldElkLCB0aGlzLm93bmVyTmV0SWQsICg8QnVsbGV0cy5Ib21pbmdCdWxsZXQ+YnVsbGV0KS50YXJnZXQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduQnVsbGV0KHRoaXMuYWltVHlwZSwgYnVsbGV0LmRpcmVjdGlvbiwgYnVsbGV0Lm5ldElkLCB0aGlzLm93bmVyTmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldEJ1bGxldERpcmVjdGlvbihfbWFnYXppbmU6IEJ1bGxldHMuQnVsbGV0W10pIHtcclxuICAgICAgICAgICAgc3dpdGNoIChfbWFnYXppbmUubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9tYWdhemluZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgICAgICBfbWFnYXppbmVbMF0ubXR4TG9jYWwucm90YXRlWig0NSAvIDIpO1xyXG4gICAgICAgICAgICAgICAgICAgIF9tYWdhemluZVsxXS5tdHhMb2NhbC5yb3RhdGVaKDQ1IC8gMiAqIC0xKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX21hZ2F6aW5lO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICAgICAgICAgIF9tYWdhemluZVswXS5tdHhMb2NhbC5yb3RhdGVaKDQ1IC8gMik7XHJcbiAgICAgICAgICAgICAgICAgICAgX21hZ2F6aW5lWzFdLm10eExvY2FsLnJvdGF0ZVooNDUgLyAyICogLTEpO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX21hZ2F6aW5lO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsb2FkTWFnYXppbmUoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfYnVsbGV0VHlwZTogQnVsbGV0cy5CVUxMRVRUWVBFLCBfbmV0SWQ/OiBudW1iZXIpOiBCdWxsZXRzLkJ1bGxldFtdIHtcclxuICAgICAgICAgICAgbGV0IG1hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdID0gW107XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5wcm9qZWN0aWxlQW1vdW50OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAodGhpcy5haW1UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBBSU0uTk9STUFMOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWdhemluZS5wdXNoKG5ldyBCdWxsZXRzLkJ1bGxldCh0aGlzLmJ1bGxldFR5cGUsIF9wb3NpdGlvbiwgX2RpcmVjdGlvbiwgdGhpcy5vd25lck5ldElkLCBfbmV0SWQpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEFJTS5IT01JTkc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hZ2F6aW5lLnB1c2gobmV3IEJ1bGxldHMuSG9taW5nQnVsbGV0KHRoaXMuYnVsbGV0VHlwZSwgX3Bvc2l0aW9uLCBfZGlyZWN0aW9uLCB0aGlzLm93bmVyTmV0SWQsIG51bGwsIF9uZXRJZCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbWFnYXppbmU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBlbnVtIEFJTSB7XHJcbiAgICAgICAgTk9STUFMLFxyXG4gICAgICAgIEhPTUlOR1xyXG4gICAgfVxyXG5cclxufSJdfQ==