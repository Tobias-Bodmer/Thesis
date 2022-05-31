namespace Entity {

    export enum ATTRIBUTETYPE {
        HEALTHPOINTS,
        MAXHEALTHPOINTS,
        KNOCKBACKFORCE,
        HITABLE,
        ARMOR,
        SPEED,
        ATTACKPOINTS,
        COOLDOWNREDUCTION,
        SCALE
    }
    export class Attributes {

        healthPoints: number;
        maxHealthPoints: number;
        knockbackForce: number;
        hitable: boolean = true;
        armor: number;
        speed: number;
        attackPoints: number;
        coolDownReduction: number = 1;
        scale: number;
        accuracy: number = 80;


        constructor(_healthPoints: number, _attackPoints: number, _speed: number, _scale: number, _knockbackForce: number, _armor: number, _cooldownReduction: number, _accuracy: number) {
            this.scale = _scale;
            this.armor = this.newGameFactor(_armor);
            this.healthPoints = this.newGameFactor(_healthPoints);
            this.maxHealthPoints = this.healthPoints;
            this.attackPoints = this.newGameFactor(_attackPoints);
            this.speed = _speed;
            this.knockbackForce = _knockbackForce
            this.coolDownReduction = _cooldownReduction;
            this.accuracy = _accuracy;
        }

        public updateScaleDependencies() {
            this.maxHealthPoints = Math.round(this.maxHealthPoints * (100 + (10 * this.scale)) / 100);
            this.healthPoints = Math.round(this.healthPoints * (100 + (10 * this.scale)) / 100);
            this.attackPoints = Math.round(this.attackPoints * this.scale);
            this.speed = Math.fround(this.speed / this.scale);
            this.knockbackForce = this.knockbackForce * (100 + (10 * this.scale)) / 100;
        }

        private newGameFactor(_value: number): number {
            let amount = 1.5;
            for (let i = 0; i < Game.newGamePlus; i++) {
                _value *= amount;
            }
            return _value;
        }
    }
}