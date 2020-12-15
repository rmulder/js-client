const test = require('ava')
const tempy = require('tempy')

const hashFns = require('./hash_fns')

test('hashes files in a folder', async (t) => {
  const { functions, fnShaMap } = await hashFns(__dirname, {
    tmpDir: tempy.directory(),
    concurrentHash: 100,
    statusCb() {},
  })

  Object.keys(functions).forEach((path) => {
    t.truthy(path, 'each file has a path')
  })
  t.truthy(fnShaMap, 'fnShaMap is returned')
  Object.values(fnShaMap).forEach((fileObjArray) => {
    fileObjArray.forEach((fileObj) => {
      t.truthy(fileObj.normalizedPath, 'fileObj have a normalizedPath field')
    })
  })
})
