/**
 * badgeMessages.js
 *
 * A pool of celebratory message variations shown when the user earns a badge.
 * getRandomBadgeMessage(badgeName) picks one at random and fills in the name.
 *
 * Add/edit lines freely — just keep the {badgeName} placeholder in each one.
 */

const BADGE_MESSAGES = [
  "Hello there, stair superstar. You just earned the {badgeName} badge!",
  "Step it up! You've unlocked the {badgeName} badge.",
  "You're on a roll — the {badgeName} badge is officially yours.",
  "Another flight conquered. {badgeName} badge unlocked!",
  "Look at you go! You've earned the {badgeName} badge.",
  "You've climbed your way to the {badgeName} badge.",
  "Legend status: {badgeName} is now in your collection.",
  "Ding! Achievement unlocked: {badgeName}.",
];

export function getRandomBadgeMessage(badgeName) {
  const template = BADGE_MESSAGES[Math.floor(Math.random() * BADGE_MESSAGES.length)];
  return template.replace('{badgeName}', badgeName);
}

export default BADGE_MESSAGES;
