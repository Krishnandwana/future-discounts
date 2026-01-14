import React, { useState } from 'react';
import { Button, ButtonGroup, Card, TextContainer, InlineStack } from '@shopify/polaris';

function RichTextEditor() {
  const [content, setContent] = useState('');

  // Function to handle text formatting commands
  const applyFormat = (command) => {
    document.execCommand(command, false, null);
  };

  // Handle the change event
  const handleChange = (e) => {
    setContent(e.target.innerHTML);
  };

  return (
    <Card title="Custom Rich Text Editor" sectioned>
      <TextContainer>
        {/* Toolbar for formatting options */}
        <InlineStack spacing="tight" align="center">
          <ButtonGroup segmented>
            <Button onClick={() => applyFormat('bold')}><b>B</b></Button>
            <Button onClick={() => applyFormat('italic')}><i>I</i></Button>
            <Button onClick={() => applyFormat('underline')}><u>U</u></Button>
            <Button onClick={() => applyFormat('strikethrough')}><s>S</s></Button>
          </ButtonGroup>
        </InlineStack>

        {/* Contenteditable div for text input */}
        
        <div
          contentEditable
          suppressContentEditableWarning
          style={{
            border: '1px solid #c4cdd5',
            minHeight: '200px',
            marginTop: '10px',
            padding: '10px',
            borderRadius: '4px'
          }}
          onInput={handleChange}
          dangerouslySetInnerHTML={{ __html: content }} // Render the formatted content
        />
      </TextContainer>
    </Card>
  );
}

export default RichTextEditor;
