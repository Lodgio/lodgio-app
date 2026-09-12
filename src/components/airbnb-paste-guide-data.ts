export const airbnbGuideSteps = [
  {
    title: "Open Messages, then settings",
    detail: "In Airbnb, go to Messages and click the gear next to search.",
    src: "/welcome/airbnb/01-messages.png",
    alt: "Airbnb Messages with the settings gear highlighted",
  },
  {
    title: "Open Manage quick replies",
    detail: "That’s where Airbnb keeps automatic guest templates.",
    src: "/welcome/airbnb/02-manage-quick-replies.png",
    alt: "Airbnb Messaging settings with Manage quick replies highlighted",
  },
  {
    title: "Open Booking confirmation",
    detail: "Use this template, or create one if you don’t have it yet.",
    src: "/welcome/airbnb/03-booking-confirmation.png",
    alt: "Airbnb quick replies list with Booking confirmation highlighted",
  },
  {
    title: "Paste your Lodgio check-in link",
    detail: "Put the link from above in the message. Keep the Guest first name shortcode.",
    src: "/welcome/airbnb/04-paste-link.png",
    alt: "Airbnb template editor with the Lodgio check-in link highlighted",
  },
  {
    title: "Set the notification time",
    detail: "Choose 5 minutes after a guest books, or a custom time. Don’t leave it unscheduled.",
    src: "/welcome/airbnb/05-schedule.png",
    alt: "Airbnb schedule dialog with 5 minutes after a guest books selected",
  },
] as const;

export const airbnbGuideImages = airbnbGuideSteps.map((step) => step.src);
