# Example Requirements Table

## Combined HTML and JS Requirements

This table is from CS133JS_Lab01GradeAssist.csv. It has settings for HTML and JavaScript

- The MacOS and Windows submission paths can either be an abolute path to the submission directory or a path relative to the directory the requirements file is in.

- The 1 or 2 at the end of a requirement type in column headings indicate whether it's for part 1 or part 2

- The requiredJs checks are done with regular expressions (I think?)

  

| line | settings                  | settingsDescription        | requiredJS1    | RecJS1Qty | requiredJS2 | RecJS2Qty | requiredElements1            | RecElem1Qty | requiredElements2 | RecElem2Qty | regExpForHTML1    | regExpForHTML1Description | regExpForHTML2 | regExpForHTML2Description | moreRequirements | moreReqsDescription | Notes                 |                              |
| ---- | ------------------------- | -------------------------- | -------------- | --------- | ----------- | --------- | ---------------------------- | ----------- | ----------------- | ----------- | ----------------- | ------------------------- | -------------- | ------------------------- | ---------------- | ------------------- | --------------------- | ---------------------------- |
| 0    | CS133JS_F23Lab1Production | MacOS submission path      | =              | 8         |             |           | title                        |             |                   |             | <head>[\s\S]*<!-- | Comment in head           |                |                           | index            | File name           |                       |                              |
| 1    | CS133JS_F23Lab1Production | Windows submission path    | *              | 4         |             |           | style                        |             |                   |             |                   |                           |                |                           |                  | 4                   | Total HTML files      |                              |
| 2    | 2                         | Number of parts            | +              | 4         |             |           | link[href][rel='stylesheet'] |             |                   |             |                   |                           |                | 1                         | Total CSS files  |                     |                       |                              |
| 3    | Lab01                     | Lab name                   | alert          | 1         |             |           | [style]                      |             |                   |             |                   |                           |                |                           |                  | 3                   | Embedded CSS rules    |                              |
| 4    | TRUE                      | All parts in one directory | prompt         | 1         |             |           | [id]                         |             |                   |             |                   |                           |                |                           |                  | 8                   | External CSS rules    | Check for combined CSS rules |
| 5    | TRUE                      | Check HTML                 | var            | 9         |             |           | [class]                      |             |                   |             |                   |                           |                |                           |                  | 4                   | Unique property types |                              |
| 6    | FALSE                     | Check CSS                  | const          | 1         |             |           |                              |             |                   |             |                   |                           |                |                           |                  |                     |                       |                              |
| 7    | TRUE                      | Check JavaScript           | Number         | 1         |             |           |                              |             |                   |             |                   |                           |                |                           |                  |                     |                       |                              |
|      |                           |                            | String         | 1         |             |           |                              |             |                   |             |                   |                           |                |                           |                  |                     |                       |                              |
|      |                           |                            | toFixed        | 1         |             |           |                              |             |                   |             |                   |                           |                |                           |                  |                     |                       |                              |
|      |                           |                            | document.write | 8         |             |           |                              |             |                   |             |                   |                           |                |                           |                  |                     |                       |                              |
|      |                           |                            |                |           |             |           |                              |             |                   |             |                   |                           |                |                           |                  |                     |                       |                              |





