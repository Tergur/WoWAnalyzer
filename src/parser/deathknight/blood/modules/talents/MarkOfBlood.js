import React from 'react';
import Analyzer from 'parser/core/Analyzer';
import Enemies from 'parser/shared/modules/Enemies';
import SPELLS from 'common/SPELLS/index';
import SpellLink from 'common/SpellLink';
import { formatPercentage } from 'common/format';
import TalentStatisticBox from 'interface/others/TalentStatisticBox';
import STATISTIC_ORDER from 'interface/others/STATISTIC_ORDER';

class MarkOfBlood extends Analyzer {
  static dependencies = {
    enemies: Enemies,
  };

  constructor(...args) {
    super(...args);
    this.active = this.selectedCombatant.hasTalent(SPELLS.MARK_OF_BLOOD_TALENT.id);
  }

  get uptime() {
    return this.enemies.getBuffUptime(SPELLS.MARK_OF_BLOOD_TALENT.id) / this.owner.fightDuration;
  }

  get uptimeSuggestionThresholds() {
    return {
      actual: this.uptime,
      isLessThan: {
        minor: 0.95,
        average: 0.9,
        major: .8,
      },
      style: 'percentage',
    };
  }

  suggestions(when) {
    when(this.uptimeSuggestionThresholds)
        .addSuggestion((suggest, actual, recommended) => {
          return suggest(<>Your <SpellLink id={SPELLS.MARK_OF_BLOOD_TALENT.id} /> uptime can be improved.</>)
            .icon(SPELLS.MARK_OF_BLOOD_TALENT.icon)
            .actual(`${formatPercentage(actual)}% Mark Of Blood Uptime`)
            .recommended(`>${formatPercentage(recommended)}% is recommended`);
        });
  }

  statistic() {
    return (
      <TalentStatisticBox
        talent={SPELLS.MARK_OF_BLOOD_TALENT.id}
        position={STATISTIC_ORDER.OPTIONAL(6)}
        value={`${formatPercentage(this.uptime)} %`}
        label="Mark Of Blood Uptime"
      />
    );
  }
}

export default MarkOfBlood;
