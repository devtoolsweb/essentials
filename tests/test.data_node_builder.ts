import * as model from './model.json'

import { DataNodeBuilder } from '../lib'

test('create', () => {
  const dnRoot = DataNodeBuilder.buildFromObject(model)
  expect(dnRoot.getNodeByPath('model/tasks/dashboard')).not.toBeNull()
})
