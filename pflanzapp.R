library(shiny)
library(ggplot2)
library(dplyr)
library(tibble)
library(png)
library(grid)
library(stringr)
library(purrr)
library(DT)
library(ellmer)

setwd("~/Downloads/pflanzapp/")
# COOLE Website www.baumschule-horstmann.de
# Auch cool https://www.naturadb.de
# Sabrina app https://staudenforum.de/stauden-ratgeber.html
# Scientific www.floraweb.de

# Pflanzen-Datenbank
# CSV einlesen


monatsnamen <- c("Januar", "Februar", "März", "April", "Mai", "Juni",
                 "Juli", "August", "September", "Oktober", "November", "Dezember")

monat_to_num <- function(monat) {
  match(monat, monatsnamen)
}

parse_bluetezeit <- function(text) {
  if (is.na(text) || str_trim(text) == "") return(c(NA_integer_, NA_integer_))
  teile <- unlist(str_split(text, " - "))
  teile <- str_remove_all(teile, "^Anfang |^Mitte |^Ende ")
  teile <- str_remove_all(teile, "^\\s+|\\s+$")
  monate <- monat_to_num(teile)
  if (length(monate) == 1) return(c(monate, monate))
  if (length(monate) == 2) return(monate)
  return(c(NA_integer_, NA_integer_))
}


pflanzen_db <- readr::read_csv("pflanzen.csv", show_col_types = FALSE) %>%
  filter(!is.na(pflanzenname), !is.na(durchmesser), !is.na(hoehe)) %>%
  distinct(pflanzenname, .keep_all = TRUE) %>% mutate(bildname = str_replace(bildname, "\\.jpe?g$", ".png"))
