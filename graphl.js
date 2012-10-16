var container = d3.select('body').append("form")
  , textEntry = container.append("textarea")
  , svg = container.append("svg")
  ;

d3.text('graph.txt', function(dsldata) {
  textEntry.text(dsldata);

  translate();
});

function translate() {
  var dsldata = textEntry.text()
    , statements = convertDSLtoStatements(dsldata)
    , links = []
    ;
  statements.forEach(function(statement) {
    links.push({ source: statement.subject
               , target: statement.noun
               , label:  statement.verb
               });
  });

  buildGraph(svg, links);
}

function lineIndent(s) {
  var sa = s.match(/^( *)(.*)$/);
  return sa
    ? { indent: sa[1].length , value:  sa[2] }
    : { indent: 0     , value:  s     }
}

function processLines(lines) {
  // assuming "noun verb noun", 3 levels, 2 space indents, no wild jumps
  var i = 0
    , diff = 0
    , ll
    , pl = lineIndent(lines[i]).value
    , stack = [pl]
    , list = []
    ;

  while (++i < lines.length) {
    ll = pl;
    pl = lineIndent(lines[i]);
    diff = (pl.indent - ll.indent) / 2;
    if (diff <= 0) {
      d3.range(Math.abs(diff) + 1).forEach(function(){
        stack.pop();
      });
    }
    stack.push(pl.value);
    if (stack.length == 3) {
      list.push({ subject: stack[0]
                , verb:    stack[1]
                , noun:    stack[2]
                });
    }
  }

  return list;
}

function convertDSLtoStatements(dsldata) {
  var lines = dsldata.split('\n')
    , obj = {}
    ;

  return processLines(lines);
}

function buildGraph(svg, links, nodes) {
  var width  = parseInt(svg.style('width'))
    , height = parseInt(svg.style('height'))
    , links = links || []
    , nodes = nodes || {}
    ;

  // Compute the distinct nodes from the links.
  links.forEach(function(link) {
    link.source = nodes[link.source]
             || ( nodes[link.source] = {name: link.source} );
    link.target = nodes[link.target]
             || ( nodes[link.target] = {name: link.target} );
  });

  var force = d3.layout.force()
      .nodes(d3.values(nodes))
      .links(links)
      .size([width, height])
      .linkDistance(60)
      .charge(-1700)
      .on("tick", tick)
      .start();

  var link = svg.selectAll(".link")
      .data(force.links())
    .enter().append("line")
      .attr("class", "link");

  var link_text = svg.selectAll(".link-text")
      .data(force.links(), function (d){ return d.label; })
    .enter().append("g").append("text").attr("class", "link-text")
      .text(function(d) { return d.label; });

  var node = svg.selectAll(".node")
      .data(force.nodes())
    .enter().append("g")
      .attr("class", "node")
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)
      .call(force.drag);

  node.append("circle")
      .attr("r", 4);

  node.append("text")
      .attr("x", 12)
      .attr("dy", ".35em")
      .text(function(d) { return d.name; });

  function tick() {
    link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    link_text
        .attr("transform", function(d) {
            var dx = (d.target.x - d.source.x),
            dy = (d.target.y - d.source.y);
            var dr = Math.sqrt(dx * dx + dy * dy);
            var sinus = dy/dr;
            var cosinus = dx/dr;
            var l = d.label.length*6;
            var offset = (1 - (l / dr )) / 2;
            var x=(d.source.x + dx*offset);
            var y=(d.source.y + dy*offset);
            return "translate(" + x + "," + y + ") matrix("+cosinus+", "+sinus+", "+-sinus+", "+cosinus+", 0 , 0)";
          });

    node
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  }

  function mouseover() {
    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 8);
  }

  function mouseout() {
    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 4);
  }

}
