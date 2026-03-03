const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();

function readWorkflow(fileName) {
  const fullPath = path.join(ROOT, fileName);
  return {
    fullPath,
    data: JSON.parse(fs.readFileSync(fullPath, 'utf8')),
  };
}

function writeWorkflow(fullPath, data) {
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
}

function newId() {
  return crypto.randomUUID();
}

function hasNode(workflow, nodeName) {
  return workflow.nodes.some((node) => node.name === nodeName);
}

function addNode(workflow, node) {
  if (!hasNode(workflow, node.name)) {
    workflow.nodes.push(node);
  }
}

function ensureMainConnection(workflow, sourceName, outputIndex, targetName, inputIndex = 0) {
  if (!workflow.connections[sourceName]) {
    workflow.connections[sourceName] = { main: [] };
  }

  if (!workflow.connections[sourceName].main) {
    workflow.connections[sourceName].main = [];
  }

  while (workflow.connections[sourceName].main.length <= outputIndex) {
    workflow.connections[sourceName].main.push([]);
  }

  if (!workflow.connections[sourceName].main[outputIndex]) {
    workflow.connections[sourceName].main[outputIndex] = [];
  }

  const alreadyConnected = workflow.connections[sourceName].main[outputIndex].some(
    (conn) => conn.node === targetName && conn.type === 'main' && conn.index === inputIndex,
  );

  if (!alreadyConnected) {
    workflow.connections[sourceName].main[outputIndex].push({
      node: targetName,
      type: 'main',
      index: inputIndex,
    });
  }
}

function makeAnalyticsHttpNode(name, position) {
  return {
    parameters: {
      method: 'POST',
      url: "={{ $env.ANALYTICS_INGEST_URL || 'http://localhost:8000/events' }}",
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ $json }}',
      options: {},
    },
    id: newId(),
    name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position,
    continueOnFail: true,
  };
}

function makeSetNode(name, position, assignments) {
  return {
    parameters: {
      assignments: {
        assignments,
      },
      options: {},
    },
    id: newId(),
    name,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position,
  };
}

function makeIfNode(name, position, leftValue, operatorType, operatorOperation, rightValue = null, version = 2) {
  const condition = {
    id: newId(),
    leftValue,
    operator: {
      type: operatorType,
      operation: operatorOperation,
      ...(operatorType === 'boolean' ? { singleValue: true } : {}),
    },
  };

  if (rightValue !== null) {
    condition.rightValue = rightValue;
  }

  return {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version,
        },
        conditions: [condition],
        combinator: 'and',
      },
      options: {},
    },
    id: newId(),
    name,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position,
  };
}

function makeStickyNode(name, position, content) {
  return {
    parameters: {
      content,
      height: 240,
      width: 560,
    },
    id: newId(),
    name,
    type: 'n8n-nodes-base.stickyNote',
    typeVersion: 1,
    position,
  };
}