# pflanzen_db%>% glimpse
# Rows: 3,143
# Columns: 18
# $ pflanzenname         <chr> "Aprikose 'Early Orange'", "Aprikose 'Goldrich'", "Tellerpfirsich / Plattpfirsich", "Pfirsich 'Oriane' Neu", "Teller-Nektarine 'Mesembrine' ®", "Unsterblichkeitskraut / Ji…
# $ durchmesser          <dbl> 350, 350, 300, 300, 350, 200, 200, 30, 80, 60, 60, 70, 60, 200, 1200, 400, 60, 50, 130, 40, 250, 30, 30, 400, 300, 120, 100, 300, 300, 700, 500, 300, 150, 180, 200, 150, 4…
# $ hoehe                <dbl> 450, 500, 450, 450, 400, 300, 300, 25, 80, 80, 100, 150, 60, 350, 1500, 1200, 80, 10, 150, 40, 400, 40, 40, 600, 600, 250, 150, 600, 450, 800, 1500, 600, 450, 250, 300, 20…
# $ bluetezeit           <chr> NA, "März - April", NA, NA, NA, "Juli - August", NA, "Juli - September", "Juni - Oktober", "Juni - September", "Juni - September", "Juni - Juli", "Juni - Oktober", "Juni -…
# $ standort             <chr> "Sonne bis Halbschatten", "Sonne", "Sonne bis Halbschatten", "Sonne bis Halbschatten", "Sonne bis Halbschatten", "Sonne bis Halbschatten", "Sonne bis Halbschatten", "Sonne…
# $ erntezeit            <chr> "Mitte Juli - Ende Juli", "Mitte Juli - Ende Juli", "Mitte August", "Mitte September - Ende September", "Mitte August - Ende August", NA, NA, NA, NA, NA, NA, NA, NA, "Augu…
# $ wuchsgeschwindigkeit <chr> "30 - 50 cm/Jahr", "30 - 50 cm/Jahr", "30 - 50 cm/Jahr", "30 - 50 cm/Jahr", "30 - 50 cm/Jahr", NA, "20 - 40 cm/Jahr", NA, NA, NA, NA, NA, NA, "50 - 90 cm/Jahr", NA, "40 - …
# $ laub                 <chr> "laubabwerfend", "laubabwerfend", "laubabwerfend", "laubabwerfend", "laubabwerfend", "laubabwerfend", "immergrün", "laubabwerfend", "laubabwerfend", "laubabwerfend", "laub…
# $ laubfarbe            <chr> "grün", "grün", "grün", "grün", "grün", "grün", "grün, dünne Halme", "grün", "grün", "dunkelgrün", "dunkel-grün", "tiefgrün", "dunkelgrün", "graugrün", "dunkelgrün", "pupu…
# $ boden                <chr> "normaler Gartenboden", "normaler Gartenboden", "lockeren, humosen, nährstoffreichen Gartenboden", "normaler Gartenboden", "normaler Gartenboden", "frisch, durchlässig, no…
# $ wurzelsystem         <chr> "Herzwurzler", "Herzwurzler", "Herzwurzler", "Herzwurzler", "Herzwurzler", NA, "Flachwurzler", NA, NA, NA, NA, NA, NA, "Tiefwurzler", "Flachwurzler", "Tiefwurzler", NA, NA…
# $ wuchs                <chr> "starker, kompakter Wuchs", "kompakter, starker Wuchs", NA, NA, NA, "rankend, kletternd, ausdauernd, krautig, horstig", "aufrecht, zugleich überhängend", "kriechend, teppi…
# $ verfuegbarkeit       <chr> NA, "vorbestellbar", NA, NA, NA, "lieferbar", "vorbestellbar", "lieferbar", NA, "lieferbar", "vorbestellbar", "lieferbar", "lieferbar", "lieferbar", NA, NA, "lieferbar", "…
# $ lieferzeit           <chr> NA, "lieferbar ab Mitte Mai 2025", NA, NA, NA, "Lieferzeit bis zu 9 Werktage", "lieferbar ab Mitte August 2025", "Lieferzeit bis zu 9 Werktage", NA, "Lieferzeit bis zu 9 W…
# $ preis                <dbl> NA, 70.5, NA, NA, NA, 5.8, NA, 5.1, NA, 25.7, 6.7, 7.7, 27.8, 22.1, NA, NA, 7.0, 2.5, NA, 21.1, 9.3, NA, 5.8, NA, 129.8, NA, 47.8, NA, 64.1, NA, NA, 13.8, 418.2, NA, NA, 3…
# $ bildname             <chr> NA, "aprikose-goldrich-neu-m043383_h_0.png", "pfirsich-tellerpfirsich-plattpfirsich-m043388_h_0.png", NA, "tellernektarine-mesembrine-m043400_h_0.png", "unsterblichkeitskr…
# $ bildurl              <chr> NA, "https://www.baumschule-horstmann.de/bilder/detail/aprikose-goldrich-neu-m043383_h_0.jpg", "https://www.baumschule-horstmann.de/bilder/detail/pfirsich-tellerpfirsich-p…
# $ url                  <chr> "https://www.baumschule-horstmann.de/shop/exec/product/65/43382/Aprikose-Early-Orange.html", "https://www.baumschule-horstmann.de/shop/exec/product/65/43383/Aprikose-Goldr…
# $ beschreibung                  <chr> "Beschreibung der Pflanze"

create_circle_df <- function(x0, y0, r, id, npoints = 100) {
  theta <- seq(0, 2 * pi, length.out = npoints)
  tibble(
    x = x0 + r * cos(theta),
    y = y0 + r * sin(theta),
    id = id
  )
}

