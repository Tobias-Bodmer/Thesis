namespace EnemySpawner {
    let spawnTime: number = 0 * 60;
    let currentTime: number = spawnTime;

    export function spawnMultipleEnemiesAtRoom(_maxEnemies: number, _roomPos: Game.ƒ.Vector2, _enemyClass?: Enemy.ENEMYCLASS): void {
        if (Networking.client.idHost == Networking.client.id) {
            let spawnedEnemies: number = 0;
            while (spawnedEnemies < _maxEnemies) {
                if (currentTime == spawnTime) {
                    let position = new ƒ.Vector2(((Math.random() * Game.currentRoom.roomSize / 2) - ((Math.random() * Game.currentRoom.roomSize / 2))), ((Math.random() * Game.currentRoom.roomSize / 2) - ((Math.random() * Game.currentRoom.roomSize / 2))));
                    position.add(_roomPos);
                    if (_enemyClass == undefined) {
                        getRandomEnemy(position);
                    } else {
                        spawnByID(_enemyClass, position);
                    }
                    spawnedEnemies++;
                }
                currentTime--;
                if (currentTime <= 0) {
                    currentTime = spawnTime;
                }
            }
        }
    }

    function getRandomEnemy(_position: ƒ.Vector2): void {
        let enemyClass: number = Math.round(Math.random() * ((Object.keys(Enemy.ENEMYCLASS).length / 2) - 1));

        if (enemyClass == undefined || enemyClass == Enemy.ENEMYCLASS.BIGBOOM || enemyClass == Enemy.ENEMYCLASS.SUMMONER ||
            enemyClass == Enemy.ENEMYCLASS.SUMMONORADDS || enemyClass == Enemy.ENEMYCLASS.ENEMYSMASH ||
            enemyClass == Enemy.ENEMYCLASS.ENEMYPATROL) {
            getRandomEnemy(_position);
            return;
        }

        spawnByID(enemyClass, _position);
    }

    export function spawnByID(_enemyClass: Enemy.ENEMYCLASS, _position: ƒ.Vector2, _target?: Player.Player, _netID?: number) {
        if (Game.currentRoom.enemyCountManager.finished) {
            return;
        }
        console.log("spawned enemy " + Enemy.ENEMYCLASS[_enemyClass].toString());

        let enemy: Enemy.Enemy;
        switch (_enemyClass) {
            case Enemy.ENEMYCLASS.ENEMYDASH:
                enemy = new Enemy.EnemyDash(Entity.ID.REDTICK, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.ENEMYDUMB:
                enemy = new Enemy.EnemyDumb(Entity.ID.SMALLTICK, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.ENEMYSHOOT:
                enemy = new Enemy.EnemyShoot(Entity.ID.SKELETON, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.ENEMYSMASH:
                enemy = new Enemy.EnemySmash(Entity.ID.OGER, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.SUMMONORADDS:
                enemy = new Enemy.SummonorAdds(Entity.ID.BAT, _position, _target, _netID);
                break;
            case Enemy.ENEMYCLASS.SUMMONER:
                enemy = new Enemy.Summonor(Entity.ID.SUMMONER, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.BIGBOOM:
                enemy = new Enemy.BigBoom(Entity.ID.BIGBOOM, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.ENEMYCIRCLE:
                enemy = new Enemy.EnemyCircle(Entity.ID.BAT, _position, _netID);
            default:
                break;
        }
        if (enemy != null) {
            Game.graph.addChild(enemy);
            Networking.spawnEnemy(_enemyClass, enemy, enemy.netId);

            if (Game.currentRoom.roomType == Generation.ROOMTYPE.BOSS && (<Generation.BossRoom>Game.currentRoom).boss == undefined) {
                if (_enemyClass == Enemy.ENEMYCLASS.BIGBOOM || _enemyClass == Enemy.ENEMYCLASS.SUMMONER) {
                    console.log((<Generation.BossRoom>Game.currentRoom).boss);
                    (<Generation.BossRoom>Game.currentRoom).boss = enemy;
                    console.log((<Generation.BossRoom>Game.currentRoom).boss);
                }
            }
        }
    }

    export function networkSpawnById(_enemyClass: Enemy.ENEMYCLASS, _id: Entity.ID, _position: ƒ.Vector2, _netID: number, _target?: number) {
        if (_target != null) {
            if (Game.avatar1.netId == _target) {
                spawnByID(_enemyClass, _position, Game.avatar1, _netID);
            } else {
                spawnByID(_enemyClass, _position, Game.avatar2, _netID);
            }
        } else {
            spawnByID(_enemyClass, _position, null, _netID);
        }
    }

}