import React from 'react';
import Analyzer from 'parser/core/Analyzer';
import StatisticBox from 'interface/others/StatisticBox';
import SpellIcon from 'common/SpellIcon';
import SPELLS from 'common/SPELLS';
import HIT_TYPES from 'game/HIT_TYPES';
import { formatPercentage } from 'common/format';
import OneVariableBinomialChart from 'interface/others/charts/OneVariableBinomialChart';
import Abilities from '../Abilities';

const BASE_PROC_CHANCE = 0.15;
const FA_PROC_CHANCE = 0.1;
const IV_PROC_CHANCE = 0.05;

class GrandCrusader extends Analyzer {
  static dependencies = {
    abilities: Abilities,
  }
  _totalResets = 0;
  _exactResets = 0;
  _inferredResets = 0;
  _resetChances = 0;

  _hasIV = false;
  _hasFA = false;

  constructor(...args) {
    super(...args);
    this._hasIV = this.selectedCombatant.hasTrait(SPELLS.INSPIRING_VANGUARD.id);
    this._hasFA = this.selectedCombatant.hasTalent(SPELLS.FIRST_AVENGER_TALENT.id);
  }

  get procChance() {
    let chance = BASE_PROC_CHANCE;
    if(this._hasIV) {
      chance += IV_PROC_CHANCE;
    }
    if(this._hasFA) {
      chance += FA_PROC_CHANCE;
    }

    return chance;
  }

  _lastResetSource = null;

  on_byPlayer_cast(event) {
    if(![SPELLS.HAMMER_OF_THE_RIGHTEOUS.id, SPELLS.BLESSED_HAMMER_TALENT.id].includes(event.ability.guid)) {
      return;
    }
    this._resetChances += 1;
    this._lastResetSource = event;
  }

  on_toPlayer_damage(event) {
    if (![HIT_TYPES.DODGE, HIT_TYPES.PARRY].includes(event.hitType)) {
      return;
    }
    this._resetChances += 1;
    this._lastResetSource = event;
  }

  triggerExactReset(spellUsable) {
    this._totalResets += 1;
    this._exactResets += 1;
    this.resetCooldowns(spellUsable);
  }

  triggerInferredReset(spellUsable, event) {
    if(this._hasIV) {
      console.warn('Inferred reset with IV. Not actually resetting. This shouldn\'t happen.', event.ability.name, event);
      return;
    }
    this._totalResets += 1;
    this._inferredResets += 1;
    this.resetCooldowns(spellUsable);
  }

  resetCooldowns(spellUsable, event) {
    // reset AS cd
    if(spellUsable.isOnCooldown(SPELLS.AVENGERS_SHIELD.id)) {
      spellUsable.endCooldown(SPELLS.AVENGERS_SHIELD.id, false, this._lastResetSource.timestamp, 0);
    }

    // reset Judgment CD if the CJ talent is selected
    if(this.selectedCombatant.hasTalent(SPELLS.CRUSADERS_JUDGMENT_TALENT.id) && spellUsable.isOnCooldown(SPELLS.JUDGMENT_CAST_PROTECTION.id)) {
      // get haste as of last reset source. fingers crossed that it
      // isn't too far off
      const ecd = this.abilities.getExpectedCooldownDuration(SPELLS.JUDGMENT_CAST_PROTECTION.id, this._lastResetSource);
      spellUsable.reduceCooldown(SPELLS.JUDGMENT_CAST_PROTECTION.id, ecd, this._lastResetSource.timestamp);
    }
  }

  get plot() {
    // stolen from BrM code

    // not the most efficient, but close enough and pretty safe
    function binom(n, k) {
      if(k > n) {
        return null;
      }
      if(k === 0) {
        return 1;
      }

      return n / k * binom(n-1, k-1);
    }

    // pmf of the binomial distribution with n = _resetChances and
    // p = procChance
    const resetProb = (i) => binom(this._resetChances, i) * Math.pow(this.procChance, i) * Math.pow(1 - this.procChance, this._resetChances - i);

    // probability of having exactly k resets of the n chances
    const resetProbabilities = Array.from({length: this._resetChances}, (_x, i) => {
      return { x: i, y: resetProb(i) };
    });

    const actualReset = {
      x: this._totalResets,
      y: resetProb(this._totalResets),
    };

    return (
      <OneVariableBinomialChart
        probabilities={resetProbabilities}
        actualEvent={actualReset}
        xAxis={{
          title: 'Reset %',
          tickFormat: (value) => `${formatPercentage(value / this._resetChances, 0)}%`,
          style: {
            fill: 'white',
          },
        }}
        yAxis={{
          title: 'Likelihood',
          tickFormat: (value) => `${formatPercentage(value, 0)}%`,
          style: {
            fill: 'white',
          },
        }}
        tooltip={(point) => `Actual Resets: ${formatPercentage(point.x / this._resetChances, 2)}%`}
        yDomain={[0, 0.2]}
      />
    );
  }

  statistic() {
    return (
      <StatisticBox
        icon={<SpellIcon id={SPELLS.GRAND_CRUSADER.id} />}
        value={`${this._totalResets} Resets`}
        label="Grand Crusader"
        tooltip={(
          <>
            Grand Crusader reset the cooldown of Avenger's Shield at least {this._totalResets} times. {this._inferredResets} are inferred from using it before its cooldown normally be up.<br />
            You had {this._resetChances} chances for Grand Crusader to trigger with a {formatPercentage(this.procChance, 0)}% chance to trigger.
          </>
        )}
      >
        <div style={{padding: '8px'}}>
          {this.plot}
          <p>Likelihood of having <em>exactly</em> as many resets as you did with your traits and talents.</p>
        </div>
      </StatisticBox>
    );
  }
}

export default GrandCrusader;
