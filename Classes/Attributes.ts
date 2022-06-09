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
        private scale: number; get getScale(): number { return this.scale };
        accuracy: number = 80;

        protected readonly baseMaxHealthPoints: number;
        protected readonly baseHealthPoints: number;
        protected readonly baseAttackPoints: number;
        protected readonly baseSpeed: number;
        protected readonly baseKnockbackForce: number;


        constructor(_healthPoints: number, _attackPoints: number, _speed: number, _scale: number, _knockbackForce: number, _armor: number, _cooldownReduction: number, _accuracy: number) {
            this.scale = _scale;
            this.armor = Calculation.clampNumber(this.newGameFactor(_armor), 0, 99);
            this.healthPoints = this.newGameFactor(_healthPoints);
            this.maxHealthPoints = this.healthPoints;
            this.attackPoints = this.newGameFactor(_attackPoints);
            this.speed = _speed;
            this.knockbackForce = _knockbackForce
            this.coolDownReduction = _cooldownReduction;
            this.accuracy = _accuracy;

            this.baseHealthPoints = this.healthPoints;
            this.baseMaxHealthPoints = this.healthPoints;
            this.baseAttackPoints = this.attackPoints;
            this.baseSpeed = this.speed;
            this.baseKnockbackForce = this.knockbackForce;
        }

        public updateScaleDependencies(_newScale: number) {
            if (_newScale == this.scale) {
                return;
            }
            if (_newScale > this.scale) {
                this.maxHealthPoints = Math.round(this.baseMaxHealthPoints * (100 + (10 * _newScale)) / 100);
                this.healthPoints = Math.round(this.healthPoints * (100 + (10 * _newScale)) / 100);
                this.attackPoints = Math.round(this.baseAttackPoints * _newScale);
                this.speed = Math.fround(this.baseSpeed / _newScale);
                this.knockbackForce = this.baseKnockbackForce * (100 + (10 * _newScale)) / 100;
            } else {
                let amountMaxHealthPoints = (Math.round(this.baseMaxHealthPoints * (100 + (10 * this.scale)) / 100)) - (Math.round(this.baseMaxHealthPoints * (100 + (10 * _newScale)) / 100));
                let amountHealthPoints = (Math.round(this.baseHealthPoints * (100 + (10 * this.scale)) / 100)) - (Math.round(this.baseHealthPoints * (100 + (10 * _newScale)) / 100));
                let amountAttackPoints = (Math.round(this.baseAttackPoints * this.scale)) - (Math.round(this.baseAttackPoints * _newScale));
                let amountSpeed = (Math.fround(this.baseSpeed / this.scale)) - (Math.fround(this.baseSpeed / _newScale));
                this.maxHealthPoints -= amountMaxHealthPoints;
                this.healthPoints -= amountHealthPoints;
                this.attackPoints -= amountAttackPoints;
                this.speed -= amountSpeed;
            }
            this.scale = _newScale;
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