function instrumentW1() {
  const { fullPath, data } = readWorkflow('W1_ AI Agent.json');

  addNode(
    data,
    makeStickyNode(
      'Sticky: Analytics Instrumentation',
      [-1120, 1600],
      '## Analytics Tracking\nThis branch sends non-blocking analytics events to an external API.\nMain support behavior is unchanged.',
    ),
  );

  addNode(
    data,
    makeIfNode(
      'Analytics IF: Incoming?',
      [-960, 1840],
      "={{ ($json.message_type || '').toString() }}",
      'string',
      'equals',
      'incoming',
      3,
    ),
  );

  addNode(
    data,
    makeIfNode(
      'Analytics IF: Outbound AI/Bot?',
      [-960, 1560],
      "={{ (($(\"Webhook (Chatwoot)\").item.json.body.message_type === 'outgoing' || $(\"Webhook (Chatwoot)\").item.json.body.message_type === 1) && ($(\"Webhook (Chatwoot)\").item.json.body.content_attributes?.sent_by_ai === true || $(\"Webhook (Chatwoot)\").item.json.body.content_attributes?.sent_by_otp === true)) }}",
      'boolean',
      'true',
      null,
      2,
    ),
  );

  addNode(
    data,
    makeIfNode(
      'Analytics IF: Conversation Created?',
      [-640, 1960],
      "={{ Math.abs((Number($(\"Webhook (Chatwoot)\").item.json.body.created_at || 0) - Number($(\"Webhook (Chatwoot)\").item.json.body.conversation?.created_at || 0))) <= 2 }}",
      'boolean',
      'true',
      null,
      2,
    ),
  );

  addNode(
    data,
    makeSetNode('Analytics Event: Inbound Message', [-640, 1840], [
      { name: 'event_type', value: 'inbound_message', type: 'string' },
      {
        name: 'event_key',
        value: "={{ ['inbound_message', $json.conversation_id || '', $json.message_id || ''].join('|') }}",
        type: 'string',
      },
      {
        name: 'event_time',
        value: "={{ new Date((Number($(\"Webhook (Chatwoot)\").item.json.body.created_at || Math.floor(Date.now()/1000)) * 1000)).toISOString() }}",
        type: 'string',
      },
      { name: 'conversation_id', value: "={{ String($json.conversation_id || '') }}", type: 'string' },
      { name: 'customer_id', value: "={{ $json.phone || '' }}", type: 'string' },
      { name: 'channel', value: 'whatsapp', type: 'string' },
      { name: 'direction', value: 'inbound', type: 'string' },
      {
        name: 'category',
        value: "={{ /disney|ديزني/i.test($json.message_text || '') ? 'disney' : (/fasel|فاصل/i.test($json.message_text || '') ? 'fasel' : 'general') }}",
        type: 'string',
      },
      {
        name: 'intent',
        value: "={{ /otp|code|كود|رمز/i.test($json.message_text || '') ? 'otp_request' : (/login|دخول|تسجيل/i.test($json.message_text || '') ? 'login_help' : (/order|طلب/i.test($json.message_text || '') ? 'order_support' : 'general_support')) }}",
        type: 'string',
      },
      { name: 'otp_status', value: '', type: 'string' },
      { name: 'escalation_reason', value: '', type: 'string' },
      { name: 'token_input', value: 0, type: 'number' },
      { name: 'token_output', value: 0, type: 'number' },
      {
        name: 'metadata',
        value: "={{ ({ source: 'W1', source_event_id: $json.message_id || '', message_preview: ($json.message_text || '').slice(0, 160) }) }}",
        type: 'json',
      },
    ]),
  );

  addNode(
    data,
    makeSetNode('Analytics Event: Intent Classification', [-640, 1700], [
      { name: 'event_type', value: 'intent_classification', type: 'string' },
      {
        name: 'event_key',
        value: "={{ ['intent_classification', $json.conversation_id || '', $json.message_id || ''].join('|') }}",
        type: 'string',
      },
      { name: 'event_time', value: "={{ new Date().toISOString() }}", type: 'string' },
      { name: 'conversation_id', value: "={{ String($json.conversation_id || '') }}", type: 'string' },
      { name: 'customer_id', value: "={{ $json.phone || '' }}", type: 'string' },
      { name: 'channel', value: 'whatsapp', type: 'string' },
      { name: 'direction', value: 'system', type: 'string' },
      {
        name: 'category',
        value: "={{ /disney|ديزني/i.test($json.message_text || '') ? 'disney' : (/fasel|فاصل/i.test($json.message_text || '') ? 'fasel' : 'general') }}",
        type: 'string',
      },
      {
        name: 'intent',
        value: "={{ /otp|code|كود|رمز/i.test($json.message_text || '') ? 'otp_request' : (/login|دخول|تسجيل/i.test($json.message_text || '') ? 'login_help' : (/order|طلب/i.test($json.message_text || '') ? 'order_support' : 'general_support')) }}",
        type: 'string',
      },
      { name: 'otp_status', value: '', type: 'string' },
      { name: 'escalation_reason', value: '', type: 'string' },
      { name: 'token_input', value: 0, type: 'number' },
      { name: 'token_output', value: 0, type: 'number' },
      {
        name: 'metadata',
        value: "={{ ({ source: 'W1', source_event_id: $json.message_id || '' }) }}",
        type: 'json',
      },
    ]),
  );

  addNode(
    data,
    makeSetNode('Analytics Event: Conversation Created', [-320, 1960], [
      { name: 'event_type', value: 'conversation_created', type: 'string' },
      {
        name: 'event_key',
        value: "={{ ['conversation_created', $json.conversation_id || '', String($(\"Webhook (Chatwoot)\").item.json.body.conversation?.created_at || '')].join('|') }}",
        type: 'string',
      },
      {
        name: 'event_time',
        value: "={{ new Date((Number($(\"Webhook (Chatwoot)\").item.json.body.conversation?.created_at || Math.floor(Date.now()/1000)) * 1000)).toISOString() }}",
        type: 'string',
      },
      { name: 'conversation_id', value: "={{ String($json.conversation_id || '') }}", type: 'string' },
      { name: 'customer_id', value: "={{ $json.phone || '' }}", type: 'string' },
      { name: 'channel', value: 'whatsapp', type: 'string' },
      { name: 'direction', value: 'system', type: 'string' },
      {
        name: 'category',
        value: "={{ /disney|ديزني/i.test($json.message_text || '') ? 'disney' : (/fasel|فاصل/i.test($json.message_text || '') ? 'fasel' : 'general') }}",
        type: 'string',
      },
      {
        name: 'intent',
        value: "={{ /otp|code|كود|رمز/i.test($json.message_text || '') ? 'otp_request' : 'general_support' }}",
        type: 'string',
      },
      { name: 'otp_status', value: '', type: 'string' },
      { name: 'escalation_reason', value: '', type: 'string' },
      { name: 'token_input', value: 0, type: 'number' },
      { name: 'token_output', value: 0, type: 'number' },
      {
        name: 'metadata',
        value: "={{ ({ source: 'W1', source_event_id: $json.message_id || '' }) }}",
        type: 'json',
      },
    ]),
  );

  addNode(
    data,
    makeSetNode('Analytics Event: Outbound Message', [-640, 1560], [
      { name: 'event_type', value: 'outbound_message', type: 'string' },
      {
        name: 'event_key',
        value: "={{ ['outbound_message', $json.conversation_id || '', $json.message_id || ''].join('|') }}",
        type: 'string',
      },
      {
        name: 'event_time',
        value: "={{ new Date((Number($(\"Webhook (Chatwoot)\").item.json.body.created_at || Math.floor(Date.now()/1000)) * 1000)).toISOString() }}",
        type: 'string',
      },
      { name: 'conversation_id', value: "={{ String($json.conversation_id || '') }}", type: 'string' },
      { name: 'customer_id', value: "={{ $json.phone || '' }}", type: 'string' },
      { name: 'channel', value: 'whatsapp', type: 'string' },
      { name: 'direction', value: 'outbound', type: 'string' },
      {
        name: 'category',
        value: "={{ /disney|ديزني/i.test($json.message_text || '') ? 'disney' : (/fasel|فاصل/i.test($json.message_text || '') ? 'fasel' : 'general') }}",
        type: 'string',
      },
      { name: 'intent', value: 'agent_response', type: 'string' },
      { name: 'otp_status', value: '', type: 'string' },
      { name: 'escalation_reason', value: '', type: 'string' },
      { name: 'token_input', value: 0, type: 'number' },
      { name: 'token_output', value: 0, type: 'number' },
      {
        name: 'metadata',
        value: "={{ ({ source: 'W1', source_event_id: $json.message_id || '', sent_by_ai: $(\"Webhook (Chatwoot)\").item.json.body.content_attributes?.sent_by_ai === true, sent_by_otp: $(\"Webhook (Chatwoot)\").item.json.body.content_attributes?.sent_by_otp === true }) }}",
        type: 'json',
      },
    ]),
  );

  addNode(
    data,
    makeSetNode('Analytics Event: OTP Outcome Success', [-320, 2300], [
      { name: 'event_type', value: 'otp_outcome', type: 'string' },
      {
        name: 'event_key',
        value: "={{ ['otp_outcome', 'success', $('Set: Extract Incoming').first().json.conversation_id || '', $('Set: Extract Incoming').first().json.message_id || ''].join('|') }}",
        type: 'string',
      },
      { name: 'event_time', value: "={{ new Date().toISOString() }}", type: 'string' },
      {
        name: 'conversation_id',
        value: "={{ String($('Set: Extract Incoming').first().json.conversation_id || '') }}",
        type: 'string',
      },
      { name: 'customer_id', value: "={{ $('Set: Extract Incoming').first().json.phone || '' }}", type: 'string' },
      { name: 'channel', value: 'whatsapp', type: 'string' },
      { name: 'direction', value: 'inbound', type: 'string' },
      { name: 'category', value: 'disney', type: 'string' },
      { name: 'intent', value: 'otp_feedback', type: 'string' },
      { name: 'otp_status', value: 'success', type: 'string' },
      { name: 'escalation_reason', value: '', type: 'string' },
      { name: 'token_input', value: 0, type: 'number' },
      { name: 'token_output', value: 0, type: 'number' },
      {
        name: 'metadata',
        value: "={{ ({ source: 'W1', source_event_id: $('Set: Extract Incoming').first().json.message_id || '', user_reply: $('Code: Normalize State').item.json.message_text || '' }) }}",
        type: 'json',
      },
    ]),
  );

  addNode(
    data,
    makeSetNode('Analytics Event: OTP Outcome Failed', [-320, 2460], [
      { name: 'event_type', value: 'otp_outcome', type: 'string' },
      {
        name: 'event_key',
        value: "={{ ['otp_outcome', 'failed', $('Set: Extract Incoming').first().json.conversation_id || '', $('Set: Extract Incoming').first().json.message_id || ''].join('|') }}",
        type: 'string',
      },
      { name: 'event_time', value: "={{ new Date().toISOString() }}", type: 'string' },
      {
        name: 'conversation_id',
        value: "={{ String($('Set: Extract Incoming').first().json.conversation_id || '') }}",
        type: 'string',
      },
      { name: 'customer_id', value: "={{ $('Set: Extract Incoming').first().json.phone || '' }}", type: 'string' },
      { name: 'channel', value: 'whatsapp', type: 'string' },
      { name: 'direction', value: 'inbound', type: 'string' },
      { name: 'category', value: 'disney', type: 'string' },
      { name: 'intent', value: 'otp_feedback', type: 'string' },
      { name: 'otp_status', value: 'failed', type: 'string' },
      {
        name: 'escalation_reason',
        value: "={{ $('Code: Normalize State').item.json.message_text === 'جاني خطأ - حد اقصى' ? 'retry_limit' : '' }}",
        type: 'string',
      },
      { name: 'token_input', value: 0, type: 'number' },
      { name: 'token_output', value: 0, type: 'number' },
      {
        name: 'metadata',
        value: "={{ ({ source: 'W1', source_event_id: $('Set: Extract Incoming').first().json.message_id || '', user_reply: $('Code: Normalize State').item.json.message_text || '' }) }}",
        type: 'json',
      },
    ]),
  );

  addNode(
    data,
    makeSetNode('Analytics Event: OTP Outcome Unconfirmed', [-320, 2620], [
      { name: 'event_type', value: 'otp_outcome', type: 'string' },
      {
        name: 'event_key',
        value: "={{ ['otp_outcome', 'unconfirmed', $('Set: Extract Incoming').first().json.conversation_id || '', $('Set: Extract Incoming').first().json.message_id || ''].join('|') }}",
        type: 'string',
      },
      { name: 'event_time', value: "={{ new Date().toISOString() }}", type: 'string' },
      {
        name: 'conversation_id',
        value: "={{ String($('Set: Extract Incoming').first().json.conversation_id || '') }}",
        type: 'string',
      },
      { name: 'customer_id', value: "={{ $('Set: Extract Incoming').first().json.phone || '' }}", type: 'string' },
      { name: 'channel', value: 'whatsapp', type: 'string' },
      { name: 'direction', value: 'inbound', type: 'string' },
      { name: 'category', value: 'disney', type: 'string' },
      { name: 'intent', value: 'otp_feedback', type: 'string' },
      { name: 'otp_status', value: 'unconfirmed', type: 'string' },
      { name: 'escalation_reason', value: '', type: 'string' },
      { name: 'token_input', value: 0, type: 'number' },
      { name: 'token_output', value: 0, type: 'number' },
      {
        name: 'metadata',
        value: "={{ ({ source: 'W1', source_event_id: $('Set: Extract Incoming').first().json.message_id || '', user_reply: $('Code: Normalize State').item.json.message_text || '' }) }}",
        type: 'json',
      },
    ]),
  );

  addNode(
    data,
    makeSetNode('Analytics Event: AI Usage', [880, 2920], [
      { name: 'event_type', value: 'ai_usage', type: 'string' },
      {
        name: 'event_key',
        value: "={{ ['ai_usage', $('Set: Extract Incoming').first().json.conversation_id || '', ($json.intermediateSteps?.[0]?.action?.toolCallId || $execution.id || '')].join('|') }}",
        type: 'string',
      },
      { name: 'event_time', value: "={{ new Date().toISOString() }}", type: 'string' },
      {
        name: 'conversation_id',
        value: "={{ String($('Set: Extract Incoming').first().json.conversation_id || '') }}",
        type: 'string',
      },
      { name: 'customer_id', value: "={{ $('Set: Extract Incoming').first().json.phone || '' }}", type: 'string' },
      { name: 'channel', value: 'whatsapp', type: 'string' },
      { name: 'direction', value: 'system', type: 'string' },
      {
        name: 'category',
        value: "={{ /disney|ديزني/i.test($('Set: Extract Incoming').first().json.message_text || '') ? 'disney' : (/fasel|فاصل/i.test($('Set: Extract Incoming').first().json.message_text || '') ? 'fasel' : 'general') }}",
        type: 'string',
      },
      { name: 'intent', value: 'ai_response', type: 'string' },
      { name: 'otp_status', value: '', type: 'string' },
      { name: 'escalation_reason', value: '', type: 'string' },
      { name: 'token_input', value: "={{ Number($json.safe_input_tokens || 0) }}", type: 'number' },
      { name: 'token_output', value: "={{ Number($json.safe_output_tokens || 0) }}", type: 'number' },
      {
        name: 'metadata',
        value: "={{ ({ source: 'W1', source_event_id: ($json.intermediateSteps?.[0]?.action?.toolCallId || ''), execution_id: ($execution.id || ''), total_tokens: Number($json.safe_total_tokens || 0) }) }}",
        type: 'json',
      },
    ]),
  );

  addNode(data, makeAnalyticsHttpNode('Analytics: Send Event', [-40, 1800]));

  ensureMainConnection(data, 'Set: Extract Incoming', 0, 'Analytics IF: Incoming?', 0);
  ensureMainConnection(data, 'Set: Extract Incoming', 0, 'Analytics IF: Outbound AI/Bot?', 0);

  ensureMainConnection(data, 'Analytics IF: Incoming?', 0, 'Analytics Event: Inbound Message', 0);
  ensureMainConnection(data, 'Analytics IF: Incoming?', 0, 'Analytics Event: Intent Classification', 0);
  ensureMainConnection(data, 'Analytics IF: Incoming?', 0, 'Analytics IF: Conversation Created?', 0);

  ensureMainConnection(data, 'Analytics IF: Conversation Created?', 0, 'Analytics Event: Conversation Created', 0);
  ensureMainConnection(data, 'Analytics IF: Outbound AI/Bot?', 0, 'Analytics Event: Outbound Message', 0);

  ensureMainConnection(data, 'Analytics Event: Inbound Message', 0, 'Analytics: Send Event', 0);
  ensureMainConnection(data, 'Analytics Event: Intent Classification', 0, 'Analytics: Send Event', 0);
  ensureMainConnection(data, 'Analytics Event: Conversation Created', 0, 'Analytics: Send Event', 0);
  ensureMainConnection(data, 'Analytics Event: Outbound Message', 0, 'Analytics: Send Event', 0);

  ensureMainConnection(data, 'Switch: Button Type', 0, 'Analytics Event: OTP Outcome Success', 0);
  ensureMainConnection(data, 'Switch: Button Type', 1, 'Analytics Event: OTP Outcome Failed', 0);
  ensureMainConnection(data, 'Switch: Button Type', 2, 'Analytics Event: OTP Outcome Failed', 0);
  ensureMainConnection(data, 'Switch: Button Type', 3, 'Analytics Event: OTP Outcome Unconfirmed', 0);
  ensureMainConnection(data, 'Switch: Button Type', 6, 'Analytics Event: OTP Outcome Unconfirmed', 0);

  ensureMainConnection(data, 'Analytics Event: OTP Outcome Success', 0, 'Analytics: Send Event', 0);
  ensureMainConnection(data, 'Analytics Event: OTP Outcome Failed', 0, 'Analytics: Send Event', 0);
  ensureMainConnection(data, 'Analytics Event: OTP Outcome Unconfirmed', 0, 'Analytics: Send Event', 0);

  ensureMainConnection(data, 'Code in JavaScript1', 0, 'Analytics Event: AI Usage', 0);
  ensureMainConnection(data, 'Analytics Event: AI Usage', 0, 'Analytics: Send Event', 0);

  const tokenCodeNode = data.nodes.find((node) => node.name === 'Code in JavaScript1');
  if (tokenCodeNode) {
    tokenCodeNode.parameters.jsCode = `// Extract token usage metadata from the AI Agent response and normalize it for analytics.\nconst aiOutput = $input.first().json;\n\nfunction findKey(obj, keyToFind) {\n  if (obj === null || typeof obj !== 'object') return null;\n  if (Object.prototype.hasOwnProperty.call(obj, keyToFind)) return obj[keyToFind];\n\n  for (const key of Object.keys(obj)) {\n    const result = findKey(obj[key], keyToFind);\n    if (result !== null) return result;\n  }\n\n  return null;\n}\n\nconst usageMeta = findKey(aiOutput, 'usage_metadata') || {};\n\nconst inputTokens = Number(\n  usageMeta.input_tokens\n  || usageMeta.prompt_tokens\n  || usageMeta.promptTokenCount\n  || usageMeta.promptTokens\n  || findKey(aiOutput, 'input_tokens')\n  || findKey(aiOutput, 'prompt_tokens')\n  || 0\n);\n\nconst outputTokens = Number(\n  usageMeta.output_tokens\n  || usageMeta.completion_tokens\n  || usageMeta.candidatesTokenCount\n  || usageMeta.outputTokens\n  || findKey(aiOutput, 'output_tokens')\n  || findKey(aiOutput, 'completion_tokens')\n  || 0\n);\n\nconst totalTokens = Number(\n  usageMeta.total_tokens\n  || usageMeta.totalTokenCount\n  || (inputTokens + outputTokens)\n  || 0\n);\n\nconst cacheRead = Number(\n  usageMeta.cachedContentTokenCount\n  || findKey(aiOutput, 'cache_read')\n  || 0\n);\n\nreturn [{\n  json: {\n    ...aiOutput,\n    safe_total_tokens: totalTokens,\n    safe_input_tokens: inputTokens,\n    safe_output_tokens: outputTokens,\n    safe_cache_read: cacheRead,\n  }\n}];`;
  }

  writeWorkflow(fullPath, data);
}

