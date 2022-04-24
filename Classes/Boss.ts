namespace Enemy {
    export class Summonor extends EnemyDumb {
        summonChance: number = 5;
        summonCooldown: number = 120;
        summonCurrentCooldown: number = 0;

        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _position: ƒ.Vector2, _netId?: number) {
            super(_id, _attributes, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.translation.x / 2);
        }

        update(): void {
            super.update();
        }

        cooldown(): void {
            if (this.summonCurrentCooldown > 0) {
                this.summonCurrentCooldown--;
            }
        }

        behaviour() {
            this.cooldown();

            let target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
            let distance = ƒ.Vector3.DIFFERENCE(target, this.cmpTransform.mtxLocal.translation).magnitude;

            if (distance < 5) {
                this.currentBehaviour = Entity.BEHAVIOUR.FLEE;
            }
            else {
                if (this.summonCurrentCooldown <= 0) {
                    let nextState = Math.round(Math.random() * 100);

                    if (nextState <= this.summonChance) {
                        this.currentBehaviour = Entity.BEHAVIOUR.SUMMON;
                        this.summonCurrentCooldown = this.summonCooldown;
                    }
                } else {
                    this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
                }
            }
        }

        moveBehaviour() {
            this.behaviour();

            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.IDLE:
                    // this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    // this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    console.log(this.mtxLocal.translation);
                    this.moveDirection = this.moveAway(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
                    console.log(this.moveDirection);
                    break;
                case Entity.BEHAVIOUR.SUMMON:
                    // this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);
                    this.summon();
                    break;
                default:
                    // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                    break;
            }
        }

        summon() {
            let target = Math.round(Math.random());
            if (target > 0) {
                EnemySpawner.spawnByID(SummonorAdds, Entity.ID.SMALLTICK, this.mtxLocal.translation.toVector2(), null, Game.avatar1);
            } else {
                EnemySpawner.spawnByID(SummonorAdds, Entity.ID.SMALLTICK, this.mtxLocal.translation.toVector2(), null, Game.avatar2);
            }
        }
    }
}