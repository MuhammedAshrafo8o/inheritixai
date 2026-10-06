import * as migration_20261002_013702_milestone_two_schema from './20261002_013702_milestone_two_schema';
import * as migration_20261002_022010_home_story_card_source from './20261002_022010_home_story_card_source';
import * as migration_20261002_083916_content_controls from './20261002_083916_content_controls';
import * as migration_20261002_093640_localized_visibility_controls from './20261002_093640_localized_visibility_controls';
import * as migration_20261004_194318_milestone_three_inquiries from './20261004_194318_milestone_three_inquiries';
import * as migration_20261004_200248_inquiry_notification_history from './20261004_200248_inquiry_notification_history';

export const migrations = [
  {
    up: migration_20261002_013702_milestone_two_schema.up,
    down: migration_20261002_013702_milestone_two_schema.down,
    name: '20261002_013702_milestone_two_schema',
  },
  {
    up: migration_20261002_022010_home_story_card_source.up,
    down: migration_20261002_022010_home_story_card_source.down,
    name: '20261002_022010_home_story_card_source',
  },
  {
    up: migration_20261002_083916_content_controls.up,
    down: migration_20261002_083916_content_controls.down,
    name: '20261002_083916_content_controls',
  },
  {
    up: migration_20261002_093640_localized_visibility_controls.up,
    down: migration_20261002_093640_localized_visibility_controls.down,
    name: '20261002_093640_localized_visibility_controls',
  },
  {
    up: migration_20261004_194318_milestone_three_inquiries.up,
    down: migration_20261004_194318_milestone_three_inquiries.down,
    name: '20261004_194318_milestone_three_inquiries',
  },
  {
    up: migration_20261004_200248_inquiry_notification_history.up,
    down: migration_20261004_200248_inquiry_notification_history.down,
    name: '20261004_200248_inquiry_notification_history',
  },
];