function instrumentWf2() {
  const { fullPath, data } = readWorkflow('wf2- agent v3.json');

  addNode(
    data,
    makeStickyNode(
      'Sticky: Analytics Instrumentation',
      [-1160, -380],
      '## Analytics Tracking\nLogs OTP request events as non-blocking side effects.',
    ),
  );

  addNode(
    data,
    makeSetNode('Analytics Event: OTP Request', [-840, -220], [
      { name: 'event_type', value: 'otp_request', type: 'string' },
      {
        name: 'event_key',
        value: "={{ ['otp_request', String($json.conversation_id || ''), String($execution.id || '')].join('|') }}",
        type: 'string',
      },
      { name: 'event_time', value: "={{ new Date().toISOString() }}", type: 'string' },
      { name: 'conversation_id', value: "={{ String($json.conversation_id || '') }}", type: 'string' },
      { name: 'customer_id', value: "={{ $json.phone || '' }}", type: 'string' },
      { name: 'channel', value: 'whatsapp', type: 'string' },
      { name: 'direction', value: 'inbound', type: 'string' },
      { name: 'category', value: 'disney', type: 'string' },
      { name: 'intent', value: 'otp_request', type: 'string' },
      { name: 'otp_status', value: 'requested', type: 'string' },
      { name: 'escalation_reason', value: '', type: 'string' },
      { name: 'token_input', value: 0, type: 'number' },
      { name: 'token_output', value: 0, type: 'number' },
      {
        name: 'metadata',
        value: "={{ ({ source: 'wf2', source_event_id: String($execution.id || ''), email: $json.email || '', order_number: $json.order_number || '' }) }}",
        type: 'json',
      },
    ]),
  );

  addNode(data, makeAnalyticsHttpNode('Analytics: Send Event', [-520, -220]));

  ensureMainConnection(data, 'Trigger (From W1)', 0, 'Analytics Event: OTP Request', 0);
  ensureMainConnection(data, 'Analytics Event: OTP Request', 0, 'Analytics: Send Event', 0);

  writeWorkflow(fullPath, data);
}