ui <- fluidPage(
  titlePanel("Bepflanzungsplan"),
  tags$img(src = "title.png", height = "200px", width = "200px"),
  fluidRow(
    column(
      width = 1,
      numericInput("diameter", "Durchmesser (cm):", value = 60, min = 1, step = 1),
      sliderInput("durchmesser_filter", "Filter: Durchmesser (cm)",
                  min = 15, max = 2500, value = c(15, 2500), step = 1),
      sliderInput("bluete_filter", "Filter: Blütezeit (Monate)", 
                  min = 1, max = 12, value = c(1, 12), step = 1,
                  ticks = FALSE,
                  pre = "", post = "", animate = FALSE),
      checkboxInput("filter_sonne", "☀️", value = TRUE),
      checkboxInput("filter_halbschatten", "🌤️", value = TRUE),
      checkboxInput("filter_lieferbar", "📦", value = TRUE),
      checkboxInput("filter_vorbestellbar", "⏳", value = TRUE),
      checkboxInput("filter_allow_na", "❔ auch unvollständige Pflanzen anzeigen", value = FALSE),
      
      
     

      
      
      actionButton("save_btn", "Speichern"),
      actionButton("load_btn", "Laden"),
      checkboxInput("delete_mode", "Löschmodus aktiv", FALSE)
      
    ),
    column(
      width = 11,
      tags$div(
        style = "width: 100%;",
        selectizeInput(
          "pflanze",
          "Pflanze auswählen:",
          choices = NULL,
          width="100%",
          options = list(
            dropdownDirection = "down",
            #maxOptions = 25,
            render = I("
      {
        option: function(item, escape) {
          return '<div style=\"display: flex; align-items: center;\"><img src=\"' + item.img + '\" height=\"60\" style=\"margin-right:10px; border-radius: 5px;\">' + escape(item.label) + '</div>';
        },
        item: function(item, escape) {
          return '<div style=\"display: flex; align-items: center;\"><img src=\"' + item.img + '\" height=\"40\" style=\"margin-right:10px; border-radius: 5px;\">' + escape(item.label) + '</div>';
        }
      }
    "),
            escape = FALSE
          )
        )
        
        ,
        plotOutput(
          "beetPlot",
          click = "plot_click",
          hover = hoverOpts(id = "plot_hover", delay = 100, delayType = "throttle", clip = TRUE),
          height = "400px",
          width = "100%"
        )
      ),
      hr(),
      h3("Gesetzte Pflanzen im Beet"),
      DT::dataTableOutput("gesetzte_tabelle")
    )
  ),
  tags$head(tags$style(HTML("
    .selectize-dropdown-content {
      max-height: 800px !important;
      overflow-y: auto;
    }
  ")),
    tags$script(HTML("
    Shiny.addCustomMessageHandler('updateSelectize', function(message) {
      var $el = $('#' + message.id)[0];
      if ($el && $el.selectize) {
        var selectize = $el.selectize;
        selectize.clearOptions();
        var data = message.data;  // ✅ Kein JSON.parse mehr!
        for (var i = 0; i < data.length; i++) {
          selectize.addOption(data[i]);
        }
        if (data.length > 0) {
          selectize.setValue(data[0].value);  // optional, für erste Auswahl
        }
        selectize.refreshOptions(false);
      }
    });
  "))
  )
  
  
  
)




server <- function(input, output, session) {
  beet_width <- 1280
  beet_height <- 200
  
  observe({
    session$sendCustomMessage("updateSelectize", list(
      id = "pflanze",
      data = gefilterte_pflanzen()
    ))
  })
  
  output$gesetzte_tabelle <- DT::renderDataTable({
    req(nrow(pflanzen()) > 0)
    
    pflanzen() %>%
      distinct(name, .keep_all = TRUE) %>%
      select(name) %>%
      left_join(pflanzen_db, by = c("name" = "pflanzenname")) %>%
      select(-bildname,-bildurl) %>%
      mutate(url = ifelse(
        !is.na(url),
        paste0("<a href='", url, "' target='_blank'>zur Pflanze</a>"),
        NA_character_
      )) %>%
      DT::datatable(escape = FALSE, options = list(pageLength = 5))
  })
  
  
  
  
  
  gefilterte_pflanzen <- reactive({
    req(input$durchmesser_filter, input$bluete_filter)
    
    filtered <- pflanzen_db %>%
      mutate(
        bluete_monate = purrr::map(bluetezeit, parse_bluetezeit),
        bluete_start = purrr::map_int(bluete_monate, 1),
        bluete_ende = purrr::map_int(bluete_monate, 2)
      ) %>%
      filter(
        durchmesser >= input$durchmesser_filter[1],
        durchmesser <= input$durchmesser_filter[2],
        input$filter_allow_na | (!is.na(bluete_start) & !is.na(bluete_ende)),
        bluete_ende >= input$bluete_filter[1],
        bluete_start <= input$bluete_filter[2]
      )
    
    
    # Standortfilter (nur wenn mindestens ein Häkchen gesetzt ist)
    filtered <- filtered %>%
      filter(
        (
          (!is.na(standort) & (
            (input$filter_sonne & str_detect(standort, "Sonne")) |
              (input$filter_halbschatten & str_detect(standort, "Halbschatten"))
          )) |
            (is.na(standort) & input$filter_allow_na)
        )
      )
    
    
    
    filtered <- filtered %>%
      filter(
        (
          (!is.na(verfuegbarkeit) & (
            (input$filter_lieferbar & verfuegbarkeit == "lieferbar") |
              (input$filter_vorbestellbar & verfuegbarkeit == "vorbestellbar")
          )) |
            (is.na(verfuegbarkeit) & input$filter_allow_na)
        )
      )
    
    
    
    
    # Daten fürs Dropdown aufbereiten
    filtered %>%
      mutate(
        label = pflanzenname,
        value = pflanzenname,
        img = bildname
      ) %>%
      select(label, value, img) %>%
      purrr::transpose()
  })
  
  
  
  
  
  
  pflanzen <- reactiveVal(tibble(x = numeric(), y = numeric(), name = character(), durchmesser = numeric()))
  
  last_hover <- reactiveVal(NULL)
  
  observeEvent(input$pflanze, {
    selected <- pflanzen_db %>% filter(pflanzenname == input$pflanze)
    updateSliderInput(session, "diameter", value = selected$durchmesser)
  })
  
  observeEvent(input$plot_click, {
    pos <- input$plot_click
    current <- pflanzen()
    
    if (input$delete_mode) {
      # Löschen-Modus aktiv: Entferne Pflanze in der Nähe
      if (nrow(current) == 0) return()
      threshold <- 30
      distances <- sqrt((current$x - pos$x)^2 + (current$y - pos$y)^2)
      nearest <- which.min(distances)
      if (distances[nearest] < threshold) {
        current <- current[-nearest, ]
        pflanzen(current)
      }
    } else {
      # Pflanze hinzufügen
      new <- tibble(x = pos$x, y = pos$y, name = input$pflanze, durchmesser = input$diameter)
      pflanzen(bind_rows(current, new))
      
      pflanzen(bind_rows(current, new))
    }
  })
  
  
  
  output$beetPlot <- renderPlot({
    hover <- input$plot_hover
    if (!is.null(hover)) {
      last_hover(list(x = hover$x, y = hover$y))
    }
    hover_pos <- last_hover()
    
    p <- ggplot() +
      coord_fixed(xlim = c(0, beet_width), ylim = c(0, beet_height), expand = FALSE) +
      theme_minimal() +
      theme(panel.grid = element_blank()) +
      geom_rect(aes(xmin = 0, xmax = beet_width, ymin = 0, ymax = beet_height),
                fill = "#885533", color = "#663311")
    
    # platzierte Pflanzen
    pflanzen_data <- pflanzen()
    if (nrow(pflanzen_data) > 0) {
      for (i in seq_len(nrow(pflanzen_data))) {
        row <- pflanzen_data[i, ]
        pfl_info <- pflanzen_db %>% filter(pflanzenname == row$name)
        radius <- row$durchmesser / 2
        img_path <- file.path("www", pfl_info$bildname)
        
        if (file.exists(img_path)) {
          img <- png::readPNG(img_path)
          g <- rasterGrob(img, interpolate = TRUE)
          p <- p + annotation_custom(
            g,
            xmin = row$x - radius,
            xmax = row$x + radius,
            ymin = row$y - radius,
            ymax = row$y + radius
          )
        } else {
          # fallback Kreis
          fallback_circle <- create_circle_df(row$x, row$y, radius, id = i)
          p <- p + geom_polygon(data = fallback_circle, aes(x = x, y = y), fill = "red", alpha = 0.5)
        }
      }
    }
    
    # Vorschau bei Hover
    if (!is.null(hover_pos)) {
      pfl_info <- pflanzen_db %>% filter(pflanzenname == input$pflanze)
      radius <- input$diameter / 2
      img_path <- file.path("www", pfl_info$bildname)
      
      if (file.exists(img_path)) {
        img <- png::readPNG(img_path)
        g <- rasterGrob(img, interpolate = TRUE)
        p <- p + annotation_custom(
          g,
          xmin = hover_pos$x - radius,
          xmax = hover_pos$x + radius,
          ymin = hover_pos$y - radius,
          ymax = hover_pos$y + radius
        )
      } else {
        # fallback Vorschaukreis
        preview <- create_circle_df(hover_pos$x, hover_pos$y, radius, id = 0)
        p <- p + geom_path(data = preview, aes(x = x, y = y), color = "black", linetype = "dashed")
      }
    }
    
    p
  })
  
  observeEvent(input$save_btn, {
    write.csv(pflanzen(), "pflanzen_status.csv", row.names = FALSE)
    
  })
  
  observeEvent(input$load_btn, {
    if (file.exists("pflanzen_status.csv")) {
      data <- read.csv("pflanzen_status.csv", stringsAsFactors = FALSE)
      pflanzen(as_tibble(data))
      
    }
  })
  
}

shinyApp(ui, server)

