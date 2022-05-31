namespace EnemySpawner {
    let spawnTime: number = 0 * 60;
    let currentTime: number = spawnTime;

    export function spawnMultipleEnemiesAtRoom(_maxEnemies: number, _roomPos: Game.ƒ.Vector2): void {
        if (Networking.client.idHost == Networking.client.id) {
            //TODO: depending on currentroom.enemyCount and decrease it 
            let spawnedEnemies: number = 0;
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

    //TODO: make fresh
    function getRandomEnemyId(): number {
        let random = Math.round(Math.random() * Object.keys(Entity.ID).length / 2);
        if (random <= 2) {
            return getRandomEnemyId();
        }
        else {
            console.log(random);
            return random;
        }
    }

    export function spawnByID(_enemyClass: Enemy.ENEMYCLASS, _id: Entity.ID, _position: ƒ.Vector2, _target?: Player.Player, _netID?: number) {
        let enemy: Enemy.Enemy;
        switch (_enemyClass) {
            case Enemy.ENEMYCLASS.ENEMYDASH:
                enemy = new Enemy.EnemyDash(_id, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.ENEMYDUMB:
                enemy = new Enemy.EnemyDumb(_id, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.ENEMYPATROL:
                enemy = new Enemy.EnemyPatrol(_id, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.ENEMYSMASH:
                enemy = new Enemy.EnemySmash(_id, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.SUMMONORADDS:
                enemy = new Enemy.SummonorAdds(_id, _position, _target, _netID);
                break;
            case Enemy.ENEMYCLASS.SUMMONOR:
                enemy = new Enemy.Summonor(_id, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.BIGBOOM:
                enemy = new Enemy.BigBoom(_id, _position, _netID);
                break;
            case Enemy.ENEMYCLASS.ENEMYCIRCLE:
                enemy = new Enemy.EnemyCircle(_id, _position, _netID);
            default:
                break;
        }
        if (enemy != null) {
            Game.graph.addChild(enemy);
            Networking.spawnEnemy(_enemyClass, enemy, enemy.netId);
        }
    }

    export function networkSpawnById(_enemyClass: Enemy.ENEMYCLASS, _id: Entity.ID, _position: ƒ.Vector2, _netID: number, _target?: number) {
        if (_target != null) {
            if (Game.avatar1.netId == _target) {
                spawnByID(_enemyClass, _id, _position, Game.avatar1, _netID);
            } else {
                spawnByID(_enemyClass, _id, _position, Game.avatar2, _netID);
            }
        } else {
            spawnByID(_enemyClass, _id, _position, null, _netID);
        }
    }

}