function instrumentEscalation() {
  const { fullPath, data } = readWorkflow('esclation v3.json');

  addNode(
    data,
    makeStickyNode(
      'Sticky: Analytics Instrumentation',
      [-920, -260],
      '## Analytics Tracking\nLogs support escalation events for dashboard reporting.',
    ),
  );

  addNode(
    data,
    makeSetNode('Analytics Event: Escalation', [-680, -120], [
      { name: 'event_type', value: 'support_escalation', type: 'string' },
      {
        name: 'event_key',
        value: "={{ ['support_escalation', String($json.conversation_id || ''), String($execution.id || '')].join('|') }}",
        type: 'string',
      },
      { name: 'event_time', value: "={{ new Date().toISOString() }}", type: 'string' },
      { name: 'conversation_id', value: "={{ String($json.conversation_id || '') }}", type: 'string' },
      { name: 'customer_id', value: "={{ $json.phonenumber || '' }}", type: 'string' },
      { name: 'channel', value: 'whatsapp', type: 'string' },
      { name: 'direction', value: 'system', type: 'string' },
      {
        name: 'category',
        value: "={{ /disney|ديزني/i.test($json['Cuse-of-escalation'] || '') ? 'disney' : (/fasel|فاصل/i.test($json['Cuse-of-escalation'] || '') ? 'fasel' : 'general') }}",
        type: 'string',
      },
      { name: 'intent', value: 'support_handoff', type: 'string' },
      { name: 'otp_status', value: '', type: 'string' },
      { name: 'escalation_reason', value: "={{ $json['Cuse-of-escalation'] || '' }}", type: 'string' },
      { name: 'token_input', value: 0, type: 'number' },
      { name: 'token_output', value: 0, type: 'number' },
      {
        name: 'metadata',
        value: "={{ ({ source: 'esclation', source_event_id: String($execution.id || ''), conversation_url: ('https://app.chatwoot.com/app/accounts/' + String($json.chatwoot_account_id || '') + '/inbox-view/conversation/' + String($json.conversation_id || '')) }) }}",
        type: 'json',
      },
    ]),
  );

  addNode(data, makeAnalyticsHttpNode('Analytics: Send Event', [-360, -120]));

  ensureMainConnection(data, 'When Executed by Another Workflow', 0, 'Analytics Event: Escalation', 0);
  ensureMainConnection(data, 'Analytics Event: Escalation', 0, 'Analytics: Send Event', 0);

  writeWorkflow(fullPath, data);
}

function main() {
  instrumentW1();
  instrumentWf2();
  instrumentEscalation();
  console.log('Workflow analytics instrumentation completed.');
}

main();
