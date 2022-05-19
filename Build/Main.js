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
            loadJSON();
            waitOnConnection();
            async function waitOnConnection() {
                setClient();
                if (Networking.clients.filter(elem => elem.ready == true).length >= 2 && Networking.client.idHost != undefined) {
                    if (Networking.client.id == Networking.client.idHost) {
                        document.getElementById("IMHOST").style.visibility = "visible";
                    }
                    await init();
                    Game.gamestate = GAMESTATES.PLAYING;
                    // EnemySpawner.spawnEnemies();
                    if (Networking.client.id == Networking.client.idHost) {
                        // EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, Entity.ID.REDTICK, new ƒ.Vector2(3, 3), avatar1);
                        // EnemySpawner.spawnMultipleEnemiesAtRoom(5, Game.currentRoom.mtxLocal.translation.toVector2());
                        // EnemySpawner.spawnByID(Enemy.ENEMYCLASS.ENEMYSMASH, Entity.ID.OGER, new ƒ.Vector2(3, 3), null);
                        EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONOR, Entity.ID.SUMMONOR, new Game.ƒ.Vector2(3, 3), null);
                    }
                    //#region init Items
                    if (Networking.client.id == Networking.client.idHost) {
                        let item2 = new Items.InternalItem(Items.ITEMID.PROJECTILESUP);
                        item2.setPosition(new Game.ƒ.Vector2(-5, 0));
                        item2.spawn();
                        // // let item3 = new Items.InternalItem(Items.ITEMID.SCALEUP, new ƒ.Vector2(-2, 0), null);
                        // let zipzap = new Items.InternalItem(Items.ITEMID.TEST);
                        // zipzap.setPosition(new ƒ.Vector2(5, 0));
                        // zipzap.spawn();
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
            updateRooms();
            waitForLobby();
            function waitForLobby() {
                if (Networking.clients.length > 1 && Networking.client.idRoom.toLocaleLowerCase() != "lobby") {
                    document.getElementById("Hostscreen").style.visibility = "hidden";
                    document.getElementById("RoomId").parentElement.style.visibility = "hidden";
                    document.getElementById("Lobbyscreen").style.visibility = "visible";
                }
                else {
                    setTimeout(() => {
                        waitForLobby();
                    }, 200);
                }
            }
            async function updateRooms() {
                if (Networking.client.socket.readyState == Networking.client.socket.OPEN) {
                    Networking.getRooms();
                    return;
                }
                else {
                    setTimeout(() => {
                        updateRooms();
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
        const loadBuffs = await (await fetch("./Resources/BuffStorage.json")).json();
        Game.damageBuffJSON = loadBuffs.damageBuff;
        Game.attributeBuffJSON = loadBuffs.attributeBuff;
        console.warn("all JSON loaded");
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
        updateInvUI(Game.avatar1.items, player1UI);
        //Avatar2 UI
        player2UI.querySelector("#HP").style.width = (Game.avatar2.attributes.healthPoints / Game.avatar2.attributes.maxHealthPoints * 100) + "%";
        //InventoryUI
        updateInvUI(Game.avatar2.items, player2UI);
        function updateInvUI(_inv, _ui) {
            _ui.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                let remove = true;
                _inv.forEach((element) => {
                    let imgName = element.imgSrc.split("/");
                    if (imgElement.src.split("/").find(elem => elem == imgName[imgName.length - 1]) != null) {
                        remove = false;
                    }
                });
                if (remove) {
                    imgElement.parentElement.remove();
                }
            });
            _inv.forEach((element) => {
                if (element != undefined) {
                    let exsist = false;
                    if (element.imgSrc == undefined) {
                        exsist = true;
                    }
                    else {
                        //search DOMImg for Item
                        _ui.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                            let imgName = element.imgSrc.split("/");
                            if (imgElement.src.split("/").find(elem => elem == imgName[imgName.length - 1]) != null) {
                                exsist = true;
                            }
                        });
                    }
                    //none exsisting DOMImg for Item
                    if (!exsist) {
                        let newDiv = document.createElement("div");
                        newDiv.className = "tooltip";
                        let newItem = document.createElement("img");
                        newItem.src = element.imgSrc;
                        newDiv.appendChild(newItem);
                        let newTooltip = document.createElement("span");
                        newTooltip.textContent = element.description;
                        newTooltip.className = "tooltiptext";
                        newDiv.appendChild(newTooltip);
                        let newTooltipLabel = document.createElement("p");
                        newTooltipLabel.textContent = element.name;
                        newTooltip.insertAdjacentElement("afterbegin", newTooltipLabel);
                        _ui.querySelector("#Inventory").appendChild(newDiv);
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
        buffs = [];
        offsetColliderX;
        offsetColliderY;
        colliderScaleFaktor;
        weapon;
        canMoveX = true;
        canMoveY = true;
        moveDirection = Game.ƒ.Vector3.ZERO();
        animationContainer;
        idleScale;
        currentKnockback = ƒ.Vector3.ZERO();
        shadow;
        constructor(_id, _netId) {
            super(getNameById(_id));
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
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            this.updateBuffs();
            this.shadow.updateShadowPos();
            if (Networking.client.idHost == Networking.client.id) {
                this.setCollider();
            }
        }
        updateScale() {
            this.attributes.updateScaleDependencies();
            this.mtxLocal.scaling = new ƒ.Vector3(this.attributes.scale, this.attributes.scale, this.attributes.scale);
            this.collider.setRadius((this.cmpTransform.mtxLocal.scaling.x / 2) * this.colliderScaleFaktor);
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
        /**
         * does Damage to the Entity
         * @param _value value how much damage is applied
         */
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
                    Networking.removeEntity(this.netId);
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
                        case ANIMATIONSTATES.TELEPORT:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.TELEPORT;
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
        ANIMATIONSTATES[ANIMATIONSTATES["TELEPORT"] = 4] = "TELEPORT";
    })(ANIMATIONSTATES = Entity_1.ANIMATIONSTATES || (Entity_1.ANIMATIONSTATES = {}));
    let BEHAVIOUR;
    (function (BEHAVIOUR) {
        BEHAVIOUR[BEHAVIOUR["IDLE"] = 0] = "IDLE";
        BEHAVIOUR[BEHAVIOUR["FOLLOW"] = 1] = "FOLLOW";
        BEHAVIOUR[BEHAVIOUR["FLEE"] = 2] = "FLEE";
        BEHAVIOUR[BEHAVIOUR["SUMMON"] = 3] = "SUMMON";
        BEHAVIOUR[BEHAVIOUR["ATTACK"] = 4] = "ATTACK";
        BEHAVIOUR[BEHAVIOUR["TELEPORT"] = 5] = "TELEPORT";
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
        flocking = new Enemy_1.FlockingBehaviour(this, 2, 2, 0.1, 1, 1, 1, 0, 1);
        aggressiveDistance = 3 * 3;
        stamina = new Ability.Cooldown(180);
        recover = new Ability.Cooldown(60);
        constructor(_id, _pos, _netId) {
            super(_id, _pos, _netId);
            this.stamina.onEndCoolDown = () => this.recoverStam;
        }
        behaviour() {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitudeSquared;
            this.flocking.update();
            if (distance < this.aggressiveDistance) {
                this.isAggressive = true;
            }
            if (this.isAggressive && !this.recover.hasCoolDown) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
        }
        recoverStam = () => {
            this.recover.startCoolDown();
            this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
        };
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
                        //TODO: set a callback function to do this.
                        // if (this.stamina.getCurrentCooldown == 1) {
                        //     this.recover.startCoolDown();
                        //     this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
                        // }
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
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.weapon = new Weapons.RangedWeapon(60, 1, Bullets.BULLETTYPE.STANDARD, 2, this.netId, Weapons.AIM.NORMAL);
        }
        behaviour() {
            this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            if (distance < 5) {
                this.currentBehaviour = Entity.BEHAVIOUR.FLEE;
                this.isAggressive = true;
            }
            else if (distance < 9 && this.isAggressive) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
            else {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveSimple(this.target).toVector3();
                    break;
                case Entity.BEHAVIOUR.IDLE:
                    this.moveDirection = ƒ.Vector3.ZERO();
                    this.shoot();
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveAway(this.target).toVector3();
                    break;
            }
        }
        shoot(_netId) {
            this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
            let _direction = ƒ.Vector3.DIFFERENCE(this.target.toVector3(0), this.mtxLocal.translation);
            if (_direction.magnitude < 3 || this.isAggressive) {
                this.weapon.shoot(_direction, true, _netId);
            }
        }
    }
    Enemy_1.EnemyShoot = EnemyShoot;
    class SummonorAdds extends EnemyDash {
        avatar;
        randomPlayer = Math.round(Math.random());
        constructor(_id, _position, _target, _netId) {
            super(_id, _position, _netId);
            this.avatar = _target;
            this.flocking = new Enemy_1.FlockingBehaviour(this, 3, 5, 1.5, 1, 1, 0.1, 0);
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
        ITEMID[ITEMID["AOETEST"] = 16] = "AOETEST";
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
        netId;
        description;
        imgSrc;
        collider;
        transform = new ƒ.ComponentTransform();
        position;
        get getPosition() { return this.position; }
        buff = [];
        changedValue;
        constructor(_id, _netId) {
            super(ITEMID[_id]);
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
                    return Buff.getBuffById(Buff.BUFFID.POISON);
                case ITEMID.VAMPY:
                    return Buff.getBuffById(Buff.BUFFID.BLEEDING);
                case ITEMID.SLOWYSLOW:
                    return Buff.getBuffById(Buff.BUFFID.SLOW);
                case ITEMID.GETSTRONKO:
                    return Buff.getBuffById(Buff.BUFFID.SCALEUP);
                case ITEMID.GETWEAKO:
                    return Buff.getBuffById(Buff.BUFFID.SCALEDOWN);
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
                    function rotateBullets() {
                        let magazin = _avatar.weapon.getMagazin;
                        switch (magazin.length) {
                            case 2:
                            case 3:
                                console.log("rotating");
                                magazin[0].mtxLocal.rotateZ(45 / 2);
                                magazin[1].mtxLocal.rotateZ(45 / 2 * -1);
                                _avatar.weapon.magazin = magazin;
                                break;
                            default:
                                break;
                        }
                    }
                    if (_add) {
                        _avatar.weapon.projectileAmount += this.value;
                        _avatar.weapon.addFunction(rotateBullets);
                    }
                    else {
                        _avatar.weapon.projectileAmount -= this.value;
                        _avatar.weapon.deleteFunction(rotateBullets);
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
                    // localStorage.setItem("cooldownTime", _avatar.weapon.getCoolDown.getMaxCoolDown.toString());
                    // localStorage.setItem("aimType", Weapons.AIM[_avatar.weapon.aimType]);
                    // localStorage.setItem("bulletType", Bullets.BULLETTYPE[_avatar.weapon.bulletType]);
                    // localStorage.setItem("projectileAmount", _avatar.weapon.projectileAmount.toString());
                    // _avatar.weapon.getCoolDown.setMaxCoolDown = 100 * 60;
                    // _avatar.weapon.aimType = Weapons.AIM.NORMAL;
                    // _avatar.weapon.bulletType = Bullets.BULLETTYPE.THORSHAMMER;
                    // _avatar.weapon.projectileAmount = 1;
                    // _avatar.weapon.canShoot = true;
                    _avatar.weapon = new Weapons.ThorsHammer(100 * 60, 1, Bullets.BULLETTYPE.THORSHAMMER, 1, _avatar.netId);
                    Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
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
                case ITEMID.AOETEST:
                    if (_add) {
                        new Ability.AreaOfEffect(Ability.AOETYPE.HEALTHUP, null).addToEntity(_avatar);
                    }
                    else {
                        _avatar.getChildren().find(child => child.id == Ability.AOETYPE.HEALTHUP).despawn();
                    }
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
                Networking.spawnBullet(this.bullets[i].direction, this.bullets[i].netId, this.ownerNetId);
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
        onEndCoolDown;
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
            if (this.onEndCoolDown != undefined) {
                this.onEndCoolDown();
            }
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
var Ability;
(function (Ability) {
    let AOETYPE;
    (function (AOETYPE) {
        AOETYPE[AOETYPE["HEALTHUP"] = 0] = "HEALTHUP";
    })(AOETYPE = Ability.AOETYPE || (Ability.AOETYPE = {}));
    class AreaOfEffect extends Game.ƒ.Node {
        netId;
        id;
        position;
        get getPosition() { return this.position; }
        ;
        set setPosition(_pos) { this.position = _pos; }
        ;
        collider;
        get getCollider() { return this.collider; }
        ;
        duration;
        areaMat;
        ownerNetId;
        buffList;
        get getBuffList() { return this.buffList; }
        ;
        damageValue;
        constructor(_id, _netId) {
            super(AOETYPE[_id].toLowerCase());
            Networking.IdManager(_netId);
            this.duration = new Ability.Cooldown(120);
            this.duration.onEndCoolDown = this.despawn;
            this.addComponent(new Game.ƒ.ComponentMesh(new Game.ƒ.MeshQuad));
            this.damageValue = 1;
            this.areaMat = new ƒ.Material("aoeShader", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), UI.commonParticle));
            let cmpMat = new Game.ƒ.ComponentMaterial(this.areaMat);
            this.addComponent(cmpMat);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), 2, this.netId);
            this.mtxLocal.scaling = new Game.ƒ.Vector3(this.collider.getRadius * 2, this.collider.getRadius * 2, 1);
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            this.collider.position = this.mtxWorld.translation.toVector2();
            this.collisionDetection();
        }
        despawn = () => {
            console.log("despawn");
            //TODO: find right parent to cancel;
            Game.graph.removeChild(this);
            Networking.popID(this.netId);
        };
        spawn(_entity) {
            _entity.addChild(this);
            this.mtxLocal.translateZ(0.01);
            if (this.duration == undefined) {
                return;
            }
            else {
                this.duration.startCoolDown();
            }
        }
        addToEntity(_entity) {
            this.spawn(_entity);
            this.ownerNetId = _entity.netId;
        }
        collisionDetection() {
            let colliders = [];
            colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ENEMY || element.tag == Tag.TAG.PLAYER);
            colliders.forEach(_coll => {
                let entity = _coll;
                if (this.collider.collides(entity.collider) && entity.attributes != undefined) {
                    //TODO: overwrite in other children to do own thing
                    this.applyAreaOfEffect(entity);
                }
            });
        }
        applyAreaOfEffect(_entity) {
            //TODO: overwrite in other classes
            if (this.ownerNetId != _entity.netId) {
                console.log("colliding with: " + _entity.name);
                Buff.getBuffById(Buff.BUFFID.POISON).addToEntity(_entity);
            }
        }
    }
    Ability.AreaOfEffect = AreaOfEffect;
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
        }
    }
    Entity.Attributes = Attributes;
})(Entity || (Entity = {}));
var Enemy;
(function (Enemy) {
    class BigBoom extends Enemy.EnemyDumb {
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
        }
        behaviour() {
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    break;
                case Entity.BEHAVIOUR.SUMMON:
                    this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);
                    break;
                default:
                    // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                    break;
            }
        }
    }
    Enemy.BigBoom = BigBoom;
    let SUMMNORBEHAVIOUR;
    (function (SUMMNORBEHAVIOUR) {
        SUMMNORBEHAVIOUR[SUMMNORBEHAVIOUR["IDLE"] = 0] = "IDLE";
        SUMMNORBEHAVIOUR[SUMMNORBEHAVIOUR["WALK"] = 1] = "WALK";
        SUMMNORBEHAVIOUR[SUMMNORBEHAVIOUR["SUMMON"] = 2] = "SUMMON";
        SUMMNORBEHAVIOUR[SUMMNORBEHAVIOUR["ATTACK"] = 3] = "ATTACK";
        SUMMNORBEHAVIOUR[SUMMNORBEHAVIOUR["TELEPORT"] = 4] = "TELEPORT";
        SUMMNORBEHAVIOUR[SUMMNORBEHAVIOUR["ABILITY"] = 5] = "ABILITY";
    })(SUMMNORBEHAVIOUR = Enemy.SUMMNORBEHAVIOUR || (Enemy.SUMMNORBEHAVIOUR = {}));
    class Summonor extends Enemy.EnemyShoot {
        damageTaken = 0;
        stateCurrent;
        stateNext;
        instructions;
        attackPhaseCd = new Ability.Cooldown(580);
        defencePhaseCd = new Ability.Cooldown(720);
        beginShooting = false;
        shootingCount = 3;
        currentShootingCount = 0;
        summonPosition = new ƒ.Vector3();
        stateMachineInstructions;
        lastState;
        summon = new Ability.SpawnSummoners(this.netId, 0, 1, 45);
        dash = new Ability.Dash(this.netId, 45, 1, 13 * 60, 5);
        shoot360 = new Ability.circleShoot(this.netId, 0, 3, 5 * 60);
        dashWeapon = new Weapons.RangedWeapon(12, 1, Bullets.BULLETTYPE.SUMMONER, 1, this.netId, Weapons.AIM.NORMAL);
        flock = new Enemy.FlockingBehaviour(this, 4, 4, 1, 1, 1, 0, 1, 10);
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
            this.defencePhaseCd.onEndCoolDown = this.stopDefencePhase;
            this.stateMachineInstructions = new Game.ƒAid.StateMachineInstructions();
            this.stateMachineInstructions.transitDefault = () => { };
            this.stateMachineInstructions.actDefault = this.behaviour;
            // this.stateMachineInstructions.setTransition(Entity.BEHAVIOUR.FLEE, Entity.BEHAVIOUR.SUMMON, this.teleport);
            this.stateMachineInstructions.setAction(SUMMNORBEHAVIOUR.ATTACK, this.attackingPhase);
            this.stateMachineInstructions.setAction(SUMMNORBEHAVIOUR.SUMMON, this.defencePhase);
            this.stateMachineInstructions.setAction(SUMMNORBEHAVIOUR.TELEPORT, this.teleport);
            this.stateMachineInstructions.setAction(SUMMNORBEHAVIOUR.ABILITY, this.shooting360);
            this.instructions = this.stateMachineInstructions;
            this.transit(SUMMNORBEHAVIOUR.IDLE);
        }
        transit(_next) {
            console.log(SUMMNORBEHAVIOUR[this.stateCurrent]);
            this.lastState = this.stateCurrent;
            this.instructions.transit(this.stateCurrent, _next, this);
        }
        act() {
            this.instructions.act(this.stateCurrent, this);
        }
        update() {
            this.act();
        }
        behaviour = () => {
            this.target = Game.avatar1.mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            this.flock.update();
            this.moveDirection = this.flock.getMoveVector().toVector3();
            console.log(distance);
            if (distance < 5) {
                this.isAggressive = true;
                this.flock.notToTargetWeight = 2;
                this.flock.toTargetWeight = 0;
                //TODO: Intro animation here and when it is done then fight...
            }
            else {
                this.flock.notToTargetWeight = 0;
                this.flock.toTargetWeight = 2;
            }
            if (this.damageTaken >= 4) {
                // new Buff.DamageBuff(Buff.BUFFID.POISON, 120, 30, 3).addToEntity(this);
                this.transit(SUMMNORBEHAVIOUR.SUMMON);
                // this.currentBehaviour = Entity.BEHAVIOUR.SUMMON;
                // } else {
                //     this.stateMachine.transit(Entity.BEHAVIOUR.FLEE);
            }
            this.move(this.moveDirection);
        };
        getDamage(_value) {
            super.getDamage(_value);
            this.damageTaken += _value;
        }
        // moveBehaviour = () => {
        //     this.behaviour();
        //     // switch (this.currentBehaviour) {
        //     //     case Entity.BEHAVIOUR.IDLE:
        //     //         this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
        //     //         break;
        //     //     case Entity.BEHAVIOUR.FLEE:
        //     //         this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
        //     //         this.attackingPhase();
        //     //         break;
        //     //     case Entity.BEHAVIOUR.SUMMON:
        //     //         this.defencePhase();
        //     //         break;
        //     //     default:
        //     //         break;
        //     // }
        // }
        attackingPhase = () => {
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
                    this.dashWeapon.shoot(Game.ƒ.Vector2.DIFFERENCE(this.target, this.mtxLocal.translation.toVector2()).toVector3(), true, null);
                    this.dashWeapon.getCoolDown.setMaxCoolDown = Calculation.clampNumber(Math.random() * 30, 8, 30);
                }
            }
            else {
                this.mtxLocal.translation = (new ƒ.Vector2(0, 0)).toVector3();
                this.shooting360();
            }
        };
        defencePhase = () => {
            // if (this.teleport()) {
            if (!this.defencePhaseCd.hasCoolDown) {
                this.defencePhaseCd.setMaxCoolDown = Math.round(this.defencePhaseCd.getMaxCoolDown + Math.random() * 5 + Math.random() * -5);
                this.defencePhaseCd.startCoolDown();
                this.summonPosition.set(Game.currentRoom.mtxWorld.translation.x, Game.currentRoom.mtxWorld.translation.y - (Game.currentRoom.roomSize / 3), this.mtxWorld.translation.z);
            }
            else {
                if (this.mtxLocal.translation.equals(this.summonPosition, 1)) {
                    this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);
                    new Buff.AttributesBuff(Buff.BUFFID.IMMUNE, null, 1, 0).addToEntity(this);
                    console.log("spawning");
                    this.moveDirection = ƒ.Vector3.ZERO();
                    this.summon.doAbility();
                }
                // }
            }
        };
        stopDefencePhase = () => {
            this.summonPosition.set(Game.currentRoom.mtxWorld.translation.x, Game.currentRoom.mtxWorld.translation.y, this.mtxWorld.translation.z);
            this.transit(SUMMNORBEHAVIOUR.TELEPORT);
        };
        teleport = () => {
            if (!this.mtxLocal.translation.equals(this.summonPosition)) {
                this.switchAnimation(Entity.ANIMATIONSTATES.TELEPORT);
                console.log(this.getCurrentFrame);
                if (this.getCurrentFrame >= 5) {
                    this.mtxLocal.translation = this.summonPosition;
                    switch (this.lastState) {
                        case SUMMNORBEHAVIOUR.IDLE:
                        case SUMMNORBEHAVIOUR.ATTACK:
                            this.transit(SUMMNORBEHAVIOUR.SUMMON);
                            break;
                        case SUMMNORBEHAVIOUR.SUMMON:
                            this.transit(SUMMNORBEHAVIOUR.ABILITY);
                            break;
                        default:
                            break;
                    }
                }
            }
        };
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
                    this.damageTaken = 0;
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
                this.getBuffStatsById(this.id, _avatar, true);
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
                this.getBuffStatsById(this.id, _avatar, false);
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
        getBuffStatsById(_id, _avatar, _add) {
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
    /**
     * creates a new Buff that does Damage to an Entity;
     */
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
        getBuffStatsById(_id, _avatar, _add) {
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
        getBuffStatsById(_id, _avatar, _add) {
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
    function getBuffById(_id) {
        let ref = undefined;
        ref = Game.damageBuffJSON.find(buff => buff.id == _id);
        if (ref != undefined) {
            return new DamageBuff(_id, ref.duration, ref.tickRate, ref.value);
        }
        ref = Game.attributeBuffJSON.find(buff => buff.id == _id);
        if (ref != undefined) {
            return new AttributesBuff(_id, ref.duration, ref.tickRate, ref.value);
        }
        return null;
    }
    Buff_1.getBuffById = getBuffById;
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
        lastPosition;
        countCheckUpdate = 0;
        constructor(_bulletType, _position, _direction, _ownerNetId, _netId) {
            super(BULLETTYPE[_bulletType]);
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
            if (_direction.magnitudeSquared > 0) {
                _direction.normalize();
            }
            this.updateRotation(_direction);
            this.loadTexture();
            this.flyDirection = ƒ.Vector3.X();
            this.direction = _direction;
            this.ownerNetId = _ownerNetId;
            this.serverPrediction = new Networking.ServerBulletPrediction(this.netId);
            this.clientPrediction = new Networking.ClientBulletPrediction(this.netId);
            this.lastPosition = this.mtxLocal.translation;
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            this.predict();
            if (Networking.client.idHost == Networking.client.id) {
                this.updateLifetime();
            }
        }
        spawn(_sync) {
            Game.graph.addChild(this);
            if (_sync) {
                // Networking.spawnBullet(this.direction, this.netId, this.ownerNetId);
            }
        }
        despawn() {
            Networking.popID(this.netId);
            Networking.removeBullet(this.netId);
            Game.graph.removeChild(this);
            if (this.type == BULLETTYPE.THORSHAMMER) {
                this.spawnThorsHammer();
            }
        }
        updateLifetime() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    this.despawn();
                }
            }
        }
        predict() {
            if (Networking.client.idHost != Networking.client.id) {
                if (this.owner == Game.avatar1) {
                    this.clientPrediction.update();
                }
                this.checkUpdate();
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
        }
        checkUpdate() {
            if (this.lastPosition == this.mtxLocal.translation) {
                this.countCheckUpdate++;
                if (this.countCheckUpdate >= (2 * 60)) {
                    this.despawn();
                }
            }
            else {
                this.countCheckUpdate = 0;
            }
            this.lastPosition = this.mtxLocal.translation;
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
                this.owner.weapon = this.owner.weapon.weaponStorage;
                // this.owner.weapon.getCoolDown.setMaxCoolDown = +localStorage.getItem("cooldownTime");
                // this.owner.weapon.aimType = (<any>Weapons.AIM)[localStorage.getItem("aimType")];
                // this.owner.weapon.bulletType = (<any>BULLETTYPE)[localStorage.getItem("bulletType")];
                // this.owner.weapon.projectileAmount = +localStorage.getItem("projectileAmount");
                // this.owner.weapon.canShoot = false;
                Networking.updateAvatarWeapon(this.owner.weapon, this.ownerNetId);
            }
        }
        loadTexture() {
            if (this.texturePath != "" && this.texturePath != null) {
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
                this.despawn();
            }
            colliders = [];
            colliders = Game.graph.getChildren().find(element => element.tag == Tag.TAG.ROOM).walls;
            colliders.forEach((_elem) => {
                let element = _elem;
                if (element.collider != undefined && this.collider.collidesRect(element.collider)) {
                    this.despawn();
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
        nextTarget;
        avatars;
        playerSize;
        counter;
        tickHit;
        constructor(_ownerNetId, _netId) {
            super(BULLETTYPE.ZIPZAP, new ƒ.Vector2(0, 0), new ƒ.Vector2(0, 0).toVector3(), _ownerNetId, _netId);
            this.avatars = undefined;
            this.counter = 0;
            this.tag = Tag.TAG.UI;
            this.tickHit = new Ability.Cooldown(12);
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
        }
        eventUpdate = (_event) => {
            this.update();
        };
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
        setRadius(_newRadius) {
            this.radius = _newRadius;
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
        let distancePlayer1 = _startPoint.getDistance(Game.avatar1.cmpTransform.mtxLocal.translation);
        let distancePlayer2 = _startPoint.getDistance(Game.avatar2.cmpTransform.mtxLocal.translation);
        if (distancePlayer1 < distancePlayer2) {
            target = Game.avatar1;
        }
        else {
            target = Game.avatar2;
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
        FUNCTION[FUNCTION["SENDMAGAZIN"] = 15] = "SENDMAGAZIN";
        FUNCTION[FUNCTION["SPAWNENEMY"] = 16] = "SPAWNENEMY";
        FUNCTION[FUNCTION["ENEMYTRANSFORM"] = 17] = "ENEMYTRANSFORM";
        FUNCTION[FUNCTION["ENTITYANIMATIONSTATE"] = 18] = "ENTITYANIMATIONSTATE";
        FUNCTION[FUNCTION["ENTITYDIE"] = 19] = "ENTITYDIE";
        FUNCTION[FUNCTION["SPAWNINTERNALITEM"] = 20] = "SPAWNINTERNALITEM";
        FUNCTION[FUNCTION["UPDATEATTRIBUTES"] = 21] = "UPDATEATTRIBUTES";
        FUNCTION[FUNCTION["UPDATEWEAPON"] = 22] = "UPDATEWEAPON";
        FUNCTION[FUNCTION["ITEMDIE"] = 23] = "ITEMDIE";
        FUNCTION[FUNCTION["SENDROOM"] = 24] = "SENDROOM";
        FUNCTION[FUNCTION["SWITCHROOMREQUEST"] = 25] = "SWITCHROOMREQUEST";
        FUNCTION[FUNCTION["UPDATEBUFF"] = 26] = "UPDATEBUFF";
        FUNCTION[FUNCTION["UPDATEUI"] = 27] = "UPDATEUI";
        FUNCTION[FUNCTION["SPWANMINIMAP"] = 28] = "SPWANMINIMAP";
        FUNCTION[FUNCTION["SPAWNZIPZAP"] = 29] = "SPAWNZIPZAP";
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
                if (message.command == FudgeNet.COMMAND.ROOM_GET_IDS) {
                    if (message.content != undefined && document.getElementById("Hostscreen").style.visibility != "hidden") {
                        let rooms = message.content.rooms;
                        document.getElementById("Rooms").innerHTML = "";
                        if (rooms.length > 0) {
                            let newRooms = [];
                            rooms.forEach(room => {
                                if (room != "Lobby") {
                                    newRooms.push("<p>" + room + "</p>");
                                }
                            });
                            document.getElementById("Rooms").innerHTML = newRooms.toString().replaceAll(",", "");
                        }
                        setTimeout(() => {
                            getRooms();
                        }, 5000);
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
                    //Spawn normal bullet from host
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWNBULLET.toString()) {
                        let bullet;
                        let entity = Game.entities.find(elem => elem.netId == message.content.ownerNetId);
                        if (entity != null) {
                            let direction = new Game.ƒ.Vector3(message.content.direction.data[0], message.content.direction.data[1], message.content.direction.data[2]);
                            bullet = new Bullets.Bullet(entity.weapon.bulletType, entity.mtxLocal.translation.toVector2(), direction, message.content.ownerNetId, message.content.bulletNetId);
                            bullet.spawn(false);
                        }
                    }
                    //Send magazin
                    if (message.content != undefined && message.content.text == FUNCTION.SENDMAGAZIN.toString()) {
                        let entity = Game.entities.find(elem => elem.netId == message.content.magazin.ownerNetId);
                        let tempMagazin = message.content.magazin;
                        entity.weapon.magazin = [];
                        for (let i = 0; i < tempMagazin.bulletTypes.length; i++) {
                            let direction = new Game.ƒ.Vector3(message.content.magazin.directions[i].data[0], message.content.magazin.directions[i].data[1], 0);
                            if (entity.weapon.aimType == Weapons.AIM.NORMAL) {
                                entity.weapon.magazin.push(new Bullets.Bullet(tempMagazin.bulletTypes[i], entity.mtxLocal.translation.toVector2(), direction, tempMagazin.ownerNetId, tempMagazin.netIds[i]));
                            }
                            else {
                                entity.weapon.magazin.push(new Bullets.HomingBullet(tempMagazin.bulletTypes[i], entity.mtxLocal.translation.toVector2(), direction, tempMagazin.ownerNetId, null, tempMagazin.netIds[i]));
                            }
                        }
                        entity.weapon.shoot(Game.ƒ.Vector3.ZERO(), false);
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
                                bullet.despawn();
                            }
                        }
                    }
                    //Spawn enemy at the client 
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWNENEMY.toString()) {
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
                    //Kill entity at the client from host
                    if (message.content != undefined && message.content.text == FUNCTION.ENTITYDIE.toString()) {
                        let entity = Game.entities.find(enem => enem.netId == message.content.netId);
                        if (entity != undefined) {
                            entity.die();
                        }
                    }
                    //update Entity buff List
                    if (message.content != undefined && message.content.text == FUNCTION.UPDATEBUFF.toString()) {
                        let buffList = message.content.buffList;
                        let entity = Game.entities.find(ent => ent.netId == message.content.netId);
                        if (entity != undefined) {
                            entity.buffs.forEach(oldBuff => {
                                let buffToCheck = buffList.find(buff => buff.id == oldBuff.id);
                                if (buffToCheck == undefined) {
                                    oldBuff.removeBuff(entity);
                                }
                            });
                            buffList.forEach(buff => {
                                let newBuff = Buff.getBuffById(buff.id);
                                newBuff.tickRate = buff.tickRate;
                                newBuff.duration = buff.duration;
                                newBuff.addToEntity(entity);
                            });
                        }
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
                        console.log(refWeapon.magazin);
                        let tempWeapon;
                        switch (message.content.type) {
                            case Weapons.WEAPONTYPE.RANGEDWEAPON:
                                tempWeapon = new Weapons.RangedWeapon(message.content.weapon.cooldown.coolDown, message.content.weapon.attackCount, refWeapon.bulletType, refWeapon.projectileAmount, refWeapon.ownerNetId, refWeapon.aimType);
                                break;
                            case Weapons.WEAPONTYPE.MELEEWEAPON:
                                tempWeapon = new Weapons.MeleeWeapon(message.content.weapon.cooldown.coolDown, message.content.weapon.attackCount, refWeapon.bulletType, refWeapon.projectileAmount, refWeapon.ownerNetId, refWeapon.aimType);
                                break;
                            case Weapons.WEAPONTYPE.THORSHAMMERWEAPON:
                                tempWeapon = new Weapons.ThorsHammer(message.content.weapon.cooldown.coolDown, message.content.weapon.attackCount, refWeapon.bulletType, refWeapon.projectileAmount, refWeapon.ownerNetId);
                                break;
                            default:
                                console.warn(Weapons.WEAPONTYPE[message.content.type] + " does not exist in Networking switch");
                                break;
                        }
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
        Networking.client.dispatch({ route: FudgeNet.ROUTE.SERVER, command: FudgeNet.COMMAND.ROOM_CREATE });
    }
    Networking.createRoom = createRoom;
    function joinRoom(_roomId) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.SERVER, command: FudgeNet.COMMAND.ROOM_ENTER, content: { room: _roomId } });
    }
    Networking.joinRoom = joinRoom;
    function getRooms() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.SERVER, command: FudgeNet.COMMAND.ROOM_GET_IDS });
    }
    Networking.getRooms = getRooms;
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
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEINVENTORY, add: _add, itemId: _itemId, itemNetId: _itemNetId, netId: _netId } });
        }
    }
    Networking.updateInventory = updateInventory;
    function spawnMinimap(_miniMapInfos) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPWANMINIMAP, miniMapInfos: _miniMapInfos } });
    }
    Networking.spawnMinimap = spawnMinimap;
    //#endregion
    //#region bullet
    function spawnBullet(_direction, _bulletNetId, _ownerNetId) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.SPAWNBULLET, direction: _direction, ownerNetId: _ownerNetId, bulletNetId: _bulletNetId } });
    }
    Networking.spawnBullet = spawnBullet;
    function sendMagazin(_magazin) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.SENDMAGAZIN, magazin: _magazin } });
    }
    Networking.sendMagazin = sendMagazin;
    function sendBulletInput(_netId, _inputPayload) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.BULLETPREDICT, netId: _netId, input: _inputPayload } });
    }
    Networking.sendBulletInput = sendBulletInput;
    function updateBullet(_position, _rotation, _netId) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.BULLETTRANSFORM, position: _position, rotation: _rotation, netId: _netId } });
        }
    }
    Networking.updateBullet = updateBullet;
    function removeBullet(_netId) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.BULLETDIE, netId: _netId } });
        }
    }
    Networking.removeBullet = removeBullet;
    //#endregion
    //#region specialItems
    function spawnZipZap(_ownerNetId, _netId) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNZIPZAP, ownerNetId: _ownerNetId, netId: _netId } });
        }
    }
    Networking.spawnZipZap = spawnZipZap;
    //#endregion
    //#region enemy
    function spawnEnemy(_enemyClass, _enemy, _netId) {
        if (Networking.client.idHost == Networking.client.id) {
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
    function removeEntity(_netId) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENTITYDIE, netId: _netId } });
    }
    Networking.removeEntity = removeEntity;
    //#endregion
    //#region items
    function spawnItem(_id, _position, _netId) {
        if (Networking.client.idHost == Networking.client.id) {
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
            Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.UPDATEWEAPON, weapon: _weapon, type: _weapon.getType(), netId: _targetNetId } });
        }
        else {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEWEAPON, weapon: _weapon, type: _weapon.getType(), netId: _targetNetId } });
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
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEBUFF, buffList: _buffList, netId: _netId } });
        }
    }
    Networking.updateBuffList = updateBuffList;
    //#endregion
    //#region UI
    function updateUI(_position, _value) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEUI, position: _position, value: _value } });
        }
    }
    Networking.updateUI = updateUI;
    //#endregion
    //#region room
    function sendRoom(_room) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SENDROOM, room: _room } });
        }
    }
    Networking.sendRoom = sendRoom;
    function switchRoomRequest(_direction) {
        if (Networking.client.idHost != Networking.client.id) {
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
        Networking.currentIDs.splice(Networking.currentIDs.indexOf(_id), 1);
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
        weapon = new Weapons.MeleeWeapon(12, 1, Bullets.BULLETTYPE.MELEE, 1, this.netId, Weapons.AIM.NORMAL);
        swordRadius = 0.75;
        attack(_direction, _netId, _sync) {
            this.weapon.shoot(_direction, _sync, _netId);
        }
        //Block
        doAbility() {
            this.block.doAbility();
        }
    }
    Player_1.Melee = Melee;
    class Ranged extends Player {
        weapon = new Weapons.RangedWeapon(25, 1, Bullets.BULLETTYPE.STANDARD, 1, this.netId, Weapons.AIM.NORMAL);
        dash = new Ability.Dash(this.netId, 8, 1, 60, 5);
        performAbility = false;
        lastMoveDirection;
        attack(_direction, _netId, _sync) {
            this.weapon.shoot(_direction, _sync, _netId);
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
        challenge;
        challengeRoomMat = new ƒ.Material("challengeRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")));
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.CHALLENGE);
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
            if (Networking.client.id == Networking.client.idHost) {
                switch (this.challenge) {
                    case CHALLENGE.THORSHAMMER:
                        this.startThorsHammerChallenge();
                        break;
                    default:
                        break;
                }
            }
        }
        startThorsHammerChallenge() {
            //TODO: activate
            // if (this.enemyCountManager.finished) {
            //     return;
            // }
            let thorshammer = new Items.InternalItem(Items.ITEMID.THORSHAMMER);
            let choosenOne;
            if (Math.round(Math.random()) > 0) {
                choosenOne = Game.avatar1;
            }
            else {
                choosenOne = Game.avatar2;
            }
            thorshammer.addItemToEntity(choosenOne);
            Networking.updateInventory(true, thorshammer.id, thorshammer.netId, choosenOne.netId);
            if (choosenOne != Game.avatar1) {
                Game.avatar1.weapon = new Weapons.ThorsHammer(100 * 60, 1, Bullets.BULLETTYPE.THORSHAMMER, 1, Game.avatar1.netId);
            }
            else {
                Game.avatar2.weapon = new Weapons.ThorsHammer(100 * 60, 1, Bullets.BULLETTYPE.THORSHAMMER, 1, Game.avatar1.netId);
            }
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
                }
                if (avatar2Inv != undefined) {
                    Game.avatar2.items.splice(Game.avatar2.items.indexOf(avatar2Inv), 1);
                    Networking.updateInventory(false, avatar2Inv.id, avatar2Inv.netId, Game.avatar2.netId);
                }
                Game.avatar1.weapon = Game.avatar1.weapon.weaponStorage;
                Game.avatar2.weapon = Game.avatar2.weapon.weaponStorage;
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
        tag = Tag.TAG.WALL;
        collider;
        door;
        normal;
        get getNormal() { return this.normal; }
        ;
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
        let startRoom = new Generation.StartRoom(new ƒ.Vector2(0, 0), 30);
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
        mesh = new ƒ.MeshQuad;
        shadowMatt = new ƒ.Material("startRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Entity.txtShadow));
        shadowParent;
        constructor(_parent) {
            super("shadow");
            this.shadowParent = _parent;
            this.addComponent(new Game.ƒ.ComponentMesh(this.mesh));
            let cmpMaterial = new ƒ.ComponentMaterial(this.shadowMatt);
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
    let AIM;
    (function (AIM) {
        AIM[AIM["NORMAL"] = 0] = "NORMAL";
        AIM[AIM["HOMING"] = 1] = "HOMING";
    })(AIM = Weapons.AIM || (Weapons.AIM = {}));
    let WEAPONTYPE;
    (function (WEAPONTYPE) {
        WEAPONTYPE[WEAPONTYPE["RANGEDWEAPON"] = 0] = "RANGEDWEAPON";
        WEAPONTYPE[WEAPONTYPE["MELEEWEAPON"] = 1] = "MELEEWEAPON";
        WEAPONTYPE[WEAPONTYPE["THORSHAMMERWEAPON"] = 2] = "THORSHAMMERWEAPON";
    })(WEAPONTYPE = Weapons.WEAPONTYPE || (Weapons.WEAPONTYPE = {}));
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
        inaccuracy(_direciton) {
            _direciton.x = _direciton.x + Math.random() * 10 / this.owner.attributes.accuracy - Math.random() * 10 / this.owner.attributes.accuracy;
            _direciton.y = _direciton.y + Math.random() * 10 / this.owner.attributes.accuracy - Math.random() * 10 / this.owner.attributes.accuracy;
        }
        fire(_magazine, _sync) {
            _magazine.forEach(bullet => {
                bullet.spawn(_sync);
            });
        }
    }
    Weapons.Weapon = Weapon;
    //TODO: BIG FUCKING CHANGES.
    class RangedWeapon extends Weapon {
        magazin;
        get getMagazin() { return this.magazin; }
        ;
        set setMagazin(_magazin) { this.magazin = _magazin; }
        ;
        ItemFunctions = [];
        shoot(_direction, _sync, _bulletNetId) {
            let _position = this.owner.mtxLocal.translation.toVector2();
            if (_sync) {
                if (this.currentAttackCount <= 0 && !this.cooldown.hasCoolDown) {
                    this.currentAttackCount = this.attackCount;
                }
                if (this.currentAttackCount > 0 && !this.cooldown.hasCoolDown) {
                    if (this.owner.attributes.accuracy < 100) {
                        this.inaccuracy(_direction);
                    }
                    this.magazin = this.loadMagazine(_position, _direction, this.bulletType, _bulletNetId);
                    this.processItemEffects();
                    this.sendMagazin();
                    this.fire(this.magazin, _sync);
                    this.currentAttackCount--;
                    if (this.currentAttackCount <= 0 && !this.cooldown.hasCoolDown) {
                        this.cooldown.setMaxCoolDown = this.cooldown.getMaxCoolDown * this.owner.attributes.coolDownReduction;
                        this.cooldown.startCoolDown();
                    }
                }
            }
            else {
                // this.magazin = this.loadMagazine(_position, _direction, this.bulletType, _bulletNetId);
                this.processItemEffects();
                this.fire(this.magazin, _sync);
            }
        }
        sendMagazin() {
            let bulletType = [];
            let directions = [];
            let netIds = [];
            this.magazin.forEach(bul => { bulletType.push(bul.type); directions.push(bul.direction.toVector2()); netIds.push(bul.netId); });
            let magazinpayload = { bulletTypes: bulletType, directions: directions, ownerNetId: this.ownerNetId, netIds: netIds };
            Networking.sendMagazin(magazinpayload);
        }
        fire(_magazine, _sync) {
            super.fire(_magazine, _sync);
            this.magazin = [];
        }
        addFunction(_func) {
            this.ItemFunctions.push(_func);
        }
        deleteFunction(_func) {
            this.ItemFunctions.splice(this.ItemFunctions.indexOf(_func), 1);
        }
        processItemEffects() {
            this.ItemFunctions.forEach(func => {
                func();
            });
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
        getType() {
            return WEAPONTYPE.RANGEDWEAPON;
        }
    }
    Weapons.RangedWeapon = RangedWeapon;
    class MeleeWeapon extends Weapon {
        shoot(_direction, _sync, _bulletNetId) {
            let newPos = this.owner.mtxLocal.translation.clone.toVector2();
            if (_direction.magnitude > 0) {
                _direction.normalize();
                _direction.scale(0.5);
            }
            newPos.add(_direction.toVector2());
            let swordCollider = new Collider.Collider(newPos, this.owner.swordRadius / 2, this.ownerNetId);
            Game.enemies.forEach(enemy => {
                if (swordCollider.collides(enemy.collider)) {
                    enemy.getDamage(this.owner.attributes.attackPoints);
                }
            });
        }
        getType() {
            return WEAPONTYPE.MELEEWEAPON;
        }
    }
    Weapons.MeleeWeapon = MeleeWeapon;
    class ThorsHammer extends RangedWeapon {
        weaponStorage;
        constructor(_cooldownTime, _attackCount, _bulletType, _projectileAmount, _ownerNetId) {
            super(_cooldownTime, _attackCount, _bulletType, _projectileAmount, _ownerNetId, AIM.NORMAL);
            this.weaponStorage = this.owner.weapon;
            this.bulletType = Bullets.BULLETTYPE.THORSHAMMER;
        }
        getType() {
            return WEAPONTYPE.THORSHAMMERWEAPON;
        }
        shoot(_direction, _sync, _bulletNetId) {
            if (this.owner.items.find(item => item.id == Items.ITEMID.THORSHAMMER) != null) {
                let _position = this.owner.mtxLocal.translation.toVector2();
                if (_sync) {
                    if (this.currentAttackCount <= 0 && !this.cooldown.hasCoolDown) {
                        this.currentAttackCount = this.attackCount;
                    }
                    if (this.currentAttackCount > 0 && !this.cooldown.hasCoolDown) {
                        this.magazin = this.loadMagazine(_position, _direction, this.bulletType, _bulletNetId);
                        this.fire(this.magazin, _sync);
                        this.currentAttackCount--;
                        if (this.currentAttackCount <= 0 && !this.cooldown.hasCoolDown) {
                            this.cooldown.setMaxCoolDown = this.cooldown.getMaxCoolDown * this.owner.attributes.coolDownReduction;
                            this.cooldown.startCoolDown();
                        }
                    }
                }
                else {
                    let magazine = this.loadMagazine(_position, _direction, this.bulletType, _bulletNetId);
                    this.fire(magazine, _sync);
                }
            }
        }
    }
    Weapons.ThorsHammer = ThorsHammer;
})(Weapons || (Weapons = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL0NsYXNzZXMvTWFpbi50cyIsIi4uL0NsYXNzZXMvVUkudHMiLCIuLi9DbGFzc2VzL1RhZy50cyIsIi4uL0NsYXNzZXMvRW50aXR5LnRzIiwiLi4vQ2xhc3Nlcy9FbmVteS50cyIsIi4uL0NsYXNzZXMvSW50ZXJmYWNlcy50cyIsIi4uL0NsYXNzZXMvSXRlbXMudHMiLCIuLi9DbGFzc2VzL0FuaW1hdGlvbkdlbmVyYXRpb24udHMiLCIuLi9DbGFzc2VzL1ByZWRpY3Rpb24udHMiLCIuLi9DbGFzc2VzL0FiaWxpdHkudHMiLCIuLi9DbGFzc2VzL0FyZWFPZkVmZmVjdC50cyIsIi4uL0NsYXNzZXMvQXR0cmlidXRlcy50cyIsIi4uL0NsYXNzZXMvQm9zcy50cyIsIi4uL0NsYXNzZXMvQnVmZi50cyIsIi4uL0NsYXNzZXMvQnVsbGV0LnRzIiwiLi4vQ2xhc3Nlcy9Db2xsaWRlci50cyIsIi4uL0NsYXNzZXMvRW5lbXlTcGF3bmVyLnRzIiwiLi4vQ2xhc3Nlcy9GbG9ja2luZy50cyIsIi4uL0NsYXNzZXMvRnJpZW5kbHlDcmVhdHVyZXMudHMiLCIuLi9DbGFzc2VzL0dhbWVDYWxjdWxhdGlvbi50cyIsIi4uL0NsYXNzZXMvSW5wdXRTeXN0ZW0udHMiLCIuLi9DbGFzc2VzL0xhbmRzY2FwZS50cyIsIi4uL0NsYXNzZXMvTWluaW1hcC50cyIsIi4uL0NsYXNzZXMvTmV0d29ya2luZy50cyIsIi4uL0NsYXNzZXMvUGxheWVyLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tR2VuZXJhdGlvbi50cyIsIi4uL0NsYXNzZXMvU2hhZG93LnRzIiwiLi4vQ2xhc3Nlcy9XZWFwb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtQkFBbUI7QUFDbkIsd0RBQXdEO0FBQ3hELHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFFdEIsSUFBVSxJQUFJLENBaWNiO0FBdGNELG1CQUFt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LE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRSxvQkFBQSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFM0YsWUFBWSxHQUFHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLG9CQUFBLGVBQWUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEYsWUFBWSxHQUFHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLG9CQUFBLGVBQWUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFeEYsUUFBUSxHQUFHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLG9CQUFBLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0UsUUFBUSxHQUFHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLG9CQUFBLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0UsVUFBVSxHQUFHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLG9CQUFBLGFBQWEsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFbkYsWUFBWSxHQUFHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLG9CQUFBLGVBQWUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEYsWUFBWSxHQUFHLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLG9CQUFBLGVBQWUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEYsY0FBYyxHQUFHLElB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SSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFBLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQzdJLE1BQU07Z0JBQ1YsS0FBSyxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVE7b0JBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFBLFlBQVksQ0FBQyxDQUFDLENBQUM7b0JBQzdJLE1BQU07Z0JBQ1YsS0FBSyxVQUFVLENBQUMsUUFBUSxDQUFDLFNBQVM7b0JBQzlCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFBLGFBQWEsQ0FBQyxDQUFDLENBQUM7b0JBQzlJLE1BQU07Z0JBQ1YsS0FBSyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUk7b0JBQ3pCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFBLFFB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QUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTdGLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBUSxJQUFLLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMvRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBUSxJQUFLLENBQUMsQ0FBQztZQUNsQyxDQUFDLENBQUMsQ0FBQTtRQUNOLENBQUM7UUFFTSxjQUFjO1lBQ2pCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdILElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdILElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsR0FB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LENBQUM7SUFDakIsQ0FBQztJQUVELFNBQVMscUJBQXFCLENBQUMsVUFBZ0I7UUFDM0MsSUFBSSxVQUFVLEdBQVMsV0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0osSUFBSSxVQUFVLEdBQVMsV0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0osSUFBSSxVQUFVLEdBQVMsV0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0osSUFBSSxVQUFVLEdBQVMsV0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0osSUFBSSxVQUFVLElBQUksU0FBUyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBRTtZQUN4RCxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZOLFVBQVUsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1lBQ2xDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3JDO1FBQ0QsSUFBSSxVQUFVLElBQUksU0FBUyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBRTtZQUN4RCxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZOLFVBQVUsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1lBQ2xDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3JDO1FBQ0QsSUFBSSxVQUFVLElBQUksU0FBUyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBRTtZQUN4RCxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZOLFVBQVUsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1lBQ2xDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3JDO1FBQ0QsSUFBSSxVQUFVLElBQUksU0FBUyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBRTtZQUN4RCxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZOLFVBQVUsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1lBQ2xDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQ3JDO0lBQ0wsQ0FBQztJQUVELFNBQWdCLFVBQVUs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R0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQzs0QkFDdEcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsQ0FBQzt5QkFDakM7cUJBQ0o7aUJBQ0o7cUJBQ0k7b0JBQ0QsSUFBSSxRQUFRLEdBQXFCLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO29CQUN6RyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztpQkFDOUI7YUFDSjtRQUNMLENBQUM7S0FDSjtJQXBDWSxtQkFBVyxjQW9DdkIsQ0FBQTtBQUNMLENBQUMsRUFuTVMsT0FBTyxLQUFQLE9BQU8sUUFtTWhCIiwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIFwiSW1wb3J0c1wiXHJcbi8vLzxyZWZlcmVuY2UgdHlwZXM9XCIuLi9GVURHRS9Db3JlL0J1aWxkL0Z1ZGdlQ29yZS5qc1wiLz5cclxuLy8vPHJlZmVyZW5jZSB0eXBlcz1cIi4uL0ZVREdFL0FpZC9CdWlsZC9GdWRnZUFpZC5qc1wiLz5cclxuLy8jZW5kcmVnaW9uIFwiSW1wb3J0c1wiXHJcblxyXG5uYW1lc3BhY2UgR2FtZSB7XHJcbiAgICBleHBvcnQgZW51bSBHQU1FU1RBVEVTIHtcclxuICAgICAgICBQTEFZSU5HLFxyXG4gICAgICAgIFBBVVNFXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGltcG9ydCDGkiA9IEZ1ZGdlQ29yZTtcclxuICAgIGV4cG9ydCBpbXBvcnQgxpJBaWQgPSBGdWRnZUFpZDtcclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiRG9tRWxlbWVudHNcIlxyXG4gICAgZXhwb3J0IGxldCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50ID0gPEhUTUxDYW52YXNFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ2FudmFzXCIpO1xyXG4gICAgLy8gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGluaXQpO1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIHN0YXJ0KTtcclxuXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJhbmdlZFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcGxheWVyQ2hvaWNlKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTWVsZWVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHBsYXllckNob2ljZSk7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJEb21FbGVtZW50c1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiUHVibGljVmFyaWFibGVzXCJcclxuICAgIGV4cG9ydCBsZXQgZ2FtZXN0YXRlOiBHQU1FU1RBVEVTID0gR0FNRVNUQVRFUy5QQVVTRTtcclxuICAgIGV4cG9ydCBsZXQgdmlld3BvcnQ6IMaSLlZpZXdwb3J0ID0gbmV3IMaSLlZpZXdwb3J0KCk7XHJcbiAgICBleHBvcnQgbGV0IGNtcENhbWVyYTogxpIuQ29tcG9uZW50Q2FtZXJhID0gbmV3IMaSLkNvbXBvbmVudENhbWVyYSgpO1xyXG4gICAgZXhwb3J0IGxldCBncmFwaDogxpIuTm9kZSA9IG5ldyDGki5Ob2RlKFwiR3JhcGhcIik7XHJcblxyXG4gICAgdmlld3BvcnQuaW5pdGlhbGl6ZShcIlZpZXdwb3J0XCIsIGdyYXBoLCBjbXBDYW1lcmEsIGNhbnZhcyk7XHJcblxyXG4gICAgZXhwb3J0IGxldCBhdmF0YXIxOiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgZXhwb3J0IGxldCBhdmF0YXIyOiBQbGF5ZXIuUGxheWVyO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY3VycmVudFJvb206IEdlbmVyYXRpb24uUm9vbTtcclxuICAgIGV4cG9ydCBsZXQgbWluaU1hcDogVUkuTWluaW1hcDtcclxuXHJcbiAgICBleHBvcnQgbGV0IGRlbHRhVGltZTogbnVtYmVyO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgc2VydmVyUHJlZGljdGlvbkF2YXRhcjogTmV0d29ya2luZy5TZXJ2ZXJQcmVkaWN0aW9uO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY3VycmVudE5ldE9iajogSW50ZXJmYWNlcy5JTmV0d29ya09iamVjdHNbXSA9IFtdO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgZW50aXRpZXM6IEVudGl0eS5FbnRpdHlbXSA9IFtdO1xyXG4gICAgZXhwb3J0IGxldCBlbmVtaWVzOiBFbmVteS5FbmVteVtdID0gW107XHJcbiAgICBleHBvcnQgbGV0IGJ1bGxldHM6IEJ1bGxldHMuQnVsbGV0W10gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgaXRlbXM6IEl0ZW1zLkl0ZW1bXSA9IFtdO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY29vbERvd25zOiBBYmlsaXR5LkNvb2xkb3duW10gPSBbXTtcclxuICAgIC8vSlNPTlxyXG4gICAgZXhwb3J0IGxldCBlbmVtaWVzSlNPTjogRW50aXR5LkVudGl0eVtdO1xyXG4gICAgZXhwb3J0IGxldCBpbnRlcm5hbEl0ZW1KU09OOiBJdGVtcy5JbnRlcm5hbEl0ZW1bXTtcclxuICAgIGV4cG9ydCBsZXQgYnVmZkl0ZW1KU09OOiBJdGVtcy5CdWZmSXRlbVtdO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgZGFtYWdlQnVmZkpTT046IEJ1ZmYuRGFtYWdlQnVmZltdO1xyXG4gICAgZXhwb3J0IGxldCBhdHRyaWJ1dGVCdWZmSlNPTjogQnVmZi5BdHRyaWJ1dGVzQnVmZltdO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgYnVsbGV0c0pTT046IEJ1bGxldHMuQnVsbGV0W107XHJcbiAgICBleHBvcnQgbGV0IGxvYWRlZCA9IGZhbHNlO1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiUHVibGljVmFyaWFibGVzXCJcclxuXHJcbiAgICAvLyNyZWdpb24gXCJQcml2YXRlVmFyaWFibGVzXCJcclxuICAgIGNvbnN0IGRhbXBlcjogbnVtYmVyID0gMy41O1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiUHJpdmF0ZVZhcmlhYmxlc1wiXHJcblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gXCJlc3NlbnRpYWxcIlxyXG4gICAgYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgICAgICBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRlWigyNSk7XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnJvdGF0ZVkoMTgwKTtcclxuXHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAvLyBHZW5lcmF0aW9uLnJvb21zID0gR2VuZXJhdGlvbi5nZW5lcmF0ZU5vcm1hbFJvb21zKCk7XHJcbiAgICAgICAgICAgIEl0ZW1zLkl0ZW1HZW5lcmF0b3IuZmlsbFBvb2woKTtcclxuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgICAgIEdlbmVyYXRpb24ucHJvY2VkdWFsUm9vbUdlbmVyYXRpb24oKTtcclxuICAgICAgICAgICAgICAgIGlmICghR2VuZXJhdGlvbi5nZW5lcmF0aW9uRmFpbGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJHRU5FUkFUSU9OIEZBSUxFRCAtPiBSRVNUQVJUIEdFTkVSQVRJT05cIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2VydmVyUHJlZGljdGlvbkF2YXRhciA9IG5ldyBOZXR3b3JraW5nLlNlcnZlclByZWRpY3Rpb24obnVsbCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBncmFwaC5hcHBlbmRDaGlsZChhdmF0YXIxKTtcclxuXHJcbiAgICAgICAgxpJBaWQuYWRkU3RhbmRhcmRMaWdodENvbXBvbmVudHMoZ3JhcGgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZSgpOiB2b2lkIHtcclxuICAgICAgICBmaW5kR2FtZU9iamVjdHMoKTtcclxuICAgICAgICBkZWx0YVRpbWUgPSBHYW1lLsaSLkxvb3AudGltZUZyYW1lR2FtZSAqIDAuMDAxO1xyXG4gICAgICAgIHBhdXNlQ2hlY2soKTtcclxuICAgICAgICBHYW1lLmF2YXRhcjEucHJlZGljdCgpO1xyXG4gICAgICAgIGNhbWVyYVVwZGF0ZSgpO1xyXG5cclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyUG9zaXRpb24oR2FtZS5hdmF0YXIxLm10eExvY2FsLnRyYW5zbGF0aW9uLCBHYW1lLmF2YXRhcjEubXR4TG9jYWwucm90YXRpb24pO1xyXG4gICAgICAgICAgICBzZXJ2ZXJQcmVkaWN0aW9uQXZhdGFyLnVwZGF0ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgVUkudXBkYXRlVUkoKTtcclxuXHJcbiAgICAgICAgZHJhdygpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbmRHYW1lT2JqZWN0cygpOiB2b2lkIHtcclxuICAgICAgICBpdGVtcyA9IDxJdGVtcy5JdGVtW10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEl0ZW1zLkl0ZW0+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuSVRFTSk7XHJcbiAgICAgICAgYnVsbGV0cyA9IDxCdWxsZXRzLkJ1bGxldFtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxCdWxsZXRzLkJ1bGxldD5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5CVUxMRVQpO1xyXG4gICAgICAgIGVudGl0aWVzID0gPEVudGl0eS5FbnRpdHlbXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihjaGlsZCA9PiAoPEVudGl0eS5FbnRpdHk+Y2hpbGQpIGluc3RhbmNlb2YgRW50aXR5LkVudGl0eSk7XHJcbiAgICAgICAgZW5lbWllcyA9IDxFbmVteS5FbmVteVtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxFbmVteS5FbmVteT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5FTkVNWSk7XHJcbiAgICAgICAgY3VycmVudFJvb20gPSAoPEdlbmVyYXRpb24uUm9vbT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbGVtID0+ICg8R2VuZXJhdGlvbi5Sb29tPmVsZW0pLnRhZyA9PSBUYWcuVEFHLlJPT00pKTtcclxuICAgICAgICBjdXJyZW50TmV0T2JqID0gc2V0TmV0T2JqKGdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW0gPT4gTmV0d29ya2luZy5pc05ldHdvcmtPYmplY3QoZWxlbSkpKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzZXROZXRPYmooX25ldE9qOiBHYW1lLsaSLk5vZGVbXSk6IEludGVyZmFjZXMuSU5ldHdvcmtPYmplY3RzW10ge1xyXG4gICAgICAgIGxldCB0ZW1wTmV0T2JqczogSW50ZXJmYWNlcy5JTmV0d29ya09iamVjdHNbXSA9IFtdO1xyXG4gICAgICAgIF9uZXRPai5mb3JFYWNoKG9iaiA9PiB7XHJcbiAgICAgICAgICAgIHRlbXBOZXRPYmpzLnB1c2goPEludGVyZmFjZXMuSU5ldHdvcmtPYmplY3RzPnsgbmV0SWQ6IE5ldHdvcmtpbmcuZ2V0TmV0SWQob2JqKSwgbmV0T2JqZWN0Tm9kZTogb2JqIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgICByZXR1cm4gdGVtcE5ldE9ianM7XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBzZXRDbGllbnQoKSB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LnNvY2tldC5yZWFkeVN0YXRlID09IE5ldHdvcmtpbmcuY2xpZW50LnNvY2tldC5PUEVOICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkUm9vbS50b0xvd2VyQ2FzZSgpICE9IFwibG9iYnlcIikge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNldENsaWVudCgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7IHNldENsaWVudCgpIH0sIDEwMCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlYWR5U2F0ZSgpIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnRzLmxlbmd0aCA+PSAyICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zZXRDbGllbnRSZWFkeSgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4geyByZWFkeVNhdGUoKSB9LCAxMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzdGFydExvb3AoKSB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAmJiBhdmF0YXIyICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLmxvYWRlZCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoR2FtZS5sb2FkZWQpIHtcclxuICAgICAgICAgICAgxpIuTG9vcC5zdGFydCjGki5MT09QX01PREUuVElNRV9HQU1FLCBkZWx0YVRpbWUpO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlVJXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0TG9vcCgpO1xyXG4gICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzdGFydCgpIHtcclxuICAgICAgICBsb2FkVGV4dHVyZXMoKTtcclxuICAgICAgICAvLyBsb2FkSlNPTigpO1xyXG5cclxuICAgICAgICAvL1RPRE86IGFkZCBzcHJpdGUgdG8gZ3JhcGhlIGZvciBzdGFydHNjcmVlblxyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRHYW1lXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcblxyXG4gICAgICAgICAgICBOZXR3b3JraW5nLmNvbm5lY3RpbmcoKTtcclxuICAgICAgICAgICAgbG9hZEpTT04oKTtcclxuXHJcbiAgICAgICAgICAgIHdhaXRPbkNvbm5lY3Rpb24oKTtcclxuICAgICAgICAgICAgYXN5bmMgZnVuY3Rpb24gd2FpdE9uQ29ubmVjdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHNldENsaWVudCgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50cy5maWx0ZXIoZWxlbSA9PiBlbGVtLnJlYWR5ID09IHRydWUpLmxlbmd0aCA+PSAyICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSU1IT1NUXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgaW5pdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGdhbWVzdGF0ZSA9IEdBTUVTVEFURVMuUExBWUlORztcclxuICAgICAgICAgICAgICAgICAgICAvLyBFbmVteVNwYXduZXIuc3Bhd25FbmVtaWVzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5lbXlTcGF3bmVyLnNwYXduQnlJRChFbmVteS5FTkVNWUNMQVNTLlNVTU1PTk9SQUREUywgRW50aXR5LklELlJFRFRJQ0ssIG5ldyDGki5WZWN0b3IyKDMsIDMpLCBhdmF0YXIxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5lbXlTcGF3bmVyLnNwYXduTXVsdGlwbGVFbmVtaWVzQXRSb29tKDUsIEdhbWUuY3VycmVudFJvb20ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFbmVteVNwYXduZXIuc3Bhd25CeUlEKEVuZW15LkVORU1ZQ0xBU1MuRU5FTVlTTUFTSCwgRW50aXR5LklELk9HRVIsIG5ldyDGki5WZWN0b3IyKDMsIDMpLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgRW5lbXlTcGF3bmVyLnNwYXduQnlJRChFbmVteS5FTkVNWUNMQVNTLlNVTU1PTk9SLCBFbnRpdHkuSUQuU1VNTU9OT1IsIG5ldyDGki5WZWN0b3IyKDMsIDMpLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vI3JlZ2lvbiBpbml0IEl0ZW1zXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaXRlbTIgPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKEl0ZW1zLklURU1JRC5QUk9KRUNUSUxFU1VQKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbTIuc2V0UG9zaXRpb24obmV3IMaSLlZlY3RvcjIoLTUsIDApKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbTIuc3Bhd24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gLy8gbGV0IGl0ZW0zID0gbmV3IEl0ZW1zLkludGVybmFsSXRlbShJdGVtcy5JVEVNSUQuU0NBTEVVUCwgbmV3IMaSLlZlY3RvcjIoLTIsIDApLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0IHppcHphcCA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oSXRlbXMuSVRFTUlELlRFU1QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB6aXB6YXAuc2V0UG9zaXRpb24obmV3IMaSLlZlY3RvcjIoNSwgMCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB6aXB6YXAuc3Bhd24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ3JhcGguYXBwZW5kQ2hpbGQoaXRlbTMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3blBsYXllcigpO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcm9vbUluZm9zOiBJbnRlcmZhY2VzLklNaW5pbWFwSW5mb3NbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29vcmRzOiBHYW1lLsaSLlZlY3RvcjJbXSA9IEdlbmVyYXRpb24uZ2V0Q29vcmRzRnJvbVJvb21zKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb29tSW5mb3MucHVzaCg8SW50ZXJmYWNlcy5JTWluaW1hcEluZm9zPnsgY29vcmRzOiBjb29yZHNbaV0sIHJvb21UeXBlOiBHZW5lcmF0aW9uLnJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzID09IGNvb3Jkc1tpXSkucm9vbVR5cGUgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtaW5pTWFwID0gbmV3IFVJLk1pbmltYXAocm9vbUluZm9zKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JhcGguYWRkQ2hpbGQobWluaU1hcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRMb29wKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQod2FpdE9uQ29ubmVjdGlvbiwgMzAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSG9zdHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcblxyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIE5ldHdvcmtpbmcuY3JlYXRlUm9vbSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSm9pblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IHJvb21JZDogc3RyaW5nID0gKDxIVE1MSW5wdXRFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiUm9vbVwiKSkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLmpvaW5Sb29tKHJvb21JZCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdXBkYXRlUm9vbXMoKTtcclxuICAgICAgICAgICAgd2FpdEZvckxvYmJ5KCk7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHdhaXRGb3JMb2JieSgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMubGVuZ3RoID4gMSAmJiBOZXR3b3JraW5nLmNsaWVudC5pZFJvb20udG9Mb2NhbGVMb3dlckNhc2UoKSAhPSBcImxvYmJ5XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJSb29tSWRcIikucGFyZW50RWxlbWVudC5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJMb2JieXNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3YWl0Rm9yTG9iYnkoKTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAyMDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBhc3luYyBmdW5jdGlvbiB1cGRhdGVSb29tcygpIHtcclxuICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5zb2NrZXQucmVhZHlTdGF0ZSA9PSBOZXR3b3JraW5nLmNsaWVudC5zb2NrZXQuT1BFTikge1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuZ2V0Um9vbXMoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVSb29tcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDIwMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvbnNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcblxyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkJhY2tPcHRpb25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ3JlZGl0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25zY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDcmVkaXRzXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ3JlZGl0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQmFja0NyZWRpdFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDcmVkaXRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvbnNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwbGF5ZXJDaG9pY2UoX2U6IEV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCg8SFRNTEJ1dHRvbkVsZW1lbnQ+X2UudGFyZ2V0KS5pZCA9PSBcIlJhbmdlZFwiKSB7XHJcbiAgICAgICAgICAgIGF2YXRhcjEgPSBuZXcgUGxheWVyLlJhbmdlZChFbnRpdHkuSUQuUkFOR0VELCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMoMTAwMDAsIDUsIDUsIDEsIDIsIDUsIDEsIDgwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICgoPEhUTUxCdXR0b25FbGVtZW50Pl9lLnRhcmdldCkuaWQgPT0gXCJNZWxlZVwiKSB7XHJcbiAgICAgICAgICAgIGF2YXRhcjEgPSBuZXcgUGxheWVyLk1lbGVlKEVudGl0eS5JRC5NRUxFRSwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKDEwMDAwLCAxLCA1LCAxLCAyLCAxMCwgMSwgODApKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJMb2JieXNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICByZWFkeVNhdGUoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGF1c2VDaGVjaygpIHtcclxuICAgICAgICBpZiAoKHdpbmRvdy5zY3JlZW5YIDwgLXdpbmRvdy5zY3JlZW4uYXZhaWxXaWR0aCkgJiYgKHdpbmRvdy5zY3JlZW5ZIDwgLXdpbmRvdy5zY3JlZW4uYXZhaWxIZWlnaHQpKSB7XHJcbiAgICAgICAgICAgIHBhdXNlKHRydWUsIGZhbHNlKTtcclxuXHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcGF1c2VDaGVjaygpO1xyXG4gICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHBsYXlpbmcodHJ1ZSwgZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcGF1c2UoX3N5bmM6IGJvb2xlYW4sIF90cmlnZ2VyT3B0aW9uOiBib29sZWFuKSB7XHJcbiAgICAgICAgaWYgKGdhbWVzdGF0ZSA9PSBHQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgaWYgKF9zeW5jKSB7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNldEdhbWVzdGF0ZShmYWxzZSk7XHJcbiAgICAgICAgICAgIH0gaWYgKF90cmlnZ2VyT3B0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvbnNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGJhY2sgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkJhY2tPcHRpb25cIik7XHJcbiAgICAgICAgICAgICAgICBsZXQgYmFja0Nsb25lID0gYmFjay5jbG9uZU5vZGUodHJ1ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgYmFjay5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChiYWNrQ2xvbmUsIGJhY2spO1xyXG5cclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQmFja09wdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZ2FtZXN0YXRlID0gR0FNRVNUQVRFUy5QQVVTRTtcclxuICAgICAgICAgICAgxpIuTG9vcC5zdG9wKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBwbGF5aW5nKF9zeW5jOiBib29sZWFuLCBfdHJpZ2dlck9wdGlvbjogYm9vbGVhbikge1xyXG4gICAgICAgIGlmIChnYW1lc3RhdGUgPT0gR0FNRVNUQVRFUy5QQVVTRSkge1xyXG4gICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc2V0R2FtZXN0YXRlKHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfdHJpZ2dlck9wdGlvbikge1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25zY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZ2FtZXN0YXRlID0gR0FNRVNUQVRFUy5QTEFZSU5HO1xyXG4gICAgICAgICAgICDGki5Mb29wLmNvbnRpbnVlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIGxvYWRKU09OKCkge1xyXG4gICAgICAgIGNvbnN0IGxvYWRFbmVteSA9IGF3YWl0IChhd2FpdCBmZXRjaChcIi4vUmVzb3VyY2VzL0VuZW1pZXNTdG9yYWdlLmpzb25cIikpLmpzb24oKTtcclxuICAgICAgICBlbmVtaWVzSlNPTiA9ICg8RW50aXR5LkVudGl0eVtdPmxvYWRFbmVteS5lbmVtaWVzKTtcclxuXHJcbiAgICAgICAgY29uc3QgbG9hZEl0ZW0gPSBhd2FpdCAoYXdhaXQgZmV0Y2goXCIuL1Jlc291cmNlcy9JdGVtU3RvcmFnZS5qc29uXCIpKS5qc29uKCk7XHJcbiAgICAgICAgaW50ZXJuYWxJdGVtSlNPTiA9ICg8SXRlbXMuSW50ZXJuYWxJdGVtW10+bG9hZEl0ZW0uaW50ZXJuYWxJdGVtcyk7XHJcbiAgICAgICAgYnVmZkl0ZW1KU09OID0gKDxJdGVtcy5CdWZmSXRlbVtdPmxvYWRJdGVtLmJ1ZmZJdGVtcyk7XHJcblxyXG5cclxuICAgICAgICBjb25zdCBsb2FkQnVsbGV0cyA9IGF3YWl0IChhd2FpdCBmZXRjaChcIi4vUmVzb3VyY2VzL0J1bGxldFN0b3JhZ2UuanNvblwiKSkuanNvbigpO1xyXG4gICAgICAgIGJ1bGxldHNKU09OID0gKDxCdWxsZXRzLkJ1bGxldFtdPmxvYWRCdWxsZXRzLnN0YW5kYXJkQnVsbGV0cyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGxvYWRCdWZmcyA9IGF3YWl0IChhd2FpdCBmZXRjaChcIi4vUmVzb3VyY2VzL0J1ZmZTdG9yYWdlLmpzb25cIikpLmpzb24oKTtcclxuICAgICAgICBkYW1hZ2VCdWZmSlNPTiA9ICg8QnVmZi5EYW1hZ2VCdWZmW10+bG9hZEJ1ZmZzLmRhbWFnZUJ1ZmYpO1xyXG4gICAgICAgIGF0dHJpYnV0ZUJ1ZmZKU09OID0gKDxCdWZmLkF0dHJpYnV0ZXNCdWZmW10+bG9hZEJ1ZmZzLmF0dHJpYnV0ZUJ1ZmYpO1xyXG5cclxuICAgICAgICBjb25zb2xlLndhcm4oXCJhbGwgSlNPTiBsb2FkZWRcIik7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkVGV4dHVyZXMoKSB7XHJcbiAgICAgICAgYXdhaXQgR2VuZXJhdGlvbi50eHRTdGFydFJvb20ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1Jvb21zL21hcDAxLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgQnVsbGV0cy5idWxsZXRUeHQubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1Byb2plY3RpbGVzL2Fycm93LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBCdWxsZXRzLndhdGVyQmFsbFR4dC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUHJvamVjdGlsZXMvd2F0ZXJCYWxsLnBuZ1wiKVxyXG5cclxuICAgICAgICAvL1VJXHJcbiAgICAgICAgYXdhaXQgVUkudHh0WmVyby5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGUwLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRPbmUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlMS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0VG93LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTIucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFRocmVlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTMucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dEZvdXIubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlNC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0Rml2ZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU1LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRTaXgubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlNi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0U2V2ZW4ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlNy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0RWlnaHQubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlOC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0TmluZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU5LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRUZW4ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlMTAucG5nXCIpO1xyXG5cclxuICAgICAgICAvL1VJIHBhcnRpY2xlXHJcbiAgICAgICAgYXdhaXQgVUkuaGVhbFBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvaGVhbGluZy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkucG9pc29uUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9wb2lzb24ucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLmJ1cm5QYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL3BvaXNvbi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuYmxlZWRpbmdQYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL2JsZWVkaW5nLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5zbG93UGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9zbG93LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5pbW11bmVQYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL2ltbXVuZS5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IFVJLmNvbW1vblBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvUmFyaXR5L2NvbW1vbi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkucmFyZVBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvUmFyaXR5L3JhcmUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLmVwaWNQYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL1Jhcml0eS9lcGljLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5sZWdlbmRhcnlQYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL1Jhcml0eS9sZWdlbmRhcnkucG5nXCIpO1xyXG5cclxuXHJcbiAgICAgICAgYXdhaXQgRW50aXR5LnR4dFNoYWRvdy5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL3NoYWRvdy5wbmdcIik7XHJcblxyXG4gICAgICAgIC8vTWluaW1hcFxyXG4gICAgICAgIGF3YWl0IFVJLm5vcm1hbFJvb20ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL01pbmltYXAvbm9ybWFsLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5jaGFsbGVuZ2VSb29tLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9NaW5pbWFwL2NoYWxsZW5nZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkubWVyY2hhbnRSb29tLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9NaW5pbWFwL21lcmNoYW50LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50cmVhc3VyZVJvb20ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL01pbmltYXAvdHJlYXN1cmUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLmJvc3NSb29tLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9NaW5pbWFwL2Jvc3MucG5nXCIpO1xyXG5cclxuXHJcbiAgICAgICAgLy9FTkVNWVxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0QmF0SWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9iYXQvYmF0SWRsZS5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0UmVkVGlja0lkbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvdGljay9yZWRUaWNrSWRsZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRSZWRUaWNrV2Fsay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy90aWNrL3JlZFRpY2tXYWxrLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRTbWFsbFRpY2tJZGxlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3NtYWxsVGljay9zbWFsbFRpY2tJZGxlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFNtYWxsVGlja1dhbGsubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc21hbGxUaWNrL3NtYWxsVGlja1dhbGsucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFNrZWxldG9uSWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9za2VsZXRvbi9za2VsZXRvbklkbGUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U2tlbGV0b25XYWxrLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3NrZWxldG9uL3NrZWxldG9uV2Fsay5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0T2dlcklkbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvb2dlci9vZ2VySWRsZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRPZ2VyV2Fsay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9vZ2VyL29nZXJXYWxrLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dE9nZXJBdHRhY2subG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvb2dlci9vZ2VyQXR0YWNrLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRTdW1tb25lcklkbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc3VtbW9uZXIvc3VtbW9uZXJJZGxlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFN1bW1vbmVyU3VtbW9uLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3N1bW1vbmVyL3N1bW1vbmVyU21hc2gucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U3VtbW9uZXJUZWxlcG9ydC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9zdW1tb25lci9zdW1tb25lclRlbGVwb3J0LnBuZ1wiKTtcclxuXHJcblxyXG5cclxuXHJcbiAgICAgICAgLy9JdGVtc1xyXG4gICAgICAgIGF3YWl0IEl0ZW1zLnR4dEljZUJ1Y2tldC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvSXRlbXMvaWNlQnVja2V0LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBJdGVtcy50eHREbWdVcC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvSXRlbXMvZGFtYWdlVXAucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEl0ZW1zLnR4dEhlYWx0aFVwLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy9oZWFsdGhVcC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgSXRlbXMudHh0U3BlZWRVcC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvSXRlbXMvc3BlZWRVcC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgSXRlbXMudHh0VG94aWNSZWxhdGlvbnNoaXAubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0l0ZW1zL3RveGljUmVsYXRpb25zaGlwLnBuZ1wiKTtcclxuXHJcblxyXG4gICAgICAgIEFuaW1hdGlvbkdlbmVyYXRpb24uZ2VuZXJhdGVBbmltYXRpb25PYmplY3RzKCk7XHJcblxyXG4gICAgICAgIC8vVE9ETzogVVNFIFRISVNcclxuICAgICAgICAvLyBjb25zb2xlLmNsZWFyKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZHJhdygpOiB2b2lkIHtcclxuICAgICAgICB2aWV3cG9ydC5kcmF3KCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbWVyYVVwZGF0ZSgpIHtcclxuICAgICAgICBsZXQgZGlyZWN0aW9uID0gxpIuVmVjdG9yMi5ESUZGRVJFTkNFKGF2YXRhcjEubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICBkaXJlY3Rpb24uc2NhbGUoZGVsdGFUaW1lICogZGFtcGVyKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkaXJlY3Rpb24uc2NhbGUoYXZhdGFyMS5jbGllbnQubWluVGltZUJldHdlZW5UaWNrcyAqIGRhbXBlcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGUobmV3IMaSLlZlY3RvcjMoLWRpcmVjdGlvbi54LCBkaXJlY3Rpb24ueSwgMCksIHRydWUpO1xyXG4gICAgICAgIG1pbmlNYXAubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRpb24ueCArIG1pbmlNYXAub2Zmc2V0WCwgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uLnkgKyBtaW5pTWFwLm9mZnNldFksIDApO1xyXG4gICAgfVxyXG5cclxuICAgIMaSLkxvb3AuYWRkRXZlbnRMaXN0ZW5lcijGki5FVkVOVC5MT09QX0ZSQU1FLCB1cGRhdGUpO1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiZXNzZW50aWFsXCJcclxuXHJcbn1cclxuIiwibmFtZXNwYWNlIFVJIHtcclxuICAgIC8vbGV0IGRpdlVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlVJXCIpO1xyXG4gICAgbGV0IHBsYXllcjFVSTogSFRNTERpdkVsZW1lbnQgPSA8SFRNTERpdkVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJQbGF5ZXIxXCIpO1xyXG4gICAgbGV0IHBsYXllcjJVSTogSFRNTERpdkVsZW1lbnQgPSA8SFRNTERpdkVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJQbGF5ZXIyXCIpO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVVSSgpIHtcclxuICAgICAgICAvL0F2YXRhcjEgVUlcclxuICAgICAgICAoPEhUTUxEaXZFbGVtZW50PnBsYXllcjFVSS5xdWVyeVNlbGVjdG9yKFwiI0hQXCIpKS5zdHlsZS53aWR0aCA9IChHYW1lLmF2YXRhcjEuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLyBHYW1lLmF2YXRhcjEuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgKiAxMDApICsgXCIlXCI7XHJcblxyXG4gICAgICAgIC8vSW52ZW50b3J5VUlcclxuICAgICAgICB1cGRhdGVJbnZVSShHYW1lLmF2YXRhcjEuaXRlbXMsIHBsYXllcjFVSSk7XHJcblxyXG4gICAgICAgIC8vQXZhdGFyMiBVSVxyXG5cclxuICAgICAgICAoPEhUTUxEaXZFbGVtZW50PnBsYXllcjJVSS5xdWVyeVNlbGVjdG9yKFwiI0hQXCIpKS5zdHlsZS53aWR0aCA9IChHYW1lLmF2YXRhcjIuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLyBHYW1lLmF2YXRhcjIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgKiAxMDApICsgXCIlXCI7XHJcblxyXG4gICAgICAgIC8vSW52ZW50b3J5VUlcclxuICAgICAgICB1cGRhdGVJbnZVSShHYW1lLmF2YXRhcjIuaXRlbXMsIHBsYXllcjJVSSk7XHJcblxyXG5cclxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVJbnZVSShfaW52OiBJdGVtcy5JdGVtW10sIF91aTogSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgX3VpLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbWdcIikuZm9yRWFjaCgoaW1nRWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlbW92ZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBfaW52LmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW1nTmFtZSA9IGVsZW1lbnQuaW1nU3JjLnNwbGl0KFwiL1wiKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW1nRWxlbWVudC5zcmMuc3BsaXQoXCIvXCIpLmZpbmQoZWxlbSA9PiBlbGVtID09IGltZ05hbWVbaW1nTmFtZS5sZW5ndGggLSAxXSkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmIChyZW1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbWdFbGVtZW50LnBhcmVudEVsZW1lbnQucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgX2ludi5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZXhzaXN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmltZ1NyYyA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgICAgICAgICAgICAgX3VpLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbWdcIikuZm9yRWFjaCgoaW1nRWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGltZ05hbWUgPSBlbGVtZW50LmltZ1NyYy5zcGxpdChcIi9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1nRWxlbWVudC5zcmMuc3BsaXQoXCIvXCIpLmZpbmQoZWxlbSA9PiBlbGVtID09IGltZ05hbWVbaW1nTmFtZS5sZW5ndGggLSAxXSkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4c2lzdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vbm9uZSBleHNpc3RpbmcgRE9NSW1nIGZvciBJdGVtXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFleHNpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpdjogSFRNTERpdkVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdEaXYuY2xhc3NOYW1lID0gXCJ0b29sdGlwXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbTogSFRNTEltYWdlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc3JjID0gZWxlbWVudC5pbWdTcmM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0Rpdi5hcHBlbmRDaGlsZChuZXdJdGVtKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdUb29sdGlwOiBIVE1MU3BhbkVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9vbHRpcC50ZXh0Q29udGVudCA9IGVsZW1lbnQuZGVzY3JpcHRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rvb2x0aXAuY2xhc3NOYW1lID0gXCJ0b29sdGlwdGV4dFwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdEaXYuYXBwZW5kQ2hpbGQobmV3VG9vbHRpcCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3VG9vbHRpcExhYmVsOiBIVE1MUGFyYWdyYXBoRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJwXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUb29sdGlwTGFiZWwudGV4dENvbnRlbnQgPSBlbGVtZW50Lm5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rvb2x0aXAuaW5zZXJ0QWRqYWNlbnRFbGVtZW50KFwiYWZ0ZXJiZWdpblwiLCBuZXdUb29sdGlwTGFiZWwpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX3VpLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLmFwcGVuZENoaWxkKG5ld0Rpdik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRaZXJvOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE9uZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRUb3c6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VGhyZWU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0Rm91cjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRGaXZlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNpeDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTZXZlbjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRFaWdodDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHROaW5lOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFRlbjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBEYW1hZ2VVSSBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLlVJO1xyXG4gICAgICAgIHVwOiBudW1iZXIgPSAwLjE1O1xyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXIgPSAwLjUgKiA2MDtcclxuICAgICAgICByYW5kb21YOiBudW1iZXIgPSBNYXRoLnJhbmRvbSgpICogMC4wNSAtIE1hdGgucmFuZG9tKCkgKiAwLjA1O1xyXG4gICAgICAgIGFzeW5jIGxpZmVzcGFuKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA+PSAwICYmIHRoaXMubGlmZXRpbWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saWZldGltZS0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfZGFtYWdlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJkYW1hZ2VVSVwiKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjMoMC4zMywgMC4zMywgMC4zMykpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgMC4yNSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWVzaCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckxpdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIikpKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUoX2RhbWFnZSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5SRU5ERVJfUFJFUEFSRSwgdGhpcy51cGRhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy5tb3ZlKCk7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXNwYW4oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIG1vdmUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShuZXcgxpIuVmVjdG9yMyh0aGlzLnJhbmRvbVgsIHRoaXMudXAsIDApKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGUoxpIuVmVjdG9yMy5PTkUoMS4wMSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZFRleHR1cmUoX2RhbWFnZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGxldCBuZXdUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgICAgICAgICAgbGV0IG5ld0NvYXQ6IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCA9IG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoKTtcclxuICAgICAgICAgICAgbGV0IG5ld010cjogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtdHJcIiwgxpIuU2hhZGVyRmxhdFRleHR1cmVkLCBuZXdDb2F0KTtcclxuICAgICAgICAgICAgbGV0IG9sZENvbUNvYXQ6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKCk7XHJcblxyXG4gICAgICAgICAgICBvbGRDb21Db2F0ID0gdGhpcy5nZXRDb21wb25lbnQoxpIuQ29tcG9uZW50TWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChNYXRoLmFicyhfZGFtYWdlKSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFplcm87XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0T25lO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFRvdztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRUaHJlZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNDpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRGb3VyO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEZpdmU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDY6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0U2V2ZW47XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDc6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0RWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDg6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0RWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDk6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0TmluZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMTA6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0VGVuO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RhbWFnZSA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdDb2F0LmNvbG9yID0gxpIuQ29sb3IuQ1NTKFwicmVkXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbmV3Q29hdC5jb2xvciA9IMaSLkNvbG9yLkNTUyhcImdyZWVuXCIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cCA9IDAuMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBuZXdDb2F0LnRleHR1cmUgPSBuZXdUeHQ7XHJcbiAgICAgICAgICAgIG9sZENvbUNvYXQubWF0ZXJpYWwgPSBuZXdNdHI7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBsZXQgaGVhbFBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHBvaXNvblBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IGJ1cm5QYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBibGVlZGluZ1BhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHNsb3dQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBpbW11bmVQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY29tbW9uUGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgcmFyZVBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IGVwaWNQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBsZWdlbmRhcnlQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBQYXJ0aWNsZXMgZXh0ZW5kcyBHYW1lLsaSQWlkLk5vZGVTcHJpdGUge1xyXG4gICAgICAgIGlkOiBCdWZmLkJVRkZJRCB8IEl0ZW1zLlJBUklUWTtcclxuICAgICAgICBhbmltYXRpb25QYXJ0aWNsZXM6IEdhbWUuxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb247XHJcbiAgICAgICAgcGFydGljbGVmcmFtZU51bWJlcjogbnVtYmVyO1xyXG4gICAgICAgIHBhcnRpY2xlZnJhbWVSYXRlOiBudW1iZXI7XHJcbiAgICAgICAgd2lkdGg6IG51bWJlcjtcclxuICAgICAgICBoZWlnaHQ6IG51bWJlcjtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEJ1ZmYuQlVGRklEIHwgSXRlbXMuUkFSSVRZLCBfdGV4dHVyZTogR2FtZS7Gki5UZXh0dXJlSW1hZ2UsIF9mcmFtZUNvdW50OiBudW1iZXIsIF9mcmFtZVJhdGU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihCdWZmLkJVRkZJRFtfaWRdLnRvTG93ZXJDYXNlKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gX2lkO1xyXG4gICAgICAgICAgICB0aGlzLnBhcnRpY2xlZnJhbWVOdW1iZXIgPSBfZnJhbWVDb3VudDtcclxuICAgICAgICAgICAgdGhpcy5wYXJ0aWNsZWZyYW1lUmF0ZSA9IF9mcmFtZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uUGFydGljbGVzID0gbmV3IEdhbWUuxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24oQnVmZi5CVUZGSURbX2lkXS50b0xvd2VyQ2FzZSgpLCBuZXcgxpIuQ29hdFRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpLCBfdGV4dHVyZSkpXHJcbiAgICAgICAgICAgIHRoaXMuaGVpZ2h0ID0gX3RleHR1cmUuaW1hZ2UuaGVpZ2h0O1xyXG4gICAgICAgICAgICB0aGlzLndpZHRoID0gX3RleHR1cmUuaW1hZ2Uud2lkdGggLyB0aGlzLnBhcnRpY2xlZnJhbWVOdW1iZXI7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvblBhcnRpY2xlcy5nZW5lcmF0ZUJ5R3JpZCjGki5SZWN0YW5nbGUuR0VUKDAsIDAsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSwgdGhpcy5wYXJ0aWNsZWZyYW1lTnVtYmVyLCAzMiwgxpIuT1JJR0lOMkQuQ0VOVEVSLCDGki5WZWN0b3IyLlgodGhpcy53aWR0aCkpO1xyXG4gICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbih0aGlzLmFuaW1hdGlvblBhcnRpY2xlcyk7XHJcbiAgICAgICAgICAgIHRoaXMuZnJhbWVyYXRlID0gX2ZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IEdhbWUuxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0ZVooMC4wMDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgVGFnIHtcclxuICAgIGV4cG9ydCBlbnVtIFRBRyB7XHJcbiAgICAgICAgUExBWUVSLFxyXG4gICAgICAgIEVORU1ZLFxyXG4gICAgICAgIEJVTExFVCxcclxuICAgICAgICBJVEVNLFxyXG4gICAgICAgIFJPT00sXHJcbiAgICAgICAgV0FMTCxcclxuICAgICAgICBET09SLFxyXG4gICAgICAgIE9CU1RJQ0FMLFxyXG4gICAgICAgIFVJXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW50aXR5IHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW50aXR5IGV4dGVuZHMgR2FtZS7GkkFpZC5Ob2RlU3ByaXRlIGltcGxlbWVudHMgSW50ZXJmYWNlcy5JTmV0d29ya2FibGUge1xyXG4gICAgICAgIHByb3RlY3RlZCBjdXJyZW50QW5pbWF0aW9uU3RhdGU6IEFOSU1BVElPTlNUQVRFUztcclxuICAgICAgICBwcml2YXRlIHBlcmZvcm1Lbm9ja2JhY2s6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHO1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBuZXRPYmplY3ROb2RlOiDGki5Ob2RlID0gdGhpcztcclxuICAgICAgICBwdWJsaWMgaWQ6IEVudGl0eS5JRDtcclxuICAgICAgICBwdWJsaWMgYXR0cmlidXRlczogQXR0cmlidXRlcztcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG4gICAgICAgIHB1YmxpYyBpdGVtczogQXJyYXk8SXRlbXMuSXRlbT4gPSBbXTtcclxuICAgICAgICBwdWJsaWMgYnVmZnM6IEJ1ZmYuQnVmZltdID0gW107XHJcbiAgICAgICAgcHVibGljIG9mZnNldENvbGxpZGVyWDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBvZmZzZXRDb2xsaWRlclk6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXJTY2FsZUZha3RvcjogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyB3ZWFwb246IFdlYXBvbnMuV2VhcG9uO1xyXG4gICAgICAgIHByb3RlY3RlZCBjYW5Nb3ZlWDogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgcHJvdGVjdGVkIGNhbk1vdmVZOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICBwcm90ZWN0ZWQgbW92ZURpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICBwcm90ZWN0ZWQgYW5pbWF0aW9uQ29udGFpbmVyOiBBbmltYXRpb25HZW5lcmF0aW9uLkFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgICAgICBwcm90ZWN0ZWQgaWRsZVNjYWxlOiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGN1cnJlbnRLbm9ja2JhY2s6IMaSLlZlY3RvcjMgPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICBwdWJsaWMgc2hhZG93OiBTaGFkb3c7XHJcblxyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKGdldE5hbWVCeUlkKF9pZCkpO1xyXG4gICAgICAgICAgICB0aGlzLm5ldElkID0gTmV0d29ya2luZy5JZE1hbmFnZXIoX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0gbmV3IEF0dHJpYnV0ZXMoMSwgMSwgMSwgMSwgMSwgMSwgMSwgMSk7XHJcbiAgICAgICAgICAgIGlmIChBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGFuaSA9IEFuaW1hdGlvbkdlbmVyYXRpb24uZ2V0QW5pbWF0aW9uQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uQ29udGFpbmVyID0gYW5pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pZGxlU2NhbGUgPSBhbmkuc2NhbGUuZmluZChhbmltYXRpb24gPT4gYW5pbWF0aW9uWzBdID09IFwiaWRsZVwiKVsxXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm9mZnNldENvbGxpZGVyWCA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMub2Zmc2V0Q29sbGlkZXJZID0gMDtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlclNjYWxlRmFrdG9yID0gMTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcihuZXcgxpIuVmVjdG9yMih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKyAodGhpcy5vZmZzZXRDb2xsaWRlclggKiB0aGlzLm10eExvY2FsLnNjYWxpbmcueCksIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueSArICh0aGlzLm9mZnNldENvbGxpZGVyWSAqIHRoaXMubXR4TG9jYWwuc2NhbGluZy55KSksICh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyKSAqIHRoaXMuY29sbGlkZXJTY2FsZUZha3RvciwgdGhpcy5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoQW5pbWF0aW9uR2VuZXJhdGlvbi5nZXRBbmltYXRpb25CeUlkKHRoaXMuaWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGxldCBhbmkgPSBBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFuaW1hdGlvbkNvbnRhaW5lciA9IGFuaTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaWRsZVNjYWxlID0gYW5pLnNjYWxlLmZpbmQoYW5pbWF0aW9uID0+IGFuaW1hdGlvblswXSA9PSBcImlkbGVcIilbMV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5zaGFkb3cgPSBuZXcgU2hhZG93KHRoaXMpO1xyXG4gICAgICAgICAgICAvLyB0aGlzLmFkZENoaWxkKHRoaXMuc2hhZG93KTtcclxuICAgICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuUkVOREVSX1BSRVBBUkUsIHRoaXMuZXZlbnRVcGRhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQnVmZnMoKTtcclxuICAgICAgICAgICAgdGhpcy5zaGFkb3cudXBkYXRlU2hhZG93UG9zKCk7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0Q29sbGlkZXIoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZVNjYWxlKCkge1xyXG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMudXBkYXRlU2NhbGVEZXBlbmRlbmNpZXMoKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IMaSLlZlY3RvcjModGhpcy5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMuYXR0cmlidXRlcy5zY2FsZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIuc2V0UmFkaXVzKCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyKSAqIHRoaXMuY29sbGlkZXJTY2FsZUZha3Rvcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0Q29sbGlkZXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIuc2V0UG9zaXRpb24obmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgKHRoaXMub2Zmc2V0Q29sbGlkZXJYICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLngpLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKyAodGhpcy5vZmZzZXRDb2xsaWRlclkgKiB0aGlzLm10eExvY2FsLnNjYWxpbmcueSkpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCB1cGRhdGVCdWZmcygpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnVmZnMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnVmZnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVmZnNbaV0uZG9CdWZmU3R1ZmYodGhpcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBjb2xsaWRlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSB0cnVlO1xyXG4gICAgICAgICAgICBsZXQgd2FsbHM6IEdlbmVyYXRpb24uV2FsbFtdID0gR2FtZS5jdXJyZW50Um9vbS53YWxscztcclxuICAgICAgICAgICAgbGV0IHdhbGxDb2xsaWRlcnM6IEdhbWUuxpIuUmVjdGFuZ2xlW10gPSBbXTtcclxuICAgICAgICAgICAgd2FsbHMuZm9yRWFjaChlbGVtID0+IHtcclxuICAgICAgICAgICAgICAgIHdhbGxDb2xsaWRlcnMucHVzaChlbGVtLmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgbGV0IG1ld0RpcmVjdGlvbiA9IF9kaXJlY3Rpb24uY2xvbmU7XHJcbiAgICAgICAgICAgIGlmICghbWV3RGlyZWN0aW9uLmVxdWFscyhHYW1lLsaSLlZlY3RvcjMuWkVSTygpKSkge1xyXG4gICAgICAgICAgICAgICAgbWV3RGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgbWV3RGlyZWN0aW9uLnNjYWxlKChHYW1lLmRlbHRhVGltZSAqIHRoaXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlQ29sbGlzaW9uKHdhbGxDb2xsaWRlcnMsIG1ld0RpcmVjdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgY2FsY3VsYXRlQ29sbGlzaW9uKF9jb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXJbXSB8IEdhbWUuxpIuUmVjdGFuZ2xlW10sIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgX2NvbGxpZGVyLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgQ29sbGlkZXIuQ29sbGlkZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQmVmb3JlTW92ZSA9IGludGVyc2VjdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IHRoaXMuY29sbGlkZXIuZ2V0UmFkaXVzICsgZWxlbWVudC5nZXRSYWRpdXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvbGRQb3NpdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIodGhpcy5jb2xsaWRlci5wb3NpdGlvbi54LCB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoX2RpcmVjdGlvbi54LCAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50KSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVggPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMigwLCBfZGlyZWN0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50KSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5vd25lck5ldElkID09IEdhbWUuYXZhdGFyMS5uZXRJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5nZXRLbm9ja2JhY2sodGhpcy5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50Lm93bmVyTmV0SWQgPT0gR2FtZS5hdmF0YXIyLm5ldElkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5rbm9ja2JhY2tQdXNoKHRoaXMuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChlbGVtZW50IGluc3RhbmNlb2YgR2FtZS7Gki5SZWN0YW5nbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlc1JlY3QoZWxlbWVudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFCZWZvcmVNb3ZlID0gaW50ZXJzZWN0aW9uLmhlaWdodCAqIGludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IHRoaXMubXR4TG9jYWwuc2NhbGluZy54ICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvbGRQb3NpdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIodGhpcy5jb2xsaWRlci5wb3NpdGlvbi54LCB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoX2RpcmVjdGlvbi54LCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uLmhlaWdodCAqIG5ld0ludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoMCwgX2RpcmVjdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uLmhlaWdodCAqIG5ld0ludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVZID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogZG9lcyBEYW1hZ2UgdG8gdGhlIEVudGl0eVxyXG4gICAgICAgICAqIEBwYXJhbSBfdmFsdWUgdmFsdWUgaG93IG11Y2ggZGFtYWdlIGlzIGFwcGxpZWRcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgZ2V0RGFtYWdlKF92YWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChfdmFsdWUgIT0gbnVsbCAmJiB0aGlzLmF0dHJpYnV0ZXMuaGl0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBoaXRWYWx1ZSA9IHRoaXMuZ2V0RGFtYWdlUmVkdWN0aW9uKF92YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyAtPSBoaXRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBVSS5EYW1hZ2VVSSh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLCBNYXRoLnJvdW5kKGhpdFZhbHVlKSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlVUkodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgTWF0aC5yb3VuZChoaXRWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IHRoaXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHR5cGU6IEFUVFJJQlVURVRZUEUuSEVBTFRIUE9JTlRTIH0sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucmVtb3ZlRW50aXR5KHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGllKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkaWUoKSB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcucG9wSUQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGdldERhbWFnZVJlZHVjdGlvbihfdmFsdWU6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiBfdmFsdWUgKiAoMSAtICh0aGlzLmF0dHJpYnV0ZXMuYXJtb3IgLyAxMDApKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8jcmVnaW9uIGtub2NrYmFja1xyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMucGVyZm9ybUtub2NrYmFjaykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wZXJmb3JtS25vY2tiYWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBfcG9zaXRpb24udG9WZWN0b3IyKCkpLnRvVmVjdG9yMygwKTtcclxuICAgICAgICAgICAgICAgIGxldCBrbm9ja0JhY2tTY2FsaW5nOiBudW1iZXIgPSBHYW1lLmRlbHRhVGltZSAqIHRoaXMuYXR0cmlidXRlcy5zY2FsZTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKF9rbm9ja2JhY2tGb3JjZSAqIGtub2NrQmFja1NjYWxpbmcpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEtub2NrYmFjay5hZGQoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHJlZHVjZUtub2NrYmFjaygpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50S25vY2tiYWNrLnNjYWxlKDAuNSk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuY3VycmVudEtub2NrYmFjay5tYWduaXR1ZGUpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50S25vY2tiYWNrLm1hZ25pdHVkZSA8IDAuMDAwMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50S25vY2tiYWNrID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMucGVyZm9ybUtub2NrYmFjayA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICBwdWJsaWMgIHN3aXRjaEFuaW1hdGlvbihfbmFtZTogQU5JTUFUSU9OU1RBVEVTKSB7XHJcbiAgICAgICAgICAgIGxldCBuYW1lOiBzdHJpbmcgPSBBTklNQVRJT05TVEFURVNbX25hbWVdLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmFuaW1hdGlvbkNvbnRhaW5lciAhPSBudWxsICYmIDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRBbmltYXRpb25TdGF0ZSAhPSBfbmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoX25hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlID0gQU5JTUFUSU9OU1RBVEVTLklETEU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuV0FMSzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlID0gQU5JTUFUSU9OU1RBVEVTLldBTEs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuU1VNTU9OOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbbmFtZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QW5pbWF0aW9uU3RhdGUgPSBBTklNQVRJT05TVEFURVMuU1VNTU9OO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQU5JTUFUSU9OU1RBVEVTLkFUVEFDSzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlID0gQU5JTUFUSU9OU1RBVEVTLkFUVEFDSztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuVEVMRVBPUlQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25Db250YWluZXIuYW5pbWF0aW9uc1tuYW1lXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBbmltYXRpb25TdGF0ZSA9IEFOSU1BVElPTlNUQVRFUy5URUxFUE9SVDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmZyYW1lcmF0ZSA9IHRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmZyYW1lUmF0ZS5maW5kKG9iaiA9PiBvYmpbMF0gPT0gbmFtZSlbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRGcmFtZURpcmVjdGlvbigxKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUFuaW1hdGlvblN0YXRlKHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUud2FybihcIm5vIGFuaW1hdGlvbkNvbnRhaW5lciBvciBhbmltYXRpb24gd2l0aCBuYW1lOiBcIiArIG5hbWUgKyBcIiBhdCBFbnRpdHk6IFwiICsgdGhpcy5uYW1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGVudW0gQU5JTUFUSU9OU1RBVEVTIHtcclxuICAgICAgICBJRExFLCBXQUxLLCBTVU1NT04sIEFUVEFDSywgVEVMRVBPUlRcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBCRUhBVklPVVIge1xyXG4gICAgICAgIElETEUsIEZPTExPVywgRkxFRSwgU1VNTU9OLCBBVFRBQ0ssIFRFTEVQT1JUXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGVudW0gSUQge1xyXG4gICAgICAgIFJBTkdFRCxcclxuICAgICAgICBNRUxFRSxcclxuICAgICAgICBNRVJDSEFOVCxcclxuICAgICAgICBCQVQsXHJcbiAgICAgICAgUkVEVElDSyxcclxuICAgICAgICBTTUFMTFRJQ0ssXHJcbiAgICAgICAgU0tFTEVUT04sXHJcbiAgICAgICAgT0dFUixcclxuICAgICAgICBTVU1NT05PUlxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXROYW1lQnlJZChfaWQ6IEVudGl0eS5JRCk6IHN0cmluZyB7XHJcbiAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgY2FzZSBJRC5SQU5HRUQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJyYW5nZWRcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5NRUxFRTpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInRhbmtcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5CQVQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJiYXRcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5SRURUSUNLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwicmVkVGlja1wiO1xyXG4gICAgICAgICAgICBjYXNlIElELlNNQUxMVElDSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInNtYWxsVGlja1wiO1xyXG4gICAgICAgICAgICBjYXNlIElELlNLRUxFVE9OOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwic2tlbGV0b25cIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5PR0VSOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwib2dlclwiO1xyXG4gICAgICAgICAgICBjYXNlIElELlNLRUxFVE9OOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwic3VtbW9ub3JcIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXkge1xyXG5cclxuICAgIGV4cG9ydCBlbnVtIEVORU1ZQ0xBU1Mge1xyXG4gICAgICAgIEVORU1ZRFVNQixcclxuICAgICAgICBFTkVNWURBU0gsXHJcbiAgICAgICAgRU5FTVlTTUFTSCxcclxuICAgICAgICBFTkVNWVBBVFJPTCxcclxuICAgICAgICBFTkVNWVNIT09ULFxyXG4gICAgICAgIFNVTU1PTk9SLFxyXG4gICAgICAgIFNVTU1PTk9SQUREU1xyXG4gICAgfVxyXG5cclxuICAgIGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteSBleHRlbmRzIEVudGl0eS5FbnRpdHkgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklLbm9ja2JhY2thYmxlIHtcclxuICAgICAgICBjdXJyZW50QmVoYXZpb3VyOiBFbnRpdHkuQkVIQVZJT1VSO1xyXG4gICAgICAgIHRhcmdldDogxpIuVmVjdG9yMjtcclxuICAgICAgICBtb3ZlRGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgIGZsb2NraW5nOiBGbG9ja2luZ0JlaGF2aW91cjtcclxuICAgICAgICBpc0FnZ3Jlc3NpdmU6IGJvb2xlYW47XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuRU5FTVk7XHJcbiAgICAgICAgICAgIHRoaXMuaXNBZ2dyZXNzaXZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGxldCByZWYgPSBHYW1lLmVuZW1pZXNKU09OLmZpbmQoZW5lbXkgPT4gZW5lbXkubmFtZSA9PSBFbnRpdHkuSURbX2lkXS50b0xvd2VyQ2FzZSgpKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZWYpO1xyXG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCByZWYuYXR0cmlidXRlcy5zY2FsZSwgcmVmLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UsIHJlZi5hdHRyaWJ1dGVzLmFybW9yLCByZWYuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiwgcmVmLmF0dHJpYnV0ZXMuYWNjdXJhY3kpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbXCJpZGxlXCJdKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDAuMSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwuc2NhbGluZyA9IG5ldyDGki5WZWN0b3IzKHRoaXMuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLmF0dHJpYnV0ZXMuc2NhbGUpO1xyXG4gICAgICAgICAgICB0aGlzLm9mZnNldENvbGxpZGVyWCA9IHJlZi5vZmZzZXRDb2xsaWRlclg7XHJcbiAgICAgICAgICAgIHRoaXMub2Zmc2V0Q29sbGlkZXJZID0gcmVmLm9mZnNldENvbGxpZGVyWTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlclNjYWxlRmFrdG9yID0gcmVmLmNvbGxpZGVyU2NhbGVGYWt0b3I7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIobmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgKHJlZi5vZmZzZXRDb2xsaWRlclggKiB0aGlzLm10eExvY2FsLnNjYWxpbmcueCksIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueSArIChyZWYub2Zmc2V0Q29sbGlkZXJZICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnkpKSwgKCh0aGlzLm10eExvY2FsLnNjYWxpbmcueCAqIHRoaXMuaWRsZVNjYWxlKSAvIDIpICogdGhpcy5jb2xsaWRlclNjYWxlRmFrdG9yLCB0aGlzLm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHN1cGVyLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlQmVoYXZpb3VyKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmUodGhpcy5tb3ZlRGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW5lbXlQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0RGFtYWdlKF92YWx1ZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmdldERhbWFnZShfdmFsdWUpO1xyXG4gICAgICAgICAgICB0aGlzLmlzQWdncmVzc2l2ZSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5nZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlLCBfcG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBtb3ZlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgLy8gdGhpcy5tb3ZlRGlyZWN0aW9uLmFkZChfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBZ2dyZXNzaXZlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIHRoaXMubW92ZURpcmVjdGlvbi5zdWJ0cmFjdChfZGlyZWN0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgbW92ZVNpbXBsZShfdGFyZ2V0OiDGki5WZWN0b3IyKTogxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gX3RhcmdldDtcclxuICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBtb3ZlQXdheShfdGFyZ2V0OiDGki5WZWN0b3IyKTogxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgICAgIGxldCBtb3ZlU2ltcGxlID0gdGhpcy5tb3ZlU2ltcGxlKF90YXJnZXQpO1xyXG4gICAgICAgICAgICBtb3ZlU2ltcGxlLnggKj0gLTE7XHJcbiAgICAgICAgICAgIG1vdmVTaW1wbGUueSAqPSAtMTtcclxuICAgICAgICAgICAgcmV0dXJuIG1vdmVTaW1wbGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZGllKCkge1xyXG4gICAgICAgICAgICBzdXBlci5kaWUoKTtcclxuICAgICAgICAgICAgR2FtZS5jdXJyZW50Um9vbS5lbmVteUNvdW50TWFuYWdlci5vbkVuZW15RGVhdGgoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgbGV0IGtub2NrYmFjayA9IHRoaXMuY3VycmVudEtub2NrYmFjay5jbG9uZTtcclxuICAgICAgICAgICAgaWYgKGtub2NrYmFjay5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImRpcmVjdGlvbjogXCIgKyBrbm9ja2JhY2subWFnbml0dWRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5hZGQoa25vY2tiYWNrKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5zY2FsZSgoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuICAgICAgICAgICAgICAgIGtub2NrYmFjay5zY2FsZSgoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgc3VwZXIuY29sbGlkZShfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgYXZhdGFyOiBQbGF5ZXIuUGxheWVyW10gPSAoPFBsYXllci5QbGF5ZXJbXT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlBMQVlFUikpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGF2YXRhckNvbGxpZGVyczogQ29sbGlkZXIuQ29sbGlkZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgYXZhdGFyLmZvckVhY2goKGVsZW0pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBhdmF0YXJDb2xsaWRlcnMucHVzaCgoPFBsYXllci5QbGF5ZXI+ZWxlbSkuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVDb2xsaXNpb24oYXZhdGFyQ29sbGlkZXJzLCBfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jYW5Nb3ZlWCAmJiB0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNhbk1vdmVYICYmICF0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9kaXJlY3Rpb24ueCwgMCwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuY2FuTW92ZVggJiYgdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMygwLCBfZGlyZWN0aW9uLnksIF9kaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnN1YnRyYWN0KGtub2NrYmFjayk7XHJcbiAgICAgICAgICAgICAgICBpZiAoa25vY2tiYWNrLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImtub2NrYmFjazogXCIgKyBrbm9ja2JhY2subWFnbml0dWRlKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImRpcmVjdGlvbjogXCIgKyBfZGlyZWN0aW9uLm1hZ25pdHVkZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMucmVkdWNlS25vY2tiYWNrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlEdW1iIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIHB1YmxpYyBmbG9ja2luZzogRmxvY2tpbmdCZWhhdmlvdXIgPSBuZXcgRmxvY2tpbmdCZWhhdmlvdXIodGhpcywgMiwgMiwgMC4xLCAxLCAxLCAxLCAwLCAxKTtcclxuICAgICAgICBwcml2YXRlIGFnZ3Jlc3NpdmVEaXN0YW5jZTogbnVtYmVyID0gMyAqIDM7XHJcbiAgICAgICAgcHJpdmF0ZSBzdGFtaW5hOiBBYmlsaXR5LkNvb2xkb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oMTgwKTtcclxuICAgICAgICBwcml2YXRlIHJlY292ZXI6IEFiaWxpdHkuQ29vbGRvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93big2MCk7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfcG9zOiBHYW1lLsaSLlZlY3RvcjIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3BvcywgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5zdGFtaW5hLm9uRW5kQ29vbERvd24gPSAoKSA9PiB0aGlzLnJlY292ZXJTdGFtO1xyXG4gICAgICAgIH1cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGVTcXVhcmVkO1xyXG4gICAgICAgICAgICB0aGlzLmZsb2NraW5nLnVwZGF0ZSgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgdGhpcy5hZ2dyZXNzaXZlRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNBZ2dyZXNzaXZlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5pc0FnZ3Jlc3NpdmUgJiYgIXRoaXMucmVjb3Zlci5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgcmVjb3ZlclN0YW0gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucmVjb3Zlci5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuSURMRTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmVoYXZpb3VyKCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jdXJyZW50QmVoYXZpb3VyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5zdGFtaW5hLmhhc0Nvb2xEb3duICYmICF0aGlzLnJlY292ZXIuaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFtaW5hLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhbWluYS5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLmZsb2NraW5nLmdldE1vdmVWZWN0b3IoKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBzZXQgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBkbyB0aGlzLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiAodGhpcy5zdGFtaW5hLmdldEN1cnJlbnRDb29sZG93biA9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0aGlzLnJlY292ZXIuc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5JRExFO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlTbWFzaCBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICBjb29sRG93biA9IG5ldyBBYmlsaXR5LkNvb2xkb3duKDUpO1xyXG4gICAgICAgIGF2YXRhcnM6IFBsYXllci5QbGF5ZXJbXSA9IFtdO1xyXG4gICAgICAgIHJhbmRvbVBsYXllciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSk7XHJcbiAgICAgICAgY3VycmVudEJlaGF2aW91cjogRW50aXR5LkJFSEFWSU9VUiA9IEVudGl0eS5CRUhBVklPVVIuSURMRTtcclxuXHJcblxyXG4gICAgICAgIGJlaGF2aW91cigpIHtcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXJzID0gW0dhbWUuYXZhdGFyMSwgR2FtZS5hdmF0YXIyXTtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSAoPFBsYXllci5QbGF5ZXI+dGhpcy5hdmF0YXJzW3RoaXMucmFuZG9tUGxheWVyXSkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZSA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldC50b1ZlY3RvcjMoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLm1hZ25pdHVkZTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPT0gRW50aXR5LkJFSEFWSU9VUi5BVFRBQ0sgJiYgdGhpcy5nZXRDdXJyZW50RnJhbWUgPj0gKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW1wiYXR0YWNrXCJdKS5mcmFtZXMubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5JRExFO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZSA8IDQgJiYgIXRoaXMuY29vbERvd24uaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29vbERvd24uc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5BVFRBQ0s7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuY29vbERvd24uaGFzQ29vbERvd24gJiYgdGhpcy5jdXJyZW50QmVoYXZpb3VyICE9IEVudGl0eS5CRUhBVklPVVIuSURMRSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5JRExFO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIgIT0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1cpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuRk9MTE9XO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYmVoYXZpb3VyKCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jdXJyZW50QmVoYXZpb3VyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRk9MTE9XOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuV0FMSyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5tb3ZlU2ltcGxlKHRoaXMudGFyZ2V0KS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5BVFRBQ0s6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5BVFRBQ0spO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLklETEU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlEYXNoIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIHByb3RlY3RlZCBkYXNoID0gbmV3IEFiaWxpdHkuRGFzaCh0aGlzLm5ldElkLCAxMiwgMSwgNSAqIDYwLCAzKTtcclxuICAgICAgICBsYXN0TW92ZURpcmVjaXRvbjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgICAgIGRhc2hDb3VudDogbnVtYmVyID0gMTtcclxuICAgICAgICBhdmF0YXJzOiBQbGF5ZXIuUGxheWVyW10gPSBbXTtcclxuICAgICAgICByYW5kb21QbGF5ZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuZmxvY2tpbmcgPSBuZXcgRmxvY2tpbmdCZWhhdmlvdXIodGhpcywgMywgMC44LCAxLjUsIDEsIDEsIDAuMSwgMCk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcblxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFycyA9IFtHYW1lLmF2YXRhcjEsIEdhbWUuYXZhdGFyMl1cclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSAoPFBsYXllci5QbGF5ZXI+dGhpcy5hdmF0YXJzW3RoaXMucmFuZG9tUGxheWVyXSkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZSA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldC50b1ZlY3RvcjMoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLm1hZ25pdHVkZVNxdWFyZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuZmxvY2tpbmcudXBkYXRlKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuZGFzaC5oYXNDb29sZG93bigpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSAqIDEwMCA8IDAuMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kYXNoLmRvQWJpbGl0eSgpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm1vdmVEaXJlY3Rpb24ubWFnbml0dWRlU3F1YXJlZCA+IDAuMDAwNSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZGFzaC5kb2VzQWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLmZsb2NraW5nLmdldE1vdmVWZWN0b3IoKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXN0TW92ZURpcmVjaXRvbiA9IHRoaXMubW92ZURpcmVjdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GTEVFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuV0FMSyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5tb3ZlQXdheSh0aGlzLnRhcmdldCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15UGF0cm9sIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIHBhdHJvbFBvaW50czogxpIuVmVjdG9yMltdID0gW25ldyDGki5WZWN0b3IyKDAsIDQpLCBuZXcgxpIuVmVjdG9yMig1LCAwKV07XHJcbiAgICAgICAgd2FpdFRpbWU6IG51bWJlciA9IDEwMDA7XHJcbiAgICAgICAgY3VycmVuUG9pbnRJbmRleDogbnVtYmVyID0gMDtcclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5wYXRyb2woKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHBhdHJvbCgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24uZ2V0RGlzdGFuY2UoxpIuVmVjdG9yMy5TVU0odGhpcy5wYXRyb2xQb2ludHNbdGhpcy5jdXJyZW5Qb2ludEluZGV4XS50b1ZlY3RvcjMoKSwgR2FtZS5jdXJyZW50Um9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbikpID4gMC4zKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVTaW1wbGUoKMaSLlZlY3RvcjIuU1VNKHRoaXMucGF0cm9sUG9pbnRzW3RoaXMuY3VycmVuUG9pbnRJbmRleF0sIEdhbWUuY3VycmVudFJvb20ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpKSkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW5Qb2ludEluZGV4ICsgMSA8IHRoaXMucGF0cm9sUG9pbnRzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlblBvaW50SW5kZXgrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVuUG9pbnRJbmRleCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwgdGhpcy53YWl0VGltZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteVNob290IGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIHZpZXdSYWRpdXM6IG51bWJlciA9IDM7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy53ZWFwb24gPSBuZXcgV2VhcG9ucy5SYW5nZWRXZWFwb24oNjAsIDEsIEJ1bGxldHMuQlVMTEVUVFlQRS5TVEFOREFSRCwgMiwgdGhpcy5uZXRJZCwgV2VhcG9ucy5BSU0uTk9STUFMKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJlaGF2aW91cigpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKS50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgNSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GTEVFO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc0FnZ3Jlc3NpdmUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRpc3RhbmNlIDwgOSAmJiB0aGlzLmlzQWdncmVzc2l2ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLklETEU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYmVoYXZpb3VyKCk7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZVNpbXBsZSh0aGlzLnRhcmdldCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNob290KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRkxFRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZUF3YXkodGhpcy50YXJnZXQpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2hvb3QoX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbikudG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIGxldCBfZGlyZWN0aW9uID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygwKSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcblxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5tYWduaXR1ZGUgPCAzIHx8IHRoaXMuaXNBZ2dyZXNzaXZlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndlYXBvbi5zaG9vdChfZGlyZWN0aW9uLCB0cnVlLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTdW1tb25vckFkZHMgZXh0ZW5kcyBFbmVteURhc2gge1xyXG4gICAgICAgIGF2YXRhcjogUGxheWVyLlBsYXllcjtcclxuICAgICAgICByYW5kb21QbGF5ZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfdGFyZ2V0OiBQbGF5ZXIuUGxheWVyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyID0gX3RhcmdldDtcclxuICAgICAgICAgICAgdGhpcy5mbG9ja2luZyA9IG5ldyBGbG9ja2luZ0JlaGF2aW91cih0aGlzLCAzLCA1LCAxLjUsIDEsIDEsIDAuMSwgMCk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IHRoaXMuYXZhdGFyLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlID4gNSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGRpc3RhbmNlIDwgMykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kYXNoLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuZmxvY2tpbmcudXBkYXRlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5iZWhhdmlvdXIoKTtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZGFzaC5kb2VzQWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RNb3ZlRGlyZWNpdG9uID0gdGhpcy5tb3ZlRGlyZWN0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLmZsb2NraW5nLmdldE1vdmVWZWN0b3IoKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZMRUU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVBd2F5KHRoaXMudGFyZ2V0KS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIC8vIGV4cG9ydCBjbGFzcyBFbmVteUNpcmNsZSBleHRlbmRzIEVuZW15IHtcclxuICAgIC8vICAgICBkaXN0YW5jZTogbnVtYmVyID0gNTtcclxuXHJcbiAgICAvLyAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX3Byb3BlcnRpZXM6IFBsYXllci5DaGFyYWN0ZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMikge1xyXG4gICAgLy8gICAgICAgICBzdXBlcihfbmFtZSwgX3Byb3BlcnRpZXMsIF9wb3NpdGlvbik7XHJcbiAgICAvLyAgICAgfVxyXG5cclxuICAgIC8vICAgICBtb3ZlKCk6IHZvaWQge1xyXG4gICAgLy8gICAgICAgICBzdXBlci5tb3ZlKCk7XHJcbiAgICAvLyAgICAgICAgIHRoaXMubW92ZUNpcmNsZSgpO1xyXG4gICAgLy8gICAgIH1cclxuXHJcbiAgICAvLyAgICAgbGlmZXNwYW4oX2dyYXBoOiDGki5Ob2RlKTogdm9pZCB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyLmxpZmVzcGFuKF9ncmFwaCk7XHJcbiAgICAvLyAgICAgfVxyXG5cclxuICAgIC8vICAgICBhc3luYyBtb3ZlQ2lyY2xlKCkge1xyXG4gICAgLy8gICAgICAgICB0aGlzLnRhcmdldCA9IENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgIC8vICAgICAgICAgY29uc29sZS5sb2codGhpcy50YXJnZXQpO1xyXG4gICAgLy8gICAgICAgICBsZXQgZGlzdGFuY2VQbGF5ZXIxID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24uZ2V0RGlzdGFuY2UoR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAvLyAgICAgICAgIC8vIGxldCBkaXN0YW5jZVBsYXllcjIgPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZShHYW1lLnBsYXllcjIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgIC8vICAgICAgICAgaWYgKGRpc3RhbmNlUGxheWVyMSA+IHRoaXMuZGlzdGFuY2UpIHtcclxuICAgIC8vICAgICAgICAgICAgIHRoaXMubW92ZVNpbXBsZSgpO1xyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgICAgIGVsc2Uge1xyXG4gICAgLy8gICAgICAgICAgICAgbGV0IGRlZ3JlZSA9IENhbGN1bGF0aW9uLmNhbGNEZWdyZWUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMudGFyZ2V0KVxyXG4gICAgLy8gICAgICAgICAgICAgbGV0IGFkZCA9IDA7XHJcblxyXG4gICAgLy8gICAgICAgICAgICAgLy8gd2hpbGUgKGRpc3RhbmNlUGxheWVyMSA8PSB0aGlzLmRpc3RhbmNlKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIElucHV0U3lzdGVtLmNhbGNQb3NpdGlvbkZyb21EZWdyZWUoZGVncmVlICsgYWRkLCB0aGlzLmRpc3RhbmNlKS50b1ZlY3RvcjMoMCkpO1xyXG4gICAgLy8gICAgICAgICAgICAgLy8gICAgIGRpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgZGlyZWN0aW9uLnNjYWxlKCgxIC8gR2FtZS5mcmFtZVJhdGUgKiB0aGlzLnByb3BlcnRpZXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG4gICAgLy8gICAgICAgICAgICAgLy8gICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShkaXJlY3Rpb24sIHRydWUpO1xyXG4gICAgLy8gICAgICAgICAgICAgLy8gICAgIGFkZCArPSA1O1xyXG4gICAgLy8gICAgICAgICAgICAgLy8gfVxyXG5cclxuICAgIC8vICAgICAgICAgfVxyXG4gICAgLy8gICAgIH1cclxuICAgIC8vIH1cclxufSIsIm5hbWVzcGFjZSBJbnRlcmZhY2VzIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSVNwYXduYWJsZSB7XHJcbiAgICAgICAgbGlmZXRpbWU/OiBudW1iZXI7XHJcbiAgICAgICAgZGVzcGF3bigpOiB2b2lkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUtub2NrYmFja2FibGUge1xyXG4gICAgICAgIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUtpbGxhYmxlIHtcclxuICAgICAgICBvbkRlYXRoKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRGFtYWdlYWJsZSB7XHJcbiAgICAgICAgZ2V0RGFtYWdlKCk6IHZvaWQ7XHJcbiAgICB9XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElBdHRyaWJ1dGVWYWx1ZVBheWxvYWQge1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXIgfCBib29sZWFuO1xyXG4gICAgICAgIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU5ldHdvcmthYmxlIHtcclxuICAgICAgICBuZXRJZDogbnVtYmVyO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU5ldHdvcmtPYmplY3RzIHtcclxuICAgICAgICBuZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIG5ldE9iamVjdE5vZGU6IEdhbWUuxpIuTm9kZTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElJbnB1dEJ1bGxldFBheWxvYWQge1xyXG4gICAgICAgIHRpY2s6IG51bWJlcjtcclxuICAgICAgICBpbnB1dFZlY3RvcjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElJbnB1dEF2YXRhclBheWxvYWQge1xyXG4gICAgICAgIHRpY2s6IG51bWJlcjtcclxuICAgICAgICBpbnB1dFZlY3RvcjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgICAgIGRvZXNBYmlsaXR5OiBib29sZWFuO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSVN0YXRlUGF5bG9hZCB7XHJcbiAgICAgICAgdGljazogbnVtYmVyO1xyXG4gICAgICAgIHBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjM7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJTWFnYXppbiB7XHJcbiAgICAgICAgYnVsbGV0VHlwZXM6IEJ1bGxldHMuQlVMTEVUVFlQRVtdO1xyXG4gICAgICAgIGRpcmVjdGlvbnM6IEdhbWUuxpIuVmVjdG9yMltdO1xyXG4gICAgICAgIG93bmVyTmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBuZXRJZHM6IG51bWJlcltdO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGV4cG9ydCBpbnRlcmZhY2UgQnVsbGV0SW5mb3JtYXRpb24ge1xyXG4gICAgLy8gICAgIHNwZWVkOiBudW1iZXI7XHJcbiAgICAvLyAgICAgaGl0UG9pbnQ6IG51bWJlcjtcclxuICAgIC8vICAgICBsaWZlVGltZTogbnVtYmVyO1xyXG4gICAgLy8gICAgIGtub2NrYmFja0ZvcmNlOiBudW1iZXI7XHJcbiAgICAvLyAgICAgcGFzc3Rocm91Z2hFbmVteTogbnVtYmVyO1xyXG4gICAgLy8gICAgIHBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAvLyAgICAgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAvLyAgICAgcm90YXRpb25EZWc6IG51bWJlcjtcclxuICAgIC8vICAgICBob21pbmdUYXJnZXQ/OiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAvLyB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJUm9vbUV4aXRzIHtcclxuICAgICAgICBub3J0aDogYm9vbGVhbjtcclxuICAgICAgICBlYXN0OiBib29sZWFuO1xyXG4gICAgICAgIHNvdXRoOiBib29sZWFuO1xyXG4gICAgICAgIHdlc3Q6IGJvb2xlYW47XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJUm9vbSB7XHJcbiAgICAgICAgY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgICAgICByb29tU2l6ZTogbnVtYmVyO1xyXG4gICAgICAgIGV4aXRzOiBJUm9vbUV4aXRzO1xyXG4gICAgICAgIHJvb21UeXBlOiBHZW5lcmF0aW9uLlJPT01UWVBFO1xyXG4gICAgICAgIHRyYW5zbGF0aW9uOiBHYW1lLsaSLlZlY3RvcjM7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJTWluaW1hcEluZm9zIHtcclxuICAgICAgICBjb29yZHM6IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgICAgICByb29tVHlwZTogR2VuZXJhdGlvbi5ST09NVFlQRTtcclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBJdGVtcyB7XHJcbiAgICBleHBvcnQgZW51bSBJVEVNSUQge1xyXG4gICAgICAgIElDRUJVQ0tFVENIQUxMRU5HRSxcclxuICAgICAgICBETUdVUCxcclxuICAgICAgICBTUEVFRFVQLFxyXG4gICAgICAgIFBST0pFQ1RJTEVTVVAsXHJcbiAgICAgICAgSEVBTFRIVVAsXHJcbiAgICAgICAgU0NBTEVVUCxcclxuICAgICAgICBTQ0FMRURPV04sXHJcbiAgICAgICAgQVJNT1JVUCxcclxuICAgICAgICBIT01FQ09NSU5HLFxyXG4gICAgICAgIFRPWElDUkVMQVRJT05TSElQLFxyXG4gICAgICAgIFZBTVBZLFxyXG4gICAgICAgIFNMT1dZU0xPVyxcclxuICAgICAgICBUSE9SU0hBTU1FUixcclxuICAgICAgICBHRVRTVFJPTktPLFxyXG4gICAgICAgIEdFVFdFQUtPLFxyXG4gICAgICAgIFpJUFpBUCxcclxuICAgICAgICBBT0VURVNULFxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0SWNlQnVja2V0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dERtZ1VwOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dEhlYWx0aFVwOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFRveGljUmVsYXRpb25zaGlwOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNwZWVkVXA6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcblxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIEl0ZW0gZXh0ZW5kcyBHYW1lLsaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLklURU07XHJcbiAgICAgICAgaWQ6IElURU1JRDtcclxuICAgICAgICBwdWJsaWMgcmFyaXR5OiBSQVJJVFk7XHJcbiAgICAgICAgcHVibGljIG5ldElkOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbiAgICAgICAgcHVibGljIGltZ1NyYzogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7XHJcbiAgICAgICAgdHJhbnNmb3JtOiDGki5Db21wb25lbnRUcmFuc2Zvcm0gPSBuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCk7XHJcbiAgICAgICAgcHJpdmF0ZSBwb3NpdGlvbjogxpIuVmVjdG9yMjsgZ2V0IGdldFBvc2l0aW9uKCk6IMaSLlZlY3RvcjIgeyByZXR1cm4gdGhpcy5wb3NpdGlvbiB9XHJcbiAgICAgICAgYnVmZjogQnVmZi5CdWZmW10gPSBbXTtcclxuICAgICAgICBwcm90ZWN0ZWQgY2hhbmdlZFZhbHVlOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogSVRFTUlELCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoSVRFTUlEW19pZF0pO1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gX2lkO1xyXG4gICAgICAgICAgICB0aGlzLm5ldElkID0gTmV0d29ya2luZy5JZE1hbmFnZXIoX25ldElkKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyDGki5NZXNoUXVhZCgpKSk7XHJcbiAgICAgICAgICAgIGxldCBtYXRlcmlhbDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJ3aGl0ZVwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobWF0ZXJpYWwpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuYnVmZi5wdXNoKHRoaXMuZ2V0QnVmZkJ5SWQoKSk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0VGV4dHVyZUJ5SWQoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjbG9uZSgpOiBJdGVtIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBhZGRSYXJpdHlCdWZmKCkge1xyXG4gICAgICAgICAgICBsZXQgYnVmZiA9IG5ldyBCdWZmLlJhcml0eUJ1ZmYodGhpcy5yYXJpdHkpO1xyXG4gICAgICAgICAgICBidWZmLmFkZFRvSXRlbSh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBnZXRCdWZmQnlJZCgpOiBCdWZmLkJ1ZmYge1xyXG4gICAgICAgICAgICBsZXQgdGVtcDogSXRlbXMuQnVmZkl0ZW0gPSBnZXRCdWZmSXRlbUJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVE9YSUNSRUxBVElPTlNISVA6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEJ1ZmYuZ2V0QnVmZkJ5SWQoQnVmZi5CVUZGSUQuUE9JU09OKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlZBTVBZOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBCdWZmLmdldEJ1ZmZCeUlkKEJ1ZmYuQlVGRklELkJMRUVESU5HKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNMT1dZU0xPVzpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gQnVmZi5nZXRCdWZmQnlJZChCdWZmLkJVRkZJRC5TTE9XKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkdFVFNUUk9OS086XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEJ1ZmYuZ2V0QnVmZkJ5SWQoQnVmZi5CVUZGSUQuU0NBTEVVUCk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5HRVRXRUFLTzpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gQnVmZi5nZXRCdWZmQnlJZChCdWZmLkJVRkZJRC5TQ0FMRURPV04pO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGxvYWRUZXh0dXJlKF90ZXh0dXJlOiDGki5UZXh0dXJlSW1hZ2UpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IG5ld1R4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgICAgICAgICBuZXdUeHQgPSBfdGV4dHVyZTtcclxuICAgICAgICAgICAgbGV0IG5ld0NvYXQ6IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCA9IG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoKTtcclxuICAgICAgICAgICAgbmV3Q29hdC50ZXh0dXJlID0gbmV3VHh0O1xyXG4gICAgICAgICAgICBsZXQgbmV3TXRyOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm10clwiLCDGki5TaGFkZXJGbGF0VGV4dHVyZWQsIG5ld0NvYXQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRNYXRlcmlhbCkubWF0ZXJpYWwgPSBuZXdNdHI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb3RlY3RlZCBzZXRUZXh0dXJlQnlJZCgpIHtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5JQ0VCVUNLRVRDSEFMTEVOR0U6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSh0eHRJY2VCdWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuRE1HVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSh0eHREbWdVcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5TUEVFRFVQOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUodHh0U3BlZWRVcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlBST0pFQ1RJTEVTVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkhFQUxUSFVQOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUodHh0SGVhbHRoVXApO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5TQ0FMRVVQOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5TQ0FMRURPV046XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuQVJNT1JVUDpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5IT01FQ09NSU5HOlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVE9YSUNSRUxBVElPTlNISVA6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSh0eHRUb3hpY1JlbGF0aW9uc2hpcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5WQU1QWTpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5USE9SU0hBTU1FUjpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRQb3NpdGlvbihfcG9zaXRpb246IMaSLlZlY3RvcjIpIHtcclxuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IF9wb3NpdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IF9wb3NpdGlvbi50b1ZlY3RvcjMoMC4wMSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIuc2V0UG9zaXRpb24oX3Bvc2l0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIHNwYXduKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduSXRlbSh0aGlzLmlkLCB0aGlzLnBvc2l0aW9uLCB0aGlzLm5ldElkKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIGRlc3Bhd24oKTogdm9pZCB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcucG9wSUQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcucmVtb3ZlSXRlbSh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBhZGRJdGVtVG9FbnRpdHkoX2F2YXRhcjogUGxheWVyLlBsYXllcikge1xyXG4gICAgICAgICAgICBfYXZhdGFyLml0ZW1zLnB1c2godGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgcmVtb3ZlSXRlbVRvRW50aXR5KF9hdmF0YXI6IFBsYXllci5QbGF5ZXIpIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgSW50ZXJuYWxJdGVtIGV4dGVuZHMgSXRlbSB7XHJcbiAgICAgICAgdmFsdWU6IG51bWJlcjtcclxuICAgICAgICBjaG9vc2VuT25lTmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IElURU1JRCwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX25ldElkKTtcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IGdldEludGVybmFsSXRlbUJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgIGlmIChpdGVtICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uYW1lID0gaXRlbS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGl0ZW0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlc2NyaXB0aW9uID0gaXRlbS5kZXNjcmlwdGlvbjtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW1nU3JjID0gaXRlbS5pbWdTcmM7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJhcml0eSA9IGl0ZW0ucmFyaXR5O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZFJhcml0eUJ1ZmYoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRDaG9vc2VuT25lTmV0SWQoX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5jaG9vc2VuT25lTmV0SWQgPSBfbmV0SWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgYWRkSXRlbVRvRW50aXR5KF9hdmF0YXI6IFBsYXllci5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIuYWRkSXRlbVRvRW50aXR5KF9hdmF0YXIpO1xyXG4gICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZXNCeUlkKF9hdmF0YXIsIHRydWUpO1xyXG4gICAgICAgICAgICB0aGlzLmRlc3Bhd24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyByZW1vdmVJdGVtVG9FbnRpdHkoX2F2YXRhcjogUGxheWVyLlBsYXllcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZXNCeUlkKF9hdmF0YXIsIGZhbHNlKTtcclxuICAgICAgICAgICAgX2F2YXRhci5pdGVtcy5zcGxpY2UoX2F2YXRhci5pdGVtcy5pbmRleE9mKF9hdmF0YXIuaXRlbXMuZmluZChpdGVtID0+IGl0ZW0uaWQgPT0gdGhpcy5pZCkpLCAxKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjbG9uZSgpOiBJdGVtIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBJbnRlcm5hbEl0ZW0odGhpcy5pZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgc2V0QXR0cmlidXRlc0J5SWQoX2F2YXRhcjogUGxheWVyLlBsYXllciwgX2FkZDogYm9vbGVhbikge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELklDRUJVQ0tFVENIQUxMRU5HRTpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZWRWYWx1ZSA9IF9hdmF0YXIuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiAtIENhbGN1bGF0aW9uLnN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiA9IENhbGN1bGF0aW9uLnN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24gKz0gdGhpcy5jaGFuZ2VkVmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuQ09PTERPV05SRURVQ1RJT04gfSwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5ETUdVUDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzICs9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cyAtPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCB0eXBlOiBFbnRpdHkuQVRUUklCVVRFVFlQRS5BVFRBQ0tQT0lOVFMgfSwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5TUEVFRFVQOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlZFZhbHVlID0gQ2FsY3VsYXRpb24uYWRkUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkLCB0aGlzLnZhbHVlKSAtIF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkID0gQ2FsY3VsYXRpb24uYWRkUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQgLT0gdGhpcy5jaGFuZ2VkVmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuU1BFRUQgfSwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5QUk9KRUNUSUxFU1VQOlxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJvdGF0ZUJ1bGxldHMoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBtYWdhemluID0gKDxXZWFwb25zLlJhbmdlZFdlYXBvbj5fYXZhdGFyLndlYXBvbikuZ2V0TWFnYXppbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChtYWdhemluLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicm90YXRpbmdcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFnYXppblswXS5tdHhMb2NhbC5yb3RhdGVaKDQ1IC8gMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFnYXppblsxXS5tdHhMb2NhbC5yb3RhdGVaKDQ1IC8gMiAqIC0xKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPFdlYXBvbnMuUmFuZ2VkV2VhcG9uPl9hdmF0YXIud2VhcG9uKS5tYWdhemluID0gbWFnYXppbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24ucHJvamVjdGlsZUFtb3VudCArPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPFdlYXBvbnMuUmFuZ2VkV2VhcG9uPl9hdmF0YXIud2VhcG9uKS5hZGRGdW5jdGlvbihyb3RhdGVCdWxsZXRzKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLndlYXBvbi5wcm9qZWN0aWxlQW1vdW50IC09IHRoaXMudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8V2VhcG9ucy5SYW5nZWRXZWFwb24+X2F2YXRhci53ZWFwb24pLmRlbGV0ZUZ1bmN0aW9uKHJvdGF0ZUJ1bGxldHMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJXZWFwb24oX2F2YXRhci53ZWFwb24sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSEVBTFRIVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VkVmFsdWUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzLCB0aGlzLnZhbHVlKSAtIF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50TWF4UG9pbnRzID0gX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyA9IENhbGN1bGF0aW9uLmFkZFBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYW1vdW50ID0gX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAtIGN1cnJlbnRNYXhQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgKz0gYW1vdW50O1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgLT0gdGhpcy5jaGFuZ2VkVmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50TWF4UG9pbnRzID0gX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFtb3VudCA9IF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgLSBjdXJyZW50TWF4UG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC09IGFtb3VudDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogX2F2YXRhci5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuSEVBTFRIUE9JTlRTIH0sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMsIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLk1BWEhFQUxUSFBPSU5UUyB9LCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNDQUxFVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VkVmFsdWUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpIC0gX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSAtPSB0aGlzLmNoYW5nZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuU0NBTEUgfSwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5TQ0FMRURPV046XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VkVmFsdWUgPSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpIC0gX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUgPSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSAtPSB0aGlzLmNoYW5nZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuU0NBTEUgfSwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5BUk1PUlVQOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5hcm1vciArPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5hcm1vciAtPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuYXJtb3IsIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLkFSTU9SIH0sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSE9NRUNPTUlORzpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2F2YXRhciBpbnN0YW5jZW9mIFBsYXllci5SYW5nZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uLmFpbVR5cGUgPSBXZWFwb25zLkFJTS5IT01JTkc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLndlYXBvbi5haW1UeXBlID0gV2VhcG9ucy5BSU0uTk9STUFMO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKF9hdmF0YXIud2VhcG9uLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5USE9SU0hBTU1FUjpcclxuICAgICAgICAgICAgICAgICAgICAvLyBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImNvb2xkb3duVGltZVwiLCBfYXZhdGFyLndlYXBvbi5nZXRDb29sRG93bi5nZXRNYXhDb29sRG93bi50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImFpbVR5cGVcIiwgV2VhcG9ucy5BSU1bX2F2YXRhci53ZWFwb24uYWltVHlwZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiYnVsbGV0VHlwZVwiLCBCdWxsZXRzLkJVTExFVFRZUEVbX2F2YXRhci53ZWFwb24uYnVsbGV0VHlwZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicHJvamVjdGlsZUFtb3VudFwiLCBfYXZhdGFyLndlYXBvbi5wcm9qZWN0aWxlQW1vdW50LnRvU3RyaW5nKCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBfYXZhdGFyLndlYXBvbi5nZXRDb29sRG93bi5zZXRNYXhDb29sRG93biA9IDEwMCAqIDYwO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIF9hdmF0YXIud2VhcG9uLmFpbVR5cGUgPSBXZWFwb25zLkFJTS5OT1JNQUw7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gX2F2YXRhci53ZWFwb24uYnVsbGV0VHlwZSA9IEJ1bGxldHMuQlVMTEVUVFlQRS5USE9SU0hBTU1FUjtcclxuICAgICAgICAgICAgICAgICAgICAvLyBfYXZhdGFyLndlYXBvbi5wcm9qZWN0aWxlQW1vdW50ID0gMTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBfYXZhdGFyLndlYXBvbi5jYW5TaG9vdCA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uID0gbmV3IFdlYXBvbnMuVGhvcnNIYW1tZXIoMTAwICogNjAsIDEsIEJ1bGxldHMuQlVMTEVUVFlQRS5USE9SU0hBTU1FUiwgMSwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJXZWFwb24oX2F2YXRhci53ZWFwb24sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuWklQWkFQOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJdGVtOiBCdWxsZXRzLlppcFphcE9iamVjdCA9IG5ldyBCdWxsZXRzLlppcFphcE9iamVjdChfYXZhdGFyLm5ldElkLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zcGF3bigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB6aXB6YXAgPSA8QnVsbGV0cy5aaXBaYXBPYmplY3Q+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoaXRlbSA9PiAoPEJ1bGxldHMuWmlwWmFwT2JqZWN0Pml0ZW0pLnR5cGUgPT0gQnVsbGV0cy5CVUxMRVRUWVBFLlpJUFpBUCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHppcHphcC5kZXNwYXduKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuQU9FVEVTVDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgQWJpbGl0eS5BcmVhT2ZFZmZlY3QoQWJpbGl0eS5BT0VUWVBFLkhFQUxUSFVQLCBudWxsKS5hZGRUb0VudGl0eShfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPEFiaWxpdHkuQXJlYU9mRWZmZWN0Pl9hdmF0YXIuZ2V0Q2hpbGRyZW4oKS5maW5kKGNoaWxkID0+ICg8QWJpbGl0eS5BcmVhT2ZFZmZlY3Q+Y2hpbGQpLmlkID09IEFiaWxpdHkuQU9FVFlQRS5IRUFMVEhVUCkpLmRlc3Bhd24oKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEJ1ZmZJdGVtIGV4dGVuZHMgSXRlbSB7XHJcbiAgICAgICAgdmFsdWU6IG51bWJlcjtcclxuICAgICAgICB0aWNrUmF0ZTogbnVtYmVyO1xyXG4gICAgICAgIGR1cmF0aW9uOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogSVRFTUlELCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICBsZXQgdGVtcCA9IGdldEJ1ZmZJdGVtQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgdGhpcy5uYW1lID0gdGVtcC5uYW1lO1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gdGVtcC52YWx1ZTtcclxuICAgICAgICAgICAgdGhpcy50aWNrUmF0ZSA9IHRlbXAudGlja1JhdGU7XHJcbiAgICAgICAgICAgIHRoaXMuZHVyYXRpb24gPSB0ZW1wLmR1cmF0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLmltZ1NyYyA9IHRlbXAuaW1nU3JjO1xyXG4gICAgICAgICAgICB0aGlzLnJhcml0eSA9IHRlbXAucmFyaXR5O1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRSYXJpdHlCdWZmKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhZGRJdGVtVG9FbnRpdHkoX2F2YXRhcjogUGxheWVyLlBsYXllcik6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5hZGRJdGVtVG9FbnRpdHkoX2F2YXRhcik7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0QnVmZkJ5SWQoX2F2YXRhcik7XHJcbiAgICAgICAgICAgIHRoaXMuZGVzcGF3bigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNsb25lKCk6IEJ1ZmZJdGVtIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBCdWZmSXRlbSh0aGlzLmlkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldEJ1ZmZCeUlkKF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5UT1hJQ1JFTEFUSU9OU0hJUDpcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3QnVmZiA9IHRoaXMuYnVmZi5maW5kKGJ1ZmYgPT4gYnVmZi5pZCA9PSBCdWZmLkJVRkZJRC5QT0lTT04pLmNsb25lKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3QnVmZi5kdXJhdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgICAgICAoPEJ1ZmYuRGFtYWdlQnVmZj5uZXdCdWZmKS52YWx1ZSA9IDAuNTtcclxuICAgICAgICAgICAgICAgICAgICBuZXdCdWZmLmFkZFRvRW50aXR5KF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldEludGVybmFsSXRlbUJ5SWQoX2lkOiBJVEVNSUQpOiBJdGVtcy5JbnRlcm5hbEl0ZW0ge1xyXG4gICAgICAgIHJldHVybiBHYW1lLmludGVybmFsSXRlbUpTT04uZmluZChpdGVtID0+IGl0ZW0uaWQgPT0gX2lkKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0QnVmZkl0ZW1CeUlkKF9pZDogSVRFTUlEKTogSXRlbXMuQnVmZkl0ZW0ge1xyXG4gICAgICAgIHJldHVybiBHYW1lLmJ1ZmZJdGVtSlNPTi5maW5kKGl0ZW0gPT4gaXRlbS5pZCA9PSBfaWQpO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgSXRlbUdlbmVyYXRvciB7XHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgaXRlbVBvb2w6IEl0ZW1zLkl0ZW1bXSA9IFtdO1xyXG5cclxuXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBmaWxsUG9vbCgpIHtcclxuICAgICAgICAgICAgR2FtZS5pbnRlcm5hbEl0ZW1KU09OLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW1Qb29sLnB1c2gobmV3IEl0ZW1zLkludGVybmFsSXRlbShpdGVtLmlkKSlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIEdhbWUuYnVmZkl0ZW1KU09OLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW1Qb29sLnB1c2gobmV3IEJ1ZmZJdGVtKGl0ZW0uaWQpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldFJhbmRvbUl0ZW0oKTogSXRlbXMuSXRlbSB7XHJcbiAgICAgICAgICAgIGxldCBwb3NzaWJsZUl0ZW1zOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuICAgICAgICAgICAgcG9zc2libGVJdGVtcyA9IHRoaXMuZ2V0UG9zc2libGVJdGVtcygpO1xyXG4gICAgICAgICAgICBsZXQgcmFuZG9tSW5kZXggPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAocG9zc2libGVJdGVtcy5sZW5ndGggLSAxKSk7XHJcbiAgICAgICAgICAgIGxldCByZXR1cm5JdGVtID0gcG9zc2libGVJdGVtc1tyYW5kb21JbmRleF07XHJcbiAgICAgICAgICAgIC8vIHRoaXMuaXRlbVBvb2wuc3BsaWNlKHRoaXMuaXRlbVBvb2wuaW5kZXhPZihyZXR1cm5JdGVtKSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXR1cm5JdGVtLmNsb25lKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGdldFJhbmRvbUl0ZW1CeVJhcml0eShfcmFyaXR5OiBSQVJJVFkpOiBJdGVtcy5JdGVtIHtcclxuICAgICAgICAgICAgbGV0IHBvc3NpYmxlSXRlbXMgPSB0aGlzLml0ZW1Qb29sLmZpbHRlcihpdGVtID0+IGl0ZW0ucmFyaXR5ID09IF9yYXJpdHkpO1xyXG4gICAgICAgICAgICBsZXQgcmFuZG9tSW5kZXggPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAocG9zc2libGVJdGVtcy5sZW5ndGggLSAxKSk7XHJcbiAgICAgICAgICAgIGxldCByZXR1cm5JdGVtID0gcG9zc2libGVJdGVtc1tyYW5kb21JbmRleF07XHJcbiAgICAgICAgICAgIHJldHVybiByZXR1cm5JdGVtLmNsb25lKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHN0YXRpYyBnZXRQb3NzaWJsZUl0ZW1zKCk6IEl0ZW1zLkl0ZW1bXSB7XHJcbiAgICAgICAgICAgIGxldCBjaG9zZW5SYXJpdHk6IFJBUklUWSA9IHRoaXMuZ2V0UmFyaXR5KCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoY2hvc2VuUmFyaXR5KSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJBUklUWS5DT01NT046XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbVBvb2wuZmlsdGVyKGl0ZW0gPT4gaXRlbS5yYXJpdHkgPT0gUkFSSVRZLkNPTU1PTik7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJBUklUWS5SQVJFOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1Qb29sLmZpbHRlcihpdGVtID0+IGl0ZW0ucmFyaXR5ID09IFJBUklUWS5SQVJFKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgUkFSSVRZLkVQSUM6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbVBvb2wuZmlsdGVyKGl0ZW0gPT4gaXRlbS5yYXJpdHkgPT0gUkFSSVRZLkVQSUMpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBSQVJJVFkuTEVHRU5EQVJZOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1Qb29sLmZpbHRlcihpdGVtID0+IGl0ZW0ucmFyaXR5ID09IFJBUklUWS5MRUdFTkRBUlkpO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtUG9vbC5maWx0ZXIoaXRlbSA9PiBpdGVtLnJhcml0eSA9IFJBUklUWS5DT01NT04pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHN0YXRpYyBnZXRSYXJpdHkoKTogUkFSSVRZIHtcclxuICAgICAgICAgICAgbGV0IHJhcml0eU51bWJlciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDEwMCk7XHJcbiAgICAgICAgICAgIGlmIChyYXJpdHlOdW1iZXIgPj0gNTApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBSQVJJVFkuQ09NTU9OO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyYXJpdHlOdW1iZXIgPj0gMjAgJiYgcmFyaXR5TnVtYmVyIDwgNTApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBSQVJJVFkuUkFSRTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmFyaXR5TnVtYmVyID49IDUgJiYgcmFyaXR5TnVtYmVyIDwgMjApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBSQVJJVFkuRVBJQztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmFyaXR5TnVtYmVyIDwgNSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFJBUklUWS5MRUdFTkRBUlk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFJBUklUWS5DT01NT047XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBlbnVtIFJBUklUWSB7XHJcbiAgICAgICAgQ09NTU9OLFxyXG4gICAgICAgIFJBUkUsXHJcbiAgICAgICAgRVBJQyxcclxuICAgICAgICBMRUdFTkRBUllcclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBBbmltYXRpb25HZW5lcmF0aW9uIHtcclxuICAgIGV4cG9ydCBsZXQgdHh0UmVkVGlja0lkbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0UmVkVGlja1dhbGs6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dFNtYWxsVGlja0lkbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U21hbGxUaWNrV2FsazogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0QmF0SWRsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0U2tlbGV0b25JZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNrZWxldG9uV2FsazogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0T2dlcklkbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0T2dlcldhbGs6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0T2dlckF0dGFjazogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dFN1bW1vbmVySWRsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTdW1tb25lclN1bW1vbjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTdW1tb25lclRlbGVwb3J0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG5cclxuICAgIGV4cG9ydCBpbXBvcnQgxpJBaWQgPSBGdWRnZUFpZDtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQW5pbWF0aW9uQ29udGFpbmVyIHtcclxuICAgICAgICBpZDogRW50aXR5LklEO1xyXG4gICAgICAgIGFuaW1hdGlvbnM6IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9ucyA9IHt9O1xyXG4gICAgICAgIHNjYWxlOiBbc3RyaW5nLCBudW1iZXJdW10gPSBbXTtcclxuICAgICAgICBmcmFtZVJhdGU6IFtzdHJpbmcsIG51bWJlcl1bXSA9IFtdO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklEKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0QW5pbWF0aW9uQnlJZCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhZGRBbmltYXRpb24oX2FuaTogxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24sIF9zY2FsZTogbnVtYmVyLCBfZnJhbWVSYXRlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25zW19hbmkubmFtZV0gPSBfYW5pO1xyXG4gICAgICAgICAgICB0aGlzLnNjYWxlLnB1c2goW19hbmkubmFtZSwgX3NjYWxlXSk7XHJcbiAgICAgICAgICAgIHRoaXMuZnJhbWVSYXRlLnB1c2goW19hbmkubmFtZSwgX2ZyYW1lUmF0ZV0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0QW5pbWF0aW9uQnlJZCgpIHtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5CQVQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oYmF0SWRsZS5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIGJhdElkbGUuYW5pbWF0aW9uU2NhbGUsIGJhdElkbGUuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlJFRFRJQ0s6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24ocmVkVGlja0lkbGUuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCByZWRUaWNrSWRsZS5hbmltYXRpb25TY2FsZSwgcmVkVGlja0lkbGUuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihyZWRUaWNrV2Fsay5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHJlZFRpY2tXYWxrLmFuaW1hdGlvblNjYWxlLCByZWRUaWNrV2Fsay5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU01BTExUSUNLOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHNtYWxsVGlja0lkbGUuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBzbWFsbFRpY2tJZGxlLmFuaW1hdGlvblNjYWxlLCBzbWFsbFRpY2tJZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oc21hbGxUaWNrV2Fsay5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHNtYWxsVGlja1dhbGsuYW5pbWF0aW9uU2NhbGUsIHNtYWxsVGlja1dhbGsuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlNLRUxFVE9OOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHNrZWxldG9uSWRsZS5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHNrZWxldG9uSWRsZS5hbmltYXRpb25TY2FsZSwgc2tlbGV0b25JZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oc2tlbGV0b25XYWxrLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc2tlbGV0b25XYWxrLmFuaW1hdGlvblNjYWxlLCBza2VsZXRvbldhbGsuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LklELk9HRVI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24ob2dlcklkbGUuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBvZ2VySWRsZS5hbmltYXRpb25TY2FsZSwgb2dlcklkbGUuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihvZ2VyV2Fsay5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIG9nZXJXYWxrLmFuaW1hdGlvblNjYWxlLCBvZ2VyV2Fsay5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKG9nZXJBdHRhY2suZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBvZ2VyQXR0YWNrLmFuaW1hdGlvblNjYWxlLCBvZ2VyQXR0YWNrLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5TVU1NT05PUjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihzdW1tb25lcklkbGUuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBzdW1tb25lcklkbGUuYW5pbWF0aW9uU2NhbGUsIHN1bW1vbmVySWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHN1bW1vbmVyV2Fsay5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHN1bW1vbmVyV2Fsay5hbmltYXRpb25TY2FsZSwgc3VtbW9uZXJXYWxrLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oc3VtbW9uZXJTdW1tb24uZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBzdW1tb25lclN1bW1vbi5hbmltYXRpb25TY2FsZSwgc3VtbW9uZXJTdW1tb24uZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihzdW1tb25lclRlbGVwb3J0LmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc3VtbW9uZXJUZWxlcG9ydC5hbmltYXRpb25TY2FsZSwgc3VtbW9uZXJUZWxlcG9ydC5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjbGFzcyBNeUFuaW1hdGlvbkNsYXNzIHtcclxuICAgICAgICBwdWJsaWMgaWQ6IEVudGl0eS5JRDtcclxuICAgICAgICBhbmltYXRpb25OYW1lOiBzdHJpbmc7XHJcbiAgICAgICAgcHVibGljIHNwcml0ZVNoZWV0OiDGki5UZXh0dXJlSW1hZ2U7XHJcbiAgICAgICAgYW1vdW50T2ZGcmFtZXM6IG51bWJlcjtcclxuICAgICAgICBmcmFtZVJhdGU6IG51bWJlcjtcclxuICAgICAgICBnZW5lcmF0ZWRTcHJpdGVBbmltYXRpb246IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uO1xyXG4gICAgICAgIGFuaW1hdGlvblNjYWxlOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfYW5pbWF0aW9uTmFtZTogc3RyaW5nLCBfdGV4dHVyZTogxpIuVGV4dHVyZUltYWdlLCBfYW1vdW50T2ZGcmFtZXM6IG51bWJlciwgX2ZyYW1lUmF0ZTogbnVtYmVyLCkge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gX2lkO1xyXG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvbk5hbWUgPSBfYW5pbWF0aW9uTmFtZTtcclxuICAgICAgICAgICAgdGhpcy5zcHJpdGVTaGVldCA9IF90ZXh0dXJlO1xyXG4gICAgICAgICAgICB0aGlzLmZyYW1lUmF0ZSA9IF9mcmFtZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMuYW1vdW50T2ZGcmFtZXMgPSBfYW1vdW50T2ZGcmFtZXM7XHJcbiAgICAgICAgICAgIGdlbmVyYXRlQW5pbWF0aW9uRnJvbUdyaWQodGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL1RPRE86IGdldCBhbmltYXRpb24gc2NhbGVcclxuICAgIH1cclxuXHJcbiAgICAvLyNyZWdpb24gc3ByaXRlU2hlZXRcclxuICAgIGxldCBiYXRJZGxlOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG5cclxuICAgIGxldCByZWRUaWNrSWRsZTogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCByZWRUaWNrV2FsazogTXlBbmltYXRpb25DbGFzcztcclxuXHJcbiAgICBsZXQgc21hbGxUaWNrSWRsZTogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBzbWFsbFRpY2tXYWxrOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG5cclxuICAgIGxldCBza2VsZXRvbklkbGU6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgc2tlbGV0b25XYWxrOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG5cclxuICAgIGxldCBvZ2VySWRsZTogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBvZ2VyV2FsazogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBvZ2VyQXR0YWNrOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG5cclxuICAgIGxldCBzdW1tb25lcklkbGU6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgc3VtbW9uZXJXYWxrOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IHN1bW1vbmVyU3VtbW9uOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IHN1bW1vbmVyVGVsZXBvcnQ6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIEFuaW1hdGlvbkNvbnRhaW5lclxyXG4gICAgbGV0IGJhdEFuaW1hdGlvbjogQW5pbWF0aW9uQ29udGFpbmVyO1xyXG4gICAgbGV0IHJlZFRpY2tBbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIGxldCBzbWFsbFRpY2tBbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIGxldCBza2VsZXRvbkFuaW1hdGlvbjogQW5pbWF0aW9uQ29udGFpbmVyO1xyXG4gICAgbGV0IG9nZXJBbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIGxldCBzdW1tb25lckFuaW1hdGlvbjogQW5pbWF0aW9uQ29udGFpbmVyO1xyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlQW5pbWF0aW9uT2JqZWN0cygpIHtcclxuXHJcbiAgICAgICAgYmF0SWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5CQVQsIFwiaWRsZVwiLCB0eHRCYXRJZGxlLCA0LCAxMik7XHJcblxyXG4gICAgICAgIHJlZFRpY2tJZGxlID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELlJFRFRJQ0ssIFwiaWRsZVwiLCB0eHRSZWRUaWNrSWRsZSwgNiwgMTIpO1xyXG4gICAgICAgIHJlZFRpY2tXYWxrID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELlJFRFRJQ0ssIFwid2Fsa1wiLCB0eHRSZWRUaWNrV2FsaywgNCwgMTYpO1xyXG5cclxuICAgICAgICBzbWFsbFRpY2tJZGxlID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELlNNQUxMVElDSywgXCJpZGxlXCIsIHR4dFNtYWxsVGlja0lkbGUsIDYsIDEyKTtcclxuICAgICAgICBzbWFsbFRpY2tXYWxrID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELlNNQUxMVElDSywgXCJ3YWxrXCIsIHR4dFNtYWxsVGlja1dhbGssIDQsIDEyKTtcclxuXHJcbiAgICAgICAgc2tlbGV0b25JZGxlID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELlNLRUxFVE9OLCBcImlkbGVcIiwgdHh0U2tlbGV0b25JZGxlLCA1LCAxMik7XHJcbiAgICAgICAgc2tlbGV0b25XYWxrID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELlNLRUxFVE9OLCBcIndhbGtcIiwgdHh0U2tlbGV0b25XYWxrLCA3LCAxMik7XHJcblxyXG4gICAgICAgIG9nZXJJZGxlID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELk9HRVIsIFwiaWRsZVwiLCB0eHRPZ2VySWRsZSwgNSwgNik7XHJcbiAgICAgICAgb2dlcldhbGsgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuT0dFUiwgXCJ3YWxrXCIsIHR4dE9nZXJXYWxrLCA2LCA2KTtcclxuICAgICAgICBvZ2VyQXR0YWNrID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELk9HRVIsIFwiYXR0YWNrXCIsIHR4dE9nZXJBdHRhY2ssIDEwLCAxMik7XHJcblxyXG4gICAgICAgIHN1bW1vbmVySWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TVU1NT05PUiwgXCJpZGxlXCIsIHR4dFN1bW1vbmVySWRsZSwgNiwgMTIpO1xyXG4gICAgICAgIHN1bW1vbmVyV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TVU1NT05PUiwgXCJ3YWxrXCIsIHR4dFN1bW1vbmVySWRsZSwgNiwgMTIpO1xyXG4gICAgICAgIHN1bW1vbmVyU3VtbW9uID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELlNVTU1PTk9SLCBcInN1bW1vblwiLCB0eHRTdW1tb25lclN1bW1vbiwgMTMsIDEyKTtcclxuICAgICAgICBzdW1tb25lclRlbGVwb3J0ID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELlNVTU1PTk9SLCBcInRlbGVwb3J0XCIsIHR4dFN1bW1vbmVyVGVsZXBvcnQsIDYsIDEyKTtcclxuXHJcblxyXG5cclxuICAgICAgICBiYXRBbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uQ29udGFpbmVyKEVudGl0eS5JRC5CQVQpO1xyXG4gICAgICAgIHJlZFRpY2tBbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uQ29udGFpbmVyKEVudGl0eS5JRC5SRURUSUNLKTtcclxuICAgICAgICBzbWFsbFRpY2tBbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uQ29udGFpbmVyKEVudGl0eS5JRC5TTUFMTFRJQ0spO1xyXG4gICAgICAgIHNrZWxldG9uQW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuU0tFTEVUT04pO1xyXG4gICAgICAgIG9nZXJBbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uQ29udGFpbmVyKEVudGl0eS5JRC5PR0VSKTtcclxuICAgICAgICBzdW1tb25lckFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb25Db250YWluZXIoRW50aXR5LklELlNVTU1PTk9SKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0QW5pbWF0aW9uQnlJZChfaWQ6IEVudGl0eS5JRCk6IEFuaW1hdGlvbkNvbnRhaW5lciB7XHJcbiAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuQkFUOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJhdEFuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuUkVEVElDSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiByZWRUaWNrQW5pbWF0aW9uO1xyXG4gICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5TTUFMTFRJQ0s6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc21hbGxUaWNrQW5pbWF0aW9uO1xyXG4gICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5TS0VMRVRPTjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBza2VsZXRvbkFuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuT0dFUjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBvZ2VyQW5pbWF0aW9uO1xyXG4gICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5TVU1NT05PUjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBzdW1tb25lckFuaW1hdGlvbjtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGdldFBpeGVsUmF0aW8oX3dpZHRoOiBudW1iZXIsIF9oZWlnaHQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IG1heCA9IE1hdGgubWF4KF93aWR0aCwgX2hlaWdodCk7XHJcbiAgICAgICAgbGV0IG1pbiA9IE1hdGgubWluKF93aWR0aCwgX2hlaWdodCk7XHJcblxyXG4gICAgICAgIGxldCBzY2FsZSA9IDEgLyBtYXggKiBtaW47XHJcbiAgICAgICAgcmV0dXJuIHNjYWxlO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUFuaW1hdGlvbkZyb21HcmlkKF9jbGFzczogTXlBbmltYXRpb25DbGFzcykge1xyXG4gICAgICAgIGxldCBjbHJXaGl0ZTogxpIuQ29sb3IgPSDGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKTtcclxuICAgICAgICBsZXQgY29hdGVkU3ByaXRlU2hlZXQ6IMaSLkNvYXRUZXh0dXJlZCA9IG5ldyDGki5Db2F0VGV4dHVyZWQoY2xyV2hpdGUsIF9jbGFzcy5zcHJpdGVTaGVldCk7XHJcbiAgICAgICAgbGV0IHdpZHRoOiBudW1iZXIgPSBfY2xhc3Muc3ByaXRlU2hlZXQudGV4SW1hZ2VTb3VyY2Uud2lkdGggLyBfY2xhc3MuYW1vdW50T2ZGcmFtZXM7XHJcbiAgICAgICAgbGV0IGhlaWdodDogbnVtYmVyID0gX2NsYXNzLnNwcml0ZVNoZWV0LnRleEltYWdlU291cmNlLmhlaWdodDtcclxuICAgICAgICBsZXQgY3JlYXRlZEFuaW1hdGlvbjogxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24gPSBuZXcgxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24oX2NsYXNzLmFuaW1hdGlvbk5hbWUsIGNvYXRlZFNwcml0ZVNoZWV0KTtcclxuICAgICAgICBjcmVhdGVkQW5pbWF0aW9uLmdlbmVyYXRlQnlHcmlkKMaSLlJlY3RhbmdsZS5HRVQoMCwgMCwgd2lkdGgsIGhlaWdodCksIF9jbGFzcy5hbW91bnRPZkZyYW1lcywgMzIsIMaSLk9SSUdJTjJELkNFTlRFUiwgxpIuVmVjdG9yMi5YKHdpZHRoKSk7XHJcbiAgICAgICAgX2NsYXNzLmFuaW1hdGlvblNjYWxlID0gZ2V0UGl4ZWxSYXRpbyh3aWR0aCwgaGVpZ2h0KTtcclxuICAgICAgICBfY2xhc3MuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uID0gY3JlYXRlZEFuaW1hdGlvbjtcclxuICAgIH1cclxuXHJcblxyXG59XHJcblxyXG4iLCJuYW1lc3BhY2UgTmV0d29ya2luZyB7XHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgUHJlZGljdGlvbiB7XHJcbiAgICAgICAgcHJvdGVjdGVkIHRpbWVyOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIHByb3RlY3RlZCBjdXJyZW50VGljazogbnVtYmVyID0gMDtcclxuICAgICAgICBwdWJsaWMgbWluVGltZUJldHdlZW5UaWNrczogbnVtYmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBnYW1lVGlja1JhdGU6IG51bWJlciA9IDYyLjU7XHJcbiAgICAgICAgcHJvdGVjdGVkIGJ1ZmZlclNpemU6IG51bWJlciA9IDEwMjQ7XHJcbiAgICAgICAgcHJvdGVjdGVkIG93bmVyTmV0SWQ6IG51bWJlcjsgZ2V0IG93bmVyKCk6IEdhbWUuxpIuTm9kZSB7IHJldHVybiBHYW1lLmN1cnJlbnROZXRPYmouZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gdGhpcy5vd25lck5ldElkKS5uZXRPYmplY3ROb2RlIH07XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBzdGF0ZUJ1ZmZlcjogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkW107XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9vd25lck5ldElkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzID0gMSAvIHRoaXMuZ2FtZVRpY2tSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyID0gbmV3IEFycmF5PEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZD4odGhpcy5idWZmZXJTaXplKTtcclxuICAgICAgICAgICAgdGhpcy5vd25lck5ldElkID0gX293bmVyTmV0SWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgaGFuZGxlVGljaygpIHtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBwcm9jZXNzTW92ZW1lbnQoX2lucHV0OiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQpOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH0vLyNyZWdpb24gIGJ1bGxldCBQcmVkaWN0aW9uXHJcbiAgICBhYnN0cmFjdCBjbGFzcyBCdWxsZXRQcmVkaWN0aW9uIGV4dGVuZHMgUHJlZGljdGlvbiB7XHJcbiAgICAgICAgcHJvdGVjdGVkIHByb2Nlc3NNb3ZlbWVudChpbnB1dDogSW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkKTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkIHtcclxuICAgICAgICAgICAgbGV0IGNsb25lSW5wdXRWZWN0b3IgPSBpbnB1dC5pbnB1dFZlY3Rvci5jbG9uZTtcclxuICAgICAgICAgICAgbGV0IGJ1bGxldDogQnVsbGV0cy5CdWxsZXQgPSA8QnVsbGV0cy5CdWxsZXQ+dGhpcy5vd25lcjtcclxuICAgICAgICAgICAgYnVsbGV0Lm1vdmUoY2xvbmVJbnB1dFZlY3Rvcik7XHJcblxyXG4gICAgICAgICAgICBsZXQgbmV3U3RhdGVQYXlsb2FkOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQgPSB7IHRpY2s6IGlucHV0LnRpY2ssIHBvc2l0aW9uOiBidWxsZXQubXR4TG9jYWwudHJhbnNsYXRpb24gfVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3U3RhdGVQYXlsb2FkO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgU2VydmVyQnVsbGV0UHJlZGljdGlvbiBleHRlbmRzIEJ1bGxldFByZWRpY3Rpb24ge1xyXG4gICAgICAgIHByaXZhdGUgaW5wdXRRdWV1ZTogUXVldWUgPSBuZXcgUXVldWUoKTtcclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZUVudGl0eVRvQ2hlY2soX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5vd25lck5ldElkID0gX25ldElkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy50aW1lciArPSBHYW1lLmRlbHRhVGltZTtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMudGltZXIgPj0gdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVyIC09IHRoaXMubWluVGltZUJldHdlZW5UaWNrcztcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVGljaygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VGljaysrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBoYW5kbGVUaWNrKCkge1xyXG5cclxuICAgICAgICAgICAgbGV0IGJ1ZmZlckluZGV4ID0gLTE7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLmlucHV0UXVldWUuZ2V0UXVldWVMZW5ndGgoKSA+IDApIHtcclxuICAgICAgICAgICAgICAgIGxldCBpbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCA9IDxJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWQ+dGhpcy5pbnB1dFF1ZXVlLmRlcXVldWUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBidWZmZXJJbmRleCA9IGlucHV0UGF5bG9hZC50aWNrICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICAgICAgbGV0IHN0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkID0gdGhpcy5wcm9jZXNzTW92ZW1lbnQoaW5wdXRQYXlsb2FkKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0gPSBzdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChidWZmZXJJbmRleCAhPSAtMSkge1xyXG4gICAgICAgICAgICAgICAgLy9TZW5kIHRvIGNsaWVudCBuZXcgcG9zaXRpb25cclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc2VuZFNlcnZlckJ1ZmZlcih0aGlzLm93bmVyTmV0SWQsIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uQ2xpZW50SW5wdXQoaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWQpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dFF1ZXVlLmVucXVldWUoaW5wdXRQYXlsb2FkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIENsaWVudEJ1bGxldFByZWRpY3Rpb24gZXh0ZW5kcyBCdWxsZXRQcmVkaWN0aW9uIHtcclxuICAgICAgICBwcml2YXRlIGlucHV0QnVmZmVyOiBJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWRbXTtcclxuICAgICAgICBwcml2YXRlIGxhdGVzdFNlcnZlclN0YXRlOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgcHJpdmF0ZSBsYXN0UHJvY2Vzc2VkU3RhdGU6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZDtcclxuICAgICAgICBwcml2YXRlIGZseURpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzO1xyXG5cclxuICAgICAgICBwcml2YXRlIEFzeW5jVG9sZXJhbmNlOiBudW1iZXIgPSAwLjI7XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9vd25lck5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dEJ1ZmZlciA9IG5ldyBBcnJheTxJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWQ+KHRoaXMuYnVmZmVyU2l6ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZmx5RGlyZWN0aW9uID0gKDxCdWxsZXRzLkJ1bGxldD50aGlzLm93bmVyKS5mbHlEaXJlY3Rpb247XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNhbnQgZmluZCBvd25lclwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLnRpbWVyICs9IEdhbWUuZGVsdGFUaW1lO1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy50aW1lciA+PSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3MpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGltZXIgLT0gdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVUaWNrKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUaWNrKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBoYW5kbGVUaWNrKCkge1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMubGF0ZXN0U2VydmVyU3RhdGUgIT0gdGhpcy5sYXN0UHJvY2Vzc2VkU3RhdGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2VydmVyUmVjb25jaWxpYXRpb24oKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IGJ1ZmZlckluZGV4ID0gdGhpcy5jdXJyZW50VGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgbGV0IGlucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkID0geyB0aWNrOiB0aGlzLmN1cnJlbnRUaWNrLCBpbnB1dFZlY3RvcjogdGhpcy5mbHlEaXJlY3Rpb24gfTtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dEJ1ZmZlcltidWZmZXJJbmRleF0gPSBpbnB1dFBheWxvYWQ7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGlucHV0UGF5bG9hZC50aWNrICsgXCJfX19cIiArIGlucHV0UGF5bG9hZC5pbnB1dFZlY3Rvcik7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gdGhpcy5wcm9jZXNzTW92ZW1lbnQoaW5wdXRQYXlsb2FkKTtcclxuXHJcbiAgICAgICAgICAgIC8vc2VuZCBpbnB1dFBheWxvYWQgdG8gaG9zdFxyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNlbmRCdWxsZXRJbnB1dCh0aGlzLm93bmVyTmV0SWQsIGlucHV0UGF5bG9hZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb25TZXJ2ZXJNb3ZlbWVudFN0YXRlKF9zZXJ2ZXJTdGF0ZTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U2VydmVyU3RhdGUgPSBfc2VydmVyU3RhdGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhhbmRsZVNlcnZlclJlY29uY2lsaWF0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLmxhc3RQcm9jZXNzZWRTdGF0ZSA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGU7XHJcblxyXG4gICAgICAgICAgICBsZXQgc2VydmVyU3RhdGVCdWZmZXJJbmRleCA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGUudGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgbGV0IHBvc2l0aW9uRXJyb3I6IG51bWJlciA9IEdhbWUuxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb24sIHRoaXMuc3RhdGVCdWZmZXJbc2VydmVyU3RhdGVCdWZmZXJJbmRleF0ucG9zaXRpb24pLm1hZ25pdHVkZTtcclxuICAgICAgICAgICAgaWYgKHBvc2l0aW9uRXJyb3IgPiB0aGlzLkFzeW5jVG9sZXJhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4odGhpcy5vd25lci5uYW1lICsgXCIgbmVlZCB0byBiZSB1cGRhdGVkIHRvOiBYOlwiICsgdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbi54ICsgXCIgWTogXCIgKyB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltzZXJ2ZXJTdGF0ZUJ1ZmZlckluZGV4XSA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGU7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHRpY2tUb1Byb2Nlc3MgPSAodGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS50aWNrICsgMSk7XHJcblxyXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRpY2tUb1Byb2Nlc3MgPCB0aGlzLmN1cnJlbnRUaWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkID0gdGhpcy5wcm9jZXNzTW92ZW1lbnQodGhpcy5pbnB1dEJ1ZmZlclt0aWNrVG9Qcm9jZXNzICUgdGhpcy5idWZmZXJTaXplXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IHRpY2tUb1Byb2Nlc3MgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0gPSBzdGF0ZVBheWxvYWQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRpY2tUb1Byb2Nlc3MrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgLy8jcmVnaW9uICBhdmF0YXIgUHJlY2RpY3Rpb25cclxuICAgIGFic3RyYWN0IGNsYXNzIEF2YXRhclByZWRpY3Rpb24gZXh0ZW5kcyBQcmVkaWN0aW9uIHtcclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHByb2Nlc3NNb3ZlbWVudChpbnB1dDogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkKTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkIHtcclxuICAgICAgICAgICAgbGV0IGNsb25lSW5wdXRWZWN0b3IgPSBpbnB1dC5pbnB1dFZlY3Rvci5jbG9uZTtcclxuICAgICAgICAgICAgaWYgKGNsb25lSW5wdXRWZWN0b3IubWFnbml0dWRlID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY2xvbmVJbnB1dFZlY3Rvci5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAmJiBpbnB1dC5kb2VzQWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPnRoaXMub3duZXIpLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAoPFBsYXllci5QbGF5ZXI+dGhpcy5vd25lcikubW92ZShjbG9uZUlucHV0VmVjdG9yKTtcclxuXHJcblxyXG4gICAgICAgICAgICBsZXQgbmV3U3RhdGVQYXlsb2FkOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQgPSB7IHRpY2s6IGlucHV0LnRpY2ssIHBvc2l0aW9uOiB0aGlzLm93bmVyLm10eExvY2FsLnRyYW5zbGF0aW9uIH1cclxuICAgICAgICAgICAgcmV0dXJuIG5ld1N0YXRlUGF5bG9hZDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIENsaWVudFByZWRpY3Rpb24gZXh0ZW5kcyBBdmF0YXJQcmVkaWN0aW9uIHtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpbnB1dEJ1ZmZlcjogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkW107XHJcbiAgICAgICAgcHJpdmF0ZSBsYXRlc3RTZXJ2ZXJTdGF0ZTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkO1xyXG4gICAgICAgIHByaXZhdGUgbGFzdFByb2Nlc3NlZFN0YXRlOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgcHJpdmF0ZSBob3Jpem9udGFsSW5wdXQ6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIHZlcnRpY2FsSW5wdXQ6IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgZG9lc0FiaWxpdHk6IGJvb2xlYW47XHJcblxyXG4gICAgICAgIHByaXZhdGUgQXN5bmNUb2xlcmFuY2U6IG51bWJlciA9IDAuMTtcclxuXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9vd25lck5ldElkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX293bmVyTmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLmlucHV0QnVmZmVyID0gbmV3IEFycmF5PEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZD4odGhpcy5idWZmZXJTaXplKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICB0aGlzLmhvcml6b250YWxJbnB1dCA9IElucHV0U3lzdGVtLm1vdmUoKS54O1xyXG4gICAgICAgICAgICB0aGlzLnZlcnRpY2FsSW5wdXQgPSBJbnB1dFN5c3RlbS5tb3ZlKCkueTtcclxuICAgICAgICAgICAgdGhpcy50aW1lciArPSBHYW1lLmRlbHRhVGltZTtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMudGltZXIgPj0gdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVyIC09IHRoaXMubWluVGltZUJldHdlZW5UaWNrcztcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVGljaygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VGljaysrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgaGFuZGxlVGljaygpIHtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxhdGVzdFNlcnZlclN0YXRlICE9IHRoaXMubGFzdFByb2Nlc3NlZFN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNlcnZlclJlY29uY2lsaWF0aW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IGJ1ZmZlckluZGV4ID0gdGhpcy5jdXJyZW50VGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgdGhpcy5zd2l0Y2hBdmF0YXJBYmlsaXR5U3RhdGUoKTtcclxuICAgICAgICAgICAgbGV0IGlucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkID0geyB0aWNrOiB0aGlzLmN1cnJlbnRUaWNrLCBpbnB1dFZlY3RvcjogbmV3IMaSLlZlY3RvcjModGhpcy5ob3Jpem9udGFsSW5wdXQsIHRoaXMudmVydGljYWxJbnB1dCwgMCksIGRvZXNBYmlsaXR5OiB0aGlzLmRvZXNBYmlsaXR5IH07XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRCdWZmZXJbYnVmZmVySW5kZXhdID0gaW5wdXRQYXlsb2FkO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhpbnB1dFBheWxvYWQudGljayArIFwiX19fXCIgKyBpbnB1dFBheWxvYWQuaW5wdXRWZWN0b3IuY2xvbmUpO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSA9IHRoaXMucHJvY2Vzc01vdmVtZW50KGlucHV0UGF5bG9hZCk7XHJcblxyXG4gICAgICAgICAgICAvL3NlbmQgaW5wdXRQYXlsb2FkIHRvIGhvc3RcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zZW5kQ2xpZW50SW5wdXQodGhpcy5vd25lck5ldElkLCBpbnB1dFBheWxvYWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3dpdGNoQXZhdGFyQWJpbGl0eVN0YXRlKCkge1xyXG4gICAgICAgICAgICBpZiAoKDxFbnRpdHkuRW50aXR5PnRoaXMub3duZXIpLmlkID09IEVudGl0eS5JRC5SQU5HRUQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9lc0FiaWxpdHkgPSAoPFBsYXllci5SYW5nZWQ+dGhpcy5vd25lcikuZGFzaC5kb2VzQWJpbGl0eTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9lc0FiaWxpdHkgPSAoPFBsYXllci5NZWxlZT50aGlzLm93bmVyKS5ibG9jay5kb2VzQWJpbGl0eTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBvblNlcnZlck1vdmVtZW50U3RhdGUoX3NlcnZlclN0YXRlOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQpIHtcclxuICAgICAgICAgICAgdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZSA9IF9zZXJ2ZXJTdGF0ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaGFuZGxlU2VydmVyUmVjb25jaWxpYXRpb24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGFzdFByb2Nlc3NlZFN0YXRlID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZTtcclxuXHJcbiAgICAgICAgICAgIGxldCBzZXJ2ZXJTdGF0ZUJ1ZmZlckluZGV4ID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS50aWNrICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICBsZXQgcG9zaXRpb25FcnJvcjogbnVtYmVyID0gR2FtZS7Gki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbiwgdGhpcy5zdGF0ZUJ1ZmZlcltzZXJ2ZXJTdGF0ZUJ1ZmZlckluZGV4XS5wb3NpdGlvbikubWFnbml0dWRlO1xyXG4gICAgICAgICAgICBpZiAocG9zaXRpb25FcnJvciA+IHRoaXMuQXN5bmNUb2xlcmFuY2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcInlvdSBuZWVkIHRvIGJlIHVwZGF0ZWQgdG86IFg6XCIgKyB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uLnggKyBcIiBZOiBcIiArIHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm93bmVyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW3NlcnZlclN0YXRlQnVmZmVySW5kZXhdID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgdGlja1RvUHJvY2VzcyA9ICh0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnRpY2sgKyAxKTtcclxuXHJcbiAgICAgICAgICAgICAgICB3aGlsZSAodGlja1RvUHJvY2VzcyA8IHRoaXMuY3VycmVudFRpY2spIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3RhdGVQYXlsb2FkOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQgPSB0aGlzLnByb2Nlc3NNb3ZlbWVudCh0aGlzLmlucHV0QnVmZmVyW3RpY2tUb1Byb2Nlc3MgJSB0aGlzLmJ1ZmZlclNpemVdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGJ1ZmZlckluZGV4ID0gdGlja1RvUHJvY2VzcyAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSA9IHN0YXRlUGF5bG9hZDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGlja1RvUHJvY2VzcysrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTZXJ2ZXJQcmVkaWN0aW9uIGV4dGVuZHMgQXZhdGFyUHJlZGljdGlvbiB7XHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5wdXRRdWV1ZTogUXVldWUgPSBuZXcgUXVldWUoKTtcclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZUVudGl0eVRvQ2hlY2soX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5vd25lck5ldElkID0gX25ldElkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy50aW1lciArPSBHYW1lLmRlbHRhVGltZTtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMudGltZXIgPj0gdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVyIC09IHRoaXMubWluVGltZUJldHdlZW5UaWNrcztcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVGljaygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VGljaysrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBoYW5kbGVUaWNrKCkge1xyXG5cclxuICAgICAgICAgICAgbGV0IGJ1ZmZlckluZGV4ID0gLTE7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLmlucHV0UXVldWUuZ2V0UXVldWVMZW5ndGgoKSA+IDApIHtcclxuICAgICAgICAgICAgICAgIGxldCBpbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCA9IDxJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQ+dGhpcy5pbnB1dFF1ZXVlLmRlcXVldWUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBidWZmZXJJbmRleCA9IGlucHV0UGF5bG9hZC50aWNrICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICAgICAgbGV0IHN0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkID0gdGhpcy5wcm9jZXNzTW92ZW1lbnQoaW5wdXRQYXlsb2FkKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0gPSBzdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChidWZmZXJJbmRleCAhPSAtMSkge1xyXG4gICAgICAgICAgICAgICAgLy9TZW5kIHRvIGNsaWVudCBuZXcgcG9zaXRpb25cclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc2VuZFNlcnZlckJ1ZmZlcih0aGlzLm93bmVyTmV0SWQsIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uQ2xpZW50SW5wdXQoaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQpIHtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dFF1ZXVlLmVucXVldWUoaW5wdXRQYXlsb2FkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcblxyXG4gICAgY2xhc3MgUXVldWUge1xyXG4gICAgICAgIHByaXZhdGUgaXRlbXM6IGFueVtdO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAgICAgdGhpcy5pdGVtcyA9IFtdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZW5xdWV1ZShfaXRlbTogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkIHwgSW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMucHVzaChfaXRlbSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkZXF1ZXVlKCk6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCB8IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zLnNoaWZ0KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRRdWV1ZUxlbmd0aCgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbXMubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0SXRlbXMoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCJuYW1lc3BhY2UgQWJpbGl0eSB7XHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgQWJpbGl0eSB7XHJcbiAgICAgICAgcHJvdGVjdGVkIG93bmVyTmV0SWQ6IG51bWJlcjsgZ2V0IG93bmVyKCk6IEVudGl0eS5FbnRpdHkgeyByZXR1cm4gR2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSB0aGlzLm93bmVyTmV0SWQpIH07XHJcbiAgICAgICAgcHJvdGVjdGVkIGNvb2xkb3duOiBDb29sZG93bjtcclxuICAgICAgICBwcm90ZWN0ZWQgYWJpbGl0eUNvdW50OiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGN1cnJlbnRhYmlsaXR5Q291bnQ6IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgZHVyYXRpb246IENvb2xkb3duO1xyXG4gICAgICAgIHB1YmxpYyBkb2VzQWJpbGl0eTogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyLCBfZHVyYXRpb246IG51bWJlciwgX2FiaWxpdHlDb3VudDogbnVtYmVyLCBfY29vbGRvd25UaW1lOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5vd25lck5ldElkID0gX293bmVyTmV0SWQ7XHJcbiAgICAgICAgICAgIHRoaXMuYWJpbGl0eUNvdW50ID0gX2FiaWxpdHlDb3VudDtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50ID0gdGhpcy5hYmlsaXR5Q291bnQ7XHJcbiAgICAgICAgICAgIHRoaXMuZHVyYXRpb24gPSBuZXcgQ29vbGRvd24oX2R1cmF0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5jb29sZG93biA9IG5ldyBDb29sZG93bihfY29vbGRvd25UaW1lKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBldmVudFVwZGF0ZSA9IChfZXZlbnQ6IEV2ZW50KTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQWJpbGl0eSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgdXBkYXRlQWJpbGl0eSgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZG9lc0FiaWxpdHkgJiYgIXRoaXMuZHVyYXRpb24uaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGVhY3RpdmF0ZUFiaWxpdHkoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9lc0FiaWxpdHkgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgZG9BYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICAvL2RvIHN0dWZmXHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb29sZG93bi5oYXNDb29sRG93biAmJiB0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50ID0gdGhpcy5hYmlsaXR5Q291bnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvb2xkb3duLmhhc0Nvb2xEb3duICYmIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9lc0FiaWxpdHkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZUFiaWxpdHkoKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5kdXJhdGlvbi5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQtLTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29vbGRvd24uc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBoYXNDb29sZG93bigpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29vbGRvd24uaGFzQ29vbERvd247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgYWN0aXZhdGVBYmlsaXR5KCkge1xyXG4gICAgICAgICAgICBHYW1lLsaSLkxvb3AuYWRkRXZlbnRMaXN0ZW5lcihHYW1lLsaSLkVWRU5ULkxPT1BfRlJBTUUsIHRoaXMuZXZlbnRVcGRhdGUpO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIGRlYWN0aXZhdGVBYmlsaXR5KCkge1xyXG4gICAgICAgICAgICBHYW1lLsaSLkxvb3AucmVtb3ZlRXZlbnRMaXN0ZW5lcihHYW1lLsaSLkVWRU5ULkxPT1BfRlJBTUUsIHRoaXMuZXZlbnRVcGRhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCbG9jayBleHRlbmRzIEFiaWxpdHkge1xyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgYWN0aXZhdGVBYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5hY3RpdmF0ZUFiaWxpdHkoKTtcclxuICAgICAgICAgICAgdGhpcy5vd25lci5hdHRyaWJ1dGVzLmhpdGFibGUgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBkZWFjdGl2YXRlQWJpbGl0eSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuZGVhY3RpdmF0ZUFiaWxpdHkoKTtcclxuICAgICAgICAgICAgdGhpcy5vd25lci5hdHRyaWJ1dGVzLmhpdGFibGUgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRGFzaCBleHRlbmRzIEFiaWxpdHkge1xyXG4gICAgICAgIHNwZWVkOiBudW1iZXI7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX293bmVyTmV0SWQ6IG51bWJlciwgX2R1cmF0aW9uOiBudW1iZXIsIF9hYmlsaXR5Q291bnQ6IG51bWJlciwgX2Nvb2xkb3duVGltZTogbnVtYmVyLCBfc3BlZWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfb3duZXJOZXRJZCwgX2R1cmF0aW9uLCBfYWJpbGl0eUNvdW50LCBfY29vbGRvd25UaW1lKTtcclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IF9zcGVlZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIGFjdGl2YXRlQWJpbGl0eSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWN0aXZhdGVcIik7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5oaXRhYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5zcGVlZCAqPSB0aGlzLnNwZWVkO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgZGVhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmRlYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGVhY3RpdmF0ZVwiKTtcclxuICAgICAgICAgICAgdGhpcy5vd25lci5hdHRyaWJ1dGVzLmhpdGFibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuc3BlZWQgLz0gdGhpcy5zcGVlZDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFNwYXduU3VtbW9uZXJzIGV4dGVuZHMgQWJpbGl0eSB7XHJcbiAgICAgICAgcHJpdmF0ZSBzcGF3blJhZGl1czogbnVtYmVyID0gMTtcclxuICAgICAgICBwcm90ZWN0ZWQgYWN0aXZhdGVBYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5hY3RpdmF0ZUFiaWxpdHkoKTtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjIgPSBuZXcgxpIuVmVjdG9yMih0aGlzLm93bmVyLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKyBNYXRoLnJhbmRvbSgpICogdGhpcy5zcGF3blJhZGl1cywgdGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbi55ICsgMilcclxuICAgICAgICAgICAgICAgIGlmIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpID4gMC41KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgRW5lbXlTcGF3bmVyLnNwYXduQnlJRChFbmVteS5FTkVNWUNMQVNTLlNVTU1PTk9SQUREUywgRW50aXR5LklELkJBVCwgcG9zaXRpb24sIEdhbWUuYXZhdGFyMSwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIEVuZW15U3Bhd25lci5zcGF3bkJ5SUQoRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUkFERFMsIEVudGl0eS5JRC5CQVQsIHBvc2l0aW9uLCBHYW1lLmF2YXRhcjIsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBjaXJjbGVTaG9vdCBleHRlbmRzIEFiaWxpdHkge1xyXG4gICAgICAgIHB1YmxpYyBidWxsZXRBbW91bnQ6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIGJ1bGxldHM6IEJ1bGxldHMuQnVsbGV0W10gPSBbXTtcclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGFjdGl2YXRlQWJpbGl0eSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIHRoaXMuYnVsbGV0cyA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnVsbGV0QW1vdW50OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVsbGV0cy5wdXNoKG5ldyBCdWxsZXRzLkJ1bGxldChCdWxsZXRzLkJVTExFVFRZUEUuU1RBTkRBUkQsIHRoaXMub3duZXIubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIEdhbWUuxpIuVmVjdG9yMy5aRVJPKCksIHRoaXMub3duZXJOZXRJZCkpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idWxsZXRzW2ldLm10eExvY2FsLnJvdGF0ZVooKDM2MCAvIHRoaXMuYnVsbGV0QW1vdW50ICogaSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5idWxsZXRBbW91bnQ7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZCh0aGlzLmJ1bGxldHNbaV0pO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkJ1bGxldCh0aGlzLmJ1bGxldHNbaV0uZGlyZWN0aW9uLCB0aGlzLmJ1bGxldHNbaV0ubmV0SWQsIHRoaXMub3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIENvb2xkb3duIHtcclxuICAgICAgICBwdWJsaWMgaGFzQ29vbERvd246IGJvb2xlYW5cclxuICAgICAgICBwcml2YXRlIGNvb2xEb3duOiBudW1iZXI7IGdldCBnZXRNYXhDb29sRG93bigpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5jb29sRG93biB9OyBzZXQgc2V0TWF4Q29vbERvd24oX3BhcmFtOiBudW1iZXIpIHsgdGhpcy5oYXNDb29sRG93biA9IGZhbHNlOyB0aGlzLmNvb2xEb3duID0gX3BhcmFtOyB0aGlzLmN1cnJlbnRDb29sZG93biA9IHRoaXMuY29vbERvd247IH1cclxuICAgICAgICBwcml2YXRlIGN1cnJlbnRDb29sZG93bjogbnVtYmVyOyBnZXQgZ2V0Q3VycmVudENvb2xkb3duKCk6IG51bWJlciB7IHJldHVybiB0aGlzLmN1cnJlbnRDb29sZG93biB9O1xyXG4gICAgICAgIHB1YmxpYyBvbkVuZENvb2xEb3duOiAoKSA9PiB2b2lkO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9udW1iZXI6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvb2xEb3duID0gX251bWJlcjtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29vbGRvd24gPSBfbnVtYmVyO1xyXG4gICAgICAgICAgICB0aGlzLmhhc0Nvb2xEb3duID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc3RhcnRDb29sRG93bigpIHtcclxuICAgICAgICAgICAgdGhpcy5oYXNDb29sRG93biA9IHRydWVcclxuICAgICAgICAgICAgR2FtZS7Gki5Mb29wLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5MT09QX0ZSQU1FLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGVuZENvb2xEb3duKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vbkVuZENvb2xEb3duICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkVuZENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5oYXNDb29sRG93biA9IGZhbHNlO1xyXG4gICAgICAgICAgICBHYW1lLsaSLkxvb3AucmVtb3ZlRXZlbnRMaXN0ZW5lcihHYW1lLsaSLkVWRU5ULkxPT1BfRlJBTUUsIHRoaXMuZXZlbnRVcGRhdGUpO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBldmVudFVwZGF0ZSA9IChfZXZlbnQ6IEV2ZW50KTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ29vbERvd24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVDb29sRG93bigpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaGFzQ29vbERvd24gJiYgdGhpcy5jdXJyZW50Q29vbGRvd24gPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDb29sZG93bi0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRDb29sZG93biA8PSAwICYmIHRoaXMuaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZW5kQ29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudENvb2xkb3duID0gdGhpcy5jb29sRG93bjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuIiwibmFtZXNwYWNlIEFiaWxpdHkge1xyXG5cclxuICAgIGV4cG9ydCBlbnVtIEFPRVRZUEUge1xyXG4gICAgICAgIEhFQUxUSFVQXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEFyZWFPZkVmZmVjdCBleHRlbmRzIEdhbWUuxpIuTm9kZSBpbXBsZW1lbnRzIEludGVyZmFjZXMuSU5ldHdvcmthYmxlIHtcclxuICAgICAgICBwdWJsaWMgbmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgaWQ6IEFPRVRZUEU7XHJcbiAgICAgICAgcHJpdmF0ZSBwb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyOyBnZXQgZ2V0UG9zaXRpb24oKTogR2FtZS7Gki5WZWN0b3IyIHsgcmV0dXJuIHRoaXMucG9zaXRpb24gfTsgc2V0IHNldFBvc2l0aW9uKF9wb3M6IEdhbWUuxpIuVmVjdG9yMikgeyB0aGlzLnBvc2l0aW9uID0gX3BvcyB9O1xyXG4gICAgICAgIHByaXZhdGUgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyOyBnZXQgZ2V0Q29sbGlkZXIoKTogQ29sbGlkZXIuQ29sbGlkZXIgeyByZXR1cm4gdGhpcy5jb2xsaWRlciB9O1xyXG4gICAgICAgIHByaXZhdGUgZHVyYXRpb246IENvb2xkb3duO1xyXG4gICAgICAgIHByaXZhdGUgYXJlYU1hdDogR2FtZS7Gki5NYXRlcmlhbDtcclxuICAgICAgICBwcml2YXRlIG93bmVyTmV0SWQ6IG51bWJlcjtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBidWZmTGlzdDogQnVmZi5CdWZmW107IGdldCBnZXRCdWZmTGlzdCgpOiBCdWZmLkJ1ZmZbXSB7IHJldHVybiB0aGlzLmJ1ZmZMaXN0IH07XHJcbiAgICAgICAgcHJpdmF0ZSBkYW1hZ2VWYWx1ZTogbnVtYmVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEFPRVRZUEUsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKEFPRVRZUEVbX2lkXS50b0xvd2VyQ2FzZSgpKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5JZE1hbmFnZXIoX25ldElkKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZHVyYXRpb24gPSBuZXcgQ29vbGRvd24oMTIwKTtcclxuICAgICAgICAgICAgdGhpcy5kdXJhdGlvbi5vbkVuZENvb2xEb3duID0gdGhpcy5kZXNwYXduO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgR2FtZS7Gki5Db21wb25lbnRNZXNoKG5ldyBHYW1lLsaSLk1lc2hRdWFkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuZGFtYWdlVmFsdWUgPSAxO1xyXG4gICAgICAgICAgICB0aGlzLmFyZWFNYXQgPSBuZXcgxpIuTWF0ZXJpYWwoXCJhb2VTaGFkZXJcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiksIFVJLmNvbW1vblBhcnRpY2xlKSk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXQgPSBuZXcgR2FtZS7Gki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLmFyZWFNYXQpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChjbXBNYXQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IEdhbWUuxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIDIsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKHRoaXMuY29sbGlkZXIuZ2V0UmFkaXVzICogMiwgdGhpcy5jb2xsaWRlci5nZXRSYWRpdXMgKiAyLCAxKVxyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5SRU5ERVJfUFJFUEFSRSwgdGhpcy5ldmVudFVwZGF0ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHVwZGF0ZSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IHRoaXMubXR4V29ybGQudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlzaW9uRGV0ZWN0aW9uKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBkZXNwYXduID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImRlc3Bhd25cIik7XHJcbiAgICAgICAgICAgIC8vVE9ETzogZmluZCByaWdodCBwYXJlbnQgdG8gY2FuY2VsO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHNwYXduIChfZW50aXR5OiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIF9lbnRpdHkuYWRkQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRlWigwLjAxKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZHVyYXRpb24gPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmR1cmF0aW9uLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGFkZFRvRW50aXR5KF9lbnRpdHk6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgdGhpcy5zcGF3bihfZW50aXR5KTtcclxuICAgICAgICAgICAgdGhpcy5vd25lck5ldElkID0gX2VudGl0eS5uZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBjb2xsaXNpb25EZXRlY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlcnM6IEdhbWUuxpIuTm9kZVtdID0gW107XHJcbiAgICAgICAgICAgIGNvbGxpZGVycyA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVudGl0eS5FbnRpdHk+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuRU5FTVkgfHwgKDxFbnRpdHkuRW50aXR5PmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlBMQVlFUik7XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKF9jb2xsID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBlbnRpdHkgPSAoPEVudGl0eS5FbnRpdHk+X2NvbGwpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZW50aXR5LmNvbGxpZGVyKSAmJiBlbnRpdHkuYXR0cmlidXRlcyAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IG92ZXJ3cml0ZSBpbiBvdGhlciBjaGlsZHJlbiB0byBkbyBvd24gdGhpbmdcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGx5QXJlYU9mRWZmZWN0KGVudGl0eSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgYXBwbHlBcmVhT2ZFZmZlY3QoX2VudGl0eTogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICAvL1RPRE86IG92ZXJ3cml0ZSBpbiBvdGhlciBjbGFzc2VzXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm93bmVyTmV0SWQgIT0gX2VudGl0eS5uZXRJZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJjb2xsaWRpbmcgd2l0aDogXCIgKyBfZW50aXR5Lm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgQnVmZi5nZXRCdWZmQnlJZChCdWZmLkJVRkZJRC5QT0lTT04pLmFkZFRvRW50aXR5KF9lbnRpdHkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBFbnRpdHkge1xyXG5cclxuICAgIGV4cG9ydCBlbnVtIEFUVFJJQlVURVRZUEUge1xyXG4gICAgICAgIEhFQUxUSFBPSU5UUyxcclxuICAgICAgICBNQVhIRUFMVEhQT0lOVFMsXHJcbiAgICAgICAgS05PQ0tCQUNLRk9SQ0UsXHJcbiAgICAgICAgSElUQUJMRSxcclxuICAgICAgICBBUk1PUixcclxuICAgICAgICBTUEVFRCxcclxuICAgICAgICBBVFRBQ0tQT0lOVFMsXHJcbiAgICAgICAgQ09PTERPV05SRURVQ1RJT04sXHJcbiAgICAgICAgU0NBTEVcclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVzIHtcclxuXHJcbiAgICAgICAgaGVhbHRoUG9pbnRzOiBudW1iZXI7XHJcbiAgICAgICAgbWF4SGVhbHRoUG9pbnRzOiBudW1iZXI7XHJcbiAgICAgICAga25vY2tiYWNrRm9yY2U6IG51bWJlcjtcclxuICAgICAgICBoaXRhYmxlOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICBhcm1vcjogbnVtYmVyO1xyXG4gICAgICAgIHNwZWVkOiBudW1iZXI7XHJcbiAgICAgICAgYXR0YWNrUG9pbnRzOiBudW1iZXI7XHJcbiAgICAgICAgY29vbERvd25SZWR1Y3Rpb246IG51bWJlciA9IDE7XHJcbiAgICAgICAgc2NhbGU6IG51bWJlcjtcclxuICAgICAgICBhY2N1cmFjeTogbnVtYmVyID0gODA7XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaGVhbHRoUG9pbnRzOiBudW1iZXIsIF9hdHRhY2tQb2ludHM6IG51bWJlciwgX3NwZWVkOiBudW1iZXIsIF9zY2FsZTogbnVtYmVyLCBfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX2FybW9yOiBudW1iZXIsIF9jb29sZG93blJlZHVjdGlvbjogbnVtYmVyLCBfYWNjdXJhY3k6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLnNjYWxlID0gX3NjYWxlO1xyXG4gICAgICAgICAgICB0aGlzLmFybW9yID0gX2FybW9yO1xyXG4gICAgICAgICAgICB0aGlzLmhlYWx0aFBvaW50cyA9IF9oZWFsdGhQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMubWF4SGVhbHRoUG9pbnRzID0gdGhpcy5oZWFsdGhQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0YWNrUG9pbnRzID0gX2F0dGFja1BvaW50cztcclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IF9zcGVlZDtcclxuICAgICAgICAgICAgdGhpcy5rbm9ja2JhY2tGb3JjZSA9IF9rbm9ja2JhY2tGb3JjZVxyXG4gICAgICAgICAgICB0aGlzLmNvb2xEb3duUmVkdWN0aW9uID0gX2Nvb2xkb3duUmVkdWN0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLmFjY3VyYWN5ID0gX2FjY3VyYWN5O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZVNjYWxlRGVwZW5kZW5jaWVzKCkge1xyXG4gICAgICAgICAgICB0aGlzLm1heEhlYWx0aFBvaW50cyA9IE1hdGgucm91bmQodGhpcy5tYXhIZWFsdGhQb2ludHMgKiAoMTAwICsgKDEwICogdGhpcy5zY2FsZSkpIC8gMTAwKTtcclxuICAgICAgICAgICAgdGhpcy5oZWFsdGhQb2ludHMgPSBNYXRoLnJvdW5kKHRoaXMuaGVhbHRoUG9pbnRzICogKDEwMCArICgxMCAqIHRoaXMuc2NhbGUpKSAvIDEwMCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0YWNrUG9pbnRzID0gTWF0aC5yb3VuZCh0aGlzLmF0dGFja1BvaW50cyAqIHRoaXMuc2NhbGUpO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gTWF0aC5mcm91bmQodGhpcy5zcGVlZCAvIHRoaXMuc2NhbGUpO1xyXG4gICAgICAgICAgICB0aGlzLmtub2NrYmFja0ZvcmNlID0gdGhpcy5rbm9ja2JhY2tGb3JjZSAqICgxMDAgKyAoMTAgKiB0aGlzLnNjYWxlKSkgLyAxMDA7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEVuZW15IHtcclxuICAgIGV4cG9ydCBjbGFzcyBCaWdCb29tIGV4dGVuZHMgRW5lbXlEdW1iIHtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuRU5FTVk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJlaGF2aW91cigpIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRkxFRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLlNVTU1PTjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLlNVTU1PTik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbnNbXCJpZGxlXCJdKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGVudW0gU1VNTU5PUkJFSEFWSU9VUiB7XHJcbiAgICAgICAgSURMRSwgV0FMSywgU1VNTU9OLCBBVFRBQ0ssIFRFTEVQT1JULCBBQklMSVRZXHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgU3VtbW9ub3IgZXh0ZW5kcyBFbmVteVNob290IGltcGxlbWVudHMgR2FtZS7GkkFpZC5TdGF0ZU1hY2hpbmU8U1VNTU5PUkJFSEFWSU9VUj4ge1xyXG4gICAgICAgIGRhbWFnZVRha2VuOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIHN0YXRlQ3VycmVudDogU1VNTU5PUkJFSEFWSU9VUjtcclxuICAgICAgICBzdGF0ZU5leHQ6IFNVTU1OT1JCRUhBVklPVVI7XHJcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiDGkkFpZC5TdGF0ZU1hY2hpbmVJbnN0cnVjdGlvbnM8U1VNTU5PUkJFSEFWSU9VUj47XHJcblxyXG4gICAgICAgIGF0dGFja1BoYXNlQ2Q6IEFiaWxpdHkuQ29vbGRvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93big1ODApO1xyXG4gICAgICAgIGRlZmVuY2VQaGFzZUNkOiBBYmlsaXR5LkNvb2xkb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oNzIwKTtcclxuICAgICAgICBiZWdpblNob290aW5nOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgc2hvb3RpbmdDb3VudDogbnVtYmVyID0gMztcclxuICAgICAgICBjdXJyZW50U2hvb3RpbmdDb3VudDogbnVtYmVyID0gMDtcclxuICAgICAgICBzdW1tb25Qb3NpdGlvbjogxpIuVmVjdG9yMyA9IG5ldyDGki5WZWN0b3IzKCk7XHJcbiAgICAgICAgc3RhdGVNYWNoaW5lSW5zdHJ1Y3Rpb25zOiBHYW1lLsaSQWlkLlN0YXRlTWFjaGluZUluc3RydWN0aW9uczxTVU1NTk9SQkVIQVZJT1VSPjtcclxuICAgICAgICBsYXN0U3RhdGU6IFNVTU1OT1JCRUhBVklPVVI7XHJcblxyXG4gICAgICAgIHByaXZhdGUgc3VtbW9uOiBBYmlsaXR5LlNwYXduU3VtbW9uZXJzID0gbmV3IEFiaWxpdHkuU3Bhd25TdW1tb25lcnModGhpcy5uZXRJZCwgMCwgMSwgNDUpO1xyXG4gICAgICAgIHByaXZhdGUgZGFzaDogQWJpbGl0eS5EYXNoID0gbmV3IEFiaWxpdHkuRGFzaCh0aGlzLm5ldElkLCA0NSwgMSwgMTMgKiA2MCwgNSk7XHJcbiAgICAgICAgcHJpdmF0ZSBzaG9vdDM2MDogQWJpbGl0eS5jaXJjbGVTaG9vdCA9IG5ldyBBYmlsaXR5LmNpcmNsZVNob290KHRoaXMubmV0SWQsIDAsIDMsIDUgKiA2MCk7XHJcbiAgICAgICAgcHJpdmF0ZSBkYXNoV2VhcG9uOiBXZWFwb25zLldlYXBvbiA9IG5ldyBXZWFwb25zLlJhbmdlZFdlYXBvbigxMiwgMSwgQnVsbGV0cy5CVUxMRVRUWVBFLlNVTU1PTkVSLCAxLCB0aGlzLm5ldElkLCBXZWFwb25zLkFJTS5OT1JNQUwpO1xyXG4gICAgICAgIHByaXZhdGUgZmxvY2s6IEZsb2NraW5nQmVoYXZpb3VyID0gbmV3IEZsb2NraW5nQmVoYXZpb3VyKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICA0LFxyXG4gICAgICAgICAgICA0LFxyXG4gICAgICAgICAgICAxLFxyXG4gICAgICAgICAgICAxLFxyXG4gICAgICAgICAgICAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAxLFxyXG4gICAgICAgICAgICAxMCk7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuRU5FTVk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5kZWZlbmNlUGhhc2VDZC5vbkVuZENvb2xEb3duID0gdGhpcy5zdG9wRGVmZW5jZVBoYXNlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zdGF0ZU1hY2hpbmVJbnN0cnVjdGlvbnMgPSBuZXcgR2FtZS7GkkFpZC5TdGF0ZU1hY2hpbmVJbnN0cnVjdGlvbnMoKTtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZU1hY2hpbmVJbnN0cnVjdGlvbnMudHJhbnNpdERlZmF1bHQgPSAoKSA9PiB7IH07XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGVNYWNoaW5lSW5zdHJ1Y3Rpb25zLmFjdERlZmF1bHQgPSB0aGlzLmJlaGF2aW91cjtcclxuICAgICAgICAgICAgLy8gdGhpcy5zdGF0ZU1hY2hpbmVJbnN0cnVjdGlvbnMuc2V0VHJhbnNpdGlvbihFbnRpdHkuQkVIQVZJT1VSLkZMRUUsIEVudGl0eS5CRUhBVklPVVIuU1VNTU9OLCB0aGlzLnRlbGVwb3J0KTtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZU1hY2hpbmVJbnN0cnVjdGlvbnMuc2V0QWN0aW9uKFNVTU1OT1JCRUhBVklPVVIuQVRUQUNLLCB0aGlzLmF0dGFja2luZ1BoYXNlKTtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZU1hY2hpbmVJbnN0cnVjdGlvbnMuc2V0QWN0aW9uKFNVTU1OT1JCRUhBVklPVVIuU1VNTU9OLCB0aGlzLmRlZmVuY2VQaGFzZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGVNYWNoaW5lSW5zdHJ1Y3Rpb25zLnNldEFjdGlvbihTVU1NTk9SQkVIQVZJT1VSLlRFTEVQT1JULCB0aGlzLnRlbGVwb3J0KTtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZU1hY2hpbmVJbnN0cnVjdGlvbnMuc2V0QWN0aW9uKFNVTU1OT1JCRUhBVklPVVIuQUJJTElUWSwgdGhpcy5zaG9vdGluZzM2MCk7XHJcblxyXG5cclxuICAgICAgICAgICAgdGhpcy5pbnN0cnVjdGlvbnMgPSB0aGlzLnN0YXRlTWFjaGluZUluc3RydWN0aW9ucztcclxuXHJcbiAgICAgICAgICAgIHRoaXMudHJhbnNpdChTVU1NTk9SQkVIQVZJT1VSLklETEUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHRyYW5zaXQoX25leHQ6IFNVTU1OT1JCRUhBVklPVVIpOiB2b2lkIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coU1VNTU5PUkJFSEFWSU9VUlt0aGlzLnN0YXRlQ3VycmVudF0pO1xyXG4gICAgICAgICAgICB0aGlzLmxhc3RTdGF0ZSA9IHRoaXMuc3RhdGVDdXJyZW50O1xyXG4gICAgICAgICAgICB0aGlzLmluc3RydWN0aW9ucy50cmFuc2l0KHRoaXMuc3RhdGVDdXJyZW50LCBfbmV4dCwgdGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBhY3QoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5zdHJ1Y3Rpb25zLmFjdCh0aGlzLnN0YXRlQ3VycmVudCwgdGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmFjdCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYmVoYXZpb3VyID0gKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IEdhbWUuYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpLnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG4gICAgICAgICAgICB0aGlzLmZsb2NrLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLmZsb2NrLmdldE1vdmVWZWN0b3IoKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGlzdGFuY2UpO1xyXG4gICAgICAgICAgICBpZiAoZGlzdGFuY2UgPCA1KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzQWdncmVzc2l2ZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZsb2NrLm5vdFRvVGFyZ2V0V2VpZ2h0ID0gMjtcclxuICAgICAgICAgICAgICAgIHRoaXMuZmxvY2sudG9UYXJnZXRXZWlnaHQgPSAwO1xyXG4gICAgICAgICAgICAgICAgLy9UT0RPOiBJbnRybyBhbmltYXRpb24gaGVyZSBhbmQgd2hlbiBpdCBpcyBkb25lIHRoZW4gZmlnaHQuLi5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZmxvY2subm90VG9UYXJnZXRXZWlnaHQgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5mbG9jay50b1RhcmdldFdlaWdodCA9IDI7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5kYW1hZ2VUYWtlbiA+PSA0KSB7XHJcbiAgICAgICAgICAgICAgICAvLyBuZXcgQnVmZi5EYW1hZ2VCdWZmKEJ1ZmYuQlVGRklELlBPSVNPTiwgMTIwLCAzMCwgMykuYWRkVG9FbnRpdHkodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRyYW5zaXQoU1VNTU5PUkJFSEFWSU9VUi5TVU1NT04pO1xyXG4gICAgICAgICAgICAgICAgLy8gdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5TVU1NT047XHJcbiAgICAgICAgICAgICAgICAvLyB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIHRoaXMuc3RhdGVNYWNoaW5lLnRyYW5zaXQoRW50aXR5LkJFSEFWSU9VUi5GTEVFKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlKHRoaXMubW92ZURpcmVjdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0RGFtYWdlKF92YWx1ZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmdldERhbWFnZShfdmFsdWUpO1xyXG4gICAgICAgICAgICB0aGlzLmRhbWFnZVRha2VuICs9IF92YWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIG1vdmVCZWhhdmlvdXIgPSAoKSA9PiB7XHJcbiAgICAgICAgLy8gICAgIHRoaXMuYmVoYXZpb3VyKCk7XHJcblxyXG4gICAgICAgIC8vICAgICAvLyBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgIC8vICAgICAvLyAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLklETEU6XHJcbiAgICAgICAgLy8gICAgIC8vICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFKTtcclxuICAgICAgICAvLyAgICAgLy8gICAgICAgICBicmVhaztcclxuICAgICAgICAvLyAgICAgLy8gICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GTEVFOlxyXG4gICAgICAgIC8vICAgICAvLyAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuV0FMSyk7XHJcbiAgICAgICAgLy8gICAgIC8vICAgICAgICAgdGhpcy5hdHRhY2tpbmdQaGFzZSgpO1xyXG4gICAgICAgIC8vICAgICAvLyAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIC8vICAgICAvLyAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLlNVTU1PTjpcclxuICAgICAgICAvLyAgICAgLy8gICAgICAgICB0aGlzLmRlZmVuY2VQaGFzZSgpO1xyXG4gICAgICAgIC8vICAgICAvLyAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIC8vICAgICAvLyAgICAgZGVmYXVsdDpcclxuICAgICAgICAvLyAgICAgLy8gICAgICAgICBicmVhaztcclxuICAgICAgICAvLyAgICAgLy8gfVxyXG4gICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgYXR0YWNraW5nUGhhc2UgPSAoKTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5hdHRhY2tQaGFzZUNkLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF0dGFja1BoYXNlQ2Quc2V0TWF4Q29vbERvd24gPSBNYXRoLnJvdW5kKHRoaXMuYXR0YWNrUGhhc2VDZC5nZXRNYXhDb29sRG93biArIE1hdGgucmFuZG9tKCkgKiA1ICsgTWF0aC5yYW5kb20oKSAqIC01KTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNrUGhhc2VDZC5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuYXR0YWNrUGhhc2VDZC5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpLnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChkaXN0YW5jZSA+IDEwIHx8IHRoaXMuZGFzaC5kb2VzQWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IENhbGN1bGF0aW9uLmdldFJvdGF0ZWRWZWN0b3JCeUFuZ2xlMkQodGhpcy5tb3ZlRGlyZWN0aW9uLCA5MCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDEwMCkgPj0gMTApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXNoLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5tb3ZlQXdheShDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikudG9WZWN0b3IyKCkpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRhc2guZG9lc0FiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhc2hXZWFwb24uc2hvb3QoR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpLnRvVmVjdG9yMygpLCB0cnVlLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhc2hXZWFwb24uZ2V0Q29vbERvd24uc2V0TWF4Q29vbERvd24gPSBDYWxjdWxhdGlvbi5jbGFtcE51bWJlcihNYXRoLnJhbmRvbSgpICogMzAsIDgsIDMwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSAobmV3IMaSLlZlY3RvcjIoMCwgMCkpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zaG9vdGluZzM2MCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkZWZlbmNlUGhhc2UgPSAoKTogdm9pZCA9PiB7XHJcblxyXG4gICAgICAgICAgICAvLyBpZiAodGhpcy50ZWxlcG9ydCgpKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuZGVmZW5jZVBoYXNlQ2QuaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGVmZW5jZVBoYXNlQ2Quc2V0TWF4Q29vbERvd24gPSBNYXRoLnJvdW5kKHRoaXMuZGVmZW5jZVBoYXNlQ2QuZ2V0TWF4Q29vbERvd24gKyBNYXRoLnJhbmRvbSgpICogNSArIE1hdGgucmFuZG9tKCkgKiAtNSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlZmVuY2VQaGFzZUNkLnN0YXJ0Q29vbERvd24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnN1bW1vblBvc2l0aW9uLnNldChHYW1lLmN1cnJlbnRSb29tLm10eFdvcmxkLnRyYW5zbGF0aW9uLngsIEdhbWUuY3VycmVudFJvb20ubXR4V29ybGQudHJhbnNsYXRpb24ueSAtIChHYW1lLmN1cnJlbnRSb29tLnJvb21TaXplIC8gMyksIHRoaXMubXR4V29ybGQudHJhbnNsYXRpb24ueik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi5lcXVhbHModGhpcy5zdW1tb25Qb3NpdGlvbiwgMSkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLlNVTU1PTik7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3IEJ1ZmYuQXR0cmlidXRlc0J1ZmYoQnVmZi5CVUZGSUQuSU1NVU5FLCBudWxsLCAxLCAwKS5hZGRUb0VudGl0eSh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJzcGF3bmluZ1wiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdW1tb24uZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzdG9wRGVmZW5jZVBoYXNlID0gKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnN1bW1vblBvc2l0aW9uLnNldChHYW1lLmN1cnJlbnRSb29tLm10eFdvcmxkLnRyYW5zbGF0aW9uLngsIEdhbWUuY3VycmVudFJvb20ubXR4V29ybGQudHJhbnNsYXRpb24ueSwgdGhpcy5tdHhXb3JsZC50cmFuc2xhdGlvbi56KTtcclxuICAgICAgICAgICAgdGhpcy50cmFuc2l0KFNVTU1OT1JCRUhBVklPVVIuVEVMRVBPUlQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGVsZXBvcnQgPSAoKTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi5lcXVhbHModGhpcy5zdW1tb25Qb3NpdGlvbikpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuVEVMRVBPUlQpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5nZXRDdXJyZW50RnJhbWUpO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXRDdXJyZW50RnJhbWUgPj0gNSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSB0aGlzLnN1bW1vblBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodGhpcy5sYXN0U3RhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTVU1NTk9SQkVIQVZJT1VSLklETEU6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU1VNTU5PUkJFSEFWSU9VUi5BVFRBQ0s6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyYW5zaXQoU1VNTU5PUkJFSEFWSU9VUi5TVU1NT04pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU1VNTU5PUkJFSEFWSU9VUi5TVU1NT046XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyYW5zaXQoU1VNTU5PUkJFSEFWSU9VUi5BQklMSVRZKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzaG9vdGluZzM2MCgpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmJlZ2luU2hvb3RpbmcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFNob290aW5nQ291bnQgPSBNYXRoLnJvdW5kKHRoaXMuc2hvb3RpbmdDb3VudCArIE1hdGgucmFuZG9tKCkgKiAyKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYmVnaW5TaG9vdGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50U2hvb3RpbmdDb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNob290MzYwLmJ1bGxldEFtb3VudCA9IE1hdGgucm91bmQoOCArIE1hdGgucmFuZG9tKCkgKiA4KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNob290MzYwLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNob290MzYwLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFNob290aW5nQ291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYmVnaW5TaG9vdGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGFtYWdlVGFrZW4gPSAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEJ1ZmYge1xyXG5cclxuICAgIGV4cG9ydCBlbnVtIEJVRkZJRCB7XHJcbiAgICAgICAgQkxFRURJTkcsXHJcbiAgICAgICAgUE9JU09OLFxyXG4gICAgICAgIEhFQUwsXHJcbiAgICAgICAgU0xPVyxcclxuICAgICAgICBJTU1VTkUsXHJcbiAgICAgICAgU0NBTEVVUCxcclxuICAgICAgICBTQ0FMRURPV05cclxuICAgIH1cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCdWZmIHtcclxuICAgICAgICBkdXJhdGlvbjogbnVtYmVyO1xyXG4gICAgICAgIHRpY2tSYXRlOiBudW1iZXJcclxuICAgICAgICBpZDogQlVGRklEO1xyXG4gICAgICAgIHByb3RlY3RlZCBub0R1cmF0aW9uOiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGNvb2xEb3duOiBBYmlsaXR5LkNvb2xkb3duO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEJVRkZJRCwgX2R1cmF0aW9uOiBudW1iZXIsIF90aWNrUmF0ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMuZHVyYXRpb24gPSBfZHVyYXRpb247XHJcbiAgICAgICAgICAgIHRoaXMudGlja1JhdGUgPSBfdGlja1JhdGU7XHJcbiAgICAgICAgICAgIHRoaXMubm9EdXJhdGlvbiA9IDA7XHJcbiAgICAgICAgICAgIGlmIChfZHVyYXRpb24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvb2xEb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oX2R1cmF0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29vbERvd24gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBnZXRQYXJ0aWNsZUJ5SWQoX2lkOiBCVUZGSUQpOiBVSS5QYXJ0aWNsZXMge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKF9pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuUE9JU09OOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVUkuUGFydGljbGVzKEJVRkZJRC5QT0lTT04sIFVJLnBvaXNvblBhcnRpY2xlLCA2LCAxMik7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5JTU1VTkU6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoQlVGRklELklNTVVORSwgVUkuaW1tdW5lUGFydGljbGUsIDEsIDYpO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNsb25lKCk6IEJ1ZmYge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBhcHBseUJ1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEJ1ZmZTdGF0c0J5SWQodGhpcy5pZCwgX2F2YXRhciwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1ZmZMaXN0KF9hdmF0YXIuYnVmZnMsIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIHJlbW92ZXMgdGhlIGJ1ZmYgZnJvbSB0aGUgYnVmZiBsaXN0LCByZW1vdmVzIHRoZSBwYXJ0aWNsZSBhbmQgc2VuZHMgdGhlIG5ldyBsaXN0IHRvIHRoZSBjbGllbnRcclxuICAgICAgICAgKiBAcGFyYW0gX2F2YXRhciBlbnRpdHkgdGhlIGJ1ZmYgc2hvdWxkIGJlIHJlbW92ZWRcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgcmVtb3ZlQnVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIF9hdmF0YXIucmVtb3ZlQ2hpbGQoX2F2YXRhci5nZXRDaGlsZHJlbigpLmZpbmQoY2hpbGQgPT4gKDxVSS5QYXJ0aWNsZXM+Y2hpbGQpLmlkID09IHRoaXMuaWQpKTtcclxuICAgICAgICAgICAgX2F2YXRhci5idWZmcy5zcGxpY2UoX2F2YXRhci5idWZmcy5pbmRleE9mKHRoaXMpKTtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRCdWZmU3RhdHNCeUlkKHRoaXMuaWQsIF9hdmF0YXIsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQnVmZkxpc3QoX2F2YXRhci5idWZmcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogb25seSB1c2UgdGhpcyBmdW5jdGlvbiB0byBhZGQgYnVmZnMgdG8gZW50aXRpZXNcclxuICAgICAgICAgKiBAcGFyYW0gX2F2YXRhciBlbnRpdHkgaXQgc2hvdWxkIGJlIGFkZCB0b1xyXG4gICAgICAgICAqIEByZXR1cm5zIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBhZGRUb0VudGl0eShfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIGlmIChfYXZhdGFyLmJ1ZmZzLmZpbHRlcihidWZmID0+IGJ1ZmYuaWQgPT0gdGhpcy5pZCkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgX2F2YXRhci5idWZmcy5wdXNoKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRQYXJ0aWNsZShfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvb2xEb3duICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29vbERvd24uc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVCdWZmTGlzdChfYXZhdGFyLmJ1ZmZzLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogYnVmZiBhcHBsaWVzIGl0cyBidWZmIHN0YXRzIHRvIHRoZSBlbnRpdHkgYW5kIGRlbGV0ZXMgaXRzZWxmIHdoZW4gaXRzIGR1cmF0aW9uIGlzIG92ZXJcclxuICAgICAgICAgKiBAcGFyYW0gX2F2YXRhciBlbnRpdHkgaXQgc2hvdWxkIGJlIGFkZCB0b1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBkb0J1ZmZTdHVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGdldEJ1ZmZTdGF0c0J5SWQoX2lkOiBCdWZmLkJVRkZJRCwgX2F2YXRhcjogRW50aXR5LkVudGl0eSwgX2FkZDogYm9vbGVhbikge1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBhZGRQYXJ0aWNsZShfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIGlmIChfYXZhdGFyLmdldENoaWxkcmVuKCkuZmluZChjaGlsZCA9PiAoPFVJLlBhcnRpY2xlcz5jaGlsZCkuaWQgPT0gdGhpcy5pZCkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcGFydGljbGUgPSB0aGlzLmdldFBhcnRpY2xlQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgICAgIGlmIChwYXJ0aWNsZSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmFkZENoaWxkKHBhcnRpY2xlKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJ0aWNsZS5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMyhfYXZhdGFyLm10eExvY2FsLnNjYWxpbmcueCwgX2F2YXRhci5tdHhMb2NhbC5zY2FsaW5nLnksIDEpKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJ0aWNsZS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IyKF9hdmF0YXIub2Zmc2V0Q29sbGlkZXJYLCBfYXZhdGFyLm9mZnNldENvbGxpZGVyWSkudG9WZWN0b3IzKDAuMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFydGljbGUuYWN0aXZhdGUodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFJhcml0eUJ1ZmYge1xyXG4gICAgICAgIGlkOiBJdGVtcy5SQVJJVFk7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBJdGVtcy5SQVJJVFkpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBhZGRUb0l0ZW0oX2l0ZW06IEl0ZW1zLkl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5hZGRQYXJ0aWNsZVRvSXRlbShfaXRlbSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGdldFBhcnRpY2xlQnlJZChfaWQ6IEl0ZW1zLlJBUklUWSk6IFVJLlBhcnRpY2xlcyB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEl0ZW1zLlJBUklUWS5DT01NT046XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoX2lkLCBVSS5jb21tb25QYXJ0aWNsZSwgMSwgMTIpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5SQVJJVFkuUkFSRTpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVJLlBhcnRpY2xlcyhfaWQsIFVJLnJhcmVQYXJ0aWNsZSwgMSwgMTIpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5SQVJJVFkuRVBJQzpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVJLlBhcnRpY2xlcyhfaWQsIFVJLmVwaWNQYXJ0aWNsZSwgMSwgMTIpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5SQVJJVFkuTEVHRU5EQVJZOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVUkuUGFydGljbGVzKF9pZCwgVUkubGVnZW5kYXJ5UGFydGljbGUsIDEsIDEyKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoX2lkLCBVSS5jb21tb25QYXJ0aWNsZSwgMSwgMTIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGFkZFBhcnRpY2xlVG9JdGVtKF9pdGVtOiBJdGVtcy5JdGVtKSB7XHJcbiAgICAgICAgICAgIGlmIChfaXRlbS5nZXRDaGlsZHJlbigpLmZpbmQoY2hpbGQgPT4gKDxVSS5QYXJ0aWNsZXM+Y2hpbGQpLmlkID09IHRoaXMuaWQpID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHBhcnRpY2xlID0gdGhpcy5nZXRQYXJ0aWNsZUJ5SWQodGhpcy5pZClcclxuICAgICAgICAgICAgICAgIGlmIChwYXJ0aWNsZSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBfaXRlbS5hZGRDaGlsZChwYXJ0aWNsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFydGljbGUubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjMoX2l0ZW0ubXR4TG9jYWwuc2NhbGluZy54LCBfaXRlbS5tdHhMb2NhbC5zY2FsaW5nLnksIDEpKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJ0aWNsZS5tdHhMb2NhbC50cmFuc2xhdGVaKDAuMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFydGljbGUuYWN0aXZhdGUodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIGNyZWF0ZXMgYSBuZXcgQnVmZiB0aGF0IGRvZXMgRGFtYWdlIHRvIGFuIEVudGl0eTtcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIERhbWFnZUJ1ZmYgZXh0ZW5kcyBCdWZmIHtcclxuICAgICAgICB2YWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogQlVGRklELCBfZHVyYXRpb246IG51bWJlciwgX3RpY2tSYXRlOiBudW1iZXIsIF92YWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2R1cmF0aW9uLCBfdGlja1JhdGUpXHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBfdmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2xvbmUoKTogRGFtYWdlQnVmZiB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGFtYWdlQnVmZih0aGlzLmlkLCB0aGlzLmR1cmF0aW9uLCB0aGlzLnRpY2tSYXRlLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkb0J1ZmZTdHVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvb2xEb3duICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNvb2xEb3duLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuY29vbERvd24uZ2V0Q3VycmVudENvb2xkb3duICUgdGhpcy50aWNrUmF0ZSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseUJ1ZmYoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5ub0R1cmF0aW9uICUgdGhpcy50aWNrUmF0ZSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseUJ1ZmYoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRHVyYXRpb24rKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGdldEJ1ZmZTdGF0c0J5SWQoX2lkOiBCVUZGSUQsIF9hdmF0YXI6IEVudGl0eS5FbnRpdHksIF9hZGQ6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuQkxFRURJTkc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuZ2V0RGFtYWdlKHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5QT0lTT046XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgZG8gZGFtYWdlIHRvIHBsYXllciB1bnRpbCBoZSBoYXMgMjAlIGhlYWx0aFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2F2YXRhciBpbnN0YW5jZW9mIFBsYXllci5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfYXZhdGFyLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzID4gX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAqIDAuMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuZ2V0RGFtYWdlKHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5nZXREYW1hZ2UodGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7IHJldHVybjsgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogY3JlYXRlcyBhIG5ldyBCdWZmIHRoYXQgY2hhbmdlcyBhbiBhdHRyaWJ1dGUgb2YgYW4gRW50aXR5IGZvciB0aGUgZHVyYXRpb24gb2YgdGhlIGJ1ZmZcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEF0dHJpYnV0ZXNCdWZmIGV4dGVuZHMgQnVmZiB7XHJcbiAgICAgICAgcHJpdmF0ZSBpc0J1ZmZBcHBsaWVkOiBib29sZWFuO1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSByZW1vdmVkVmFsdWU6IG51bWJlcjtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEJVRkZJRCwgX2R1cmF0aW9uOiBudW1iZXIsIF90aWNrUmF0ZTogbnVtYmVyLCBfdmFsdWU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9kdXJhdGlvbiwgX3RpY2tSYXRlKTtcclxuICAgICAgICAgICAgdGhpcy5pc0J1ZmZBcHBsaWVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBfdmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBjbG9uZSgpOiBBdHRyaWJ1dGVzQnVmZiB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgQXR0cmlidXRlc0J1ZmYodGhpcy5pZCwgdGhpcy5kdXJhdGlvbiwgdGhpcy50aWNrUmF0ZSwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBkb0J1ZmZTdHVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmR1cmF0aW9uICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZHVyYXRpb24gPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlQnVmZihfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKCF0aGlzLmlzQnVmZkFwcGxpZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGx5QnVmZihfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQnVmZkFwcGxpZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5kdXJhdGlvbi0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmlzQnVmZkFwcGxpZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGx5QnVmZihfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQnVmZkFwcGxpZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRQYXJ0aWNsZShfYXZhdGFyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGdldEJ1ZmZTdGF0c0J5SWQoX2lkOiBCVUZGSUQsIF9hdmF0YXI6IEVudGl0eS5FbnRpdHksIF9hZGQ6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgbGV0IHBheWxvYWQ6IEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZDtcclxuICAgICAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELlNMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVkVmFsdWUgPSBfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQgLSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQgLT0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQgKz0gdGhpcy5yZW1vdmVkVmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuSU1NVU5FOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5oaXRhYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmhpdGFibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBwYXlsb2FkID0gPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuaGl0YWJsZSwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuSElUQUJMRSB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5TQ0FMRVVQOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlZFZhbHVlID0gQ2FsY3VsYXRpb24uYWRkUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLnZhbHVlKSAtIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlID0gQ2FsY3VsYXRpb24uYWRkUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSAtPSB0aGlzLnJlbW92ZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBheWxvYWQgPSA8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuU0NBTEUgfTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELlNDQUxFRE9XTjpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZWRWYWx1ZSA9IF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSAtIENhbGN1bGF0aW9uLnN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSA9IENhbGN1bGF0aW9uLnN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUgKz0gdGhpcy5yZW1vdmVkVmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIudXBkYXRlU2NhbGUoKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXlsb2FkID0gPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLlNDQUxFIH07XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKHBheWxvYWQsIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0QnVmZkJ5SWQoX2lkOiBCVUZGSUQpOiBCdWZmIHtcclxuICAgICAgICBsZXQgcmVmOiBCdWZmID0gdW5kZWZpbmVkO1xyXG5cclxuICAgICAgICByZWYgPSA8RGFtYWdlQnVmZj5HYW1lLmRhbWFnZUJ1ZmZKU09OLmZpbmQoYnVmZiA9PiBidWZmLmlkID09IF9pZCk7XHJcbiAgICAgICAgaWYgKHJlZiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYW1hZ2VCdWZmKF9pZCwgcmVmLmR1cmF0aW9uLCByZWYudGlja1JhdGUsICg8RGFtYWdlQnVmZj5yZWYpLnZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlZiA9IDxBdHRyaWJ1dGVzQnVmZj5HYW1lLmF0dHJpYnV0ZUJ1ZmZKU09OLmZpbmQoYnVmZiA9PiBidWZmLmlkID09IF9pZCk7XHJcbiAgICAgICAgaWYgKHJlZiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBBdHRyaWJ1dGVzQnVmZihfaWQsIHJlZi5kdXJhdGlvbiwgcmVmLnRpY2tSYXRlLCAoPEF0dHJpYnV0ZXNCdWZmPnJlZikudmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQnVsbGV0cyB7XHJcblxyXG4gICAgZXhwb3J0IGVudW0gQlVMTEVUVFlQRSB7XHJcbiAgICAgICAgU1RBTkRBUkQsXHJcbiAgICAgICAgSElHSFNQRUVELFxyXG4gICAgICAgIFNMT1csXHJcbiAgICAgICAgTUVMRUUsXHJcbiAgICAgICAgU1VNTU9ORVIsXHJcbiAgICAgICAgVEhPUlNIQU1NRVIsXHJcbiAgICAgICAgWklQWkFQXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCBidWxsZXRUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgd2F0ZXJCYWxsVHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCdWxsZXQgZXh0ZW5kcyBHYW1lLsaSLk5vZGUgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklTcGF3bmFibGUsIEludGVyZmFjZXMuSU5ldHdvcmthYmxlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5CVUxMRVQ7XHJcbiAgICAgICAgb3duZXJOZXRJZDogbnVtYmVyOyBnZXQgb3duZXIoKTogRW50aXR5LkVudGl0eSB7IHJldHVybiBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IHRoaXMub3duZXJOZXRJZCkgfTtcclxuICAgICAgICBwdWJsaWMgbmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgY2xpZW50UHJlZGljdGlvbjogTmV0d29ya2luZy5DbGllbnRCdWxsZXRQcmVkaWN0aW9uO1xyXG4gICAgICAgIHB1YmxpYyBzZXJ2ZXJQcmVkaWN0aW9uOiBOZXR3b3JraW5nLlNlcnZlckJ1bGxldFByZWRpY3Rpb247XHJcbiAgICAgICAgcHVibGljIGZseURpcmVjdGlvbjogxpIuVmVjdG9yMztcclxuICAgICAgICBkaXJlY3Rpb246IMaSLlZlY3RvcjM7XHJcblxyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7XHJcblxyXG4gICAgICAgIHB1YmxpYyBoaXRQb2ludHNTY2FsZTogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBzcGVlZDogbnVtYmVyID0gMjA7XHJcbiAgICAgICAgbGlmZXRpbWU6IG51bWJlciA9IDEgKiA2MDtcclxuICAgICAgICBrbm9ja2JhY2tGb3JjZTogbnVtYmVyID0gNDtcclxuICAgICAgICB0eXBlOiBCVUxMRVRUWVBFO1xyXG5cclxuICAgICAgICB0aW1lOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIGtpbGxjb3VudDogbnVtYmVyID0gMTtcclxuXHJcbiAgICAgICAgdGV4dHVyZVBhdGg6IHN0cmluZztcclxuICAgICAgICBsYXN0UG9zaXRpb246IMaSLlZlY3RvcjM7XHJcbiAgICAgICAgY291bnRDaGVja1VwZGF0ZTogbnVtYmVyID0gMDtcclxuXHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfYnVsbGV0VHlwZTogQlVMTEVUVFlQRSwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfb3duZXJOZXRJZDogbnVtYmVyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoQlVMTEVUVFlQRVtfYnVsbGV0VHlwZV0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy50eXBlID0gX2J1bGxldFR5cGU7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm5ldElkID0gTmV0d29ya2luZy5JZE1hbmFnZXIoX25ldElkKTtcclxuXHJcbiAgICAgICAgICAgIGxldCByZWYgPSBHYW1lLmJ1bGxldHNKU09OLmZpbmQoYnVsbGV0ID0+IGJ1bGxldC5uYW1lID09IEJVTExFVFRZUEVbX2J1bGxldFR5cGVdLnRvTG93ZXJDYXNlKCkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IHJlZi5zcGVlZDtcclxuICAgICAgICAgICAgdGhpcy5oaXRQb2ludHNTY2FsZSA9IHJlZi5oaXRQb2ludHNTY2FsZTtcclxuICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IHJlZi5saWZldGltZTtcclxuICAgICAgICAgICAgdGhpcy5rbm9ja2JhY2tGb3JjZSA9IHJlZi5rbm9ja2JhY2tGb3JjZTtcclxuICAgICAgICAgICAgdGhpcy5raWxsY291bnQgPSByZWYua2lsbGNvdW50O1xyXG4gICAgICAgICAgICB0aGlzLnRleHR1cmVQYXRoID0gcmVmLnRleHR1cmVQYXRoO1xyXG5cclxuICAgICAgICAgICAgLy8gdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudExpZ2h0KG5ldyDGki5MaWdodFBvaW50KMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgMCk7XHJcbiAgICAgICAgICAgIGxldCBtZXNoOiDGki5NZXNoUXVhZCA9IG5ldyDGki5NZXNoUXVhZCgpO1xyXG4gICAgICAgICAgICBsZXQgY21wTWVzaDogxpIuQ29tcG9uZW50TWVzaCA9IG5ldyDGki5Db21wb25lbnRNZXNoKG1lc2gpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChjbXBNZXNoKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBtdHJTb2xpZFdoaXRlOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIlNvbGlkV2hpdGVcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIikpKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1hdGVyaWFsOiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChtdHJTb2xpZFdoaXRlKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGNvbGxpZGVyUG9zaXRpb24gPSBuZXcgxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIoY29sbGlkZXJQb3NpdGlvbiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55IC8gMS41LCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ubWFnbml0dWRlU3F1YXJlZCA+IDApIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy51cGRhdGVSb3RhdGlvbihfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSgpO1xyXG4gICAgICAgICAgICB0aGlzLmZseURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWCgpO1xyXG4gICAgICAgICAgICB0aGlzLmRpcmVjdGlvbiA9IF9kaXJlY3Rpb247XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9vd25lck5ldElkO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXJ2ZXJQcmVkaWN0aW9uID0gbmV3IE5ldHdvcmtpbmcuU2VydmVyQnVsbGV0UHJlZGljdGlvbih0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5jbGllbnRQcmVkaWN0aW9uID0gbmV3IE5ldHdvcmtpbmcuQ2xpZW50QnVsbGV0UHJlZGljdGlvbih0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5sYXN0UG9zaXRpb24gPSB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5SRU5ERVJfUFJFUEFSRSwgdGhpcy5ldmVudFVwZGF0ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJlZGljdCgpO1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUxpZmV0aW1lKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzcGF3bihfc3luYzogYm9vbGVhbikge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgIC8vIE5ldHdvcmtpbmcuc3Bhd25CdWxsZXQodGhpcy5kaXJlY3Rpb24sIHRoaXMubmV0SWQsIHRoaXMub3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkZXNwYXduKCkge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnJlbW92ZUJ1bGxldCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnR5cGUgPT0gQlVMTEVUVFlQRS5USE9SU0hBTU1FUikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zcGF3blRob3JzSGFtbWVyKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCB1cGRhdGVMaWZldGltZSgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPj0gMCAmJiB0aGlzLmxpZmV0aW1lICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUtLTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVzcGF3bigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgcHJlZGljdCgpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAhPSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3duZXIgPT0gR2FtZS5hdmF0YXIxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGllbnRQcmVkaWN0aW9uLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja1VwZGF0ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3duZXIgPT0gR2FtZS5hdmF0YXIyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXJ2ZXJQcmVkaWN0aW9uLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmUodGhpcy5mbHlEaXJlY3Rpb24uY2xvbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQnVsbGV0KHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMubXR4TG9jYWwucm90YXRpb24sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgY2hlY2tVcGRhdGUoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxhc3RQb3NpdGlvbiA9PSB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvdW50Q2hlY2tVcGRhdGUrKztcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvdW50Q2hlY2tVcGRhdGUgPj0gKDIgKiA2MCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlc3Bhd24oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY291bnRDaGVja1VwZGF0ZSA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5sYXN0UG9zaXRpb24gPSB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG1vdmUoX2RpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQgJiYgdGhpcy5vd25lciA9PSBHYW1lLmF2YXRhcjIpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUodGhpcy5jbGllbnRQcmVkaWN0aW9uLm1pblRpbWVCZXR3ZWVuVGlja3MgKiB0aGlzLnNwZWVkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLnNwZWVkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMub2Zmc2V0Q29sbGlkZXIoKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaXNpb25EZXRlY3Rpb24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCB1cGRhdGVSb3RhdGlvbihfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwucm90YXRlWihDYWxjdWxhdGlvbi5jYWxjRGVncmVlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCDGki5WZWN0b3IzLlNVTShfZGlyZWN0aW9uLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikpICsgOTApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHNwYXduVGhvcnNIYW1tZXIoKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIGxldCByZW1vdmVJdGVtID0gdGhpcy5vd25lci5pdGVtcy5maW5kKGl0ZW0gPT4gKDxJdGVtcy5JbnRlcm5hbEl0ZW0+aXRlbSkuaWQgPT0gSXRlbXMuSVRFTUlELlRIT1JTSEFNTUVSKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlSW52ZW50b3J5KGZhbHNlLCByZW1vdmVJdGVtLmlkLCByZW1vdmVJdGVtLm5ldElkLCB0aGlzLm93bmVyTmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vd25lci5pdGVtcy5zcGxpY2UodGhpcy5vd25lci5pdGVtcy5pbmRleE9mKHJlbW92ZUl0ZW0pLCAxKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaXRlbSA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oSXRlbXMuSVRFTUlELlRIT1JTSEFNTUVSKTtcclxuICAgICAgICAgICAgICAgIGl0ZW0uc2V0UG9zaXRpb24odGhpcy5tdHhXb3JsZC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vd25lciA9PSBHYW1lLmF2YXRhcjEpIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLnNldENob29zZW5PbmVOZXRJZChHYW1lLmF2YXRhcjIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLnNldENob29zZW5PbmVOZXRJZChHYW1lLmF2YXRhcjEubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaXRlbS5zcGF3bigpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMub3duZXIud2VhcG9uID0gKDxXZWFwb25zLlRob3JzSGFtbWVyPnRoaXMub3duZXIud2VhcG9uKS53ZWFwb25TdG9yYWdlO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHRoaXMub3duZXIud2VhcG9uLmdldENvb2xEb3duLnNldE1heENvb2xEb3duID0gK2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwiY29vbGRvd25UaW1lXCIpO1xyXG4gICAgICAgICAgICAgICAgLy8gdGhpcy5vd25lci53ZWFwb24uYWltVHlwZSA9ICg8YW55PldlYXBvbnMuQUlNKVtsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImFpbVR5cGVcIildO1xyXG4gICAgICAgICAgICAgICAgLy8gdGhpcy5vd25lci53ZWFwb24uYnVsbGV0VHlwZSA9ICg8YW55PkJVTExFVFRZUEUpW2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwiYnVsbGV0VHlwZVwiKV07XHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzLm93bmVyLndlYXBvbi5wcm9qZWN0aWxlQW1vdW50ID0gK2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwicHJvamVjdGlsZUFtb3VudFwiKTtcclxuICAgICAgICAgICAgICAgIC8vIHRoaXMub3duZXIud2VhcG9uLmNhblNob290ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhcldlYXBvbigoPFBsYXllci5QbGF5ZXI+dGhpcy5vd25lcikud2VhcG9uLCB0aGlzLm93bmVyTmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgbG9hZFRleHR1cmUoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRleHR1cmVQYXRoICE9IFwiXCIgJiYgdGhpcy50ZXh0dXJlUGF0aCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV3VHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV3Q29hdDogxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkID0gbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld010cjogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtdHJcIiwgxpIuU2hhZGVyRmxhdFRleHR1cmVkLCBuZXdDb2F0KTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgb2xkQ29tQ29hdDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBvbGRDb21Db2F0ID0gdGhpcy5nZXRDb21wb25lbnQoxpIuQ29tcG9uZW50TWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgICAgIHN3aXRjaCAodGhpcy50ZXh0dXJlUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgYnVsbGV0VHh0LnVybDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gYnVsbGV0VHh0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIHdhdGVyQmFsbFR4dC51cmw6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHdhdGVyQmFsbFR4dDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbmV3Q29hdC5jb2xvciA9IMaSLkNvbG9yLkNTUyhcIldISVRFXCIpO1xyXG4gICAgICAgICAgICAgICAgbmV3Q29hdC50ZXh0dXJlID0gbmV3VHh0O1xyXG4gICAgICAgICAgICAgICAgb2xkQ29tQ29hdC5tYXRlcmlhbCA9IG5ld010cjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0QnVmZlRvVGFyZ2V0KF90YXJnZXQ6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgdGhpcy5vd25lci5pdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgaXRlbS5idWZmLmZvckVhY2goYnVmZiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJ1ZmYgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmYuY2xvbmUoKS5hZGRUb0VudGl0eShfdGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvZmZzZXRDb2xsaWRlcigpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1Bvc2l0aW9uID0gbmV3IMaSLlZlY3RvcjIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCArIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gbmV3UG9zaXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY29sbGlzaW9uRGV0ZWN0aW9uKCkge1xyXG4gICAgICAgICAgICBsZXQgY29sbGlkZXJzOiDGki5Ob2RlW10gPSBbXTtcclxuICAgICAgICAgICAgaWYgKHRoaXMub3duZXIudGFnID09IFRhZy5UQUcuUExBWUVSKSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRlcnMgPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxFbmVteS5FbmVteT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5FTkVNWSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKF9lbGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudDogRW5lbXkuRW5lbXkgPSAoPEVuZW15LkVuZW15Pl9lbGVtKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQuY29sbGlkZXIpICYmIGVsZW1lbnQuYXR0cmlidXRlcyAhPSB1bmRlZmluZWQgJiYgdGhpcy5raWxsY291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgRW5lbXkuU3VtbW9ub3JBZGRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKDxFbmVteS5TdW1tb25vckFkZHM+ZWxlbWVudCkuYXZhdGFyID09IHRoaXMub3duZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmtpbGxjb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPEVuZW15LkVuZW15PmVsZW1lbnQpLmdldERhbWFnZSh0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzICogdGhpcy5oaXRQb2ludHNTY2FsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QnVmZlRvVGFyZ2V0KCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPEVuZW15LkVuZW15PmVsZW1lbnQpLmdldEtub2NrYmFjayh0aGlzLmtub2NrYmFja0ZvcmNlLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5raWxsY291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm93bmVyLnRhZyA9PSBUYWcuVEFHLkVORU1ZKSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRlcnMgPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlBMQVlFUik7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoX2VsZW0pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZWxlbWVudDogUGxheWVyLlBsYXllciA9ICg8UGxheWVyLlBsYXllcj5fZWxlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5hdHRyaWJ1dGVzICE9IHVuZGVmaW5lZCAmJiB0aGlzLmtpbGxjb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA+IDAgJiYgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmF0dHJpYnV0ZXMuaGl0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmdldERhbWFnZSh0aGlzLmhpdFBvaW50c1NjYWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5nZXRLbm9ja2JhY2sodGhpcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBVSS5EYW1hZ2VVSSgoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLmhpdFBvaW50c1NjYWxlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmtpbGxjb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMua2lsbGNvdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGVzcGF3bigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb2xsaWRlcnMgPSBbXTtcclxuICAgICAgICAgICAgY29sbGlkZXJzID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbWVudCA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5ST09NKSkud2FsbHM7XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChfZWxlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnQ6IEdlbmVyYXRpb24uV2FsbCA9ICg8R2VuZXJhdGlvbi5XYWxsPl9lbGVtKTtcclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmNvbGxpZGVyICE9IHVuZGVmaW5lZCAmJiB0aGlzLmNvbGxpZGVyLmNvbGxpZGVzUmVjdChlbGVtZW50LmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVzcGF3bigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgSG9taW5nQnVsbGV0IGV4dGVuZHMgQnVsbGV0IHtcclxuICAgICAgICB0YXJnZXQ6IMaSLlZlY3RvcjM7XHJcbiAgICAgICAgcm90YXRlU3BlZWQ6IG51bWJlciA9IDI7XHJcbiAgICAgICAgdGFyZ2V0RGlyZWN0aW9uOiDGki5WZWN0b3IzO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfYnVsbGV0dHlwZTogQlVMTEVUVFlQRSwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfb3duZXJJZDogbnVtYmVyLCBfdGFyZ2V0PzogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9idWxsZXR0eXBlLCBfcG9zaXRpb24sIF9kaXJlY3Rpb24sIF9vd25lcklkLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gMjA7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0UG9pbnRzU2NhbGUgPSAxO1xyXG4gICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMSAqIDYwO1xyXG4gICAgICAgICAgICB0aGlzLmtpbGxjb3VudCA9IDE7XHJcbiAgICAgICAgICAgIGlmIChfdGFyZ2V0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gX3RhcmdldDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBlbHNlIHtcclxuICAgICAgICAgICAgLy8gICAgIHRoaXMudGFyZ2V0ID0gxpIuVmVjdG9yMy5TVU0odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiwgX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgdGhpcy50YXJnZXREaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFRhcmdldChHYW1lLmF2YXRhcjIubmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgc3VwZXIubW92ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVIb21pbmcoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm93bmVyID09IEdhbWUuYXZhdGFyMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlSG9taW5nKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldFRhcmdldChfbmV0SUQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBpZiAoR2FtZS5lbnRpdGllcy5maW5kKGVudCA9PiBlbnQubmV0SWQgPT0gX25ldElEKSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gR2FtZS5lbnRpdGllcy5maW5kKGVudCA9PiBlbnQubmV0SWQgPT0gX25ldElEKS5tdHhMb2NhbC50cmFuc2xhdGlvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBjYWxjdWxhdGVIb21pbmcoKSB7XHJcbiAgICAgICAgICAgIGxldCBuZXdEaXJlY3Rpb24gPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICBpZiAobmV3RGlyZWN0aW9uLnggIT0gMCAmJiBuZXdEaXJlY3Rpb24ueSAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IHJvdGF0ZUFtb3VudDI6IG51bWJlciA9IMaSLlZlY3RvcjMuQ1JPU1MobmV3RGlyZWN0aW9uLCB0aGlzLm10eExvY2FsLmdldFgoKSkuejtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5yb3RhdGVaKC1yb3RhdGVBbW91bnQyICogdGhpcy5yb3RhdGVTcGVlZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBaaXBaYXBPYmplY3QgZXh0ZW5kcyBCdWxsZXQge1xyXG4gICAgICAgIHByaXZhdGUgbmV4dFRhcmdldDogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHByaXZhdGUgYXZhdGFyczogUGxheWVyLlBsYXllcltdO1xyXG4gICAgICAgIHByaXZhdGUgcGxheWVyU2l6ZTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgY291bnRlcjogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgdGlja0hpdDogQWJpbGl0eS5Db29sZG93bjtcclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihCVUxMRVRUWVBFLlpJUFpBUCwgbmV3IMaSLlZlY3RvcjIoMCwgMCksIG5ldyDGki5WZWN0b3IyKDAsIDApLnRvVmVjdG9yMygpLCBfb3duZXJOZXRJZCwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXJzID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB0aGlzLmNvdW50ZXIgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuVUk7XHJcbiAgICAgICAgICAgIHRoaXMudGlja0hpdCA9IG5ldyBBYmlsaXR5LkNvb2xkb3duKDEyKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcHJvdGVjdGVkIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKEdhbWUuYXZhdGFyMSAhPSB1bmRlZmluZWQgJiYgR2FtZS5hdmF0YXIyICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmF2YXRhcnMgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXZhdGFycyA9IFtHYW1lLmF2YXRhcjEsIEdhbWUuYXZhdGFyMl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyU2l6ZSA9IHRoaXMuYXZhdGFycy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dFRhcmdldCA9IHRoaXMuYXZhdGFyc1swICUgdGhpcy5wbGF5ZXJTaXplXS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHRoaXMubmV4dFRhcmdldC50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdmF0YXJzID0gW0dhbWUuYXZhdGFyMSwgR2FtZS5hdmF0YXIyXTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMudGlja0hpdC5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpc2lvbkRldGVjdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRpY2tIaXQuc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1bGxldCh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLm10eExvY2FsLnJvdGF0aW9uLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmtpbGxjb3VudCA9IDUwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIHNwYXduKCkge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduWmlwWmFwKHRoaXMub3duZXJOZXRJZCwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZGVzcGF3bigpIHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5yZW1vdmVCdWxsZXQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZSgpIHtcclxuICAgICAgICAgICAgbGV0IGRpcmVjdGlvbiA9IEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMubmV4dFRhcmdldCwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZSA9IGRpcmVjdGlvbi5tYWduaXR1ZGVTcXVhcmVkO1xyXG4gICAgICAgICAgICBpZiAoZGlyZWN0aW9uLm1hZ25pdHVkZVNxdWFyZWQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKEdhbWUuZGVsdGFUaW1lICogdGhpcy5zcGVlZCk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRlKGRpcmVjdGlvbi50b1ZlY3RvcjMoKSk7XHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZSA8IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY291bnRlciA9ICh0aGlzLmNvdW50ZXIgKyAxKSAlIHRoaXMucGxheWVyU2l6ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLm5leHRUYXJnZXQgPSB0aGlzLmF2YXRhcnNbdGhpcy5jb3VudGVyXS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQ29sbGlkZXIge1xyXG4gICAgZXhwb3J0IGNsYXNzIENvbGxpZGVyIHtcclxuICAgICAgICBwdWJsaWMgb3duZXJOZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgcmFkaXVzOiBudW1iZXI7IGdldCBnZXRSYWRpdXMoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMucmFkaXVzIH07XHJcbiAgICAgICAgcHVibGljIHBvc2l0aW9uOiDGki5WZWN0b3IyO1xyXG5cclxuICAgICAgICBnZXQgdG9wKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi55IC0gdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgbGVmdCgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueCAtIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IHJpZ2h0KCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi54ICsgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgYm90dG9tKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi55ICsgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfcmFkaXVzOiBudW1iZXIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBfcG9zaXRpb247XHJcbiAgICAgICAgICAgIHRoaXMucmFkaXVzID0gX3JhZGl1cztcclxuICAgICAgICAgICAgdGhpcy5vd25lck5ldElkID0gX25ldElkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldFBvc2l0aW9uKF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBfcG9zaXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0UmFkaXVzKF9uZXdSYWRpdXM6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLnJhZGl1cyA9IF9uZXdSYWRpdXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb2xsaWRlcyhfY29sbGlkZXI6IENvbGxpZGVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZTogxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvc2l0aW9uLCBfY29sbGlkZXIucG9zaXRpb24pO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5yYWRpdXMgKyBfY29sbGlkZXIucmFkaXVzID4gZGlzdGFuY2UubWFnbml0dWRlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb2xsaWRlc1JlY3QoX2NvbGxpZGVyOiBHYW1lLsaSLlJlY3RhbmdsZSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5sZWZ0ID4gX2NvbGxpZGVyLnJpZ2h0KSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnJpZ2h0IDwgX2NvbGxpZGVyLmxlZnQpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMudG9wID4gX2NvbGxpZGVyLmJvdHRvbSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5ib3R0b20gPCBfY29sbGlkZXIudG9wKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0SW50ZXJzZWN0aW9uKF9jb2xsaWRlcjogQ29sbGlkZXIpOiBudW1iZXIge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29sbGlkZXMoX2NvbGxpZGVyKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlOiDGki5WZWN0b3IyID0gxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMucG9zaXRpb24sIF9jb2xsaWRlci5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb24gPSB0aGlzLnJhZGl1cyArIF9jb2xsaWRlci5yYWRpdXMgLSBkaXN0YW5jZS5tYWduaXR1ZGU7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaW50ZXJzZWN0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0SW50ZXJzZWN0aW9uUmVjdChfY29sbGlkZXI6IMaSLlJlY3RhbmdsZSk6IMaSLlJlY3RhbmdsZSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb2xsaWRlc1JlY3QoX2NvbGxpZGVyKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbjogxpIuUmVjdGFuZ2xlID0gbmV3IMaSLlJlY3RhbmdsZSgpO1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24ueCA9IE1hdGgubWF4KHRoaXMubGVmdCwgX2NvbGxpZGVyLmxlZnQpO1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24ueSA9IE1hdGgubWF4KHRoaXMudG9wLCBfY29sbGlkZXIudG9wKTtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLndpZHRoID0gTWF0aC5taW4odGhpcy5yaWdodCwgX2NvbGxpZGVyLnJpZ2h0KSAtIGludGVyc2VjdGlvbi54O1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24uaGVpZ2h0ID0gTWF0aC5taW4odGhpcy5ib3R0b20sIF9jb2xsaWRlci5ib3R0b20pIC0gaW50ZXJzZWN0aW9uLnk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaW50ZXJzZWN0aW9uO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBFbmVteVNwYXduZXIge1xyXG4gICAgbGV0IHNwYXduVGltZTogbnVtYmVyID0gMCAqIDYwO1xyXG4gICAgbGV0IGN1cnJlbnRUaW1lOiBudW1iZXIgPSBzcGF3blRpbWU7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduTXVsdGlwbGVFbmVtaWVzQXRSb29tKF9tYXhFbmVtaWVzOiBudW1iZXIsIF9yb29tUG9zOiBHYW1lLsaSLlZlY3RvcjIpOiB2b2lkIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIC8vVE9ETzogZGVwZW5kaW5nIG9uIGN1cnJlbnRyb29tLmVuZW15Q291bnQgYW5kIGRlY3JlYXNlIGl0IFxyXG4gICAgICAgICAgICBsZXQgc3Bhd25lZEVuZW1pZXM6IG51bWJlciA9IDA7XHJcbiAgICAgICAgICAgIHdoaWxlIChzcGF3bmVkRW5lbWllcyA8IF9tYXhFbmVtaWVzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPT0gc3Bhd25UaW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uID0gbmV3IMaSLlZlY3RvcjIoKChNYXRoLnJhbmRvbSgpICogR2FtZS5jdXJyZW50Um9vbS5yb29tU2l6ZSAvIDIpIC0gKChNYXRoLnJhbmRvbSgpICogR2FtZS5jdXJyZW50Um9vbS5yb29tU2l6ZSAvIDIpKSksICgoTWF0aC5yYW5kb20oKSAqIEdhbWUuY3VycmVudFJvb20ucm9vbVNpemUgLyAyKSAtICgoTWF0aC5yYW5kb20oKSAqIEdhbWUuY3VycmVudFJvb20ucm9vbVNpemUgLyAyKSkpKTtcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbi5hZGQoX3Jvb21Qb3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogdXNlIElEIHRvIGdldCByYW5kb20gZW5lbWllc1xyXG4gICAgICAgICAgICAgICAgICAgIHNwYXduQnlJRChFbmVteS5FTkVNWUNMQVNTLkVORU1ZRFVNQiwgRW50aXR5LklELlNNQUxMVElDSywgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHNwYXduZWRFbmVtaWVzKys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50VGltZS0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRUaW1lIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50VGltZSA9IHNwYXduVGltZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRSYW5kb21FbmVteUlkKCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IHJhbmRvbSA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIE9iamVjdC5rZXlzKEVudGl0eS5JRCkubGVuZ3RoIC8gMik7XHJcbiAgICAgICAgaWYgKHJhbmRvbSA8PSAyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21FbmVteUlkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyYW5kb20pO1xyXG4gICAgICAgICAgICByZXR1cm4gcmFuZG9tO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25CeUlEKF9lbmVteUNsYXNzOiBFbmVteS5FTkVNWUNMQVNTLCBfaWQ6IEVudGl0eS5JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfdGFyZ2V0PzogUGxheWVyLlBsYXllciwgX25ldElEPzogbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IGVuZW15OiBFbmVteS5FbmVteTtcclxuICAgICAgICBzd2l0Y2ggKF9lbmVteUNsYXNzKSB7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlDTEFTUy5FTkVNWURBU0g6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteURhc2goX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RGFzaChfaWQsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEVuZW15LkVORU1ZQ0xBU1MuRU5FTVlEVU1COlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEdW1iKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteUR1bWIoX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWUNMQVNTLkVORU1ZUEFUUk9MOlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlQYXRyb2woX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15UGF0cm9sKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIC8vIGNhc2UgRW5lbXkuRTpcclxuICAgICAgICAgICAgLy8gICAgIGlmIChfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15U2hvb3QoX2lkLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCByZWYuYXR0cmlidXRlcy5zY2FsZSwgTWF0aC5yYW5kb20oKSAqIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlICsgMC41LCByZWYuYXR0cmlidXRlcy5hcm1vciksIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgLy8gICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlTaG9vdChfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgIC8vICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWUNMQVNTLkVORU1ZU01BU0g6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVNtYXNoKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVNtYXNoKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUkFERFM6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5TdW1tb25vckFkZHMoX2lkLCBfcG9zaXRpb24sIF90YXJnZXQsIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LlN1bW1vbm9yQWRkcyhfaWQsIF9wb3NpdGlvbiwgX3RhcmdldCwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEVuZW15LkVORU1ZQ0xBU1MuU1VNTU9OT1I6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5TdW1tb25vcihfaWQsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuU3VtbW9ub3IoX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZW5lbXkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGVuZW15KTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkVuZW15KF9lbmVteUNsYXNzLCBlbmVteSwgZW5lbXkubmV0SWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbmV0d29ya1NwYXduQnlJZChfZW5lbXlDbGFzczogRW5lbXkuRU5FTVlDTEFTUywgX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElEOiBudW1iZXIsIF90YXJnZXQ/OiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoX3RhcmdldCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGlmIChHYW1lLmF2YXRhcjEubmV0SWQgPT0gX3RhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgc3Bhd25CeUlEKF9lbmVteUNsYXNzLCBfaWQsIF9wb3NpdGlvbiwgR2FtZS5hdmF0YXIxLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3Bhd25CeUlEKF9lbmVteUNsYXNzLCBfaWQsIF9wb3NpdGlvbiwgR2FtZS5hdmF0YXIyLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc3Bhd25CeUlEKF9lbmVteUNsYXNzLCBfaWQsIF9wb3NpdGlvbiwgbnVsbCwgX25ldElEKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59IiwibmFtZXNwYWNlIEVuZW15IHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRmxvY2tpbmdCZWhhdmlvdXIge1xyXG4gICAgICAgIHByaXZhdGUgY3VycmVudE5laWdoYm91cnM6IEVuZW15W107XHJcbiAgICAgICAgcHVibGljIHNpZ2h0UmFkaXVzOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGF2b2lkUmFkaXVzOiBudW1iZXJcclxuICAgICAgICBwcml2YXRlIGVuZW1pZXM6IEVuZW15W10gPSBbXTtcclxuICAgICAgICBwcml2YXRlIHBvczogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHByaXZhdGUgbXlFbmVteTogRW5lbXk7XHJcbiAgICAgICAgcHVibGljIGNvaGVzaW9uV2VpZ2h0OiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGFsbGlnbldlaWdodDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBhdm9pZFdlaWdodDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyB0b1RhcmdldFdlaWdodDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBub3RUb1RhcmdldFdlaWdodDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBvYnN0aWNhbEF2b2lkV2VpZ2h0OiBudW1iZXIgPSAxLjU7XHJcblxyXG4gICAgICAgIHByaXZhdGUgb2JzdGljYWxDb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9lbmVteTogRW5lbXksIF9zaWdodFJhZGl1czogbnVtYmVyLCBfYXZvaWRSYWRpdXM6IG51bWJlciwgX2NvaGVzaW9uV2VpZ2h0OiBudW1iZXIsIF9hbGxpZ25XZWlnaHQ6IG51bWJlciwgX2F2b2lkV2VpZ2h0OiBudW1iZXIsIF90b1RhcmdldFdlaWdodDogbnVtYmVyLCBfbm90VG9UYXJnZXRXZWlnaHQ6IG51bWJlciwgX29ic3RpY2FsQXZvaWRXZWlnaHQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5wb3MgPSBfZW5lbXkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIHRoaXMubXlFbmVteSA9IF9lbmVteTtcclxuICAgICAgICAgICAgdGhpcy5zaWdodFJhZGl1cyA9IF9zaWdodFJhZGl1cztcclxuICAgICAgICAgICAgdGhpcy5hdm9pZFJhZGl1cyA9IF9hdm9pZFJhZGl1cztcclxuICAgICAgICAgICAgdGhpcy5jb2hlc2lvbldlaWdodCA9IF9jb2hlc2lvbldlaWdodDtcclxuICAgICAgICAgICAgdGhpcy5hbGxpZ25XZWlnaHQgPSBfYWxsaWduV2VpZ2h0O1xyXG4gICAgICAgICAgICB0aGlzLmF2b2lkV2VpZ2h0ID0gX2F2b2lkV2VpZ2h0O1xyXG4gICAgICAgICAgICB0aGlzLnRvVGFyZ2V0V2VpZ2h0ID0gX3RvVGFyZ2V0V2VpZ2h0O1xyXG4gICAgICAgICAgICB0aGlzLm5vdFRvVGFyZ2V0V2VpZ2h0ID0gX25vdFRvVGFyZ2V0V2VpZ2h0O1xyXG4gICAgICAgICAgICBpZiAoX29ic3RpY2FsQXZvaWRXZWlnaHQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vYnN0aWNhbEF2b2lkV2VpZ2h0ID0gX29ic3RpY2FsQXZvaWRXZWlnaHQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMub2JzdGljYWxDb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLnBvcywgdGhpcy5teUVuZW15LmNvbGxpZGVyLmdldFJhZGl1cyAqIDEuNzUsIHRoaXMubXlFbmVteS5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW5lbWllcyA9IEdhbWUuZW5lbWllcztcclxuICAgICAgICAgICAgdGhpcy5wb3MgPSB0aGlzLm15RW5lbXkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIHRoaXMub2JzdGljYWxDb2xsaWRlci5wb3NpdGlvbiA9IHRoaXMucG9zO1xyXG4gICAgICAgICAgICB0aGlzLmZpbmROZWlnaGJvdXJzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBmaW5kTmVpZ2hib3VycygpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50TmVpZ2hib3VycyA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLmVuZW1pZXMuZm9yRWFjaChlbmVtID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm15RW5lbXkubmV0SWQgIT0gZW5lbS5uZXRJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmVtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKHRoaXMucG9zLnRvVmVjdG9yMygpKSA8IHRoaXMuc2lnaHRSYWRpdXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmVpZ2hib3Vycy5wdXNoKGVuZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjYWxjdWxhdGVDb2hlc2lvbk1vdmUoKTogR2FtZS7Gki5WZWN0b3IyIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudE5laWdoYm91cnMubGVuZ3RoIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiDGki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxldCBjb2hlc2lvbk1vdmU6IEdhbWUuxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmVpZ2hib3Vycy5mb3JFYWNoKGVuZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvaGVzaW9uTW92ZSA9IEdhbWUuxpIuVmVjdG9yMi5TVU0oY29oZXNpb25Nb3ZlLCBlbmVtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICBjb2hlc2lvbk1vdmUuc2NhbGUoMSAvIHRoaXMuY3VycmVudE5laWdoYm91cnMubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIGNvaGVzaW9uTW92ZS5zdWJ0cmFjdCh0aGlzLnBvcyk7XHJcbiAgICAgICAgICAgICAgICBjb2hlc2lvbk1vdmUgPSBDYWxjdWxhdGlvbi5nZXRSb3RhdGVkVmVjdG9yQnlBbmdsZTJEKHRoaXMubXlFbmVteS5tb3ZlRGlyZWN0aW9uLCBDYWxjdWxhdGlvbi5jYWxjRGVncmVlKHRoaXMubXlFbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgY29oZXNpb25Nb3ZlLnRvVmVjdG9yMygpKSAvIDEwKS50b1ZlY3RvcjIoKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvaGVzaW9uTW92ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNhbGN1bGF0ZUFsbGlnbm1lbnRNb3ZlKCk6IEdhbWUuxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnROZWlnaGJvdXJzLmxlbmd0aCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5teUVuZW15Lm1vdmVEaXJlY3Rpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYWxsaWdubWVudE1vdmU6IEdhbWUuxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmVpZ2hib3Vycy5mb3JFYWNoKGVuZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGFsbGlnbm1lbnRNb3ZlID0gR2FtZS7Gki5WZWN0b3IyLlNVTShhbGxpZ25tZW50TW92ZSwgZW5lbS5tb3ZlRGlyZWN0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICBhbGxpZ25tZW50TW92ZS5zY2FsZSgxIC8gdGhpcy5jdXJyZW50TmVpZ2hib3Vycy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFsbGlnbm1lbnRNb3ZlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2FsY3VsYXRlQXZvaWRhbmNlTW92ZSgpOiBHYW1lLsaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50TmVpZ2hib3Vycy5sZW5ndGggPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGV0IGF2b2lkYW5jZU1vdmU6IEdhbWUuxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG5Bdm9pZDogbnVtYmVyID0gMDtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE5laWdoYm91cnMuZm9yRWFjaChlbmVtID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZW5lbS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZSh0aGlzLnBvcy50b1ZlY3RvcjMoKSkgPCB0aGlzLmF2b2lkUmFkaXVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5Bdm9pZCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdm9pZGFuY2VNb3ZlID0gR2FtZS7Gki5WZWN0b3IyLlNVTShhdm9pZGFuY2VNb3ZlLCBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvcywgZW5lbS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICBpZiAobkF2b2lkID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF2b2lkYW5jZU1vdmUuc2NhbGUoMSAvIG5Bdm9pZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXZvaWRhbmNlTW92ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNhbGN1bGF0ZU9ic3RpY2FsQXZvaWRhbmNlTW92ZSgpOiBHYW1lLsaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBsZXQgb2JzdGljYWxzOiBHYW1lLsaSLk5vZGVbXSA9IFtdO1xyXG4gICAgICAgICAgICBHYW1lLmN1cnJlbnRSb29tLndhbGxzLmZvckVhY2goZWxlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBvYnN0aWNhbHMucHVzaChlbGVtKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIEdhbWUuY3VycmVudFJvb20ub2JzdGljYWxzLmZvckVhY2goZWxlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBvYnN0aWNhbHMucHVzaChlbGVtKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGxldCByZXR1cm5WZWN0b3I6IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgICAgIGxldCBuQXZvaWQ6IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgICAgICBvYnN0aWNhbHMuZm9yRWFjaChvYnN0aWNhbCA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoKDxhbnk+b2JzdGljYWwpLmNvbGxpZGVyIGluc3RhbmNlb2YgR2FtZS7Gki5SZWN0YW5nbGUgJiYgdGhpcy5vYnN0aWNhbENvbGxpZGVyLmNvbGxpZGVzUmVjdCgoPGFueT5vYnN0aWNhbCkuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1vdmU6IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMucG9zLCBvYnN0aWNhbC5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbW92ZS5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbjogR2FtZS7Gki5SZWN0YW5nbGUgPSB0aGlzLm9ic3RpY2FsQ29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdCgoPGFueT5vYnN0aWNhbCkuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQmVmb3JlTW92ZTogbnVtYmVyID0gaW50ZXJzZWN0aW9uLndpZHRoICogaW50ZXJzZWN0aW9uLmhlaWdodDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vYnN0aWNhbENvbGxpZGVyLnBvc2l0aW9uLmFkZChuZXcgR2FtZS7Gki5WZWN0b3IyKG1vdmUueCwgMCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9ic3RpY2FsQ29sbGlkZXIuY29sbGlkZXNSZWN0KCg8YW55Pm9ic3RpY2FsKS5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJzZWN0aW9uID0gdGhpcy5vYnN0aWNhbENvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoKDxhbnk+b2JzdGljYWwpLmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFmdGVyQmVmb3JlTW92ZTogbnVtYmVyID0gaW50ZXJzZWN0aW9uLndpZHRoICogaW50ZXJzZWN0aW9uLmhlaWdodDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8PSBhZnRlckJlZm9yZU1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZlY3Rvci5hZGQobmV3IEdhbWUuxpIuVmVjdG9yMigwLCBtb3ZlLnkpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZlY3Rvci5hZGQobmV3IEdhbWUuxpIuVmVjdG9yMihtb3ZlLngsIDApKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZlY3Rvci5hZGQobmV3IEdhbWUuxpIuVmVjdG9yMihtb3ZlLngsIDApKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2JzdGljYWxDb2xsaWRlci5wb3NpdGlvbi5zdWJ0cmFjdChuZXcgR2FtZS7Gki5WZWN0b3IyKG1vdmUueCwgMCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBuQXZvaWQrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICgoPGFueT5vYnN0aWNhbCkuY29sbGlkZXIgaW5zdGFuY2VvZiBDb2xsaWRlci5Db2xsaWRlciAmJiB0aGlzLm9ic3RpY2FsQ29sbGlkZXIuY29sbGlkZXMoKDxhbnk+b2JzdGljYWwpLmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBtb3ZlOiBHYW1lLsaSLlZlY3RvcjIgPSBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvcywgb2JzdGljYWwubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBsb2NhbEF3YXk6IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5TVU0obW92ZSwgdGhpcy5teUVuZW15Lm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRpc3RhbmNlUG9zID0gKEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMubXlFbmVteS50YXJnZXQsIEdhbWUuxpIuVmVjdG9yMi5TVU0oQ2FsY3VsYXRpb24uZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRChsb2NhbEF3YXkuY2xvbmUudG9WZWN0b3IzKCksIDEzNSkudG9WZWN0b3IyKCksIHRoaXMubXlFbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSkpKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZGlzdGFuY2VOZWcgPSAoR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5teUVuZW15LnRhcmdldCwgR2FtZS7Gki5WZWN0b3IyLlNVTShDYWxjdWxhdGlvbi5nZXRSb3RhdGVkVmVjdG9yQnlBbmdsZTJEKGxvY2FsQXdheS5jbG9uZS50b1ZlY3RvcjMoKSwgLTEzNSkudG9WZWN0b3IyKCksIHRoaXMubXlFbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSkpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpc3RhbmNlTmVnLm1hZ25pdHVkZVNxdWFyZWQgPiBkaXN0YW5jZVBvcy5tYWduaXR1ZGVTcXVhcmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vdmUuYWRkKENhbGN1bGF0aW9uLmdldFJvdGF0ZWRWZWN0b3JCeUFuZ2xlMkQobW92ZS5jbG9uZS50b1ZlY3RvcjMoKSwgMTM1KS50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW92ZS5hZGQoQ2FsY3VsYXRpb24uZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRChtb3ZlLmNsb25lLnRvVmVjdG9yMygpLCAtMTM1KS50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm5WZWN0b3IuYWRkKG1vdmUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBuQXZvaWQrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIGlmIChuQXZvaWQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm5WZWN0b3Iuc2NhbGUoMSAvIG5Bdm9pZCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiByZXR1cm5WZWN0b3I7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0TW92ZVZlY3RvcigpOiBHYW1lLsaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBsZXQgY29oZXNpb246IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgICAgIGxldCBhdm9pZDogR2FtZS7Gki5WZWN0b3IyID0gR2FtZS7Gki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgbGV0IGFsbGlnbjogR2FtZS7Gki5WZWN0b3IyID0gR2FtZS7Gki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgbGV0IG9ic3RpY2FsQXZvaWQ6IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5aRVJPKCk7XHJcblxyXG5cclxuICAgICAgICAgICAgbGV0IHRhcmdldCA9IHRoaXMubXlFbmVteS5tb3ZlU2ltcGxlKHRoaXMubXlFbmVteS50YXJnZXQpO1xyXG4gICAgICAgICAgICBpZiAodGFyZ2V0Lm1hZ25pdHVkZVNxdWFyZWQgPiB0aGlzLnRvVGFyZ2V0V2VpZ2h0ICogdGhpcy50b1RhcmdldFdlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0Lm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIHRhcmdldC5zY2FsZSh0aGlzLnRvVGFyZ2V0V2VpZ2h0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IG5vdFRvVGFyZ2V0ID0gdGhpcy5teUVuZW15Lm1vdmVBd2F5KHRoaXMubXlFbmVteS50YXJnZXQpXHJcbiAgICAgICAgICAgIGlmIChub3RUb1RhcmdldC5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5ub3RUb1RhcmdldFdlaWdodCAqIHRoaXMubm90VG9UYXJnZXRXZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIG5vdFRvVGFyZ2V0Lm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIG5vdFRvVGFyZ2V0LnNjYWxlKHRoaXMubm90VG9UYXJnZXRXZWlnaHQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb2hlc2lvbiA9IHRoaXMuY2FsY3VsYXRlQ29oZXNpb25Nb3ZlKCk7XHJcbiAgICAgICAgICAgIGlmIChjb2hlc2lvbi5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5jb2hlc2lvbldlaWdodCAqIHRoaXMuY29oZXNpb25XZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIGNvaGVzaW9uLm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIGNvaGVzaW9uLnNjYWxlKHRoaXMuY29oZXNpb25XZWlnaHQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGF2b2lkID0gdGhpcy5jYWxjdWxhdGVBdm9pZGFuY2VNb3ZlKCk7XHJcbiAgICAgICAgICAgIGlmIChhdm9pZC5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5hdm9pZFdlaWdodCAqIHRoaXMuYXZvaWRXZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIGF2b2lkLm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIGF2b2lkLnNjYWxlKHRoaXMuYXZvaWRXZWlnaHQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGFsbGlnbiA9IHRoaXMuY2FsY3VsYXRlQWxsaWdubWVudE1vdmUoKTtcclxuICAgICAgICAgICAgaWYgKGFsbGlnbi5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5hbGxpZ25XZWlnaHQgKiB0aGlzLmFsbGlnbldlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgYWxsaWduLm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIGFsbGlnbi5zY2FsZSh0aGlzLmFsbGlnbldlaWdodCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG9ic3RpY2FsQXZvaWQgPSB0aGlzLmNhbGN1bGF0ZU9ic3RpY2FsQXZvaWRhbmNlTW92ZSgpO1xyXG4gICAgICAgICAgICBpZiAob2JzdGljYWxBdm9pZC5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5vYnN0aWNhbEF2b2lkV2VpZ2h0ICogdGhpcy5vYnN0aWNhbEF2b2lkV2VpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICBvYnN0aWNhbEF2b2lkLm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIG9ic3RpY2FsQXZvaWQuc2NhbGUodGhpcy5vYnN0aWNhbEF2b2lkV2VpZ2h0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IG1vdmUgPSBHYW1lLsaSLlZlY3RvcjIuU1VNKG5vdFRvVGFyZ2V0LCB0YXJnZXQsIGNvaGVzaW9uLCBhdm9pZCwgYWxsaWduLCBvYnN0aWNhbEF2b2lkKTtcclxuICAgICAgICAgICAgcmV0dXJuIG1vdmU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuIiwibmFtZXNwYWNlIEVudGl0eSB7IFxyXG4gICAgZXhwb3J0IGNsYXNzIE1lcmNoYW50IGV4dGVuZHMgRW50aXR5e1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogbnVtYmVyLCBfbmV0SWQ/Om51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9uZXRJZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIENhbGN1bGF0aW9uIHtcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRDbG9zZXJBdmF0YXJQb3NpdGlvbihfc3RhcnRQb2ludDogxpIuVmVjdG9yMyk6IMaSLlZlY3RvcjMge1xyXG4gICAgICAgIGxldCB0YXJnZXQgPSBHYW1lLmF2YXRhcjE7XHJcblxyXG5cclxuICAgICAgICBsZXQgZGlzdGFuY2VQbGF5ZXIxID0gX3N0YXJ0UG9pbnQuZ2V0RGlzdGFuY2UoR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgbGV0IGRpc3RhbmNlUGxheWVyMiA9IF9zdGFydFBvaW50LmdldERpc3RhbmNlKEdhbWUuYXZhdGFyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG5cclxuICAgICAgICBpZiAoZGlzdGFuY2VQbGF5ZXIxIDwgZGlzdGFuY2VQbGF5ZXIyKSB7XHJcbiAgICAgICAgICAgIHRhcmdldCA9IEdhbWUuYXZhdGFyMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHRhcmdldCA9IEdhbWUuYXZhdGFyMjtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICByZXR1cm4gdGFyZ2V0LmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbjtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGNEZWdyZWUoX2NlbnRlcjogxpIuVmVjdG9yMywgX3RhcmdldDogxpIuVmVjdG9yMyk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IHhEaXN0YW5jZTogbnVtYmVyID0gX3RhcmdldC54IC0gX2NlbnRlci54O1xyXG4gICAgICAgIGxldCB5RGlzdGFuY2U6IG51bWJlciA9IF90YXJnZXQueSAtIF9jZW50ZXIueTtcclxuICAgICAgICBsZXQgZGVncmVlczogbnVtYmVyID0gTWF0aC5hdGFuMih5RGlzdGFuY2UsIHhEaXN0YW5jZSkgKiAoMTgwIC8gTWF0aC5QSSkgLSA5MDtcclxuICAgICAgICByZXR1cm4gZGVncmVlcztcclxuXHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRChfdmVjdG9yVG9Sb3RhdGU6IMaSLlZlY3RvcjMsIF9hbmdsZTogbnVtYmVyKTogxpIuVmVjdG9yMyB7XHJcbiAgICAgICAgbGV0IGFuZ2xlVG9SYWRpYW46IG51bWJlciA9IF9hbmdsZSAqIChNYXRoLlBJIC8gMTgwKTtcclxuXHJcbiAgICAgICAgbGV0IG5ld1ggPSBfdmVjdG9yVG9Sb3RhdGUueCAqIE1hdGguY29zKGFuZ2xlVG9SYWRpYW4pIC0gX3ZlY3RvclRvUm90YXRlLnkgKiBNYXRoLnNpbihhbmdsZVRvUmFkaWFuKTtcclxuICAgICAgICBsZXQgbmV3WSA9IF92ZWN0b3JUb1JvdGF0ZS54ICogTWF0aC5zaW4oYW5nbGVUb1JhZGlhbikgKyBfdmVjdG9yVG9Sb3RhdGUueSAqIE1hdGguY29zKGFuZ2xlVG9SYWRpYW4pO1xyXG5cclxuICAgICAgICByZXR1cm4gbmV3IMaSLlZlY3RvcjMobmV3WCwgbmV3WSwgX3ZlY3RvclRvUm90YXRlLnopO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBhZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYmFzZVZhbHVlOiBudW1iZXIsIF9wZXJjZW50YWdlQW1vdW50OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBfYmFzZVZhbHVlICogKCgxMDAgKyBfcGVyY2VudGFnZUFtb3VudCkgLyAxMDApO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9iYXNlVmFsdWU6IG51bWJlciwgX3BlcmNlbnRhZ2VBbW91bnQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIF9iYXNlVmFsdWUgKiAoMTAwIC8gKDEwMCArIF9wZXJjZW50YWdlQW1vdW50KSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNsYW1wTnVtYmVyKF9udW1iZXI6IG51bWJlciwgX21pbjogbnVtYmVyLCBfbWF4OiBudW1iZXIpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoX21pbiwgTWF0aC5taW4oX251bWJlciwgX21heCkpO1xyXG4gICAgfVxyXG5cclxuXHJcbn0iLCJuYW1lc3BhY2UgSW5wdXRTeXN0ZW0ge1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGtleWJvYXJkRG93bkV2ZW50KTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBrZXlib2FyZFVwRXZlbnQpO1xyXG4gICAgR2FtZS5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBhdHRhY2spO1xyXG4gICAgR2FtZS5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCByb3RhdGVUb01vdXNlKTtcclxuXHJcbiAgICAvLyNyZWdpb24gcm90YXRlXHJcbiAgICBsZXQgbW91c2VQb3NpdGlvbjogxpIuVmVjdG9yMztcclxuXHJcbiAgICBmdW5jdGlvbiByb3RhdGVUb01vdXNlKF9tb3VzZUV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGxldCByYXk6IMaSLlJheSA9IEdhbWUudmlld3BvcnQuZ2V0UmF5RnJvbUNsaWVudChuZXcgxpIuVmVjdG9yMihfbW91c2VFdmVudC5vZmZzZXRYLCBfbW91c2VFdmVudC5vZmZzZXRZKSk7XHJcbiAgICAgICAgICAgIG1vdXNlUG9zaXRpb24gPSByYXkuaW50ZXJzZWN0UGxhbmUobmV3IMaSLlZlY3RvcjMoMCwgMCwgMCksIG5ldyDGki5WZWN0b3IzKDAsIDAsIDEpKTtcclxuICAgICAgICAgICAgLy8gR2FtZS5hdmF0YXIxLm10eExvY2FsLnJvdGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoMCwgMCwgQ2FsY3VsYXRpb24uY2FsY0RlZ3JlZShHYW1lLmF2YXRhcjEubXR4TG9jYWwudHJhbnNsYXRpb24sIG1vdXNlUG9zaXRpb24pKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjYWxjUG9zaXRpb25Gcm9tRGVncmVlKF9kZWdyZWVzOiBudW1iZXIsIF9kaXN0YW5jZTogbnVtYmVyKTogxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgbGV0IGRpc3RhbmNlID0gNTtcclxuICAgICAgICBsZXQgbmV3RGVnID0gKF9kZWdyZWVzICogTWF0aC5QSSkgLyAxODA7XHJcbiAgICAgICAgbGV0IHkgPSBNYXRoLmNvcyhuZXdEZWcpO1xyXG4gICAgICAgIGxldCB4ID0gTWF0aC5zaW4obmV3RGVnKSAqIC0xO1xyXG4gICAgICAgIGxldCBjb29yZCA9IG5ldyDGki5WZWN0b3IyKHgsIHkpO1xyXG4gICAgICAgIGNvb3JkLnNjYWxlKGRpc3RhbmNlKTtcclxuICAgICAgICByZXR1cm4gY29vcmQ7XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvLyNyZWdpb24gbW92ZSBhbmQgYWJpbGl0eVxyXG4gICAgbGV0IGNvbnRyb2xsZXIgPSBuZXcgTWFwPHN0cmluZywgYm9vbGVhbj4oW1xyXG4gICAgICAgIFtcIldcIiwgZmFsc2VdLFxyXG4gICAgICAgIFtcIkFcIiwgZmFsc2VdLFxyXG4gICAgICAgIFtcIlNcIiwgZmFsc2VdLFxyXG4gICAgICAgIFtcIkRcIiwgZmFsc2VdXHJcbiAgICBdKTtcclxuXHJcbiAgICBmdW5jdGlvbiBrZXlib2FyZERvd25FdmVudChfZTogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBpZiAoX2UuY29kZS50b1VwcGVyQ2FzZSgpID09IFwiS0VZRVwiKSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEub3BlbkRvb3IoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2UuY29kZS50b1VwcGVyQ2FzZSgpICE9IFwiU1BBQ0VcIikge1xyXG4gICAgICAgICAgICAgICAgbGV0IGtleTogc3RyaW5nID0gX2UuY29kZS50b1VwcGVyQ2FzZSgpLnN1YnN0cmluZygzKTtcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXIuc2V0KGtleSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9lLmNvZGUudG9VcHBlckNhc2UoKSA9PSBcIlNQQUNFXCIpIHtcclxuICAgICAgICAgICAgICAgIC8vRG8gYWJpbHR5IGZyb20gcGxheWVyXHJcbiAgICAgICAgICAgICAgICBhYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChfZS5jb2RlLnRvVXBwZXJDYXNlKCkgPT0gXCJFU0NBUEVcIikge1xyXG4gICAgICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgICAgIEdhbWUucGF1c2UodHJ1ZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLnBsYXlpbmcodHJ1ZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24ga2V5Ym9hcmRVcEV2ZW50KF9lOiBLZXlib2FyZEV2ZW50KSB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGxldCBrZXk6IHN0cmluZyA9IF9lLmNvZGUudG9VcHBlckNhc2UoKS5zdWJzdHJpbmcoMyk7XHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuc2V0KGtleSwgZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbW92ZSgpOiBHYW1lLsaSLlZlY3RvcjMge1xyXG4gICAgICAgIGxldCBtb3ZlVmVjdG9yOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuWkVSTygpO1xyXG5cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJXXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueSArPSAxO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJBXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueCAtPSAxO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJTXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueSAtPSAxO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJEXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueCArPSAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gR2FtZS5hdmF0YXIxLm1vdmUobW92ZVZlY3Rvcik7XHJcbiAgICAgICAgcmV0dXJuIG1vdmVWZWN0b3I7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWJpbGl0eSgpIHtcclxuICAgICAgICBHYW1lLmF2YXRhcjEuZG9BYmlsaXR5KCk7XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvLyNyZWdpb24gYXR0YWNrXHJcbiAgICBmdW5jdGlvbiBhdHRhY2soZV86IE1vdXNlRXZlbnQpIHtcclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgbGV0IG1vdXNlQnV0dG9uID0gZV8uYnV0dG9uO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKG1vdXNlQnV0dG9uKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9sZWZ0IG1vdXNlIGJ1dHRvbiBwbGF5ZXIuYXR0YWNrXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKG1vdXNlUG9zaXRpb24sIEdhbWUuYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlVG9Nb3VzZShlXyk7XHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIxLmF0dGFjayhkaXJlY3Rpb24sIG51bGwsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogcmlnaHQgbW91c2UgYnV0dG9uIHBsYXllci5oZWF2eUF0dGFjayBvciBzb21ldGhpbmcgbGlrZSB0aGF0XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxufSIsIm5hbWVzcGFjZSBMZXZlbCB7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIExhbmRzY2FwZSBleHRlbmRzIMaSLk5vZGV7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZykge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSk7XHJcblxyXG4gICAgICAgICAgICAvLyB0aGlzLmdldENoaWxkcmVuKClbMF0uZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50VHJhbnNmb3JtKS5tdHhMb2NhbC50cmFuc2xhdGVaKC0yKVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59IiwibmFtZXNwYWNlIFVJIHtcclxuICAgIGV4cG9ydCBjbGFzcyBNaW5pbWFwIGV4dGVuZHMgR2FtZS7Gki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5VSTtcclxuICAgICAgICBwcml2YXRlIG1pbm1hcEluZm86IEludGVyZmFjZXMuSU1pbmltYXBJbmZvc1tdO1xyXG4gICAgICAgIHByaXZhdGUgcm9vbU1pbmltYXBzaXplOiBudW1iZXIgPSAwLjg7XHJcbiAgICAgICAgcHJpdmF0ZSBtaW5pUm9vbXM6IE1pbmlSb29tW10gPSBbXTtcclxuICAgICAgICBwdWJsaWMgb2Zmc2V0WDogbnVtYmVyID0gMTE7XHJcbiAgICAgICAgcHVibGljIG9mZnNldFk6IG51bWJlciA9IDY7XHJcbiAgICAgICAgcHJpdmF0ZSBjdXJyZW50Um9vbTogR2VuZXJhdGlvbi5Sb29tO1xyXG4gICAgICAgIHByaXZhdGUgcG9pbnRlcjogR2FtZS7Gki5Ob2RlO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbWluaW1hcEluZm86IEludGVyZmFjZXMuSU1pbmltYXBJbmZvc1tdKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiTWluaW1hcFwiKTtcclxuICAgICAgICAgICAgdGhpcy5taW5tYXBJbmZvID0gX21pbmltYXBJbmZvO1xyXG5cclxuXHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRlciA9IG5ldyBHYW1lLsaSLk5vZGUoXCJwb2ludGVyXCIpO1xyXG4gICAgICAgICAgICB0aGlzLnBvaW50ZXIuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyBHYW1lLsaSLk1lc2hRdWFkKSk7XHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRlci5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG5ldyDGki5NYXRlcmlhbChcImNoYWxsZW5nZVJvb21NYXRcIiwgxpIuU2hhZGVyTGl0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJibHVlXCIpKSkpKTtcclxuICAgICAgICAgICAgdGhpcy5wb2ludGVyLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLnBvaW50ZXIubXR4TG9jYWwuc2NhbGUoR2FtZS7Gki5WZWN0b3IzLk9ORSh0aGlzLnJvb21NaW5pbWFwc2l6ZSAvIDIpKTtcclxuICAgICAgICAgICAgdGhpcy5wb2ludGVyLm10eExvY2FsLnRyYW5zbGF0ZVooMTApO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLnBvaW50ZXIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IEdhbWUuxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnNjYWxlKG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy5yb29tTWluaW1hcHNpemUsIHRoaXMucm9vbU1pbmltYXBzaXplLCB0aGlzLnJvb21NaW5pbWFwc2l6ZSkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5SRU5ERVJfUFJFUEFSRSwgdGhpcy5ldmVudFVwZGF0ZSk7XHJcblxyXG5cclxuICAgICAgICAgICAgdGhpcy5jcmVhdGVNaW5pUm9vbXMoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2V0Q3VycmVudFJvb20oR2FtZS5jdXJyZW50Um9vbSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduTWluaW1hcCh0aGlzLm1pbm1hcEluZm8pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjcmVhdGVNaW5pUm9vbXMoKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWlubWFwSW5mby5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5taW5pUm9vbXMucHVzaChuZXcgTWluaVJvb20oZWxlbWVudC5jb29yZHMsIGVsZW1lbnQucm9vbVR5cGUpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMubWluaVJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZENoaWxkKHJvb20pO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHByaXZhdGUgc2V0Q3VycmVudFJvb20oX3Jvb206IEdlbmVyYXRpb24uUm9vbSkge1xyXG4gICAgICAgICAgICB0aGlzLm1pbmlSb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMoX3Jvb20uY29vcmRpbmF0ZXMpKS5pc0Rpc2NvdmVyZWQoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFJvb20gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3ViWCA9IHRoaXMuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueCAtIF9yb29tLmNvb3JkaW5hdGVzLng7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3ViWSA9IHRoaXMuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueSAtIF9yb29tLmNvb3JkaW5hdGVzLnk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9mZnNldFggKz0gc3ViWCAqIHRoaXMucm9vbU1pbmltYXBzaXplO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vZmZzZXRZICs9IHN1YlkgKiB0aGlzLnJvb21NaW5pbWFwc2l6ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50Um9vbSA9IF9yb29tO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50Um9vbSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRSb29tICE9IEdhbWUuY3VycmVudFJvb20pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEN1cnJlbnRSb29tKEdhbWUuY3VycmVudFJvb20pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucG9pbnRlci5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHRoaXMubWluaVJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzLmVxdWFscyhHYW1lLmN1cnJlbnRSb29tLmNvb3JkaW5hdGVzKSkubXR4TG9jYWwudHJhbnNsYXRpb247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCBub3JtYWxSb29tOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7O1xyXG4gICAgZXhwb3J0IGxldCBjaGFsbGVuZ2VSb29tOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7O1xyXG4gICAgZXhwb3J0IGxldCBtZXJjaGFudFJvb206IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTs7XHJcbiAgICBleHBvcnQgbGV0IHRyZWFzdXJlUm9vbTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpOztcclxuICAgIGV4cG9ydCBsZXQgYm9zc1Jvb206IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTs7XHJcblxyXG4gICAgY2xhc3MgTWluaVJvb20gZXh0ZW5kcyBHYW1lLsaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyBkaXNjb3ZlcmVkOiBib29sZWFuO1xyXG4gICAgICAgIHB1YmxpYyBjb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHB1YmxpYyByb29tVHlwZTogR2VuZXJhdGlvbi5ST09NVFlQRTtcclxuICAgICAgICBwdWJsaWMgb3BhY2l0eTogbnVtYmVyID0gMC43NTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSByb29tTWF0OiDGki5NYXRlcmlhbDtcclxuXHJcblxyXG4gICAgICAgIHByaXZhdGUgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQ7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyLCBfcm9vbVR5cGU6IEdlbmVyYXRpb24uUk9PTVRZUEUpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJNaW5pbWFwUm9vbVwiKTtcclxuICAgICAgICAgICAgdGhpcy5jb29yZGluYXRlcyA9IF9jb29yZGluYXRlcztcclxuICAgICAgICAgICAgdGhpcy5yb29tVHlwZSA9IF9yb29tVHlwZTtcclxuICAgICAgICAgICAgdGhpcy5kaXNjb3ZlcmVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgR2FtZS7Gki5Db21wb25lbnRNZXNoKHRoaXMubWVzaCkpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGNtcE1hdGVyaWFsOiDGki5Db21wb25lbnRNYXRlcmlhbDtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5yb29tVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLlNUQVJUOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucm9vbU1hdCA9IG5ldyDGki5NYXRlcmlhbChcInJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiwgdGhpcy5vcGFjaXR5KSwgbm9ybWFsUm9vbSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb21NYXQgPSBuZXcgxpIuTWF0ZXJpYWwoXCJyb29tTWF0XCIsIMaSLlNoYWRlckxpdFRleHR1cmVkLCBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIsIHRoaXMub3BhY2l0eSksIG5vcm1hbFJvb20pKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5NRVJDSEFOVDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb21NYXQgPSBuZXcgxpIuTWF0ZXJpYWwoXCJyb29tTWF0XCIsIMaSLlNoYWRlckxpdFRleHR1cmVkLCBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIsIHRoaXMub3BhY2l0eSksIG1lcmNoYW50Um9vbSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLlRSRUFTVVJFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucm9vbU1hdCA9IG5ldyDGki5NYXRlcmlhbChcInJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiwgdGhpcy5vcGFjaXR5KSwgdHJlYXN1cmVSb29tKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuQ0hBTExFTkdFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucm9vbU1hdCA9IG5ldyDGki5NYXRlcmlhbChcInJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiwgdGhpcy5vcGFjaXR5KSwgY2hhbGxlbmdlUm9vbSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLkJPU1M6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb29tTWF0ID0gbmV3IMaSLk1hdGVyaWFsKFwicm9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiLCB0aGlzLm9wYWNpdHkpLCBib3NzUm9vbSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMucm9vbU1hdCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IEdhbWUuxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjModGhpcy5jb29yZGluYXRlcy54LCB0aGlzLmNvb3JkaW5hdGVzLnksIDEpO1xyXG4gICAgICAgICAgICAvLyB0aGlzLmFjdGl2YXRlKGZhbHNlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBpc0Rpc2NvdmVyZWQoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzY292ZXJlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGUodHJ1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiLy8vPHJlZmVyZW5jZSBwYXRoPVwiLi4vRlVER0UvTmV0L0J1aWxkL0NsaWVudC9GdWRnZUNsaWVudC5kLnRzXCIvPlxyXG5cclxubmFtZXNwYWNlIE5ldHdvcmtpbmcge1xyXG4gICAgZXhwb3J0IGVudW0gRlVOQ1RJT04ge1xyXG4gICAgICAgIENPTk5FQ1RFRCxcclxuICAgICAgICBTRVRHQU1FU1RBVEUsXHJcbiAgICAgICAgTE9BREVELFxyXG4gICAgICAgIFNFVFJFQURZLFxyXG4gICAgICAgIFNQQVdOLFxyXG4gICAgICAgIFRSQU5TRk9STSxcclxuICAgICAgICBDTElFTlRNT1ZFTUVOVCxcclxuICAgICAgICBTRVJWRVJCVUZGRVIsXHJcbiAgICAgICAgVVBEQVRFSU5WRU5UT1JZLFxyXG4gICAgICAgIEtOT0NLQkFDS1JFUVVFU1QsXHJcbiAgICAgICAgS05PQ0tCQUNLUFVTSCxcclxuICAgICAgICBTUEFXTkJVTExFVCxcclxuICAgICAgICBCVUxMRVRQUkVESUNULFxyXG4gICAgICAgIEJVTExFVFRSQU5TRk9STSxcclxuICAgICAgICBCVUxMRVRESUUsXHJcbiAgICAgICAgU0VORE1BR0FaSU4sXHJcbiAgICAgICAgU1BBV05FTkVNWSxcclxuICAgICAgICBFTkVNWVRSQU5TRk9STSxcclxuICAgICAgICBFTlRJVFlBTklNQVRJT05TVEFURSxcclxuICAgICAgICBFTlRJVFlESUUsXHJcbiAgICAgICAgU1BBV05JTlRFUk5BTElURU0sXHJcbiAgICAgICAgVVBEQVRFQVRUUklCVVRFUyxcclxuICAgICAgICBVUERBVEVXRUFQT04sXHJcbiAgICAgICAgSVRFTURJRSxcclxuICAgICAgICBTRU5EUk9PTSxcclxuICAgICAgICBTV0lUQ0hST09NUkVRVUVTVCxcclxuICAgICAgICBVUERBVEVCVUZGLFxyXG4gICAgICAgIFVQREFURVVJLFxyXG4gICAgICAgIFNQV0FOTUlOSU1BUCxcclxuICAgICAgICBTUEFXTlpJUFpBUFxyXG4gICAgfVxyXG5cclxuICAgIGltcG9ydCDGkkNsaWVudCA9IEZ1ZGdlTmV0LkZ1ZGdlQ2xpZW50O1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY2xpZW50OiDGkkNsaWVudDtcclxuICAgIGV4cG9ydCBsZXQgY3JlYXRlZFJvb206IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIGV4cG9ydCBsZXQgY2xpZW50czogQXJyYXk8eyBpZDogc3RyaW5nLCByZWFkeTogYm9vbGVhbiB9PiA9IFtdO1xyXG4gICAgZXhwb3J0IGxldCBwb3NVcGRhdGU6IMaSLlZlY3RvcjM7XHJcbiAgICBleHBvcnQgbGV0IHNvbWVvbmVJc0hvc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIGV4cG9ydCBsZXQgZW5lbXk6IEVuZW15LkVuZW15O1xyXG4gICAgZXhwb3J0IGxldCBjdXJyZW50SURzOiBudW1iZXJbXSA9IFtdO1xyXG5cclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSG9zdFNwYXduXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7IHNwYXduUGxheWVyKCkgfSwgdHJ1ZSk7XHJcbiAgICBsZXQgSVBDb25uZWN0aW9uID0gPEhUTUxJbnB1dEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJJUENvbm5lY3Rpb25cIik7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNvbm5lY3RpbmdcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNvbm5lY3RpbmcsIHRydWUpO1xyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY29ubmVjdGluZygpIHtcclxuICAgICAgICBjbGllbnQgPSBuZXcgxpJDbGllbnQoKTtcclxuICAgICAgICBjbGllbnQuYWRkRXZlbnRMaXN0ZW5lcihGdWRnZU5ldC5FVkVOVC5NRVNTQUdFX1JFQ0VJVkVELCByZWNlaXZlTWVzc2FnZSk7XHJcbiAgICAgICAgY2xpZW50LmNvbm5lY3RUb1NlcnZlcihJUENvbm5lY3Rpb24udmFsdWUpO1xyXG5cclxuICAgICAgICBhZGRDbGllbnRJRCgpXHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGFkZENsaWVudElEKCkge1xyXG4gICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG9iajogeyBpZDogc3RyaW5nLCByZWFkeTogYm9vbGVhbiB9ID0geyBpZDogY2xpZW50LmlkLCByZWFkeTogZmFsc2UgfTtcclxuICAgICAgICAgICAgICAgIGNsaWVudHMucHVzaChvYmopO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChhZGRDbGllbnRJRCwgMzAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIHJlY2VpdmVNZXNzYWdlKF9ldmVudDogQ3VzdG9tRXZlbnQgfCBNZXNzYWdlRXZlbnQgfCBFdmVudCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIGlmIChfZXZlbnQgaW5zdGFuY2VvZiBNZXNzYWdlRXZlbnQpIHtcclxuICAgICAgICAgICAgbGV0IG1lc3NhZ2U6IEZ1ZGdlTmV0Lk1lc3NhZ2UgPSBKU09OLnBhcnNlKF9ldmVudC5kYXRhKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkxPQURFRC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmxvYWRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlkU291cmNlICE9IGNsaWVudC5pZCkge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbW1hbmQgPT0gRnVkZ2VOZXQuQ09NTUFORC5ST09NX0NSRUFURSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UuY29udGVudC5yb29tKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaHRtbDogSFRNTEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJvb21JZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICBodG1sLnBhcmVudEVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwudGV4dENvbnRlbnQgPSBtZXNzYWdlLmNvbnRlbnQucm9vbTtcclxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVkUm9vbSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgam9pblJvb20obWVzc2FnZS5jb250ZW50LnJvb20pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbW1hbmQgPT0gRnVkZ2VOZXQuQ09NTUFORC5ST09NX0VOVEVSKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNyZWF0ZWRSb29tKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudC5iZWNvbWVIb3N0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbW1hbmQgPT0gRnVkZ2VOZXQuQ09NTUFORC5ST09NX0dFVF9JRFMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSAhPSBcImhpZGRlblwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb29tczogc3RyaW5nW10gPSBtZXNzYWdlLmNvbnRlbnQucm9vbXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiUm9vbXNcIikuaW5uZXJIVE1MID0gXCJcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvb21zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdSb29tczogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvb20gIT0gXCJMb2JieVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb21zLnB1c2goXCI8cD5cIiArIHJvb20gKyBcIjwvcD5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJvb21zXCIpLmlubmVySFRNTCA9IG5ld1Jvb21zLnRvU3RyaW5nKCkucmVwbGFjZUFsbChcIixcIiwgXCJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXRSb29tcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCA1MDAwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29tbWFuZCAhPSBGdWRnZU5ldC5DT01NQU5ELlNFUlZFUl9IRUFSVEJFQVQgJiYgbWVzc2FnZS5jb21tYW5kICE9IEZ1ZGdlTmV0LkNPTU1BTkQuQ0xJRU5UX0hFQVJUQkVBVCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vQWRkIG5ldyBjbGllbnQgdG8gYXJyYXkgY2xpZW50c1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkNPTk5FQ1RFRC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQudmFsdWUgIT0gY2xpZW50LmlkICYmIGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQgPT0gbWVzc2FnZS5jb250ZW50LnZhbHVlKSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkID09IG1lc3NhZ2UuY29udGVudC52YWx1ZSkgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudHMucHVzaCh7IGlkOiBtZXNzYWdlLmNvbnRlbnQudmFsdWUsIHJlYWR5OiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU0VUR0FNRVNUQVRFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudC5wbGF5aW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBsYXlpbmcoZmFsc2UsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFtZXNzYWdlLmNvbnRlbnQucGxheWluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5wYXVzZShmYWxzZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vU1BBV04gTUlOSU1BUCBCWSBDTElFTlRcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUFdBTk1JTklNQVAudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgb2xkTWluaU1hcEluZm8gPSBtZXNzYWdlLmNvbnRlbnQubWluaU1hcEluZm9zO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3TWluaU1hcEluZm86IEludGVyZmFjZXMuSU1pbmltYXBJbmZvc1tdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb2xkTWluaU1hcEluZm8ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdDb29yZHM6IEdhbWUuxpIuVmVjdG9yMiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIob2xkTWluaU1hcEluZm9baV0uY29vcmRzLmRhdGFbMF0sIG9sZE1pbmlNYXBJbmZvW2ldLmNvb3Jkcy5kYXRhWzFdKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3TWluaU1hcEluZm8ucHVzaCg8SW50ZXJmYWNlcy5JTWluaW1hcEluZm9zPnsgY29vcmRzOiBuZXdDb29yZHMsIHJvb21UeXBlOiBvbGRNaW5pTWFwSW5mb1tpXS5yb29tVHlwZSB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBHYW1lLm1pbmlNYXAgPSBuZXcgVUkuTWluaW1hcChuZXdNaW5pTWFwSW5mbyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoR2FtZS5taW5pTWFwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vRlJPTSBDTElFTlQgSU5QVVQgVkVDVE9SUyBGUk9NIEFWQVRBUlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkNMSUVOVE1PVkVNRU5ULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlucHV0VmVjdG9yID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQuaW5wdXQuaW5wdXRWZWN0b3IuZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LmlucHV0LmlucHV0VmVjdG9yLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5pbnB1dC5pbnB1dFZlY3Rvci5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlucHV0OiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQgPSB7IHRpY2s6IG1lc3NhZ2UuY29udGVudC5pbnB1dC50aWNrLCBpbnB1dFZlY3RvcjogaW5wdXRWZWN0b3IsIGRvZXNBYmlsaXR5OiBtZXNzYWdlLmNvbnRlbnQuaW5wdXQuZG9lc0FiaWxpdHkgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnNlcnZlclByZWRpY3Rpb25BdmF0YXIudXBkYXRlRW50aXR5VG9DaGVjayhtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnNlcnZlclByZWRpY3Rpb25BdmF0YXIub25DbGllbnRJbnB1dChpbnB1dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBUTyBDTElFTlQgQ0FMQ1VMQVRFRCBQT1NJVElPTiBGT1IgQVZBVEFSXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU0VSVkVSQlVGRkVSLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ldE9iajogSW50ZXJmYWNlcy5JTmV0d29ya09iamVjdHMgPSBHYW1lLmN1cnJlbnROZXRPYmouZmluZChlbnRpdHkgPT4gZW50aXR5Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmJ1ZmZlci5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuYnVmZmVyLnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5idWZmZXIucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzdGF0ZTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkID0geyB0aWNrOiBtZXNzYWdlLmNvbnRlbnQuYnVmZmVyLnRpY2ssIHBvc2l0aW9uOiBwb3NpdGlvbiB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV0T2JqICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG9iaiA9IG5ldE9iai5uZXRPYmplY3ROb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iaiBpbnN0YW5jZW9mIFBsYXllci5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPFBsYXllci5QbGF5ZXI+b2JqKS5jbGllbnQub25TZXJ2ZXJNb3ZlbWVudFN0YXRlKHN0YXRlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxCdWxsZXRzLkJ1bGxldD5vYmopLmNsaWVudFByZWRpY3Rpb24ub25TZXJ2ZXJNb3ZlbWVudFN0YXRlKHN0YXRlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy9GUk9NIENMSUVOVCBCVUxMRVQgVkVDVE9SU1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkJVTExFVFBSRURJQ1QudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXRWZWN0b3IgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5pbnB1dC5pbnB1dFZlY3Rvci5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuaW5wdXQuaW5wdXRWZWN0b3IuZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LmlucHV0LmlucHV0VmVjdG9yLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXQ6IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCA9IHsgdGljazogbWVzc2FnZS5jb250ZW50LmlucHV0LnRpY2ssIGlucHV0VmVjdG9yOiBpbnB1dFZlY3RvciB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXRPYmo6IEludGVyZmFjZXMuSU5ldHdvcmtPYmplY3RzID0gR2FtZS5jdXJyZW50TmV0T2JqLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWxsZXQ6IEJ1bGxldHMuQnVsbGV0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV0T2JqICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0ID0gPEJ1bGxldHMuQnVsbGV0Pm5ldE9iai5uZXRPYmplY3ROb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYnVsbGV0ICsgXCJcIiArIG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQuc2VydmVyUHJlZGljdGlvbi51cGRhdGVFbnRpdHlUb0NoZWNrKG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQuc2VydmVyUHJlZGljdGlvbi5vbkNsaWVudElucHV0KGlucHV0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vU2V0IGNsaWVudCByZWFkeVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNFVFJFQURZLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQuaWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGllbnRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50LmlkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkucmVhZHkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGF2YXRhcjIgYXMgcmFuZ2VkIG9yIG1lbGVlIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdOLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ldElkOiBudW1iZXIgPSBtZXNzYWdlLmNvbnRlbnQubmV0SWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZXM6IEVudGl0eS5BdHRyaWJ1dGVzID0gbmV3IEVudGl0eS5BdHRyaWJ1dGVzKG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5zcGVlZCwgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuc2NhbGUsIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5hcm1vciwgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24sIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmFjY3VyYWN5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudC50eXBlID09IEVudGl0eS5JRC5NRUxFRSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyID0gbmV3IFBsYXllci5NZWxlZShFbnRpdHkuSUQuTUVMRUUsIGF0dHJpYnV0ZXMsIG5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoR2FtZS5hdmF0YXIyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmNvbnRlbnQudHlwZSA9PSBFbnRpdHkuSUQuUkFOR0VEKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIgPSBuZXcgUGxheWVyLlJhbmdlZChFbnRpdHkuSUQuUkFOR0VELCBhdHRyaWJ1dGVzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoR2FtZS5hdmF0YXIyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9SdW50aW1lIHVwZGF0ZXMgYW5kIGNvbW11bmljYXRpb25cclxuICAgICAgICAgICAgICAgICAgICAvL1N5bmMgYXZhdGFyMiBwb3NpdGlvbiBhbmQgcm90YXRpb25cclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5UUkFOU0ZPUk0udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQgdGVzdDogR2FtZS7Gki5WZWN0b3IzID0gbWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIC8vIGNvbnNvbGUubG9nKHRlc3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbW92ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJvdGF0ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzJdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmF2YXRhcjIgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIubXR4TG9jYWwudHJhbnNsYXRpb24gPSBtb3ZlVmVjdG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnJvdGF0aW9uID0gcm90YXRlVmVjdG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLmNvbGxpZGVyLnBvc2l0aW9uID0gbW92ZVZlY3Rvci50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHYW1lLmF2YXRhcjIuYXZhdGFyUHJlZGljdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1VwZGF0ZSBpbnZlbnRvcnlcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5VUERBVEVJTlZFTlRPUlkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbTogSXRlbXMuSXRlbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEl0ZW1zLmdldEJ1ZmZJdGVtQnlJZChtZXNzYWdlLmNvbnRlbnQuaXRlbUlkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtID0gbmV3IEl0ZW1zLkJ1ZmZJdGVtKG1lc3NhZ2UuY29udGVudC5pdGVtSWQsIG1lc3NhZ2UuY29udGVudC5pdGVtTmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEl0ZW1zLmdldEludGVybmFsSXRlbUJ5SWQobWVzc2FnZS5jb250ZW50Lml0ZW1JZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbSA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0obWVzc2FnZS5jb250ZW50Lml0ZW1JZCwgbWVzc2FnZS5jb250ZW50Lml0ZW1OZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbnRpdHkgPSBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiAoPFBsYXllci5QbGF5ZXI+ZWxlbSkubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQuYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuaXRlbXMucHVzaChuZXdJdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5pdGVtcy5zcGxpY2UoZW50aXR5Lml0ZW1zLmluZGV4T2YoZW50aXR5Lml0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IG5ld0l0ZW0uaWQpKSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vQ2xpZW50IHJlcXVlc3QgZm9yIG1vdmUga25vY2tiYWNrXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uS05PQ0tCQUNLUkVRVUVTVC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuZW15OiBFbmVteS5FbmVteSA9IEdhbWUuZW5lbWllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuZ2V0S25vY2tiYWNrKG1lc3NhZ2UuY29udGVudC5rbm9ja2JhY2tGb3JjZSwgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9Ib3N0IHB1c2ggbW92ZSBrbm9ja2JhY2sgZnJvbSBlbmVteVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLktOT0NLQkFDS1BVU0gudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEuZ2V0S25vY2tiYWNrKG1lc3NhZ2UuY29udGVudC5rbm9ja2JhY2tGb3JjZSwgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1NwYXduIG5vcm1hbCBidWxsZXQgZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05CVUxMRVQudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnVsbGV0OiBCdWxsZXRzLkJ1bGxldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eTogRW50aXR5LkVudGl0eSA9IEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm93bmVyTmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW50aXR5ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuZGlyZWN0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24uZGF0YVsyXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0ID0gbmV3IEJ1bGxldHMuQnVsbGV0KGVudGl0eS53ZWFwb24uYnVsbGV0VHlwZSwgZW50aXR5Lm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBkaXJlY3Rpb24sIG1lc3NhZ2UuY29udGVudC5vd25lck5ldElkLCBtZXNzYWdlLmNvbnRlbnQuYnVsbGV0TmV0SWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQuc3Bhd24oZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1NlbmQgbWFnYXppblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNFTkRNQUdBWklOLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eTogRW50aXR5LkVudGl0eSA9IEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm1hZ2F6aW4ub3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0ZW1wTWFnYXppbjogSW50ZXJmYWNlcy5JTWFnYXppbiA9IG1lc3NhZ2UuY29udGVudC5tYWdhemluO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPFdlYXBvbnMuUmFuZ2VkV2VhcG9uPmVudGl0eS53ZWFwb24pLm1hZ2F6aW4gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZW1wTWFnYXppbi5idWxsZXRUeXBlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQubWFnYXppbi5kaXJlY3Rpb25zW2ldLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5tYWdhemluLmRpcmVjdGlvbnNbaV0uZGF0YVsxXSwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKDxXZWFwb25zLlJhbmdlZFdlYXBvbj5lbnRpdHkud2VhcG9uKS5haW1UeXBlID09IFdlYXBvbnMuQUlNLk5PUk1BTCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8V2VhcG9ucy5SYW5nZWRXZWFwb24+ZW50aXR5LndlYXBvbikubWFnYXppbi5wdXNoKG5ldyBCdWxsZXRzLkJ1bGxldCh0ZW1wTWFnYXppbi5idWxsZXRUeXBlc1tpXSwgZW50aXR5Lm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBkaXJlY3Rpb24sIHRlbXBNYWdhemluLm93bmVyTmV0SWQsIHRlbXBNYWdhemluLm5ldElkc1tpXSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPFdlYXBvbnMuUmFuZ2VkV2VhcG9uPmVudGl0eS53ZWFwb24pLm1hZ2F6aW4ucHVzaChuZXcgQnVsbGV0cy5Ib21pbmdCdWxsZXQodGVtcE1hZ2F6aW4uYnVsbGV0VHlwZXNbaV0sIGVudGl0eS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgZGlyZWN0aW9uLCB0ZW1wTWFnYXppbi5vd25lck5ldElkLCBudWxsLCB0ZW1wTWFnYXppbi5uZXRJZHNbaV0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPFdlYXBvbnMuUmFuZ2VkV2VhcG9uPmVudGl0eS53ZWFwb24pLnNob290KEdhbWUuxpIuVmVjdG9yMy5aRVJPKCksIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vU3luYyBidWxsZXQgdHJhbnNmb3JtIGZyb20gaG9zdCB0byBjbGllbnRcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5CVUxMRVRUUkFOU0ZPUk0udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5jdXJyZW50TmV0T2JqLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5jdXJyZW50TmV0T2JqLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkubmV0T2JqZWN0Tm9kZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld1Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdSb3RhdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmN1cnJlbnROZXRPYmouZmluZChlbGVtZW50ID0+IGVsZW1lbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5uZXRPYmplY3ROb2RlLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3UG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5jdXJyZW50TmV0T2JqLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkubmV0T2JqZWN0Tm9kZS5tdHhMb2NhbC5yb3RhdGlvbiA9IG5ld1JvdGF0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9LaWxsIGJ1bGxldCBhdCB0aGUgY2xpZW50IGZyb20gaG9zdFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkJVTExFVERJRS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ1bGxldCA9IEdhbWUuYnVsbGV0cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChidWxsZXQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0LmRlc3Bhd24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9TcGF3biBlbmVteSBhdCB0aGUgY2xpZW50IFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdORU5FTVkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBFbmVteVNwYXduZXIubmV0d29ya1NwYXduQnlJZChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5lbmVteUNsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LmlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IMaSLlZlY3RvcjIoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50Lm5ldElkLCBtZXNzYWdlLmNvbnRlbnQudGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vU3luYyBlbmVteSB0cmFuc2Zvcm0gZnJvbSBob3N0IHRvIGNsaWVudFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkVORU1ZVFJBTlNGT1JNLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuZW15ID0gR2FtZS5lbmVtaWVzLmZpbmQoZW5lbSA9PiBlbmVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmVteSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZW15LmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuc2V0Q29sbGlkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvL1N5bmMgYW5pbWF0aW9uIHN0YXRlXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5USVRZQU5JTUFUSU9OU1RBVEUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW50aXR5ID0gR2FtZS5lbnRpdGllcy5maW5kKGVuZW0gPT4gZW5lbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW50aXR5ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LnN3aXRjaEFuaW1hdGlvbihtZXNzYWdlLmNvbnRlbnQuc3RhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL0tpbGwgZW50aXR5IGF0IHRoZSBjbGllbnQgZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5USVRZRElFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eSA9IEdhbWUuZW50aXRpZXMuZmluZChlbmVtID0+IGVuZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVudGl0eSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5kaWUoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL3VwZGF0ZSBFbnRpdHkgYnVmZiBMaXN0XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVVBEQVRFQlVGRi50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWZmTGlzdDogQnVmZi5CdWZmW10gPSA8QnVmZi5CdWZmW10+bWVzc2FnZS5jb250ZW50LmJ1ZmZMaXN0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW50aXR5ID0gR2FtZS5lbnRpdGllcy5maW5kKGVudCA9PiBlbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVudGl0eSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5idWZmcy5mb3JFYWNoKG9sZEJ1ZmYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWZmVG9DaGVjayA9IGJ1ZmZMaXN0LmZpbmQoYnVmZiA9PiBidWZmLmlkID09IG9sZEJ1ZmYuaWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJ1ZmZUb0NoZWNrID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRCdWZmLnJlbW92ZUJ1ZmYoZW50aXR5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVmZkxpc3QuZm9yRWFjaChidWZmID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3QnVmZiA9IEJ1ZmYuZ2V0QnVmZkJ5SWQoYnVmZi5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3QnVmZi50aWNrUmF0ZSA9IGJ1ZmYudGlja1JhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3QnVmZi5kdXJhdGlvbiA9IGJ1ZmYuZHVyYXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3QnVmZi5hZGRUb0VudGl0eShlbnRpdHkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy91cGRhdGUgVUlcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5VUERBVEVVSS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjogxpIuVmVjdG9yMiA9IG5ldyDGki5WZWN0b3IyKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IFVJLkRhbWFnZVVJKHBvc2l0aW9uLnRvVmVjdG9yMygpLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vc3Bhd24gc3BlY2lhbCBpdGVtc1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdOWklQWkFQLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaWVudC5pZCAhPSBjbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaXRlbTogQnVsbGV0cy5aaXBaYXBPYmplY3QgPSBuZXcgQnVsbGV0cy5aaXBaYXBPYmplY3QobWVzc2FnZS5jb250ZW50Lm93bmVyTmV0SWQsIG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnNwYXduKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gaXRlbSBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUEFXTklOVEVSTkFMSVRFTS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEl0ZW1zLmdldEJ1ZmZJdGVtQnlJZChtZXNzYWdlLmNvbnRlbnQuaWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbSA9IG5ldyBJdGVtcy5CdWZmSXRlbShtZXNzYWdlLmNvbnRlbnQuaWQsIG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zZXRQb3NpdGlvbihuZXcgxpIuVmVjdG9yMihtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0pKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3SXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEl0ZW1zLmdldEludGVybmFsSXRlbUJ5SWQobWVzc2FnZS5jb250ZW50LmlkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW0gPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKG1lc3NhZ2UuY29udGVudC5pZCwgbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnNldFBvc2l0aW9uKG5ldyDGki5WZWN0b3IyKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3SXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vYXBwbHkgaXRlbSBhdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVVBEQVRFQVRUUklCVVRFUy50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbnRpdHkgPSBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobWVzc2FnZS5jb250ZW50LnBheWxvYWQudHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQVRUUklCVVRFVFlQRS5IRUFMVEhQT0lOVFM6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5BVFRSSUJVVEVUWVBFLk1BWEhFQUxUSFBPSU5UUzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgPSBtZXNzYWdlLmNvbnRlbnQucGF5bG9hZC52YWx1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQVRUUklCVVRFVFlQRS5LTk9DS0JBQ0tGT1JDRTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQVRUUklCVVRFVFlQRS5ISVRBQkxFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzLmhpdGFibGUgPSBtZXNzYWdlLmNvbnRlbnQucGF5bG9hZC52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuQVJNT1I6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMuYXJtb3IgPSBtZXNzYWdlLmNvbnRlbnQucGF5bG9hZC52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuU1BFRUQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMuc3BlZWQgPSBtZXNzYWdlLmNvbnRlbnQucGF5bG9hZC52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuQVRUQUNLUE9JTlRTOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cyA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQVRUUklCVVRFVFlQRS5DT09MRE9XTlJFRFVDVElPTjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQVRUUklCVVRFVFlQRS5TQ0FMRTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5zY2FsZSA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL2FwcGx5IHdlYXBvblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlVQREFURVdFQVBPTi50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZWZXZWFwb246IFdlYXBvbnMuV2VhcG9uID0gPFdlYXBvbnMuV2VhcG9uPm1lc3NhZ2UuY29udGVudC53ZWFwb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCg8V2VhcG9ucy5SYW5nZWRXZWFwb24+cmVmV2VhcG9uKS5tYWdhemluKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRlbXBXZWFwb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobWVzc2FnZS5jb250ZW50LnR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgV2VhcG9ucy5XRUFQT05UWVBFLlJBTkdFRFdFQVBPTjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wV2VhcG9uID0gbmV3IFdlYXBvbnMuUmFuZ2VkV2VhcG9uKG1lc3NhZ2UuY29udGVudC53ZWFwb24uY29vbGRvd24uY29vbERvd24sIG1lc3NhZ2UuY29udGVudC53ZWFwb24uYXR0YWNrQ291bnQsIHJlZldlYXBvbi5idWxsZXRUeXBlLCByZWZXZWFwb24ucHJvamVjdGlsZUFtb3VudCwgcmVmV2VhcG9uLm93bmVyTmV0SWQsIHJlZldlYXBvbi5haW1UeXBlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgV2VhcG9ucy5XRUFQT05UWVBFLk1FTEVFV0VBUE9OOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBXZWFwb24gPSBuZXcgV2VhcG9ucy5NZWxlZVdlYXBvbihtZXNzYWdlLmNvbnRlbnQud2VhcG9uLmNvb2xkb3duLmNvb2xEb3duLCBtZXNzYWdlLmNvbnRlbnQud2VhcG9uLmF0dGFja0NvdW50LCByZWZXZWFwb24uYnVsbGV0VHlwZSwgcmVmV2VhcG9uLnByb2plY3RpbGVBbW91bnQsIHJlZldlYXBvbi5vd25lck5ldElkLCByZWZXZWFwb24uYWltVHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFdlYXBvbnMuV0VBUE9OVFlQRS5USE9SU0hBTU1FUldFQVBPTjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wV2VhcG9uID0gbmV3IFdlYXBvbnMuVGhvcnNIYW1tZXIobWVzc2FnZS5jb250ZW50LndlYXBvbi5jb29sZG93bi5jb29sRG93biwgbWVzc2FnZS5jb250ZW50LndlYXBvbi5hdHRhY2tDb3VudCwgcmVmV2VhcG9uLmJ1bGxldFR5cGUsIHJlZldlYXBvbi5wcm9qZWN0aWxlQW1vdW50LCByZWZXZWFwb24ub3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihXZWFwb25zLldFQVBPTlRZUEVbbWVzc2FnZS5jb250ZW50LnR5cGVdICsgXCIgZG9lcyBub3QgZXhpc3QgaW4gTmV0d29ya2luZyBzd2l0Y2hcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5HYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkpLndlYXBvbiA9IHRlbXBXZWFwb247XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL0tpbGwgaXRlbSBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5JVEVNRElFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbmVtID0+ICg8SXRlbXMuSXRlbT5lbmVtKS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3BJRChtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvL3NlbmQgcm9vbSBcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TRU5EUk9PTS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb29yZGlhbnRlczogR2FtZS7Gki5WZWN0b3IyID0gbmV3IEdhbWUuxpIuVmVjdG9yMihtZXNzYWdlLmNvbnRlbnQucm9vbS5jb29yZGluYXRlcy5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucm9vbS5jb29yZGluYXRlcy5kYXRhWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhbnNsYXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnJvb20udHJhbnNsYXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnJvb20udHJhbnNsYXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnJvb20udHJhbnNsYXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb29tSW5mbzogSW50ZXJmYWNlcy5JUm9vbSA9IHsgY29vcmRpbmF0ZXM6IGNvb3JkaWFudGVzLCByb29tU2l6ZTogbWVzc2FnZS5jb250ZW50LnJvb20ucm9vbVNpemUsIGV4aXRzOiBtZXNzYWdlLmNvbnRlbnQucm9vbS5leGl0cywgcm9vbVR5cGU6IG1lc3NhZ2UuY29udGVudC5yb29tLnJvb21UeXBlLCB0cmFuc2xhdGlvbjogdGFuc2xhdGlvbiB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3Um9vbTogR2VuZXJhdGlvbi5Sb29tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHJvb21JbmZvLnJvb21UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuU1RBUlQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBHZW5lcmF0aW9uLlN0YXJ0Um9vbShyb29tSW5mby5jb29yZGluYXRlcywgcm9vbUluZm8ucm9vbVNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IEdlbmVyYXRpb24uTm9ybWFsUm9vbShyb29tSW5mby5jb29yZGluYXRlcywgcm9vbUluZm8ucm9vbVNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLkJPU1M6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBHZW5lcmF0aW9uLkJvc3NSb29tKHJvb21JbmZvLmNvb3JkaW5hdGVzLCByb29tSW5mby5yb29tU2l6ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuVFJFQVNVUkU6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBHZW5lcmF0aW9uLlRyZWFzdXJlUm9vbShyb29tSW5mby5jb29yZGluYXRlcywgcm9vbUluZm8ucm9vbVNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLk1FUkNIQU5UOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgR2VuZXJhdGlvbi5NZXJjaGFudFJvb20ocm9vbUluZm8uY29vcmRpbmF0ZXMsIHJvb21JbmZvLnJvb21TaXplKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5DSEFMTEVOR0U6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBHZW5lcmF0aW9uLkNoYWxsZW5nZVJvb20ocm9vbUluZm8uY29vcmRpbmF0ZXMsIHJvb21JbmZvLnJvb21TaXplKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tLmV4aXRzID0gcm9vbUluZm8uZXhpdHM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20ubXR4TG9jYWwudHJhbnNsYXRpb24gPSByb29tSW5mby50cmFuc2xhdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbS5zZXRTcGF3blBvaW50cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tLm9wZW5Eb29ycygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLmFkZFJvb21Ub0dyYXBoKG5ld1Jvb20pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy9zZW5kIHJlcXVlc3QgdG8gc3dpdGNoIHJvb21zXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1dJVENIUk9PTVJFUVVFU1QudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLnN3aXRjaFJvb20obWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNldENsaWVudFJlYWR5KCkge1xyXG4gICAgICAgIGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQuaWQgPT0gY2xpZW50LmlkKS5yZWFkeSA9IHRydWU7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU0VUUkVBRFksIG5ldElkOiBjbGllbnQuaWQgfSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2V0R2FtZXN0YXRlKF9wbGF5aW5nOiBib29sZWFuKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkKS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TRVRHQU1FU1RBVEUsIHBsYXlpbmc6IF9wbGF5aW5nIH0gfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJvb20oKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlNFUlZFUiwgY29tbWFuZDogRnVkZ2VOZXQuQ09NTUFORC5ST09NX0NSRUFURSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gam9pblJvb20oX3Jvb21JZDogc3RyaW5nKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlNFUlZFUiwgY29tbWFuZDogRnVkZ2VOZXQuQ09NTUFORC5ST09NX0VOVEVSLCBjb250ZW50OiB7IHJvb206IF9yb29tSWQgfSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0Um9vbXMoKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlNFUlZFUiwgY29tbWFuZDogRnVkZ2VOZXQuQ09NTUFORC5ST09NX0dFVF9JRFMgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8jcmVnaW9uIHBsYXllclxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGxvYWRlZCgpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5MT0FERUQgfSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25QbGF5ZXIoKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuYXZhdGFyMS5pZCA9PSBFbnRpdHkuSUQuTUVMRUUpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV04sIHR5cGU6IEVudGl0eS5JRC5NRUxFRSwgYXR0cmlidXRlczogR2FtZS5hdmF0YXIxLmF0dHJpYnV0ZXMsIHBvc2l0aW9uOiBHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCBuZXRJZDogR2FtZS5hdmF0YXIxLm5ldElkIH0gfSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTiwgdHlwZTogRW50aXR5LklELlJBTkdFRCwgYXR0cmlidXRlczogR2FtZS5hdmF0YXIxLmF0dHJpYnV0ZXMsIHBvc2l0aW9uOiBHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCBuZXRJZDogR2FtZS5hdmF0YXIxLm5ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZXRDbGllbnQoKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogTmV0d29ya2luZy5GVU5DVElPTi5DT05ORUNURUQsIHZhbHVlOiBOZXR3b3JraW5nLmNsaWVudC5pZCB9IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVBdmF0YXJQb3NpdGlvbihfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9yb3RhdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVFJBTlNGT1JNLCB2YWx1ZTogX3Bvc2l0aW9uLCByb3RhdGlvbjogX3JvdGF0aW9uIH0gfSlcclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNlbmRDbGllbnRJbnB1dChfbmV0SWQ6IG51bWJlciwgX2lucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLkhPU1QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQ0xJRU5UTU9WRU1FTlQsIG5ldElkOiBfbmV0SWQsIGlucHV0OiBfaW5wdXRQYXlsb2FkIH0gfSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2VuZFNlcnZlckJ1ZmZlcihfbmV0SWQ6IG51bWJlciwgX2J1ZmZlcjogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkKSB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWQpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFUlZFUkJVRkZFUiwgbmV0SWQ6IF9uZXRJZCwgYnVmZmVyOiBfYnVmZmVyIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGtub2NrYmFja1JlcXVlc3QoX25ldElkOiBudW1iZXIsIF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnQuaWRIb3N0LCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLktOT0NLQkFDS1JFUVVFU1QsIG5ldElkOiBfbmV0SWQsIGtub2NrYmFja0ZvcmNlOiBfa25vY2tiYWNrRm9yY2UsIHBvc2l0aW9uOiBfcG9zaXRpb24gfSB9KVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBrbm9ja2JhY2tQdXNoKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLktOT0NLQkFDS1BVU0gsIGtub2NrYmFja0ZvcmNlOiBfa25vY2tiYWNrRm9yY2UsIHBvc2l0aW9uOiBfcG9zaXRpb24gfSB9KVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVJbnZlbnRvcnkoX2FkZDogYm9vbGVhbiwgX2l0ZW1JZDogSXRlbXMuSVRFTUlELCBfaXRlbU5ldElkOiBudW1iZXIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKGNsaWVudC5pZCA9PSBjbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURUlOVkVOVE9SWSwgYWRkOiBfYWRkLCBpdGVtSWQ6IF9pdGVtSWQsIGl0ZW1OZXRJZDogX2l0ZW1OZXRJZCwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bk1pbmltYXAoX21pbmlNYXBJbmZvczogSW50ZXJmYWNlcy5JTWluaW1hcEluZm9zW10pIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUFdBTk1JTklNQVAsIG1pbmlNYXBJbmZvczogX21pbmlNYXBJbmZvcyB9IH0pXHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gYnVsbGV0XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25CdWxsZXQoX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX2J1bGxldE5ldElkOiBudW1iZXIsIF9vd25lck5ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWQpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOQlVMTEVULCBkaXJlY3Rpb246IF9kaXJlY3Rpb24sIG93bmVyTmV0SWQ6IF9vd25lck5ldElkLCBidWxsZXROZXRJZDogX2J1bGxldE5ldElkIH0gfSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2VuZE1hZ2F6aW4oX21hZ2F6aW46IEludGVyZmFjZXMuSU1hZ2F6aW4pIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWQpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFTkRNQUdBWklOLCBtYWdhemluOiBfbWFnYXppbiB9IH0pXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNlbmRCdWxsZXRJbnB1dChfbmV0SWQ6IG51bWJlciwgX2lucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLkhPU1QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQlVMTEVUUFJFRElDVCwgbmV0SWQ6IF9uZXRJZCwgaW5wdXQ6IF9pbnB1dFBheWxvYWQgfSB9KVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVCdWxsZXQoX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfcm90YXRpb246IMaSLlZlY3RvcjMsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkJVTExFVFRSQU5TRk9STSwgcG9zaXRpb246IF9wb3NpdGlvbiwgcm90YXRpb246IF9yb3RhdGlvbiwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUJ1bGxldChfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5CVUxMRVRESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBzcGVjaWFsSXRlbXNcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25aaXBaYXAoX293bmVyTmV0SWQ6IG51bWJlciwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05aSVBaQVAsIG93bmVyTmV0SWQ6IF9vd25lck5ldElkLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvLyNyZWdpb24gZW5lbXlcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkVuZW15KF9lbmVteUNsYXNzOiBFbmVteS5FTkVNWUNMQVNTLCBfZW5lbXk6IEVuZW15LkVuZW15LCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTkVORU1ZLCBlbmVteUNsYXNzOiBfZW5lbXlDbGFzcywgaWQ6IF9lbmVteS5pZCwgYXR0cmlidXRlczogX2VuZW15LmF0dHJpYnV0ZXMsIHBvc2l0aW9uOiBfZW5lbXkubXR4TG9jYWwudHJhbnNsYXRpb24sIG5ldElkOiBfbmV0SWQsIHRhcmdldDogX2VuZW15LnRhcmdldCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUVuZW15UG9zaXRpb24oX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5FTVlUUkFOU0ZPUk0sIHBvc2l0aW9uOiBfcG9zaXRpb24sIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVFbnRpdHlBbmltYXRpb25TdGF0ZShfc3RhdGU6IEVudGl0eS5BTklNQVRJT05TVEFURVMsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5FTlRJVFlBTklNQVRJT05TVEFURSwgc3RhdGU6IF9zdGF0ZSwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGVsc2Uge1xyXG4gICAgICAgIC8vICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCA9PSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5FTlRJVFlBTklNQVRJT05TVEFURSwgc3RhdGU6IF9zdGF0ZSwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcblxyXG4gICAgICAgIC8vIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZW1vdmVFbnRpdHkoX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5FTlRJVFlESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gaXRlbXNcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkl0ZW0oX2lkOiBudW1iZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05JTlRFUk5BTElURU0sIGlkOiBfaWQsIHBvc2l0aW9uOiBfcG9zaXRpb24sIG5ldElkOiBfbmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlRW50aXR5QXR0cmlidXRlcyhfYXR0cmlidXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChjbGllbnQuaWRIb3N0ICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuSE9TVCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVBVFRSSUJVVEVTLCBwYXlsb2FkOiBfYXR0cmlidXRlUGF5bG9hZCwgbmV0SWQ6IF9uZXRJZCB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFQVRUUklCVVRFUywgcGF5bG9hZDogX2F0dHJpYnV0ZVBheWxvYWQsIG5ldElkOiBfbmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQXZhdGFyV2VhcG9uKF93ZWFwb246IFdlYXBvbnMuV2VhcG9uLCBfdGFyZ2V0TmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChjbGllbnQuaWRIb3N0ICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuSE9TVCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVXRUFQT04sIHdlYXBvbjogX3dlYXBvbiwgdHlwZTogX3dlYXBvbi5nZXRUeXBlKCksIG5ldElkOiBfdGFyZ2V0TmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURVdFQVBPTiwgd2VhcG9uOiBfd2VhcG9uLCB0eXBlOiBfd2VhcG9uLmdldFR5cGUoKSwgbmV0SWQ6IF90YXJnZXROZXRJZCB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVtb3ZlSXRlbShfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChjbGllbnQuaWRIb3N0ICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuSE9TVCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5JVEVNRElFLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLklURU1ESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuICAgIC8vI3JlZ2lvbiBidWZmc1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUJ1ZmZMaXN0KF9idWZmTGlzdDogQnVmZi5CdWZmW10sIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURUJVRkYsIGJ1ZmZMaXN0OiBfYnVmZkxpc3QsIG5ldElkOiBfbmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvLyNyZWdpb24gVUlcclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVVSShfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMiwgX3ZhbHVlOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFVUksIHBvc2l0aW9uOiBfcG9zaXRpb24sIHZhbHVlOiBfdmFsdWUgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIHJvb21cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZW5kUm9vbShfcm9vbTogSW50ZXJmYWNlcy5JUm9vbSkge1xyXG4gICAgICAgIGlmIChjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TRU5EUk9PTSwgcm9vbTogX3Jvb20gfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzd2l0Y2hSb29tUmVxdWVzdChfZGlyZWN0aW9uOiBJbnRlcmZhY2VzLklSb29tRXhpdHMpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCAhPSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudC5pZEhvc3QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1dJVENIUk9PTVJFUVVFU1QsIGRpcmVjdGlvbjogX2RpcmVjdGlvbiB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBnZW5lcmF0ZXMgaW5kaXZpZHVhbCBJRHMgb24gSG9zdCB3aXRob3V0IGR1cGxpY2F0ZXMgcmV0dXJucyB0aGUgZ2l2ZW4gTmV0SWRcclxuICAgICAqIEBwYXJhbSBfbmV0SWQgaWYgdW5kZWZpbmVkIGdlbmVyYXRlcyBhIG5ldyBOZXRJZCAtPiBvbmx5IHVuZGVmaW5lZCBvbiBIb3N0XHJcbiAgICAgKiBAcmV0dXJucyBhIG5ldyBuZXRJZCBvciB0aGUgbmV0SWQgcHJvdmlkZWQgYnkgdGhlIGhvc3RcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIElkTWFuYWdlcihfbmV0SWQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgaWYgKF9uZXRJZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgY3VycmVudElEcy5wdXNoKF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHJldHVybiBfbmV0SWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gZ2VuZXJhdGVOZXdJZCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZU5ld0lkKCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IG5ld0lkOiBudW1iZXI7XHJcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgbmV3SWQgPSBpZEdlbmVyYXRvcigpO1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudElEcy5maW5kKGlkID0+IGlkID09IG5ld0lkKSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN1cnJlbnRJRHMucHVzaChuZXdJZCk7XHJcbiAgICAgICAgcmV0dXJuIG5ld0lkO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGlkR2VuZXJhdG9yKCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IGlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTAwMCk7XHJcbiAgICAgICAgcmV0dXJuIGlkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBwb3BJRChfaWQ6IG51bWJlcikge1xyXG4gICAgICAgIGN1cnJlbnRJRHMuc3BsaWNlKGN1cnJlbnRJRHMuaW5kZXhPZihfaWQpLCAxKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gaXNOZXR3b3JrT2JqZWN0KF9vYmplY3Q6IGFueSk6IF9vYmplY3QgaXMgSW50ZXJmYWNlcy5JTmV0d29ya2FibGUge1xyXG4gICAgICAgIHJldHVybiBcIm5ldElkXCIgaW4gX29iamVjdDtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0TmV0SWQoX29iamVjdDogR2FtZS7Gki5Ob2RlKTogbnVtYmVyIHtcclxuICAgICAgICBpZiAoaXNOZXR3b3JrT2JqZWN0KF9vYmplY3QpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBfb2JqZWN0Lm5ldElkO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXVubG9hZFwiLCBvblVubG9hZCwgZmFsc2UpO1xyXG5cclxuICAgIGZ1bmN0aW9uIG9uVW5sb2FkKCkge1xyXG4gICAgICAgIC8vVE9ETzogVGhpbmdzIHdlIGRvIGFmdGVyIHRoZSBwbGF5ZXIgbGVmdCB0aGUgZ2FtZVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFBsYXllciB7XHJcblxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFBsYXllciBleHRlbmRzIEVudGl0eS5FbnRpdHkge1xyXG4gICAgICAgIHB1YmxpYyBjbGllbnQ6IE5ldHdvcmtpbmcuQ2xpZW50UHJlZGljdGlvbjtcclxuICAgICAgICByZWFkb25seSBhYmlsaXR5Q291bnQ6IG51bWJlciA9IDE7XHJcbiAgICAgICAgY3VycmVudGFiaWxpdHlDb3VudDogbnVtYmVyID0gdGhpcy5hYmlsaXR5Q291bnQ7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfYXR0cmlidXRlczogRW50aXR5LkF0dHJpYnV0ZXMsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IF9hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuUExBWUVSO1xyXG4gICAgICAgICAgICB0aGlzLmNsaWVudCA9IG5ldyBOZXR3b3JraW5nLkNsaWVudFByZWRpY3Rpb24odGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChfZGlyZWN0aW9uLm1hZ25pdHVkZSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNldENvbGxpZGVyKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNjYWxlTW92ZVZlY3RvcihfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbi5hZGQoX2RpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGUodGhpcy5tb3ZlRGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbi5zdWJ0cmFjdChfZGlyZWN0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvcGVuRG9vcigpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IHdhbGxzOiBHZW5lcmF0aW9uLldhbGxbXSA9ICg8R2VuZXJhdGlvbi5XYWxsW10+R2FtZS5jdXJyZW50Um9vbS5nZXRDaGlsZHJlbigpKTtcclxuICAgICAgICAgICAgd2FsbHMuZm9yRWFjaCgod2FsbCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHdhbGwuZG9vciAhPSB1bmRlZmluZWQgJiYgd2FsbC5kb29yLmlzQWN0aXZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXNSZWN0KHdhbGwuZG9vci5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxHZW5lcmF0aW9uLkRvb3I+d2FsbC5kb29yKS5jaGFuZ2VSb29tKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBzY2FsZU1vdmVWZWN0b3IoX2RpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgJiYgdGhpcyA9PSBHYW1lLmF2YXRhcjEpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUoKEdhbWUuZGVsdGFUaW1lICogdGhpcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKCh0aGlzLmNsaWVudC5taW5UaW1lQmV0d2VlblRpY2tzICogdGhpcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBwcmVkaWN0KCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsaWVudC51cGRhdGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZShJbnB1dFN5c3RlbS5tb3ZlKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY29sbGlkZShfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY29sbGlkZShfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0SXRlbUNvbGxpc2lvbigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgZW5lbWllczogRW5lbXkuRW5lbXlbXSA9IEdhbWUuZW5lbWllcztcclxuICAgICAgICAgICAgbGV0IGVuZW1pZXNDb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICBlbmVtaWVzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBlbmVtaWVzQ29sbGlkZXIucHVzaChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETzogdW5jb21tZW50XHJcbiAgICAgICAgICAgIC8vIHRoaXMuY2FsY3VsYXRlQ29sbGlkZXIoZW5lbWllc0NvbGxpZGVyLCBfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNhbk1vdmVYICYmIHRoaXMuY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNhbk1vdmVYICYmICF0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoX2RpcmVjdGlvbi54LCAwLCBfZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuY2FuTW92ZVggJiYgdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIF9kaXJlY3Rpb24ueSwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRJdGVtQ29sbGlzaW9uKCkge1xyXG4gICAgICAgICAgICBsZXQgaXRlbUNvbGxpZGVyOiBJdGVtcy5JdGVtW10gPSBHYW1lLml0ZW1zO1xyXG4gICAgICAgICAgICBpdGVtQ29sbGlkZXIuZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGl0ZW0uY29sbGlkZXIpKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgSXRlbXMuSW50ZXJuYWxJdGVtICYmICg8SXRlbXMuSW50ZXJuYWxJdGVtPml0ZW0pLmNob29zZW5PbmVOZXRJZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCg8SXRlbXMuSW50ZXJuYWxJdGVtPml0ZW0pLmNob29zZW5PbmVOZXRJZCAhPSB0aGlzLm5ldElkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmN1cnJlbnRSb29tLnJvb21UeXBlID09IEdlbmVyYXRpb24uUk9PTVRZUEUuVFJFQVNVUkUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxHZW5lcmF0aW9uLlRyZWFzdXJlUm9vbT5HYW1lLmN1cnJlbnRSb29tKS5vbkl0ZW1Db2xsZWN0KGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKEdhbWUuY3VycmVudFJvb20ucm9vbVR5cGUgPT0gR2VuZXJhdGlvbi5ST09NVFlQRS5NRVJDSEFOVCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISg8R2VuZXJhdGlvbi5NZXJjaGFudFJvb20+R2FtZS5jdXJyZW50Um9vbSkub25JdGVtQ29sbGVjdChpdGVtLCB0aGlzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeSh0cnVlLCBpdGVtLmlkLCBpdGVtLm5ldElkLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLmFkZEl0ZW1Ub0VudGl0eSh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBJdGVtcy5JbnRlcm5hbEl0ZW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coaXRlbS5uYW1lICsgXCI6IFwiICsgaXRlbS5kZXNjcmlwdGlvbiArIFwiIHNtdGggY2hhbmdlZCB0bzogXCIgKyAoPEl0ZW1zLkludGVybmFsSXRlbT5pdGVtKS52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgSXRlbXMuQnVmZkl0ZW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coaXRlbS5uYW1lICsgXCI6IFwiICsgaXRlbS5kZXNjcmlwdGlvbiArIFwiIHNtdGggY2hhbmdlZCB0bzogXCIgKyBCdWZmLkJVRkZJRFsoPEl0ZW1zLkJ1ZmZJdGVtPml0ZW0pLmJ1ZmZbMF0uaWRdLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgYWJzdHJhY3QgYXR0YWNrKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9uZXRJZD86IG51bWJlciwgX3N5bmM/OiBib29sZWFuKTogdm9pZDtcclxuXHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZSwgX3Bvc2l0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkb0FiaWxpdHkoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgTWVsZWUgZXh0ZW5kcyBQbGF5ZXIge1xyXG4gICAgICAgIHB1YmxpYyBibG9jazogQWJpbGl0eS5CbG9jayA9IG5ldyBBYmlsaXR5LkJsb2NrKHRoaXMubmV0SWQsIDYwMCwgMSwgNSAqIDYwKTtcclxuICAgICAgICByZWFkb25seSBhYmlsaXR5Q29vbGRvd25UaW1lOiBudW1iZXIgPSA0MDtcclxuICAgICAgICBjdXJyZW50YWJpbGl0eUNvb2xkb3duVGltZTogbnVtYmVyID0gdGhpcy5hYmlsaXR5Q29vbGRvd25UaW1lO1xyXG5cclxuICAgICAgICBwdWJsaWMgd2VhcG9uOiBXZWFwb25zLldlYXBvbiA9IG5ldyBXZWFwb25zLk1lbGVlV2VhcG9uKDEyLCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuTUVMRUUsIDEsIHRoaXMubmV0SWQsIFdlYXBvbnMuQUlNLk5PUk1BTCk7XHJcbiAgICAgICAgcHVibGljIHN3b3JkUmFkaXVzOiBudW1iZXIgPSAwLjc1O1xyXG5cclxuXHJcbiAgICAgICAgcHVibGljIGF0dGFjayhfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ/OiBudW1iZXIsIF9zeW5jPzogYm9vbGVhbikge1xyXG4gICAgICAgICAgICB0aGlzLndlYXBvbi5zaG9vdChfZGlyZWN0aW9uLCBfc3luYywgX25ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vQmxvY2tcclxuICAgICAgICBwdWJsaWMgZG9BYmlsaXR5KCkge1xyXG4gICAgICAgICAgICB0aGlzLmJsb2NrLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBSYW5nZWQgZXh0ZW5kcyBQbGF5ZXIge1xyXG4gICAgICAgIHB1YmxpYyB3ZWFwb24gPSBuZXcgV2VhcG9ucy5SYW5nZWRXZWFwb24oMjUsIDEsIEJ1bGxldHMuQlVMTEVUVFlQRS5TVEFOREFSRCwgMSwgdGhpcy5uZXRJZCwgV2VhcG9ucy5BSU0uTk9STUFMKTtcclxuICAgICAgICBwdWJsaWMgZGFzaDogQWJpbGl0eS5EYXNoID0gbmV3IEFiaWxpdHkuRGFzaCh0aGlzLm5ldElkLCA4LCAxLCA2MCwgNSk7XHJcbiAgICAgICAgcGVyZm9ybUFiaWxpdHk6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsYXN0TW92ZURpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzO1xyXG5cclxuICAgICAgICBwdWJsaWMgYXR0YWNrKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9uZXRJZD86IG51bWJlciwgX3N5bmM/OiBib29sZWFuKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMud2VhcG9uLnNob290KF9kaXJlY3Rpb24sIF9zeW5jLCBfbmV0SWQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmRhc2guZG9lc0FiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgIHN1cGVyLm1vdmUodGhpcy5sYXN0TW92ZURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzdXBlci5tb3ZlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ubWFnbml0dWRlID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdE1vdmVEaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL0Rhc2hcclxuICAgICAgICBwdWJsaWMgZG9BYmlsaXR5KCkge1xyXG4gICAgICAgICAgICB0aGlzLmRhc2guZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG4gICAgZXhwb3J0IGVudW0gUk9PTVRZUEUge1xyXG4gICAgICAgIFNUQVJULFxyXG4gICAgICAgIE5PUk1BTCxcclxuICAgICAgICBNRVJDSEFOVCxcclxuICAgICAgICBUUkVBU1VSRSxcclxuICAgICAgICBDSEFMTEVOR0UsXHJcbiAgICAgICAgQk9TU1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteUNvdW50TWFuYWdlciB7XHJcbiAgICAgICAgcHJpdmF0ZSBtYXhFbmVteUNvdW50OiBudW1iZXI7IGdldCBnZXRNYXhFbmVteUNvdW50KCk6IG51bWJlciB7IHJldHVybiB0aGlzLm1heEVuZW15Q291bnQgfTtcclxuICAgICAgICBwcml2YXRlIGN1cnJlbnRFbmVteUNvb3VudDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBmaW5pc2hlZDogYm9vbGVhbjtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfZW5lbXlDb3VudDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWF4RW5lbXlDb3VudCA9IF9lbmVteUNvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRFbmVteUNvb3VudCA9IF9lbmVteUNvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmZpbmlzaGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmIChfZW5lbXlDb3VudCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZpbmlzaGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uRW5lbXlEZWF0aCgpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50RW5lbXlDb291bnQtLTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEVuZW15Q29vdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZmluaXNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGxldCB0eHRTdGFydFJvb206IEdhbWUuxpIuVGV4dHVyZUltYWdlID0gbmV3IEdhbWUuxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFJvb20gZXh0ZW5kcyDGki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHO1xyXG4gICAgICAgIHB1YmxpYyByb29tVHlwZTogUk9PTVRZUEU7XHJcbiAgICAgICAgcHVibGljIGNvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAgICAgcHVibGljIHdhbGxzOiBXYWxsW10gPSBbXTtcclxuICAgICAgICBwdWJsaWMgb2JzdGljYWxzOiBPYnNpdGNhbFtdID0gW107XHJcbiAgICAgICAgcHVibGljIGVuZW15Q291bnRNYW5hZ2VyOiBFbmVteUNvdW50TWFuYWdlcjtcclxuICAgICAgICBwdWJsaWMgcG9zaXRpb25VcGRhdGVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgcm9vbVNpemU6IG51bWJlciA9IDMwO1xyXG4gICAgICAgIGV4aXRzOiBJbnRlcmZhY2VzLklSb29tRXhpdHM7IC8vIE4gRSBTIFdcclxuICAgICAgICBtZXNoOiDGki5NZXNoUXVhZCA9IG5ldyDGki5NZXNoUXVhZDtcclxuICAgICAgICBjbXBNZXNoOiDGki5Db21wb25lbnRNZXNoID0gbmV3IMaSLkNvbXBvbmVudE1lc2godGhpcy5tZXNoKTtcclxuICAgICAgICBwcm90ZWN0ZWQgYXZhdGFyU3Bhd25Qb2ludE46IEdhbWUuxpIuVmVjdG9yMjsgZ2V0IGdldFNwYXduUG9pbnROKCk6IEdhbWUuxpIuVmVjdG9yMiB7IHJldHVybiB0aGlzLmF2YXRhclNwYXduUG9pbnROIH07XHJcbiAgICAgICAgcHJvdGVjdGVkIGF2YXRhclNwYXduUG9pbnRFOiBHYW1lLsaSLlZlY3RvcjI7IGdldCBnZXRTcGF3blBvaW50RSgpOiBHYW1lLsaSLlZlY3RvcjIgeyByZXR1cm4gdGhpcy5hdmF0YXJTcGF3blBvaW50RSB9O1xyXG4gICAgICAgIHByb3RlY3RlZCBhdmF0YXJTcGF3blBvaW50UzogR2FtZS7Gki5WZWN0b3IyOyBnZXQgZ2V0U3Bhd25Qb2ludFMoKTogR2FtZS7Gki5WZWN0b3IyIHsgcmV0dXJuIHRoaXMuYXZhdGFyU3Bhd25Qb2ludFMgfTtcclxuICAgICAgICBwcm90ZWN0ZWQgYXZhdGFyU3Bhd25Qb2ludFc6IEdhbWUuxpIuVmVjdG9yMjsgZ2V0IGdldFNwYXduUG9pbnRXKCk6IEdhbWUuxpIuVmVjdG9yMiB7IHJldHVybiB0aGlzLmF2YXRhclNwYXduUG9pbnRXIH07XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb3JkaWFudGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tU2l6ZTogbnVtYmVyLCBfcm9vbVR5cGU6IFJPT01UWVBFKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwicm9vbVwiKTtcclxuICAgICAgICAgICAgdGhpcy50YWcgPSBUYWcuVEFHLlJPT007XHJcbiAgICAgICAgICAgIHRoaXMuY29vcmRpbmF0ZXMgPSBfY29vcmRpYW50ZXM7XHJcbiAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudE1hbmFnZXIgPSBuZXcgRW5lbXlDb3VudE1hbmFnZXIoMCk7XHJcbiAgICAgICAgICAgIGlmIChfcm9vbVNpemUgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvb21TaXplID0gX3Jvb21TaXplO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfcm9vbVR5cGUgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvb21UeXBlID0gX3Jvb21UeXBlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuZXhpdHMgPSA8SW50ZXJmYWNlcy5JUm9vbUV4aXRzPnsgbm9ydGg6IGZhbHNlLCBlYXN0OiBmYWxzZSwgc291dGg6IGZhbHNlLCB3ZXN0OiBmYWxzZSB9XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgxpIuVmVjdG9yMyh0aGlzLnJvb21TaXplLCB0aGlzLnJvb21TaXplLCAxKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQodGhpcy5jbXBNZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQodGhpcy5jbXBNYXRlcmlhbCk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoMCwgMCwgLTAuMDEpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRXYWxscygpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5SRU5ERVJfUFJFUEFSRSwgdGhpcy5ldmVudFVwZGF0ZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBldmVudFVwZGF0ZSA9IChfZXZlbnQ6IEV2ZW50KTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBvbkFkZFRvR3JhcGgoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCk6IHZvaWQge1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgYWRkV2FsbHMoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQoKG5ldyBXYWxsKG5ldyDGki5WZWN0b3IyKDAuNSwgMCksIG5ldyDGki5WZWN0b3IyKDEgLyB0aGlzLnJvb21TaXplLCAxICsgMSAvIHRoaXMucm9vbVNpemUpLCB0aGlzKSkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENoaWxkKChuZXcgV2FsbChuZXcgxpIuVmVjdG9yMigwLCAwLjUpLCBuZXcgxpIuVmVjdG9yMigxLCAxIC8gdGhpcy5yb29tU2l6ZSksIHRoaXMpKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQoKG5ldyBXYWxsKG5ldyDGki5WZWN0b3IyKC0wLjUsIDApLCBuZXcgxpIuVmVjdG9yMigxIC8gdGhpcy5yb29tU2l6ZSwgMSArIDEgLyB0aGlzLnJvb21TaXplKSwgdGhpcykpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDaGlsZCgobmV3IFdhbGwobmV3IMaSLlZlY3RvcjIoMCwgLTAuNSksIG5ldyDGki5WZWN0b3IyKDEsIDEgLyB0aGlzLnJvb21TaXplKSwgdGhpcykpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbSA9PiAoPFdhbGw+ZWxlbSkudGFnID09IFRhZy5UQUcuV0FMTCkuZm9yRWFjaCh3YWxsID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaCgoPFdhbGw+d2FsbCkpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldFNwYXduUG9pbnRzKCkge1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhclNwYXduUG9pbnRFID0gbmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgKCh0aGlzLnJvb21TaXplIC8gMikgLSAyKSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi55KTtcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXJTcGF3blBvaW50VyA9IG5ldyDGki5WZWN0b3IyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueCAtICgodGhpcy5yb29tU2l6ZSAvIDIpIC0gMiksIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueSk7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyU3Bhd25Qb2ludE4gPSBuZXcgxpIuVmVjdG9yMih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueSArICgodGhpcy5yb29tU2l6ZSAvIDIpIC0gMikpO1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhclNwYXduUG9pbnRTID0gbmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgLSAoKHRoaXMucm9vbVNpemUgLyAyKSAtIDIpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRSb29tU2l6ZSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yb29tU2l6ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRSb29tRXhpdChfbmVpZ2hib3VyOiBSb29tKSB7XHJcbiAgICAgICAgICAgIGxldCBkaWYgPSBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRShfbmVpZ2hib3VyLmNvb3JkaW5hdGVzLCB0aGlzLmNvb3JkaW5hdGVzKVxyXG4gICAgICAgICAgICBpZiAoZGlmLmVxdWFscyhjb21wYXJlTm9ydGgpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRzLm5vcnRoID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZGlmLmVxdWFscyhjb21wYXJlRWFzdCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdHMuZWFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGRpZi5lcXVhbHMoY29tcGFyZVNvdXRoKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGl0cy5zb3V0aCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGRpZi5lcXVhbHMoY29tcGFyZVdlc3QpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRzLndlc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb3BlbkRvb3JzKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5leGl0cy5ub3J0aCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53YWxscy5maW5kKHdhbGwgPT4gd2FsbC5kb29yLmRpcmVjdGlvbi5ub3J0aCA9PSB0cnVlKS5kb29yLm9wZW5Eb29yKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHMuZWFzdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53YWxscy5maW5kKHdhbGwgPT4gd2FsbC5kb29yLmRpcmVjdGlvbi5lYXN0ID09IHRydWUpLmRvb3Iub3BlbkRvb3IoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5leGl0cy5zb3V0aCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53YWxscy5maW5kKHdhbGwgPT4gd2FsbC5kb29yLmRpcmVjdGlvbi5zb3V0aCA9PSB0cnVlKS5kb29yLm9wZW5Eb29yKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHMud2VzdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53YWxscy5maW5kKHdhbGwgPT4gd2FsbC5kb29yLmRpcmVjdGlvbi53ZXN0ID09IHRydWUpLmRvb3Iub3BlbkRvb3IoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFN0YXJ0Um9vbSBleHRlbmRzIFJvb20ge1xyXG4gICAgICAgIHByaXZhdGUgc3RhcnRSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcInN0YXJ0Um9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSwgdHh0U3RhcnRSb29tKSk7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tU2l6ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9jb29yZGluYXRlcywgX3Jvb21TaXplLCBST09NVFlQRS5TVEFSVCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudE1hdGVyaWFsKS5tYXRlcmlhbCA9IHRoaXMuc3RhcnRSb29tTWF0O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgTm9ybWFsUm9vbSBleHRlbmRzIFJvb20ge1xyXG4gICAgICAgIG5vcm1hbFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibm9ybWFsUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyLCBfcm9vbVNpemU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfY29vcmRpbmF0ZXMsIF9yb29tU2l6ZSwgUk9PTVRZUEUuTk9STUFMKTtcclxuICAgICAgICAgICAgdGhpcy5lbmVteUNvdW50TWFuYWdlciA9IG5ldyBFbmVteUNvdW50TWFuYWdlcig1KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50TWF0ZXJpYWwpLm1hdGVyaWFsID0gdGhpcy5ub3JtYWxSb29tTWF0O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQm9zc1Jvb20gZXh0ZW5kcyBSb29tIHtcclxuICAgICAgICBib3NzUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJib3NzUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJibGFja1wiKSkpO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyLCBfcm9vbVNpemU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfY29vcmRpbmF0ZXMsIF9yb29tU2l6ZSwgUk9PTVRZUEUuQk9TUyk7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50TWF0ZXJpYWwpLm1hdGVyaWFsID0gdGhpcy5ib3NzUm9vbU1hdDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFRyZWFzdXJlUm9vbSBleHRlbmRzIFJvb20ge1xyXG4gICAgICAgIHByaXZhdGUgdHJlYXN1cmVSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcInRyZWFzdXJlUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ5ZWxsb3dcIikpKTtcclxuICAgICAgICBwcml2YXRlIHNwYXduQ2hhbmNlOiBudW1iZXIgPSAyNTsgZ2V0IGdldFNwYXduQ2hhbmNlKCk6IG51bWJlciB7IHJldHVybiB0aGlzLnNwYXduQ2hhbmNlIH07XHJcbiAgICAgICAgcHJpdmF0ZSB0cmVhc3VyZUNvdW50OiBudW1iZXIgPSAyO1xyXG4gICAgICAgIHByaXZhdGUgdHJlYXN1cmVzOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb21TaXplOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2Nvb3JkaW5hdGVzLCBfcm9vbVNpemUsIFJPT01UWVBFLlRSRUFTVVJFKTtcclxuICAgICAgICAgICAgdGhpcy5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRNYXRlcmlhbCkubWF0ZXJpYWwgPSB0aGlzLnRyZWFzdXJlUm9vbU1hdDtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVUcmVhc3VyZXMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBjcmVhdGVUcmVhc3VyZXMoKSB7XHJcbiAgICAgICAgICAgIGxldCB0cmVhc3VyZXM6IEl0ZW1zLkl0ZW1bXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudHJlYXN1cmVDb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB0cmVhc3VyZXMucHVzaChJdGVtcy5JdGVtR2VuZXJhdG9yLmdldFJhbmRvbUl0ZW0oKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy50cmVhc3VyZXMgPSB0cmVhc3VyZXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb25BZGRUb0dyYXBoKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBsZXQgaTogbnVtYmVyID0gMDtcclxuICAgICAgICAgICAgdGhpcy50cmVhc3VyZXMuZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgICAgIGl0ZW0uc2V0UG9zaXRpb24obmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgaSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi55KSlcclxuICAgICAgICAgICAgICAgIGl0ZW0uc3Bhd24oKTtcclxuICAgICAgICAgICAgICAgIGkrKztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkl0ZW1Db2xsZWN0KF9pdGVtOiBJdGVtcy5JdGVtKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRyZWFzdXJlcy5maW5kKGl0ZW0gPT4gaXRlbSA9PSBfaXRlbSkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRyZWFzdXJlcy5zcGxpY2UodGhpcy50cmVhc3VyZXMuaW5kZXhPZihfaXRlbSksIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgTWVyY2hhbnRSb29tIGV4dGVuZHMgUm9vbSB7XHJcbiAgICAgICAgcHJpdmF0ZSBtZXJjaGFudFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibWVyY2hhbnRSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImdyZWVuXCIpKSk7XHJcbiAgICAgICAgcHJpdmF0ZSBtZXJjaGFudDogRW50aXR5Lk1lcmNoYW50ID0gbmV3IEVudGl0eS5NZXJjaGFudChFbnRpdHkuSUQuTUVSQ0hBTlQpO1xyXG4gICAgICAgIHByaXZhdGUgaXRlbXM6IEl0ZW1zLkl0ZW1bXSA9IFtdO1xyXG4gICAgICAgIHByaXZhdGUgaXRlbXNTcGF3blBvaW50czogxpIuVmVjdG9yMltdID0gW107XHJcbiAgICAgICAgcHJpdmF0ZSBpdGVtQ291bnQ6IG51bWJlciA9IDU7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tU2l6ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9jb29yZGluYXRlcywgX3Jvb21TaXplLCBST09NVFlQRS5NRVJDSEFOVCk7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50TWF0ZXJpYWwpLm1hdGVyaWFsID0gdGhpcy5tZXJjaGFudFJvb21NYXQ7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1lcmNoYW50Lm10eExvY2FsLnRyYW5zbGF0ZVooMC4wMSk7XHJcbiAgICAgICAgICAgIHRoaXMubWVyY2hhbnQubXR4TG9jYWwudHJhbnNsYXRlWSg1IC8gdGhpcy5yb29tU2l6ZSk7XHJcbiAgICAgICAgICAgIHRoaXMubWVyY2hhbnQubXR4TG9jYWwuc2NhbGUoR2FtZS7Gki5WZWN0b3IzLk9ORSgxIC8gdGhpcy5yb29tU2l6ZSkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMubWVyY2hhbnQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVTaG9wKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgY3JlYXRlU2hvcCgpIHtcclxuICAgICAgICAgICAgbGV0IGl0ZW1zOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLml0ZW1Db3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKEl0ZW1zLkl0ZW1HZW5lcmF0b3IuZ2V0UmFuZG9tSXRlbSgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLml0ZW1zID0gaXRlbXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb25BZGRUb0dyYXBoKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmNyZWF0ZVNwYXduUG9pbnRzKCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgaSA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMuZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChpdGVtLmdldFBvc2l0aW9uICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLml0ZW1zU3Bhd25Qb2ludHMuZmluZChwb3MgPT4gcG9zLmVxdWFscyhpdGVtLmdldFBvc2l0aW9uKSkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc2V0UG9zaXRpb24odGhpcy5pdGVtc1NwYXduUG9pbnRzW2ldKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc2V0UG9zaXRpb24odGhpcy5pdGVtc1NwYXduUG9pbnRzW2ldKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGl0ZW0uc3Bhd24oKTtcclxuICAgICAgICAgICAgICAgIGkrKztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgY3JlYXRlU3Bhd25Qb2ludHMoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNTcGF3blBvaW50cyA9IFtdO1xyXG5cclxuICAgICAgICAgICAgbGV0IG1pZGRsZSA9IHRoaXMubXR4V29ybGQuY2xvbmUudHJhbnNsYXRpb247XHJcblxyXG4gICAgICAgICAgICB0aGlzLml0ZW1zU3Bhd25Qb2ludHMucHVzaChuZXcgxpIuVmVjdG9yMihtaWRkbGUueCwgbWlkZGxlLnkgKyAzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNTcGF3blBvaW50cy5wdXNoKG5ldyDGki5WZWN0b3IyKG1pZGRsZS54ICsgMywgbWlkZGxlLnkgKyAzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNTcGF3blBvaW50cy5wdXNoKG5ldyDGki5WZWN0b3IyKG1pZGRsZS54IC0gMywgbWlkZGxlLnkgKyAzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNTcGF3blBvaW50cy5wdXNoKG5ldyDGki5WZWN0b3IyKG1pZGRsZS54ICsgMiwgbWlkZGxlLnkgKyAxKSk7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNTcGF3blBvaW50cy5wdXNoKG5ldyDGki5WZWN0b3IyKG1pZGRsZS54IC0gMiwgbWlkZGxlLnkgKyAxKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb25JdGVtQ29sbGVjdChfaXRlbTogSXRlbXMuSXRlbSwgX2F2YXRhcjogUGxheWVyLlBsYXllcik6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pdGVtcy5maW5kKGl0ZW0gPT4gaXRlbSA9PSBfaXRlbSkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zaG9waW5nKF9pdGVtLCBfYXZhdGFyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHNob3BpbmcoX2l0ZW06IEl0ZW1zLkl0ZW0sIF9hdmF0YXI6IFBsYXllci5QbGF5ZXIpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgbGV0IHNhbWVSYXJpdHk6IEl0ZW1zLkl0ZW1bXSA9IF9hdmF0YXIuaXRlbXMuZmlsdGVyKGl0ZW0gPT4gaXRlbS5yYXJpdHkgPT0gX2l0ZW0ucmFyaXR5KTtcclxuICAgICAgICAgICAgbGV0IGxvd2VyUmFyaXR5OiBJdGVtcy5JdGVtW10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfaXRlbS5yYXJpdHkgIT0gSXRlbXMuUkFSSVRZLkNPTU1PTikge1xyXG4gICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkgPSBfYXZhdGFyLml0ZW1zLmZpbHRlcihpdGVtID0+IGl0ZW0ucmFyaXR5ID09IChfaXRlbS5yYXJpdHkgLSAxKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChzYW1lUmFyaXR5Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGxldCBpbmRleDogbnVtYmVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKHNhbWVSYXJpdHkubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICAgICAgc2FtZVJhcml0eVtpbmRleF0ucmVtb3ZlSXRlbVRvRW50aXR5KF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtcy5zcGxpY2UodGhpcy5pdGVtcy5pbmRleE9mKF9pdGVtKSwgMSk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeShmYWxzZSwgc2FtZVJhcml0eVtpbmRleF0uaWQsIHNhbWVSYXJpdHlbaW5kZXhdLm5ldElkLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChsb3dlclJhcml0eS5sZW5ndGggPj0gMykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbmRleDE6IG51bWJlciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChsb3dlclJhcml0eS5sZW5ndGggLSAxKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHlbaW5kZXgxXS5yZW1vdmVJdGVtVG9FbnRpdHkoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkuc3BsaWNlKGxvd2VyUmFyaXR5LmluZGV4T2YobG93ZXJSYXJpdHlbaW5kZXgxXSksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5LnNsaWNlKGluZGV4MSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkuc3BsaWNlKGluZGV4MSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVJbnZlbnRvcnkoZmFsc2UsIGxvd2VyUmFyaXR5W2luZGV4MV0uaWQsIGxvd2VyUmFyaXR5W2luZGV4MV0ubmV0SWQsIF9hdmF0YXIubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW5kZXgyOiBudW1iZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAobG93ZXJSYXJpdHkubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5W2luZGV4Ml0ucmVtb3ZlSXRlbVRvRW50aXR5KF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5LnNwbGljZShsb3dlclJhcml0eS5pbmRleE9mKGxvd2VyUmFyaXR5W2luZGV4Ml0pLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eS5zbGljZShpbmRleDIsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5LnNwbGljZShpbmRleDIsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlSW52ZW50b3J5KGZhbHNlLCBsb3dlclJhcml0eVtpbmRleDJdLmlkLCBsb3dlclJhcml0eVtpbmRleDJdLm5ldElkLCBfYXZhdGFyLm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZGV4MzogbnVtYmVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKGxvd2VyUmFyaXR5Lmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eVtpbmRleDNdLnJlbW92ZUl0ZW1Ub0VudGl0eShfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eS5zcGxpY2UobG93ZXJSYXJpdHkuaW5kZXhPZihsb3dlclJhcml0eVtpbmRleDNdKSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkuc2xpY2UoaW5kZXgzLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eS5zcGxpY2UoaW5kZXgzLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeShmYWxzZSwgbG93ZXJSYXJpdHlbaW5kZXgzXS5pZCwgbG93ZXJSYXJpdHlbaW5kZXgzXS5uZXRJZCwgX2F2YXRhci5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXRlbXMuc3BsaWNlKHRoaXMuaXRlbXMuaW5kZXhPZihfaXRlbSksIDEpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGVudW0gQ0hBTExFTkdFIHtcclxuICAgICAgICBUSE9SU0hBTU1FUlxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIENoYWxsZW5nZVJvb20gZXh0ZW5kcyBSb29tIHtcclxuICAgICAgICBjaGFsbGVuZ2U6IENIQUxMRU5HRTtcclxuICAgICAgICBjaGFsbGVuZ2VSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcImNoYWxsZW5nZVJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiYmx1ZVwiKSkpO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb21TaXplOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2Nvb3JkaW5hdGVzLCBfcm9vbVNpemUsIFJPT01UWVBFLkNIQUxMRU5HRSk7XHJcbiAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudE1hbmFnZXIgPSBuZXcgRW5lbXlDb3VudE1hbmFnZXIoMTApO1xyXG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudE1hdGVyaWFsKS5tYXRlcmlhbCA9IHRoaXMuY2hhbGxlbmdlUm9vbU1hdDtcclxuICAgICAgICAgICAgdGhpcy5jaGFsbGVuZ2UgPSB0aGlzLnJhbmRvbUNoYWxsZW5nZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHJhbmRvbUNoYWxsZW5nZSgpOiBDSEFMTEVOR0Uge1xyXG4gICAgICAgICAgICBsZXQgaW5kZXg6IG51bWJlciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChPYmplY3Qua2V5cyhDSEFMTEVOR0UpLmxlbmd0aCAvIDIgLSAxKSk7XHJcbiAgICAgICAgICAgIHJldHVybiAoPGFueT5DSEFMTEVOR0UpW0NIQUxMRU5HRVtpbmRleF1dO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZW5lbXlDb3VudE1hbmFnZXIuZmluaXNoZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY2hhbGxlbmdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQ0hBTExFTkdFLlRIT1JTSEFNTUVSOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdG9wVGhvcnNIYW1tZXJDaGFsbGVuZ2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uQWRkVG9HcmFwaCgpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoICh0aGlzLmNoYWxsZW5nZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQ0hBTExFTkdFLlRIT1JTSEFNTUVSOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXJ0VGhvcnNIYW1tZXJDaGFsbGVuZ2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgc3RhcnRUaG9yc0hhbW1lckNoYWxsZW5nZSgpIHtcclxuICAgICAgICAgICAgLy9UT0RPOiBhY3RpdmF0ZVxyXG4gICAgICAgICAgICAvLyBpZiAodGhpcy5lbmVteUNvdW50TWFuYWdlci5maW5pc2hlZCkge1xyXG4gICAgICAgICAgICAvLyAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAvLyB9XHJcblxyXG5cclxuICAgICAgICAgICAgbGV0IHRob3JzaGFtbWVyOiBJdGVtcy5JbnRlcm5hbEl0ZW0gPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKEl0ZW1zLklURU1JRC5USE9SU0hBTU1FUik7XHJcbiAgICAgICAgICAgIGxldCBjaG9vc2VuT25lOiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgICAgICAgICBpZiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKSA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNob29zZW5PbmUgPSBHYW1lLmF2YXRhcjE7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjaG9vc2VuT25lID0gR2FtZS5hdmF0YXIyO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aG9yc2hhbW1lci5hZGRJdGVtVG9FbnRpdHkoY2hvb3Nlbk9uZSk7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlSW52ZW50b3J5KHRydWUsIHRob3JzaGFtbWVyLmlkLCB0aG9yc2hhbW1lci5uZXRJZCwgY2hvb3Nlbk9uZS5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoY2hvb3Nlbk9uZSAhPSBHYW1lLmF2YXRhcjEpIHtcclxuICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS53ZWFwb24gPSBuZXcgV2VhcG9ucy5UaG9yc0hhbW1lcigxMDAgKiA2MCwgMSwgQnVsbGV0cy5CVUxMRVRUWVBFLlRIT1JTSEFNTUVSLCAxLCBHYW1lLmF2YXRhcjEubmV0SWQpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLndlYXBvbiA9IG5ldyBXZWFwb25zLlRob3JzSGFtbWVyKDEwMCAqIDYwLCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuVEhPUlNIQU1NRVIsIDEsIEdhbWUuYXZhdGFyMS5uZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKEdhbWUuYXZhdGFyMS53ZWFwb24sIEdhbWUuYXZhdGFyMS5uZXRJZCk7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKEdhbWUuYXZhdGFyMi53ZWFwb24sIEdhbWUuYXZhdGFyMi5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgc3RvcFRob3JzSGFtbWVyQ2hhbGxlbmdlKCkge1xyXG4gICAgICAgICAgICBsZXQgYXZhdGFyMUludiA9IEdhbWUuYXZhdGFyMS5pdGVtcy5maW5kKGl0ZW0gPT4gaXRlbS5pZCA9PSBJdGVtcy5JVEVNSUQuVEhPUlNIQU1NRVIpO1xyXG4gICAgICAgICAgICBsZXQgYXZhdGFyMkludiA9IEdhbWUuYXZhdGFyMi5pdGVtcy5maW5kKGl0ZW0gPT4gaXRlbS5pZCA9PSBJdGVtcy5JVEVNSUQuVEhPUlNIQU1NRVIpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGF2YXRhcjFJbnYgIT0gdW5kZWZpbmVkIHx8IGF2YXRhcjJJbnYgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYXZhdGFyMUludiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEuaXRlbXMuc3BsaWNlKEdhbWUuYXZhdGFyMS5pdGVtcy5pbmRleE9mKGF2YXRhcjFJbnYpLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeShmYWxzZSwgYXZhdGFyMUludi5pZCwgYXZhdGFyMUludi5uZXRJZCwgR2FtZS5hdmF0YXIxLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYXZhdGFyMkludiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIuaXRlbXMuc3BsaWNlKEdhbWUuYXZhdGFyMi5pdGVtcy5pbmRleE9mKGF2YXRhcjJJbnYpLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeShmYWxzZSwgYXZhdGFyMkludi5pZCwgYXZhdGFyMkludi5uZXRJZCwgR2FtZS5hdmF0YXIyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEud2VhcG9uID0gKDxXZWFwb25zLlRob3JzSGFtbWVyPkdhbWUuYXZhdGFyMS53ZWFwb24pLndlYXBvblN0b3JhZ2U7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIud2VhcG9uID0gKDxXZWFwb25zLlRob3JzSGFtbWVyPkdhbWUuYXZhdGFyMi53ZWFwb24pLndlYXBvblN0b3JhZ2U7XHJcblxyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJXZWFwb24oR2FtZS5hdmF0YXIxLndlYXBvbiwgR2FtZS5hdmF0YXIxLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKEdhbWUuYXZhdGFyMi53ZWFwb24sIEdhbWUuYXZhdGFyMi5uZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCByb29tSW52ID0gR2FtZS5pdGVtcy5maW5kKGl0ZW0gPT4gaXRlbS5pZCA9PSBJdGVtcy5JVEVNSUQuVEhPUlNIQU1NRVIpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHJvb21JbnYgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICByb29tSW52LmRlc3Bhd24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFdhbGwgZXh0ZW5kcyDGki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5XQUxMO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogR2FtZS7Gki5SZWN0YW5nbGU7XHJcbiAgICAgICAgcHVibGljIGRvb3I6IERvb3I7XHJcbiAgICAgICAgcHJpdmF0ZSBub3JtYWw6IEdhbWUuxpIuVmVjdG9yMzsgZ2V0IGdldE5vcm1hbCgpOiBHYW1lLsaSLlZlY3RvcjMgeyByZXR1cm4gdGhpcy5ub3JtYWwgfTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3BvczogR2FtZS7Gki5WZWN0b3IyLCBfc2NhbGluZzogR2FtZS7Gki5WZWN0b3IyLCBfcm9vbTogUm9vbSkge1xyXG4gICAgICAgICAgICBzdXBlcihcIldhbGxcIik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWVzaChuZXcgxpIuTWVzaFF1YWQpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG5ldyDGki5NYXRlcmlhbChcInJlZFwiLCDGki5TaGFkZXJMaXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInJlZFwiKSkpKSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbmV3UG9zID0gX3Bvcy50b1ZlY3RvcjMoMC4wMSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXdQb3M7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwuc2NhbGluZyA9IF9zY2FsaW5nLnRvVmVjdG9yMygxKTtcclxuXHJcblxyXG4gICAgICAgICAgICBpZiAoX3Bvcy54ICE9IDApIHtcclxuICAgICAgICAgICAgICAgIGlmIChfcG9zLnggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGREb29yKF9wb3MsIF9zY2FsaW5nKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vcm1hbCA9IG5ldyDGki5WZWN0b3IzKC0xLCAwLCAwKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoX3Bvcy54IDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkRG9vcihfcG9zLCBfc2NhbGluZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3JtYWwgPSBuZXcgxpIuVmVjdG9yMygxLCAwLCAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChfcG9zLnkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGREb29yKF9wb3MsIF9zY2FsaW5nKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vcm1hbCA9IG5ldyDGki5WZWN0b3IzKDAsIC0xLCAwKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoX3Bvcy55IDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkRG9vcihfcG9zLCBfc2NhbGluZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3JtYWwgPSBuZXcgxpIuVmVjdG9yMygwLCAxLCAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGFkZERvb3IoX3BvczogR2FtZS7Gki5WZWN0b3IyLCBfc2NhbGluZzogR2FtZS7Gki5WZWN0b3IyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZG9vciA9IG5ldyBEb29yKCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5kb29yKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhfcG9zLngpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb29yLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKDEsIF9zY2FsaW5nLnggLyBfc2NhbGluZy55ICogMywgMSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3Bvcy54ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9vci5kaXJlY3Rpb24gPSAoPEludGVyZmFjZXMuSVJvb21FeGl0cz57IG5vcnRoOiBmYWxzZSwgZWFzdDogdHJ1ZSwgc291dGg6IGZhbHNlLCB3ZXN0OiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvb3IubXR4TG9jYWwudHJhbnNsYXRlWCgtMC41KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb29yLmRpcmVjdGlvbiA9ICg8SW50ZXJmYWNlcy5JUm9vbUV4aXRzPnsgbm9ydGg6IGZhbHNlLCBlYXN0OiBmYWxzZSwgc291dGg6IGZhbHNlLCB3ZXN0OiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9vci5tdHhMb2NhbC50cmFuc2xhdGVYKDAuNSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvb3IubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMoX3NjYWxpbmcueSAvIF9zY2FsaW5nLnggKiAzLCAxLCAxKTtcclxuICAgICAgICAgICAgICAgIGlmIChfcG9zLnkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb29yLmRpcmVjdGlvbiA9ICg8SW50ZXJmYWNlcy5JUm9vbUV4aXRzPnsgbm9ydGg6IHRydWUsIGVhc3Q6IGZhbHNlLCBzb3V0aDogZmFsc2UsIHdlc3Q6IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9vci5tdHhMb2NhbC50cmFuc2xhdGVZKC0wLjUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvb3IuZGlyZWN0aW9uID0gKDxJbnRlcmZhY2VzLklSb29tRXhpdHM+eyBub3J0aDogZmFsc2UsIGVhc3Q6IGZhbHNlLCBzb3V0aDogdHJ1ZSwgd2VzdDogZmFsc2UgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb29yLm10eExvY2FsLnRyYW5zbGF0ZVkoMC41KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0Q29sbGlkZXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5tdHhXb3JsZC50cmFuc2xhdGlvbi54LCB0aGlzLm10eFdvcmxkLnRyYW5zbGF0aW9uLnksIHRoaXMubXR4V29ybGQuc2NhbGluZy54LCB0aGlzLm10eFdvcmxkLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRG9vciBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLkRPT1I7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBHYW1lLsaSLlJlY3RhbmdsZTtcclxuXHJcbiAgICAgICAgcHVibGljIGRpcmVjdGlvbjogSW50ZXJmYWNlcy5JUm9vbUV4aXRzO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJEb29yXCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IMaSLk1lc2hRdWFkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChuZXcgxpIuTWF0ZXJpYWwoXCJncmVlblwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJncmVlblwiKSkpKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0ZVooMC4xKTtcclxuICAgICAgICAgICAgdGhpcy5jbG9zZURvb3IoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldENvbGxpZGVyKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLm10eFdvcmxkLnRyYW5zbGF0aW9uLngsIHRoaXMubXR4V29ybGQudHJhbnNsYXRpb24ueSwgdGhpcy5tdHhXb3JsZC5zY2FsaW5nLngsIHRoaXMubXR4V29ybGQuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjaGFuZ2VSb29tKCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLnN3aXRjaFJvb20odGhpcy5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zd2l0Y2hSb29tUmVxdWVzdCh0aGlzLmRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvcGVuRG9vcigpIHtcclxuICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZSh0cnVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjbG9zZURvb3IoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGUoZmFsc2UpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBPYnNpdGNhbCBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLk9CU1RJQ0FMO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7XHJcbiAgICAgICAgcHVibGljIHBhcmVudFJvb206IFJvb207XHJcblxyXG4gICAgICAgIGRpcmVjdGlvbjogSW50ZXJmYWNlcy5JUm9vbUV4aXRzO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfcGFyZW50OiBSb29tLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMiwgX3NjYWxlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJPYnN0aWNhbFwiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucGFyZW50Um9vbSA9IF9wYXJlbnQ7XHJcbiAgICAgICAgICAgIHRoaXMucGFyZW50Um9vbS5vYnN0aWNhbHMucHVzaCh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyDGki5NZXNoUXVhZCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobmV3IMaSLk1hdGVyaWFsKFwiYmxhY2tcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiYmxhY2tcIikpKSkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IF9wb3NpdGlvbi50b1ZlY3RvcjMoMC4wMSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwuc2NhbGUoR2FtZS7Gki5WZWN0b3IzLk9ORShfc2NhbGUpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCBudWxsKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgR2VuZXJhdGlvbiB7XHJcblxyXG4gICAgbGV0IG51bWJlck9mUm9vbXM6IG51bWJlciA9IDU7XHJcbiAgICBleHBvcnQgbGV0IGdlbmVyYXRpb25GYWlsZWQgPSBmYWxzZTtcclxuICAgIGV4cG9ydCBsZXQgcm9vbXM6IFJvb21bXSA9IFtdO1xyXG5cclxuICAgIGV4cG9ydCBjb25zdCBjb21wYXJlTm9ydGg6IEdhbWUuxpIuVmVjdG9yMiA9IG5ldyDGki5WZWN0b3IyKDAsIDEpO1xyXG4gICAgZXhwb3J0IGNvbnN0IGNvbXBhcmVFYXN0OiBHYW1lLsaSLlZlY3RvcjIgPSBuZXcgxpIuVmVjdG9yMigxLCAwKTtcclxuICAgIGV4cG9ydCBjb25zdCBjb21wYXJlU291dGg6IEdhbWUuxpIuVmVjdG9yMiA9IG5ldyDGki5WZWN0b3IyKDAsIC0xKTtcclxuICAgIGV4cG9ydCBjb25zdCBjb21wYXJlV2VzdDogR2FtZS7Gki5WZWN0b3IyID0gbmV3IMaSLlZlY3RvcjIoLTEsIDApO1xyXG5cclxuICAgIC8vc3Bhd24gY2hhbmNlc1xyXG4gICAgbGV0IGNoYWxsZW5nZVJvb21TcGF3bkNoYW5jZTogbnVtYmVyID0gMzA7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHByb2NlZHVhbFJvb21HZW5lcmF0aW9uKCkge1xyXG4gICAgICAgIHJvb21zID0gW107XHJcbiAgICAgICAgZ2VuZXJhdGlvbkZhaWxlZCA9IGZhbHNlO1xyXG4gICAgICAgIHJvb21zLnB1c2goZ2VuZXJhdGVTdGFydFJvb20oKSk7XHJcbiAgICAgICAgcm9vbXMucHVzaC5hcHBseShyb29tcywgZ2VuZXJhdGVOb3JtYWxSb29tcygpKTtcclxuICAgICAgICBhZGRCb3NzUm9vbSgpO1xyXG4gICAgICAgIHJvb21zLnB1c2guYXBwbHkocm9vbXMsIGdlbmVyYXRlVHJlYXN1cmVSb29tKCkpO1xyXG4gICAgICAgIHJvb21zLnB1c2goZ2VuZXJhdGVNZXJjaGFudFJvb20oKSk7XHJcbiAgICAgICAgcm9vbXMucHVzaChnZW5lcmF0ZUNoYWxsZW5nZVJvb20oKSk7XHJcbiAgICAgICAgc2V0RXhpdHMoKTtcclxuICAgICAgICByb29tcy5mb3JFYWNoKHJvb20gPT4geyBjb25zb2xlLmxvZyhyb29tLm10eExvY2FsLnRyYW5zbGF0aW9uLmNsb25lLnRvU3RyaW5nKCkpIH0pO1xyXG4gICAgICAgIG1vdmVSb29tVG9Xb3JsZENvb3Jkcyhyb29tc1swXSk7XHJcblxyXG5cclxuICAgICAgICBzZXRFeGl0cygpO1xyXG4gICAgICAgIGFkZFJvb21Ub0dyYXBoKHJvb21zWzBdKTtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogZ2VuZXJhdGVzIGEgZ3JpZCB0aGF0cyBjb25uZWN0ZWQgdG9nZ2V0aGVyIGZyb20gYSBnaXZlbiBzdGFydGluZyBwb2ludFxyXG4gICAgICogQHBhcmFtIF9zdGFydENvb3JkIHRoZSBzdGFydGluZyBwb2ludFxyXG4gICAgICogQHJldHVybnMgdmVjdG9yMiBhcnJheSBvZiBhIGNvbm5lY3RpbmcgZ3JpZCB3aXRob3V0IG92ZXJsYXBzXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlU25ha2VHcmlkKF9zdGFydENvb3JkOiBHYW1lLsaSLlZlY3RvcjIpOiBHYW1lLsaSLlZlY3RvcjJbXSB7XHJcbiAgICAgICAgbGV0IGdyaWQ6IEdhbWUuxpIuVmVjdG9yMltdID0gW107XHJcbiAgICAgICAgZ3JpZC5wdXNoKF9zdGFydENvb3JkKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bWJlck9mUm9vbXM7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgbmV4dENvb3JkID0gZ2V0TmV4dFBvc3NpYmxlQ29vcmRGcm9tU3BlY2lmaWNDb29yZChncmlkLCBncmlkW2dyaWQubGVuZ3RoIC0gMV0pO1xyXG4gICAgICAgICAgICBpZiAobmV4dENvb3JkID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBncmlkLnB1c2gobmV4dENvb3JkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZ3JpZDtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogZnVuY3Rpb24gdG8gZ2V0IGEgcmFuZG9tIG5laWdpaGJvdXIgdGFraW5nIGNhcmUgb2YgYW4gYWN1dGFsIGdyaWRcclxuICAgICAqIEBwYXJhbSBfZ3JpZCBleGlzdGluZyBncmlkIHRoZSBmdW5jdGlvbiBzaG91bGQgY2FyZSBhYm91dFxyXG4gICAgICogQHBhcmFtIF9zcGVjaWZpY0Nvb3JkIHRoZSBjb29yZCB5b3Ugd2FudCB0aGUgbmV4dCBwb3NzaWJsZSBjb29yZCBcclxuICAgICAqIEByZXR1cm5zIGEgdmVjdG9yMiBjb29yZCB0aGF0cyBub3QgaW5zaWRlIG9mIF9ncmlkIGFuZCBhcm91bmQgIF9zcGVjaWZpY0Nvb3JkXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGdldE5leHRQb3NzaWJsZUNvb3JkRnJvbVNwZWNpZmljQ29vcmQoX2dyaWQ6IEdhbWUuxpIuVmVjdG9yMltdLCBfc3BlY2lmaWNDb29yZDogR2FtZS7Gki5WZWN0b3IyKTogR2FtZS7Gki5WZWN0b3IyIHtcclxuICAgICAgICBsZXQgY29vcmROZWlnaGJvdXJzOiBHYW1lLsaSLlZlY3RvcjJbXSA9IGdldE5laWdoYm91ckNvb3JkaW5hdGUoX3NwZWNpZmljQ29vcmQpO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29vcmROZWlnaGJvdXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGxldCByYW5kb21JbmRleCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChjb29yZE5laWdoYm91cnMubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICBsZXQgbmV4dENvb3JkID0gY29vcmROZWlnaGJvdXJzW3JhbmRvbUluZGV4XTtcclxuICAgICAgICAgICAgaWYgKF9ncmlkLmZpbmQoY29vcmQgPT4gY29vcmQuZXF1YWxzKG5leHRDb29yZCkpKSB7XHJcbiAgICAgICAgICAgICAgICBjb29yZE5laWdoYm91cnMgPSBjb29yZE5laWdoYm91cnMuZmlsdGVyKGNvb3JkID0+ICFjb29yZC5lcXVhbHMobmV4dENvb3JkKSk7XHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXh0Q29vcmQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIGZ1bmN0aW9uIHRvIGdldCBhbGwgbmVpZ2hib3VycyBpZ25vcmluZyB0aGUgY3VycmVudCBncmlkXHJcbiAgICAgKiBAcGFyYW0gX2Nvb3JkIGNvb3JkaWFudGUgeW91IHdhbnQgdGhlIG5laWdoYm91ciBmcm9tXHJcbiAgICAgKiBAcmV0dXJucyA0IG5laWdoYm91cnMgaW4gZGlyZWN0aW9uIE4gRSBTIGFuZCBXXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGdldE5laWdoYm91ckNvb3JkaW5hdGUoX2Nvb3JkOiBHYW1lLsaSLlZlY3RvcjIpOiBHYW1lLsaSLlZlY3RvcjJbXSB7XHJcbiAgICAgICAgbGV0IG5laWdoYm91cnM6IEdhbWUuxpIuVmVjdG9yMltdID0gW107XHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKG5ldyDGki5WZWN0b3IyKF9jb29yZC54ICsgMSwgX2Nvb3JkLnkpKTtcclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2gobmV3IMaSLlZlY3RvcjIoX2Nvb3JkLnggLSAxLCBfY29vcmQueSkpO1xyXG5cclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2gobmV3IMaSLlZlY3RvcjIoX2Nvb3JkLngsIF9jb29yZC55ICsgMSkpO1xyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChuZXcgxpIuVmVjdG9yMihfY29vcmQueCwgX2Nvb3JkLnkgLSAxKSk7XHJcbiAgICAgICAgcmV0dXJuIG5laWdoYm91cnM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVTdGFydFJvb20oKTogU3RhcnRSb29tIHtcclxuICAgICAgICBsZXQgc3RhcnRSb29tOiBTdGFydFJvb20gPSBuZXcgU3RhcnRSb29tKG5ldyDGki5WZWN0b3IyKDAsIDApLCAzMCk7XHJcbiAgICAgICAgcmV0dXJuIHN0YXJ0Um9vbTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZU5vcm1hbFJvb21zKCk6IE5vcm1hbFJvb21bXSB7XHJcbiAgICAgICAgbGV0IGdyaWRDb29yZHM6IEdhbWUuxpIuVmVjdG9yMltdO1xyXG4gICAgICAgIGxldCBub3JtYWxSb29tczogTm9ybWFsUm9vbVtdID0gW107XHJcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgZ3JpZENvb3JkcyA9IGdlbmVyYXRlU25ha2VHcmlkKHJvb21zWzBdLmNvb3JkaW5hdGVzKTtcclxuICAgICAgICAgICAgaWYgKChncmlkQ29vcmRzLmxlbmd0aCAtIDEpID09IG51bWJlck9mUm9vbXMpIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdyaWRDb29yZHMuZm9yRWFjaChjb29yZCA9PiB7XHJcbiAgICAgICAgICAgIG5vcm1hbFJvb21zLnB1c2gobmV3IE5vcm1hbFJvb20oY29vcmQsIDIwKSk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICByZXR1cm4gbm9ybWFsUm9vbXM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkQm9zc1Jvb20oKSB7XHJcbiAgICAgICAgbGV0IGJpZ2dlc3REaXN0YW5jZTogR2FtZS7Gki5WZWN0b3IyID0gxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgcm9vbXMuZm9yRWFjaChyb29tID0+IHtcclxuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHJvb20uY29vcmRpbmF0ZXMueCkgPiBiaWdnZXN0RGlzdGFuY2UueCAmJiBNYXRoLmFicyhyb29tLmNvb3JkaW5hdGVzLnkpID4gYmlnZ2VzdERpc3RhbmNlLnkpIHtcclxuICAgICAgICAgICAgICAgIGJpZ2dlc3REaXN0YW5jZSA9IHJvb20uY29vcmRpbmF0ZXM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICAgIGxldCByb29tQ29vcmQ6IEdhbWUuxpIuVmVjdG9yMltdID0gZ2V0Q29vcmRzRnJvbVJvb21zKCk7XHJcbiAgICAgICAgbGV0IG5leHRDb29yZCA9IGdldE5leHRQb3NzaWJsZUNvb3JkRnJvbVNwZWNpZmljQ29vcmQocm9vbUNvb3JkLCByb29tQ29vcmRbcm9vbUNvb3JkLmxlbmd0aCAtIDFdKTtcclxuICAgICAgICBpZiAobmV4dENvb3JkID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAvLyBuZXh0Q29vcmQgPSBnZXROZXh0UG9zc2libGVDb29yZEZyb21TcGVjaWZpY0Nvb3JkKHJvb21Db29yZCwgcm9vbUNvb3JkW3Jvb21Db29yZC5sZW5ndGggLSAyXSk7XHJcbiAgICAgICAgICAgIGdlbmVyYXRpb25GYWlsZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcm9vbXMucHVzaChuZXcgQm9zc1Jvb20obmV4dENvb3JkLCAzMCkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZVRyZWFzdXJlUm9vbSgpOiBUcmVhc3VyZVJvb21bXSB7XHJcbiAgICAgICAgbGV0IHJvb21Db29yZHM6IEdhbWUuxpIuVmVjdG9yMltdID0gZ2V0Q29vcmRzRnJvbVJvb21zKCk7XHJcbiAgICAgICAgbGV0IG5ld1RyZWFzdXJlUm9vbXM6IFRyZWFzdXJlUm9vbVtdID0gW11cclxuICAgICAgICByb29tcy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICBpZiAocm9vbS5yb29tVHlwZSA9PSBST09NVFlQRS5OT1JNQUwpIHtcclxuICAgICAgICAgICAgICAgIGxldCBuZXh0Q29vcmQgPSBnZXROZXh0UG9zc2libGVDb29yZEZyb21TcGVjaWZpY0Nvb3JkKHJvb21Db29yZHMsIHJvb20uY29vcmRpbmF0ZXMpXHJcbiAgICAgICAgICAgICAgICBpZiAobmV4dENvb3JkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0clJvb20gPSBuZXcgVHJlYXN1cmVSb29tKG5leHRDb29yZCwgMTApO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1NwYXduaW5nKHRyUm9vbS5nZXRTcGF3bkNoYW5jZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VHJlYXN1cmVSb29tcy5wdXNoKHRyUm9vbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICByZXR1cm4gbmV3VHJlYXN1cmVSb29tcztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZU1lcmNoYW50Um9vbSgpOiBNZXJjaGFudFJvb20ge1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcm9vbXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKGkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV4dENvb3JkID0gZ2V0TmV4dFBvc3NpYmxlQ29vcmRGcm9tU3BlY2lmaWNDb29yZChnZXRDb29yZHNGcm9tUm9vbXMoKSwgcm9vbXNbaV0uY29vcmRpbmF0ZXMpXHJcbiAgICAgICAgICAgICAgICBpZiAobmV4dENvb3JkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgTWVyY2hhbnRSb29tKG5leHRDb29yZCwgMjApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdlbmVyYXRpb25GYWlsZWQgPSB0cnVlO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlQ2hhbGxlbmdlUm9vbSgpOiBDaGFsbGVuZ2VSb29tIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJvb21zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5leHRDb29yZCA9IGdldE5leHRQb3NzaWJsZUNvb3JkRnJvbVNwZWNpZmljQ29vcmQoZ2V0Q29vcmRzRnJvbVJvb21zKCksIHJvb21zW2ldLmNvb3JkaW5hdGVzKVxyXG4gICAgICAgICAgICAgICAgaWYgKG5leHRDb29yZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IENoYWxsZW5nZVJvb20obmV4dENvb3JkLCAyMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZ2VuZXJhdGlvbkZhaWxlZCA9IHRydWU7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIGZ1bmN0aW9uIHRvIGdldCBjb29yZGlhbnRlcyBmcm9tIGFsbCBleGlzdGluZyByb29tc1xyXG4gICAgICogQHJldHVybnMgVmVjdG9yMiBhcnJheSB3aXRoIGNvb3JkaW5hdGVzIG9mIGFsbCBjdXJyZW50IGV4aXN0aW5nIHJvb21zIGluIFJvb21HZW5lcmF0aW9uLnJvb21zXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRDb29yZHNGcm9tUm9vbXMoKTogR2FtZS7Gki5WZWN0b3IyW10ge1xyXG4gICAgICAgIGxldCBjb29yZHM6IEdhbWUuxpIuVmVjdG9yMltdID0gW107XHJcbiAgICAgICAgcm9vbXMuZm9yRWFjaChyb29tID0+IHtcclxuICAgICAgICAgICAgY29vcmRzLnB1c2gocm9vbS5jb29yZGluYXRlcyk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICByZXR1cm4gY29vcmRzXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2V0RXhpdHMoKSB7XHJcbiAgICAgICAgcm9vbXMuZm9yRWFjaChyb29tID0+IHtcclxuICAgICAgICAgICAgbGV0IG5laWdoYm91cnMgPSByb29tcy5maWx0ZXIoZWxlbWVudCA9PiBlbGVtZW50ICE9IHJvb20pO1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJzLmZvckVhY2gobmVpZ2hib3VyID0+IHtcclxuICAgICAgICAgICAgICAgIHJvb20uc2V0Um9vbUV4aXQobmVpZ2hib3VyKTtcclxuICAgICAgICAgICAgICAgIHJvb20uc2V0U3Bhd25Qb2ludHMoKTtcclxuICAgICAgICAgICAgICAgIHJvb20ub3BlbkRvb3JzKCk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpc1NwYXduaW5nKF9zcGF3bkNoYW5jZTogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgbGV0IHggPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMDApO1xyXG4gICAgICAgIGlmICh4IDwgX3NwYXduQ2hhbmNlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbW92ZVJvb21Ub1dvcmxkQ29vcmRzKF9maXJzdFJvb206IFJvb20pIHtcclxuICAgICAgICBsZXQgbmVpZ2hib3VyTjogUm9vbSA9IHJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzLmVxdWFscyhuZXcgR2FtZS7Gki5WZWN0b3IyKF9maXJzdFJvb20uY29vcmRpbmF0ZXMuY2xvbmUueCwgKF9maXJzdFJvb20uY29vcmRpbmF0ZXMuY2xvbmUueSArIDEpKSkpO1xyXG4gICAgICAgIGxldCBuZWlnaGJvdXJFOiBSb29tID0gcm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKG5ldyBHYW1lLsaSLlZlY3RvcjIoKF9maXJzdFJvb20uY29vcmRpbmF0ZXMuY2xvbmUueCArIDEpLCBfZmlyc3RSb29tLmNvb3JkaW5hdGVzLmNsb25lLnkpKSk7XHJcbiAgICAgICAgbGV0IG5laWdoYm91clM6IFJvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IEdhbWUuxpIuVmVjdG9yMihfZmlyc3RSb29tLmNvb3JkaW5hdGVzLmNsb25lLngsIChfZmlyc3RSb29tLmNvb3JkaW5hdGVzLmNsb25lLnkgLSAxKSkpKTtcclxuICAgICAgICBsZXQgbmVpZ2hib3VyVzogUm9vbSA9IHJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzLmVxdWFscyhuZXcgR2FtZS7Gki5WZWN0b3IyKChfZmlyc3RSb29tLmNvb3JkaW5hdGVzLmNsb25lLnggLSAxKSwgX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS55KSkpO1xyXG4gICAgICAgIGlmIChuZWlnaGJvdXJOICE9IHVuZGVmaW5lZCAmJiAhbmVpZ2hib3VyTi5wb3NpdGlvblVwZGF0ZWQpIHtcclxuICAgICAgICAgICAgbmVpZ2hib3VyTi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKG5laWdoYm91ck4uY29vcmRpbmF0ZXMueCAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIG5laWdoYm91ck4ucm9vbVNpemUgLyAyKSwgbmVpZ2hib3VyTi5jb29yZGluYXRlcy55ICogKF9maXJzdFJvb20ucm9vbVNpemUgLyAyICsgbmVpZ2hib3VyTi5yb29tU2l6ZSAvIDIpLCAtMC4wMSk7XHJcbiAgICAgICAgICAgIG5laWdoYm91ck4ucG9zaXRpb25VcGRhdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgbW92ZVJvb21Ub1dvcmxkQ29vcmRzKG5laWdoYm91ck4pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobmVpZ2hib3VyRSAhPSB1bmRlZmluZWQgJiYgIW5laWdoYm91ckUucG9zaXRpb25VcGRhdGVkKSB7XHJcbiAgICAgICAgICAgIG5laWdoYm91ckUubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhuZWlnaGJvdXJFLmNvb3JkaW5hdGVzLnggKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBuZWlnaGJvdXJFLnJvb21TaXplIC8gMiksIG5laWdoYm91ckUuY29vcmRpbmF0ZXMueSAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIG5laWdoYm91ckUucm9vbVNpemUgLyAyKSwgLTAuMDEpO1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJFLnBvc2l0aW9uVXBkYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIG1vdmVSb29tVG9Xb3JsZENvb3JkcyhuZWlnaGJvdXJFKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5laWdoYm91clMgIT0gdW5kZWZpbmVkICYmICFuZWlnaGJvdXJTLnBvc2l0aW9uVXBkYXRlZCkge1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJTLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMobmVpZ2hib3VyUy5jb29yZGluYXRlcy54ICogKF9maXJzdFJvb20ucm9vbVNpemUgLyAyICsgbmVpZ2hib3VyUy5yb29tU2l6ZSAvIDIpLCBuZWlnaGJvdXJTLmNvb3JkaW5hdGVzLnkgKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBuZWlnaGJvdXJTLnJvb21TaXplIC8gMiksIC0wLjAxKTtcclxuICAgICAgICAgICAgbmVpZ2hib3VyUy5wb3NpdGlvblVwZGF0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBtb3ZlUm9vbVRvV29ybGRDb29yZHMobmVpZ2hib3VyUyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChuZWlnaGJvdXJXICE9IHVuZGVmaW5lZCAmJiAhbmVpZ2hib3VyVy5wb3NpdGlvblVwZGF0ZWQpIHtcclxuICAgICAgICAgICAgbmVpZ2hib3VyVy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKG5laWdoYm91clcuY29vcmRpbmF0ZXMueCAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIG5laWdoYm91clcucm9vbVNpemUgLyAyKSwgbmVpZ2hib3VyVy5jb29yZGluYXRlcy55ICogKF9maXJzdFJvb20ucm9vbVNpemUgLyAyICsgbmVpZ2hib3VyVy5yb29tU2l6ZSAvIDIpLCAtMC4wMSk7XHJcbiAgICAgICAgICAgIG5laWdoYm91clcucG9zaXRpb25VcGRhdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgbW92ZVJvb21Ub1dvcmxkQ29vcmRzKG5laWdoYm91clcpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3dpdGNoUm9vbShfZGlyZWN0aW9uOiBJbnRlcmZhY2VzLklSb29tRXhpdHMpIHtcclxuICAgICAgICBpZiAoR2FtZS5jdXJyZW50Um9vbS5lbmVteUNvdW50TWFuYWdlci5maW5pc2hlZCkge1xyXG4gICAgICAgICAgICBsZXQgbmV3Um9vbTogUm9vbTtcclxuICAgICAgICAgICAgbGV0IG5ld1Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjJcclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ubm9ydGgpIHtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IMaSLlZlY3RvcjIoR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy54LCBHYW1lLmN1cnJlbnRSb29tLmNvb3JkaW5hdGVzLnkgKyAxKSkpO1xyXG4gICAgICAgICAgICAgICAgbmV3UG9zaXRpb24gPSBuZXdSb29tLmdldFNwYXduUG9pbnRTO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLmVhc3QpIHtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IMaSLlZlY3RvcjIoR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy54ICsgMSwgR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy55KSkpO1xyXG4gICAgICAgICAgICAgICAgbmV3UG9zaXRpb24gPSBuZXdSb29tLmdldFNwYXduUG9pbnRXO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5zb3V0aCkge1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbSA9IHJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzLmVxdWFscyhuZXcgxpIuVmVjdG9yMihHYW1lLmN1cnJlbnRSb29tLmNvb3JkaW5hdGVzLngsIEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueSAtIDEpKSk7XHJcbiAgICAgICAgICAgICAgICBuZXdQb3NpdGlvbiA9IG5ld1Jvb20uZ2V0U3Bhd25Qb2ludE47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ud2VzdCkge1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbSA9IHJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzLmVxdWFscyhuZXcgxpIuVmVjdG9yMihHYW1lLmN1cnJlbnRSb29tLmNvb3JkaW5hdGVzLnggLSAxLCBHYW1lLmN1cnJlbnRSb29tLmNvb3JkaW5hdGVzLnkpKSk7XHJcbiAgICAgICAgICAgICAgICBuZXdQb3NpdGlvbiA9IG5ld1Jvb20uZ2V0U3Bhd25Qb2ludEU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG5ld1Jvb20gPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwibm8gcm9vbSBmb3VuZFwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgLy8gR2FtZS5jbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRpb24gPSBuZXdQb3NpdGlvbi50b1ZlY3RvcjMoR2FtZS5jbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRpb24ueik7XHJcblxyXG4gICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ld1Bvc2l0aW9uLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ld1Bvc2l0aW9uLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBhZGRSb29tVG9HcmFwaChuZXdSb29tKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIHJlbW92ZXMgZXJ5dGhpbmcgdW5yZWxpYWJsZSBmcm9tIHRoZSBncnBhaCBhbmQgYWRkcyB0aGUgbmV3IHJvb20gdG8gdGhlIGdyYXBoICwgc2VuZGluZyBpdCB0byB0aGUgY2xpZW50ICYgc3Bhd25zIGVuZW1pZXMgaWYgZXhpc3RpbmcgaW4gcm9vbVxyXG4gICAgICogQHBhcmFtIF9yb29tIHRoZSByb29tIGl0IHNob3VsZCBzcGF3blxyXG4gICAgICovXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gYWRkUm9vbVRvR3JhcGgoX3Jvb206IFJvb20pIHtcclxuICAgICAgICBOZXR3b3JraW5nLnNlbmRSb29tKDxJbnRlcmZhY2VzLklSb29tPnsgY29vcmRpbmF0ZXM6IF9yb29tLmNvb3JkaW5hdGVzLCByb29tU2l6ZTogX3Jvb20ucm9vbVNpemUsIGV4aXRzOiBfcm9vbS5leGl0cywgcm9vbVR5cGU6IF9yb29tLnJvb21UeXBlLCB0cmFuc2xhdGlvbjogX3Jvb20ubXR4TG9jYWwudHJhbnNsYXRpb24gfSk7XHJcblxyXG4gICAgICAgIGxldCBvbGRPYmplY3RzOiBHYW1lLsaSLk5vZGVbXSA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbSA9PiAoKDxhbnk+ZWxlbSkudGFnICE9IFRhZy5UQUcuUExBWUVSKSk7XHJcbiAgICAgICAgb2xkT2JqZWN0cyA9IG9sZE9iamVjdHMuZmlsdGVyKGVsZW0gPT4gKCg8YW55PmVsZW0pLnRhZyAhPSBUYWcuVEFHLlVJKSk7XHJcblxyXG4gICAgICAgIG9sZE9iamVjdHMuZm9yRWFjaCgoZWxlbSkgPT4ge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKGVsZW0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKF9yb29tKTtcclxuICAgICAgICBHYW1lLnZpZXdwb3J0LmNhbGN1bGF0ZVRyYW5zZm9ybXMoKTtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIF9yb29tLm9uQWRkVG9HcmFwaCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgX3Jvb20ud2FsbHMuZm9yRWFjaCh3YWxsID0+IHtcclxuICAgICAgICAgICAgd2FsbC5zZXRDb2xsaWRlcigpO1xyXG4gICAgICAgICAgICBpZiAod2FsbC5kb29yICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgd2FsbC5kb29yLnNldENvbGxpZGVyKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBHYW1lLmN1cnJlbnRSb29tID0gX3Jvb207XHJcbiAgICAgICAgRW5lbXlTcGF3bmVyLnNwYXduTXVsdGlwbGVFbmVtaWVzQXRSb29tKEdhbWUuY3VycmVudFJvb20uZW5lbXlDb3VudE1hbmFnZXIuZ2V0TWF4RW5lbXlDb3VudCwgR2FtZS5jdXJyZW50Um9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW50aXR5IHtcclxuICAgIGV4cG9ydCBsZXQgdHh0U2hhZG93OiBHYW1lLsaSLlRleHR1cmVJbWFnZSA9IG5ldyBHYW1lLsaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGNsYXNzIFNoYWRvdyBleHRlbmRzIEdhbWUuxpIuTm9kZSB7XHJcbiAgICAgICAgcHJpdmF0ZSBtZXNoOiDGki5NZXNoUXVhZCA9IG5ldyDGki5NZXNoUXVhZDtcclxuICAgICAgICBwcml2YXRlIHNoYWRvd01hdHQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwic3RhcnRSb29tTWF0XCIsIMaSLlNoYWRlckxpdFRleHR1cmVkLCBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpLCB0eHRTaGFkb3cpKTtcclxuICAgICAgICBzaGFkb3dQYXJlbnQ6IEdhbWUuxpIuTm9kZTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfcGFyZW50OiBHYW1lLsaSLk5vZGUpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJzaGFkb3dcIik7XHJcbiAgICAgICAgICAgIHRoaXMuc2hhZG93UGFyZW50ID0gX3BhcmVudDtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IEdhbWUuxpIuQ29tcG9uZW50TWVzaCh0aGlzLm1lc2gpKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1hdGVyaWFsOiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLnNoYWRvd01hdHQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWF0ZXJpYWwpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4V29ybGQudHJhbnNsYXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IzKF9wYXJlbnQubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgX3BhcmVudC5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCAtMC4wMSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMoMiwgMiwgMik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGRhdGVTaGFkb3dQb3MoKSB7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMygwLCAwLCB0aGlzLnNoYWRvd1BhcmVudC5tdHhMb2NhbC50cmFuc2xhdGlvbi56Ki0xKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgV2VhcG9ucyB7XHJcbiAgICBleHBvcnQgZW51bSBBSU0ge1xyXG4gICAgICAgIE5PUk1BTCxcclxuICAgICAgICBIT01JTkdcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBXRUFQT05UWVBFIHtcclxuICAgICAgICBSQU5HRURXRUFQT04sXHJcbiAgICAgICAgTUVMRUVXRUFQT04sXHJcbiAgICAgICAgVEhPUlNIQU1NRVJXRUFQT05cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgV2VhcG9uIHtcclxuICAgICAgICBvd25lck5ldElkOiBudW1iZXI7IGdldCBvd25lcigpOiBFbnRpdHkuRW50aXR5IHsgcmV0dXJuIEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gdGhpcy5vd25lck5ldElkKSB9O1xyXG4gICAgICAgIHByb3RlY3RlZCBjb29sZG93bjogQWJpbGl0eS5Db29sZG93bjsgZ2V0IGdldENvb2xEb3duKCkgeyByZXR1cm4gdGhpcy5jb29sZG93biB9O1xyXG4gICAgICAgIHByb3RlY3RlZCBhdHRhY2tDb3VudDogbnVtYmVyOyBnZXQgZ2V0QXR0YWNrQ291bnQoKSB7IHJldHVybiB0aGlzLmF0dGFja0NvdW50IH07XHJcbiAgICAgICAgcHVibGljIGN1cnJlbnRBdHRhY2tDb3VudDogbnVtYmVyO1xyXG4gICAgICAgIGFpbVR5cGU6IEFJTTtcclxuICAgICAgICBidWxsZXRUeXBlOiBCdWxsZXRzLkJVTExFVFRZUEUgPSBCdWxsZXRzLkJVTExFVFRZUEUuU1RBTkRBUkQ7XHJcbiAgICAgICAgcHJvamVjdGlsZUFtb3VudDogbnVtYmVyID0gMTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb2xkb3duVGltZTogbnVtYmVyLCBfYXR0YWNrQ291bnQ6IG51bWJlciwgX2J1bGxldFR5cGU6IEJ1bGxldHMuQlVMTEVUVFlQRSwgX3Byb2plY3RpbGVBbW91bnQ6IG51bWJlciwgX293bmVyTmV0SWQ6IG51bWJlciwgX2FpbVR5cGU6IEFJTSkge1xyXG4gICAgICAgICAgICB0aGlzLmF0dGFja0NvdW50ID0gX2F0dGFja0NvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRhY2tDb3VudCA9IF9hdHRhY2tDb3VudDtcclxuICAgICAgICAgICAgdGhpcy5idWxsZXRUeXBlID0gX2J1bGxldFR5cGU7XHJcbiAgICAgICAgICAgIHRoaXMucHJvamVjdGlsZUFtb3VudCA9IF9wcm9qZWN0aWxlQW1vdW50O1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyTmV0SWQgPSBfb3duZXJOZXRJZDtcclxuICAgICAgICAgICAgdGhpcy5haW1UeXBlID0gX2FpbVR5cGU7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvb2xkb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oX2Nvb2xkb3duVGltZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgYWJzdHJhY3Qgc2hvb3QoX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX3N5bmM6IGJvb2xlYW4sIF9idWxsZXROZXRJZD86IG51bWJlcik6IHZvaWQ7XHJcblxyXG4gICAgICAgIHB1YmxpYyBhYnN0cmFjdCBnZXRUeXBlKCk6IFdFQVBPTlRZUEU7XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBpbmFjY3VyYWN5KF9kaXJlY2l0b246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgX2RpcmVjaXRvbi54ID0gX2RpcmVjaXRvbi54ICsgTWF0aC5yYW5kb20oKSAqIDEwIC8gdGhpcy5vd25lci5hdHRyaWJ1dGVzLmFjY3VyYWN5IC0gTWF0aC5yYW5kb20oKSAqIDEwIC8gdGhpcy5vd25lci5hdHRyaWJ1dGVzLmFjY3VyYWN5O1xyXG4gICAgICAgICAgICBfZGlyZWNpdG9uLnkgPSBfZGlyZWNpdG9uLnkgKyBNYXRoLnJhbmRvbSgpICogMTAgLyB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYWNjdXJhY3kgLSBNYXRoLnJhbmRvbSgpICogMTAgLyB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYWNjdXJhY3k7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZmlyZShfbWFnYXppbmU6IEJ1bGxldHMuQnVsbGV0W10sIF9zeW5jOiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIF9tYWdhemluZS5mb3JFYWNoKGJ1bGxldCA9PiB7XHJcbiAgICAgICAgICAgICAgICBidWxsZXQuc3Bhd24oX3N5bmMpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvL1RPRE86IEJJRyBGVUNLSU5HIENIQU5HRVMuXHJcbiAgICBleHBvcnQgY2xhc3MgUmFuZ2VkV2VhcG9uIGV4dGVuZHMgV2VhcG9uIHtcclxuICAgICAgICBwdWJsaWMgbWFnYXppbjogQnVsbGV0cy5CdWxsZXRbXTsgZ2V0IGdldE1hZ2F6aW4oKTogQnVsbGV0cy5CdWxsZXRbXSB7IHJldHVybiB0aGlzLm1hZ2F6aW4gfTsgc2V0IHNldE1hZ2F6aW4oX21hZ2F6aW46IEJ1bGxldHMuQnVsbGV0W10pIHsgdGhpcy5tYWdhemluID0gX21hZ2F6aW4gfTtcclxuICAgICAgICBwcm90ZWN0ZWQgSXRlbUZ1bmN0aW9uczogRnVuY3Rpb25bXSA9IFtdO1xyXG5cclxuICAgICAgICBwdWJsaWMgc2hvb3QoX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX3N5bmM6IGJvb2xlYW4sIF9idWxsZXROZXRJZD86IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICBsZXQgX3Bvc2l0aW9uOiDGki5WZWN0b3IyID0gdGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgaWYgKF9zeW5jKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QXR0YWNrQ291bnQgPD0gMCAmJiAhdGhpcy5jb29sZG93bi5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dGFja0NvdW50ID0gdGhpcy5hdHRhY2tDb3VudDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRBdHRhY2tDb3VudCA+IDAgJiYgIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24pIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub3duZXIuYXR0cmlidXRlcy5hY2N1cmFjeSA8IDEwMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmluYWNjdXJhY3koX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubWFnYXppbiA9IHRoaXMubG9hZE1hZ2F6aW5lKF9wb3NpdGlvbiwgX2RpcmVjdGlvbiwgdGhpcy5idWxsZXRUeXBlLCBfYnVsbGV0TmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0l0ZW1FZmZlY3RzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VuZE1hZ2F6aW4oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maXJlKHRoaXMubWFnYXppbiwgX3N5bmMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dGFja0NvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEF0dGFja0NvdW50IDw9IDAgJiYgIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb29sZG93bi5zZXRNYXhDb29sRG93biA9IHRoaXMuY29vbGRvd24uZ2V0TWF4Q29vbERvd24gKiB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29vbGRvd24uc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzLm1hZ2F6aW4gPSB0aGlzLmxvYWRNYWdhemluZShfcG9zaXRpb24sIF9kaXJlY3Rpb24sIHRoaXMuYnVsbGV0VHlwZSwgX2J1bGxldE5ldElkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0l0ZW1FZmZlY3RzKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZpcmUodGhpcy5tYWdhemluLCBfc3luYyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgc2VuZE1hZ2F6aW4oKSB7XHJcbiAgICAgICAgICAgIGxldCBidWxsZXRUeXBlOiBCdWxsZXRzLkJVTExFVFRZUEVbXSA9IFtdO1xyXG4gICAgICAgICAgICBsZXQgZGlyZWN0aW9uczogR2FtZS7Gki5WZWN0b3IyW10gPSBbXTtcclxuICAgICAgICAgICAgbGV0IG5ldElkczogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICAgICAgdGhpcy5tYWdhemluLmZvckVhY2goYnVsID0+IHsgYnVsbGV0VHlwZS5wdXNoKGJ1bC50eXBlKTsgZGlyZWN0aW9ucy5wdXNoKGJ1bC5kaXJlY3Rpb24udG9WZWN0b3IyKCkpOyBuZXRJZHMucHVzaChidWwubmV0SWQpOyB9KVxyXG4gICAgICAgICAgICBsZXQgbWFnYXppbnBheWxvYWQgPSA8SW50ZXJmYWNlcy5JTWFnYXppbj57IGJ1bGxldFR5cGVzOiBidWxsZXRUeXBlLCBkaXJlY3Rpb25zOiBkaXJlY3Rpb25zLCBvd25lck5ldElkOiB0aGlzLm93bmVyTmV0SWQsIG5ldElkczogbmV0SWRzIH07XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc2VuZE1hZ2F6aW4obWFnYXppbnBheWxvYWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGZpcmUoX21hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdLCBfc3luYzogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5maXJlKF9tYWdhemluZSwgX3N5bmMpO1xyXG4gICAgICAgICAgICB0aGlzLm1hZ2F6aW4gPSBbXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIGFkZEZ1bmN0aW9uKF9mdW5jOiBGdW5jdGlvbikge1xyXG4gICAgICAgICAgICB0aGlzLkl0ZW1GdW5jdGlvbnMucHVzaChfZnVuYyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZGVsZXRlRnVuY3Rpb24oX2Z1bmM6IEZ1bmN0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMuSXRlbUZ1bmN0aW9ucy5zcGxpY2UodGhpcy5JdGVtRnVuY3Rpb25zLmluZGV4T2YoX2Z1bmMpLCAxKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgcHJvY2Vzc0l0ZW1FZmZlY3RzKCkge1xyXG4gICAgICAgICAgICB0aGlzLkl0ZW1GdW5jdGlvbnMuZm9yRWFjaChmdW5jID0+IHtcclxuICAgICAgICAgICAgICAgIGZ1bmMoKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBsb2FkTWFnYXppbmUoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfYnVsbGV0VHlwZTogQnVsbGV0cy5CVUxMRVRUWVBFLCBfbmV0SWQ/OiBudW1iZXIpOiBCdWxsZXRzLkJ1bGxldFtdIHtcclxuICAgICAgICAgICAgbGV0IG1hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdID0gW107XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5wcm9qZWN0aWxlQW1vdW50OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAodGhpcy5haW1UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBBSU0uTk9STUFMOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWdhemluZS5wdXNoKG5ldyBCdWxsZXRzLkJ1bGxldCh0aGlzLmJ1bGxldFR5cGUsIF9wb3NpdGlvbiwgX2RpcmVjdGlvbiwgdGhpcy5vd25lck5ldElkLCBfbmV0SWQpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEFJTS5IT01JTkc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hZ2F6aW5lLnB1c2gobmV3IEJ1bGxldHMuSG9taW5nQnVsbGV0KHRoaXMuYnVsbGV0VHlwZSwgX3Bvc2l0aW9uLCBfZGlyZWN0aW9uLCB0aGlzLm93bmVyTmV0SWQsIG51bGwsIF9uZXRJZCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbWFnYXppbmU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0VHlwZSgpOiBXRUFQT05UWVBFIHtcclxuICAgICAgICAgICAgcmV0dXJuIFdFQVBPTlRZUEUuUkFOR0VEV0VBUE9OO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIE1lbGVlV2VhcG9uIGV4dGVuZHMgV2VhcG9uIHtcclxuICAgICAgICBwdWJsaWMgc2hvb3QoX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX3N5bmM6IGJvb2xlYW4sIF9idWxsZXROZXRJZD86IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICBsZXQgbmV3UG9zOiBHYW1lLsaSLlZlY3RvcjIgPSB0aGlzLm93bmVyLm10eExvY2FsLnRyYW5zbGF0aW9uLmNsb25lLnRvVmVjdG9yMigpO1xyXG5cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ubWFnbml0dWRlID4gMCkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUoMC41KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbmV3UG9zLmFkZChfZGlyZWN0aW9uLnRvVmVjdG9yMigpKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBzd29yZENvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcihuZXdQb3MsICg8UGxheWVyLk1lbGVlPnRoaXMub3duZXIpLnN3b3JkUmFkaXVzIC8gMiwgdGhpcy5vd25lck5ldElkKTtcclxuXHJcbiAgICAgICAgICAgIEdhbWUuZW5lbWllcy5mb3JFYWNoKGVuZW15ID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChzd29yZENvbGxpZGVyLmNvbGxpZGVzKGVuZW15LmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15LmdldERhbWFnZSh0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRUeXBlKCk6IFdFQVBPTlRZUEUge1xyXG4gICAgICAgICAgICByZXR1cm4gV0VBUE9OVFlQRS5NRUxFRVdFQVBPTjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFRob3JzSGFtbWVyIGV4dGVuZHMgUmFuZ2VkV2VhcG9uIHtcclxuICAgICAgICBwdWJsaWMgd2VhcG9uU3RvcmFnZTogV2VhcG9uO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vbGRvd25UaW1lOiBudW1iZXIsIF9hdHRhY2tDb3VudDogbnVtYmVyLCBfYnVsbGV0VHlwZTogQnVsbGV0cy5CVUxMRVRUWVBFLCBfcHJvamVjdGlsZUFtb3VudDogbnVtYmVyLCBfb3duZXJOZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9jb29sZG93blRpbWUsIF9hdHRhY2tDb3VudCwgX2J1bGxldFR5cGUsIF9wcm9qZWN0aWxlQW1vdW50LCBfb3duZXJOZXRJZCwgQUlNLk5PUk1BTCk7XHJcbiAgICAgICAgICAgIHRoaXMud2VhcG9uU3RvcmFnZSA9ICg8UGxheWVyLlBsYXllcj50aGlzLm93bmVyKS53ZWFwb247XHJcbiAgICAgICAgICAgIHRoaXMuYnVsbGV0VHlwZSA9IEJ1bGxldHMuQlVMTEVUVFlQRS5USE9SU0hBTU1FUjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRUeXBlKCk6IFdFQVBPTlRZUEUge1xyXG4gICAgICAgICAgICByZXR1cm4gV0VBUE9OVFlQRS5USE9SU0hBTU1FUldFQVBPTjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzaG9vdChfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfc3luYzogYm9vbGVhbiwgX2J1bGxldE5ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm93bmVyLml0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IEl0ZW1zLklURU1JRC5USE9SU0hBTU1FUikgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IF9wb3NpdGlvbjogxpIuVmVjdG9yMiA9IHRoaXMub3duZXIubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QXR0YWNrQ291bnQgPD0gMCAmJiAhdGhpcy5jb29sZG93bi5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRhY2tDb3VudCA9IHRoaXMuYXR0YWNrQ291bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRBdHRhY2tDb3VudCA+IDAgJiYgIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tYWdhemluID0gdGhpcy5sb2FkTWFnYXppbmUoX3Bvc2l0aW9uLCBfZGlyZWN0aW9uLCB0aGlzLmJ1bGxldFR5cGUsIF9idWxsZXROZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmlyZSh0aGlzLm1hZ2F6aW4sIF9zeW5jKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0YWNrQ291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEF0dGFja0NvdW50IDw9IDAgJiYgIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29vbGRvd24uc2V0TWF4Q29vbERvd24gPSB0aGlzLmNvb2xkb3duLmdldE1heENvb2xEb3duICogdGhpcy5vd25lci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb29sZG93bi5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbWFnYXppbmU6IEJ1bGxldHMuQnVsbGV0W10gPSB0aGlzLmxvYWRNYWdhemluZShfcG9zaXRpb24sIF9kaXJlY3Rpb24sIHRoaXMuYnVsbGV0VHlwZSwgX2J1bGxldE5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmZpcmUobWFnYXppbmUsIF9zeW5jKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSJdfQ==