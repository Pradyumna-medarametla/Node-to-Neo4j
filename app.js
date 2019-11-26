const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const request = require('request')
const cheerio = require('cheerio')
const port = 9876;
const neo4j = require('neo4j-driver').v1;

app.use(bodyParser.json())

app.get('/', (req, res) => {
    res.send('working');
});

app.post('/onpush', (req, res) => {
    // const driver = neo4j.driver("bolt+routing://10.150.17.47:7690", neo4j.auth.basic("neo4j", "admin"));
    const driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "admin"));
    const session = driver.session();
        req.body.tags.forEach((item) => {
            request({
                url : item.url
            },
            (error, response, body) => {
                if(error){
                    console.log(error);
                    return;
                }
                var i,j;
                var query='';
                var query1='';
                var passparam='with ';
                if(item.OldTagID == "" ){
                    console.log("old tag is empty");
                    FirstTimeNodesCreation();
                }
                else{
                    UpdatedNodesCreation();
                }

                const $ = cheerio.load(body);
                // var jsonObj={
                //     "url": `${item.url}#${item.id}`,
                //     "content": $(`#${item.id}`).text()
                // };
            function FirstTimeNodesCreation()
                        {
                            
                            var index = 0;
                            var passparam='with ';
                            const newTags = item.NewTagID.split(":")[1].split("/");
                            var newTagSet = new Set();

                            for(j=0;j<newTags.length;j++)
                            {
                                newTagSet.add(newTags[j]);
                            }
                            // newTagSet.forEach(function(value){ 
                            //     console.log(value + "For each");
                            // });
                            newTagSet.forEach(function(value){   
                        
                                passparam+='n'+index+','
                                query=query+'MERGE (n'+index+':TestCrawlerNode {tagname: "'+value+'"}) '+passparam.substring(0,passparam.length-1)+' '
                                index++;
                           })
                            var k=index;
                            console.log(index +"index");
                            passparam+='n'+index;
                            query=query+'MERGE (n'+index+':TestCrawlerNode {content: "content1"}) set n'+index+'.url= "url"  '+passparam+' '
                            for(i=0;i<newTags.length;i++){
                                query=query+'merge (n'+i+')-[:has]->(n'+(k)+') '+passparam+' ';
                            }
                            console.log("successfully created nodes and relationship");
                            query=query.substring(0, query.length- passparam.length-1);
                            console.log(query + "query");
                            return query;

                        }
             function UpdatedNodesCreation(){  
                
                var index = 0;
                var passparam='with ';
                
 //=================================== Creating new tags set() 
                const newTags = item.NewTagID.split(":")[1].split("/");              
                var newTagSet = new Set();
                for(j=0;j<newTags.length;j++)
                {
                    newTagSet.add(newTags[j]);
                } 
                
//=================================== Creating old tags set() 
                const oldTags=item.OldTagID.split(":")[1].split("/");
                    var oldTagSet = new Set();
                    for(i=0;i<oldTags.length;i++){
                        oldTagSet.add(oldTags[i]);
                    }
                
//===================================intersection tags
                var intersectionSet =new Set([...oldTagSet].filter(x => newTagSet.has(x)));
                if(intersectionSet != null){
                console.log(intersectionSet.values());  
                    }
                else{
                    console.log("there is no intersection");
                }
 //===================================unused tags
                var unusedTags = new Set([...oldTagSet].filter(x => !intersectionSet.has(x)));
                if(unusedTags !=null){
                    unusedTags.forEach(function(value){
                        query = query+ 'MATCH (:TestCrawlerNode {tagname: "'+value+'"})-[r:has]-> (:TestCrawlerNode {url: "url"}) DELETE r with r as r1 ';
                    })
                }

//===================================new tags
                var tagsToBeAdded = new Set([...newTagSet].filter(x => !intersectionSet.has(x)));
    
            
                if(tagsToBeAdded != null)
                {
                   newTagSet.forEach(function(value){   
                        
                        passparam+='n'+index+','
                        query=query+'MERGE (n'+index+':TestCrawlerNode {tagname: "'+value+'"}) '+passparam.substring(0,passparam.length-1)+' '
                        index++;
                   })
                    var k=index;
                    console.log(index +"index");
                    passparam+='n'+index;
                    query=query+'MERGE (n'+index+':TestCrawlerNode {url: "url"}) set n'+index+'.content= "content11"  '+passparam+' '
                    for(i=0;i<newTags.length;i++){
                        query=query+'merge (n'+i+')-[:has]->(n'+(k)+') '+passparam+' ';
                    }
                    console.log("successfully changed the relationship");
                    query=query.substring(0, query.length- passparam.length-1);

                }  
                console.log(query + "query");
                return query;      
            }       
               // query=query.substring(0, query.length- passparam.length-1);
                const sessionPromise = session.run(
                    query
                ); 
                sessionPromise.then(result => {
                    session.close();
                });
            });
        });
    res.send({message: 'success'}).status(200);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));