import { useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { Modal, TextContainer, TextField, Button, Text } from '@shopify/polaris';
import { sendToSlack } from '../utils/slackLogger';

function FeedbackPopup({ shopName }) {
  const { slackWebhookUrl } = useLoaderData();

  const [usageCount, setUsageCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFeedbackStage, setIsFeedbackStage] = useState(false);
  const [isReviewRequestStage, setIsReviewRequestStage] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [userSaidNo, setUserSaidNo] = useState(false);

  useEffect(() => {
    const storedCount = parseInt(localStorage.getItem('appUsageCount') || '0', 10);
    const storedNoResponse = JSON.parse(localStorage.getItem('userSaidNo') || 'false');
    const storedReviewLater = JSON.parse(localStorage.getItem('reviewLater') || 'false');

    const updatedCount = storedCount + 1;
    localStorage.setItem('appUsageCount', updatedCount);
    setUsageCount(updatedCount);

    if (storedNoResponse) {
      setUserSaidNo(true);
    }

    if (
      (!storedNoResponse && updatedCount === 8) ||    // make 8  when in prod
      (storedNoResponse && updatedCount % 100 === 0) ||  //make 100 when in prod
      (storedReviewLater && updatedCount % 50 === 0)  //make 50 when in prod
    ) {
      setIsModalOpen(true);
    }
  }, []);

  const handleResponse = async (response) => {
    if (response === 'yes') {
      setIsReviewRequestStage(true); // Switch to review request stage
    } else {
      localStorage.setItem('userSaidNo', JSON.stringify(true));
      setUserSaidNo(true);
      setIsFeedbackStage(true); // Switch to feedback stage
    }
  };

  const handleReviewRequestResponse = async (response) => {
    if (response === 'yes') {
      // Redirect to review page
      window.open(
        'https://apps.shopify.com/geo-deals#modal-show=WriteReviewModal&st_campaign=rate-app&st_source=admin-web&utm_campaign=installed&utm_source=shopify',
        '_blank'
      );
      // Send review decision to Slack
      await sendToSlack(
        'User chose to review the app.',
        slackWebhookUrl,
        { shopName }
      );
      setIsModalOpen(false);
    } else if (response === 'later') {
      localStorage.setItem('reviewLater', JSON.stringify(true));
      alert("We'll remind you after a while. Thank you!");
      // Send review decision to Slack
      await sendToSlack(
        'User chose to review later.',
        slackWebhookUrl,
        { shopName }
      );
      setIsModalOpen(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    const feedbackMessage = `📝 *User Feedback:* \n\`\`\`${feedback}\`\`\``;

    try {
      await sendToSlack(feedbackMessage, slackWebhookUrl, { shopName, feedback });
      alert("Thank you for your feedback! We will work on improving.");
    } catch (error) {
      console.error("Failed to send feedback to Slack:", error);
      alert("Failed to submit feedback. Please try again later.");
    } finally {
      setIsModalOpen(false);
    }
  };

  return (
    <Modal
      open={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      title={
        isReviewRequestStage
          ? 'Can you please review us? It helps us.'
          : isFeedbackStage
          ? 'What do you think we should improve?'
          : 'Do you like our app?'
      }
      primaryAction={{
        content: isReviewRequestStage
          ? 'Yes, I’ll review'
          : isFeedbackStage
          ? 'Submit'
          : 'Yes',
        onAction: isReviewRequestStage
          ? () => handleReviewRequestResponse('yes')
          : isFeedbackStage
          ? handleFeedbackSubmit
          : () => handleResponse('yes'),
      }}
      secondaryActions={
        isReviewRequestStage
          ? [
              {
                content: 'Maybe later',
                onAction: () => handleReviewRequestResponse('later'),
              },
            ]
          : isFeedbackStage
          ? []
          : [
              {
                content: 'No',
                onAction: () => handleResponse('no'),
              },
            ]
      }
    >
      <Modal.Section>
        <TextContainer>
          {isReviewRequestStage ? (
            <p>We would really appreciate it if you could leave a review. It helps us improve and grow!</p>
          ) : isFeedbackStage ? (
            <>
              <TextField
                label="Your Feedback"
                value={feedback}
                onChange={(value) => setFeedback(value)}
                multiline
                placeholder="Let us know what we can improve."
              />
            </>
          ) : (
            <p>Your feedback matters to us. Please let us know if you like using our app.</p>
          )}
        </TextContainer>
      </Modal.Section>
    </Modal>
  );
}

export default FeedbackPopup;